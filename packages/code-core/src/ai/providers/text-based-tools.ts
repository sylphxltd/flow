/**
 * Text-based Tool Calling System
 * Enables Vercel AI SDK tools to work with Claude Agent SDK
 * by converting tool calls to/from XML text format
 */

import type { LanguageModelV2ToolChoice } from '@ai-sdk/provider';

/**
 * Tool definition from Vercel AI SDK
 */
export interface ToolDefinition {
  type: 'function';
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * Parsed tool call from Claude's text response
 */
export interface ParsedToolCall {
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown>;
}

/**
 * Parsed content block (text or tool call)
 */
export type ParsedContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; toolName: string; toolCallId: string; arguments: Record<string, unknown> };

/**
 * Convert Vercel AI SDK tools to XML description for system prompt
 */
export function generateToolsSystemPrompt(tools: Record<string, ToolDefinition>): string {
  const toolDescriptions = Object.entries(tools)
    .map(([name, tool]) => {
      const params = tool.parameters.properties || {};
      const required = tool.parameters.required || [];

      const paramLines = Object.entries(params).map(([paramName, paramSchema]: [string, any]) => {
        const isRequired = required.includes(paramName);
        const type = paramSchema.type || 'any';
        const description = paramSchema.description || '';
        const requiredTag = isRequired ? ', **REQUIRED**' : ', optional';
        return `  - ${paramName} (${type}${requiredTag}): ${description}`;
      });

      return `## ${name}

${tool.description || 'No description available'}

Parameters:
${paramLines.length > 0 ? paramLines.join('\n') : '  (no parameters)'}`;
    })
    .join('\n\n');

  return `# Available Tools

You have access to the following tools. To use a tool, output it in this XML format:

<tool_use>
<tool_name>ToolName</tool_name>
<tool_call_id>unique_id</tool_call_id>
<arguments>
{"param1": "value1", "param2": "value2"}
</arguments>
</tool_use>

**CRITICAL RULES**:
1. **ALWAYS wrap ALL text in <text> tags** - this is REQUIRED for every response
2. Generate a unique tool_call_id for each tool call (e.g., call_1, call_2, etc.)
3. Put arguments in valid JSON format inside <arguments> tags
4. **ALWAYS provide ALL required parameters** - never use empty object {}
5. **Infer missing parameter values from context** if not explicitly stated
6. You can call multiple tools in one response
7. You can mix text and tool calls in any order

**Example response format**:
<text>
Let me read the file first...
</text>

<tool_use>
<tool_name>Read</tool_name>
<tool_call_id>call_1</tool_call_id>
<arguments>
{"file_path": "/path/to/file.ts"}
</arguments>
</tool_use>

<text>
Now analyzing the results...
</text>

# Tools

${toolDescriptions}`;
}

/**
 * Parse XML-formatted tool calls from Claude's response
 */
export function parseToolCalls(text: string): ParsedToolCall[] {
  const toolCallRegex =
    /<tool_use>\s*<tool_name>(.*?)<\/tool_name>\s*<tool_call_id>(.*?)<\/tool_call_id>\s*<arguments>(.*?)<\/arguments>\s*<\/tool_use>/gs;

  const calls: ParsedToolCall[] = [];
  let match;

  while ((match = toolCallRegex.exec(text)) !== null) {
    try {
      calls.push({
        toolName: match[1].trim(),
        toolCallId: match[2].trim(),
        arguments: JSON.parse(match[3].trim()),
      });
    } catch (error) {
      console.error('Failed to parse tool call arguments:', match[3], error);
      // Skip invalid tool calls
    }
  }

  return calls;
}

/**
 * Parse content blocks (text and tool calls) from Claude's response
 * Maintains order of text and tool calls
 */
export function parseContentBlocks(text: string): ParsedContentBlock[] {
  const blocks: ParsedContentBlock[] = [];

  // Combined regex to match both text and tool_use blocks
  const blockRegex =
    /<text>(.*?)<\/text>|<tool_use>\s*<tool_name>(.*?)<\/tool_name>\s*<tool_call_id>(.*?)<\/tool_call_id>\s*<arguments>(.*?)<\/arguments>\s*<\/tool_use>/gs;

  let match;
  while ((match = blockRegex.exec(text)) !== null) {
    if (match[1] !== undefined) {
      // Text block
      const textContent = match[1].trim();
      if (textContent) {
        blocks.push({
          type: 'text',
          text: textContent,
        });
      }
    } else if (match[2] !== undefined) {
      // Tool use block
      try {
        blocks.push({
          type: 'tool_use',
          toolName: match[2].trim(),
          toolCallId: match[3].trim(),
          arguments: JSON.parse(match[4].trim()),
        });
      } catch (error) {
        console.error('Failed to parse tool call arguments:', match[4], error);
        // Skip invalid tool calls
      }
    }
  }

  // If no blocks were parsed and there's content, treat entire text as text block
  if (blocks.length === 0 && text.trim()) {
    blocks.push({
      type: 'text',
      text: text.trim(),
    });
  }

  return blocks;
}

/**
 * Format tool result for sending back to Claude
 */
export function formatToolResult(toolCallId: string, result: unknown, isError = false): string {
  if (isError) {
    return `<tool_result>
<tool_call_id>${toolCallId}</tool_call_id>
<error>
${typeof result === 'string' ? result : JSON.stringify(result)}
</error>
</tool_result>`;
  }

  return `<tool_result>
<tool_call_id>${toolCallId}</tool_call_id>
<content>
${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
</content>
</tool_result>`;
}
