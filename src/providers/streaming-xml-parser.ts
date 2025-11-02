/**
 * Streaming XML Parser for Text-based Tool Calls
 * Parses XML tags incrementally as text streams in
 * Emits streaming events for text and tool calls
 */

export type StreamingXMLEvent =
  | { type: 'text-start' }
  | { type: 'text-delta'; delta: string }
  | { type: 'text-end' }
  | { type: 'tool-input-start'; toolCallId: string; toolName: string }
  | { type: 'tool-input-delta'; toolCallId: string; delta: string }
  | { type: 'tool-input-end'; toolCallId: string }
  | {
      type: 'tool-call-complete';
      toolCallId: string;
      toolName: string;
      arguments: Record<string, unknown>;
    };

type ParserState =
  | { type: 'idle' }
  | { type: 'in-text'; buffer: string }
  | {
      type: 'in-tool';
      toolName: string | null;
      toolCallId: string | null;
      argsBuffer: string;
      tagBuffer: string;
    };

/**
 * Streaming XML Parser
 * Processes text chunks and emits events as XML tags are detected
 */
export class StreamingXMLParser {
  private state: ParserState = { type: 'idle' };
  private buffer = '';

  /**
   * Process a chunk of text and emit events
   */
  *processChunk(chunk: string): Generator<StreamingXMLEvent> {
    this.buffer += chunk;

    // Process buffer until no more complete tags can be extracted
    while (true) {
      const result = this.processBuffer();
      if (!result) break;
      yield result;
    }
  }

  /**
   * Flush remaining content and emit final events
   */
  *flush(): Generator<StreamingXMLEvent> {
    // Emit any remaining content based on current state
    if (this.state.type === 'in-text' && this.state.buffer) {
      yield { type: 'text-delta', delta: this.state.buffer };
      yield { type: 'text-end' };
    }

    // Reset state
    this.state = { type: 'idle' };
    this.buffer = '';
  }

  private processBuffer(): StreamingXMLEvent | null {
    if (this.state.type === 'idle') {
      // Look for <text> or <tool_use> opening tag
      const textMatch = this.buffer.match(/^[^<]*<text>/);
      const toolMatch = this.buffer.match(/^[^<]*<tool_use>/);

      if (textMatch) {
        // Remove matched content from buffer
        this.buffer = this.buffer.slice(textMatch[0].length);
        this.state = { type: 'in-text', buffer: '' };
        return { type: 'text-start' };
      }

      if (toolMatch) {
        // Remove matched content from buffer
        this.buffer = this.buffer.slice(toolMatch[0].length);
        this.state = {
          type: 'in-tool',
          toolName: null,
          toolCallId: null,
          argsBuffer: '',
          tagBuffer: '',
        };
        return this.processBuffer(); // Continue processing
      }

      // Skip any content before tags (whitespace, etc.)
      const nextTag = this.buffer.indexOf('<');
      if (nextTag > 0) {
        this.buffer = this.buffer.slice(nextTag);
        return this.processBuffer();
      }

      return null;
    }

    if (this.state.type === 'in-text') {
      // Look for </text> closing tag
      const endMatch = this.buffer.match(/^(.*?)<\/text>/s);

      if (endMatch) {
        const content = endMatch[1];
        this.buffer = this.buffer.slice(endMatch[0].length);

        // Emit any remaining buffered text plus new content
        const fullContent = this.state.buffer + content;
        this.state = { type: 'idle' };

        if (fullContent) {
          return { type: 'text-delta', delta: fullContent };
        } else {
          return { type: 'text-end' };
        }
      }

      // No closing tag yet - emit what we can
      // Keep last 10 chars in buffer in case </text> is split
      if (this.buffer.length > 10) {
        const safeToEmit = this.buffer.slice(0, -10);
        this.buffer = this.buffer.slice(-10);
        this.state.buffer += safeToEmit;
        return { type: 'text-delta', delta: safeToEmit };
      }

      return null;
    }

    if (this.state.type === 'in-tool') {
      // Parse tool_name if not yet parsed
      if (!this.state.toolName) {
        const toolNameMatch = this.buffer.match(/^[^<]*<tool_name>(.*?)<\/tool_name>/s);
        if (toolNameMatch) {
          this.state.toolName = toolNameMatch[1].trim();
          this.buffer = this.buffer.slice(toolNameMatch[0].length);
          return this.processBuffer(); // Continue
        }
        return null; // Wait for more data
      }

      // Parse tool_call_id if not yet parsed
      if (!this.state.toolCallId) {
        const idMatch = this.buffer.match(/^[^<]*<tool_call_id>(.*?)<\/tool_call_id>/s);
        if (idMatch) {
          this.state.toolCallId = idMatch[1].trim();
          this.buffer = this.buffer.slice(idMatch[0].length);

          // Emit tool-input-start now that we have name and ID
          const event: StreamingXMLEvent = {
            type: 'tool-input-start',
            toolCallId: this.state.toolCallId,
            toolName: this.state.toolName,
          };

          // Continue processing for arguments
          setTimeout(() => this.processBuffer(), 0);
          return event;
        }
        return null; // Wait for more data
      }

      // Look for <arguments> opening
      if (!this.state.tagBuffer) {
        const argsOpenMatch = this.buffer.match(/^[^<]*<arguments>/);
        if (argsOpenMatch) {
          this.buffer = this.buffer.slice(argsOpenMatch[0].length);
          this.state.tagBuffer = 'in-args';
          return this.processBuffer(); // Continue
        }
        return null;
      }

      // Parse arguments content
      if (this.state.tagBuffer === 'in-args') {
        const argsCloseMatch = this.buffer.match(/^(.*?)<\/arguments>/s);

        if (argsCloseMatch) {
          const argsContent = argsCloseMatch[1];
          this.buffer = this.buffer.slice(argsCloseMatch[0].length);

          // Emit tool-input-end first
          this.state.tagBuffer = 'args-complete';

          // Emit final delta if any content, then tool-input-end will come in next call
          if (argsContent) {
            this.state.argsBuffer += argsContent;
            return {
              type: 'tool-input-delta',
              toolCallId: this.state.toolCallId!,
              delta: argsContent
            };
          }

          // Emit tool-input-end
          const toolInputEndEvent: StreamingXMLEvent = {
            type: 'tool-input-end',
            toolCallId: this.state.toolCallId!,
          };
          return toolInputEndEvent;
        }

        // Emit partial arguments (keep last 15 chars for </arguments>)
        if (this.buffer.length > 15) {
          const safeToEmit = this.buffer.slice(0, -15);
          this.buffer = this.buffer.slice(-15);
          this.state.argsBuffer += safeToEmit;
          return {
            type: 'tool-input-delta',
            toolCallId: this.state.toolCallId!,
            delta: safeToEmit
          };
        }

        return null;
      }

      // Look for </tool_use> closing
      if (this.state.tagBuffer === 'args-complete') {
        const toolCloseMatch = this.buffer.match(/^[^<]*<\/tool_use>/);
        if (toolCloseMatch) {
          this.buffer = this.buffer.slice(toolCloseMatch[0].length);

          // Parse arguments JSON
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(this.state.argsBuffer);
          } catch (error) {
            console.error('Failed to parse tool arguments:', this.state.argsBuffer, error);
          }

          const event: StreamingXMLEvent = {
            type: 'tool-call-complete',
            toolCallId: this.state.toolCallId!,
            toolName: this.state.toolName!,
            arguments: args,
          };

          this.state = { type: 'idle' };
          return event;
        }
        return null;
      }

      return null;
    }

    return null;
  }
}
