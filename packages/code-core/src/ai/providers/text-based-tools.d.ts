/**
 * Text-based Tool Calling System
 * Enables Vercel AI SDK tools to work with Claude Agent SDK
 * by converting tool calls to/from XML text format
 */
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
export type ParsedContentBlock = {
    type: 'text';
    text: string;
} | {
    type: 'tool_use';
    toolName: string;
    toolCallId: string;
    arguments: Record<string, unknown>;
};
/**
 * Convert Vercel AI SDK tools to XML description for system prompt
 */
export declare function generateToolsSystemPrompt(tools: Record<string, ToolDefinition>): string;
/**
 * Parse XML-formatted tool calls from Claude's response
 */
export declare function parseToolCalls(text: string): ParsedToolCall[];
/**
 * Parse content blocks (text and tool calls) from Claude's response
 * Maintains order of text and tool calls
 */
export declare function parseContentBlocks(text: string): ParsedContentBlock[];
/**
 * Format tool result for sending back to Claude
 */
export declare function formatToolResult(toolCallId: string, result: unknown, isError?: boolean): string;
//# sourceMappingURL=text-based-tools.d.ts.map