/**
 * Streaming XML Parser for Text-based Tool Calls
 * Parses XML tags incrementally as text streams in
 * Emits streaming events for text and tool calls
 */

// Buffer safety margins to handle split tags
const TEXT_TAG_SAFETY_MARGIN = 10; // Reserve chars for "</text>"
const ARGUMENTS_TAG_SAFETY_MARGIN = 15; // Reserve chars for "</arguments>"

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
  | { type: 'in-text' }
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
  private eventQueue: StreamingXMLEvent[] = [];

  /**
   * Process a chunk of text and emit events
   */
  *processChunk(chunk: string): Generator<StreamingXMLEvent> {
    this.buffer += chunk;

    // Process buffer until no more complete tags can be extracted
    while (true) {
      yield* this.drainEventQueue();

      const result = this.processBuffer();
      if (!result) break;
      yield result;
    }

    yield* this.drainEventQueue();
  }

  /**
   * Drain and yield all queued events
   */
  private *drainEventQueue(): Generator<StreamingXMLEvent> {
    while (this.eventQueue.length > 0) {
      yield this.eventQueue.shift()!;
    }
  }

  /**
   * Flush remaining content and emit final events
   */
  *flush(): Generator<StreamingXMLEvent> {
    if (this.state.type === 'in-text') {
      // Emit any remaining buffered text (held back for safety margin)
      if (this.buffer) {
        yield { type: 'text-delta', delta: this.buffer };
      }
      yield { type: 'text-end' };
    }

    yield* this.drainEventQueue();

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
        this.buffer = this.buffer.slice(textMatch[0].length);
        this.state = { type: 'in-text' };
        return { type: 'text-start' };
      }

      if (toolMatch) {
        this.buffer = this.buffer.slice(toolMatch[0].length);
        this.state = {
          type: 'in-tool',
          toolName: null,
          toolCallId: null,
          argsBuffer: '',
          tagBuffer: '',
        };
        return this.processBuffer();
      }

      // Skip any content before tags
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
        this.state = { type: 'idle' };

        // Queue text-end to emit after final text-delta
        this.eventQueue.push({ type: 'text-end' });

        if (content) {
          return { type: 'text-delta', delta: content };
        }
        return this.eventQueue.shift()!;
      }

      // No closing tag yet - emit what we can safely
      // Keep safety margin in buffer in case </text> tag is split across chunks
      if (this.buffer.length > TEXT_TAG_SAFETY_MARGIN) {
        const safeToEmit = this.buffer.slice(0, -TEXT_TAG_SAFETY_MARGIN);
        this.buffer = this.buffer.slice(-TEXT_TAG_SAFETY_MARGIN);
        return { type: 'text-delta', delta: safeToEmit };
      }

      return null;
    }

    if (this.state.type === 'in-tool') {
      // Parse <tool_name> tag
      if (!this.state.toolName) {
        const toolNameMatch = this.buffer.match(/^[^<]*<tool_name>(.*?)<\/tool_name>/s);
        if (toolNameMatch) {
          this.state.toolName = toolNameMatch[1].trim();
          this.buffer = this.buffer.slice(toolNameMatch[0].length);
          return this.processBuffer();
        }
        return null;
      }

      // Parse <tool_call_id> tag
      if (!this.state.toolCallId) {
        const idMatch = this.buffer.match(/^[^<]*<tool_call_id>(.*?)<\/tool_call_id>/s);
        if (idMatch) {
          this.state.toolCallId = idMatch[1].trim();
          this.buffer = this.buffer.slice(idMatch[0].length);

          return {
            type: 'tool-input-start',
            toolCallId: this.state.toolCallId,
            toolName: this.state.toolName,
          };
        }
        return null;
      }

      // Parse <arguments> opening tag
      if (!this.state.tagBuffer) {
        const argsOpenMatch = this.buffer.match(/^[^<]*<arguments>/);
        if (argsOpenMatch) {
          this.buffer = this.buffer.slice(argsOpenMatch[0].length);
          this.state.tagBuffer = 'in-args';
          return this.processBuffer();
        }
        return null;
      }

      // Parse arguments content until closing tag
      if (this.state.tagBuffer === 'in-args') {
        const argsCloseMatch = this.buffer.match(/^(.*?)<\/arguments>/s);

        if (argsCloseMatch) {
          const argsContent = argsCloseMatch[1];
          this.buffer = this.buffer.slice(argsCloseMatch[0].length);
          this.state.tagBuffer = 'args-complete';

          // Queue tool-input-end to emit after final delta
          this.eventQueue.push({
            type: 'tool-input-end',
            toolCallId: this.state.toolCallId!,
          });

          if (argsContent) {
            this.state.argsBuffer += argsContent;
            return {
              type: 'tool-input-delta',
              toolCallId: this.state.toolCallId!,
              delta: argsContent,
            };
          }

          return this.eventQueue.shift()!;
        }

        // Emit partial arguments, keeping safety margin for closing tag
        if (this.buffer.length > ARGUMENTS_TAG_SAFETY_MARGIN) {
          const safeToEmit = this.buffer.slice(0, -ARGUMENTS_TAG_SAFETY_MARGIN);
          this.buffer = this.buffer.slice(-ARGUMENTS_TAG_SAFETY_MARGIN);
          this.state.argsBuffer += safeToEmit;
          return {
            type: 'tool-input-delta',
            toolCallId: this.state.toolCallId!,
            delta: safeToEmit,
          };
        }

        return null;
      }

      // Parse </tool_use> closing tag and complete tool call
      if (this.state.tagBuffer === 'args-complete') {
        const toolCloseMatch = this.buffer.match(/^[^<]*<\/tool_use>/);
        if (toolCloseMatch) {
          this.buffer = this.buffer.slice(toolCloseMatch[0].length);

          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(this.state.argsBuffer);
          } catch (error) {
            console.error('Failed to parse tool arguments:', this.state.argsBuffer, error);
          }

          // Save values before resetting state
          const toolCallId = this.state.toolCallId!;
          const toolName = this.state.toolName!;

          this.state = { type: 'idle' };

          return {
            type: 'tool-call-complete',
            toolCallId,
            toolName,
            arguments: args,
          };
        }
        return null;
      }

      return null;
    }

    return null;
  }
}
