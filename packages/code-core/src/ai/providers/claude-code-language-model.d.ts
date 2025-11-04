/**
 * Claude Code Language Model
 * Custom LanguageModelV2 implementation using Claude Agent SDK
 * Supports Vercel AI SDK tools (executed by Vercel framework via MCP delegation)
 *
 * Session Management & Message Tracking:
 * --------------------------------------
 * This provider intelligently manages Claude Code sessions to avoid duplication.
 *
 * How it works:
 * 1. Provider tracks which messages were sent to Claude Code session
 * 2. When resuming, only NEW messages are sent (avoids duplication)
 * 3. Message count is returned to caller for next request
 *
 * Usage Pattern:
 * ```typescript
 * // First call - creates new session
 * const result1 = await generateText({
 *   model: claudeCode('sonnet'),
 *   messages: [{ role: 'user', content: 'Hello' }]
 * });
 *
 * // Extract session info for reuse
 * const sessionId = result1.response.headers['x-claude-code-session-id'];
 * const messageCount = parseInt(result1.response.headers['x-claude-code-message-count'] || '0');
 * const fingerprints = JSON.parse(result1.response.headers['x-claude-code-message-fingerprints'] || '[]');
 *
 * // Second call - reuses session (provider only sends NEW messages)
 * const result2 = await generateText({
 *   model: claudeCode('sonnet'),
 *   messages: [
 *     { role: 'user', content: 'Hello' },        // Already in Claude Code session
 *     { role: 'assistant', content: 'Hi!' },     // Already in Claude Code session
 *     { role: 'user', content: 'How are you?' }  // NEW - will be sent
 *   ],
 *   providerOptions: {
 *     'claude-code': {
 *       sessionId: sessionId,                      // Resume this session
 *       lastProcessedMessageCount: messageCount,   // Skip first N messages
 *       messageFingerprints: fingerprints          // Detect rewind/edit
 *     }
 *   }
 * });
 *
 * // Check if session was force-created due to rewind/edit
 * if (result2.warnings?.length > 0) {
 *   console.log('New session created:', result2.warnings[0]);
 * }
 * ```
 *
 * For streaming (streamText):
 * ```typescript
 * const result = await streamText({ ... });
 * for await (const chunk of result.fullStream) {
 *   if (chunk.type === 'finish') {
 *     const metadata = chunk.providerMetadata?.['claude-code'];
 *     const sessionId = metadata?.sessionId;
 *     const messageCount = metadata?.messageCount;
 *     const fingerprints = metadata?.messageFingerprints;
 *     const forcedNew = metadata?.forcedNewSession;
 *     // Save these for next request
 *     if (forcedNew) {
 *       console.log('Message history changed, new session created');
 *     }
 *   }
 * }
 * ```
 *
 * Rewind / Edit Detection:
 * -------------------------
 * Provider automatically detects when message history changes:
 * - Rewind: Message count decreased (user deleted messages)
 * - Edit: Previously sent message content changed
 * - When detected: Automatically creates new session, returns warning
 * - Detection via messageFingerprints (role + first 100 chars of content)
 *
 * Fallback behavior (when lastProcessedMessageCount not provided):
 * - Provider sends only last user message + any tool results after it
 * - This is safer than sending full history which would duplicate
 * - But explicit tracking via lastProcessedMessageCount + messageFingerprints is recommended
 *
 * Key Points:
 * -----------
 * ✅ Provider handles message deduplication automatically
 * ✅ You always pass full message history to Vercel AI SDK
 * ✅ Provider internally skips messages already in Claude Code session
 * ✅ Provider detects rewind/edit and creates new session automatically
 * ✅ No need to manually track what was sent - just pass tracking info back
 * ⚠️  Session IDs are stored in ~/.claude/sessions/ by Claude Code CLI
 * 📦 Tracking data: sessionId, messageCount, messageFingerprints (all in response)
 */
import type { LanguageModelV2, LanguageModelV2CallOptions } from '@ai-sdk/provider';
export interface ClaudeCodeLanguageModelConfig {
    modelId: string;
}
export declare class ClaudeCodeLanguageModel implements LanguageModelV2 {
    readonly specificationVersion: "v2";
    readonly provider: "claude-code";
    readonly modelId: string;
    constructor(config: ClaudeCodeLanguageModelConfig);
    get supportedUrls(): Record<string, RegExp[]>;
    /**
     * Convert tools from Vercel AI SDK format to our internal format
     */
    private convertTools;
    /**
     * Simple message fingerprint for detecting changes
     * Returns a hash of role + first 100 chars of text content
     */
    private getMessageFingerprint;
    /**
     * Detect if message history has been rewound or modified
     * Returns true if inconsistency detected
     */
    private detectMessageInconsistency;
    /**
     * Convert Vercel AI SDK messages to a single string prompt
     * Handles tool results by converting them to XML format
     *
     * Session Resume Logic:
     * - When resuming a session (sessionId provided), only sends NEW messages
     * - Requires lastProcessedMessageCount in providerOptions to track what was sent
     * - Detects rewind/edit via message fingerprints
     * - If inconsistency detected, ignores resume and creates new session
     * - If lastProcessedMessageCount not provided when resuming, sends only the last user message + pending tool results
     */
    private convertMessagesToString;
    /**
     * Extract system prompt from messages
     */
    private extractSystemPrompt;
    /**
     * Build query options from call options
     */
    private buildQueryOptions;
    /**
     * Extract usage tokens from result event
     */
    private extractUsage;
    /**
     * Check and handle result errors
     */
    private handleResultError;
    doGenerate(options: LanguageModelV2CallOptions): Promise<Awaited<ReturnType<LanguageModelV2['doGenerate']>>>;
    doStream(options: LanguageModelV2CallOptions): Promise<Awaited<ReturnType<LanguageModelV2['doStream']>>>;
}
//# sourceMappingURL=claude-code-language-model.d.ts.map