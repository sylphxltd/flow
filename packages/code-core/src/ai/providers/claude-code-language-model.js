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
import { query } from '@anthropic-ai/claude-agent-sdk';
import { generateToolsSystemPrompt, parseContentBlocks, formatToolResult, } from './text-based-tools.js';
import { StreamingXMLParser } from './streaming-xml-parser.js';
// All Claude Code built-in tools to disable
const CLAUDE_CODE_BUILTIN_TOOLS = [
    'Task',
    'Bash',
    'Glob',
    'Grep',
    'ExitPlanMode',
    'Read',
    'Edit',
    'Write',
    'NotebookEdit',
    'WebFetch',
    'TodoWrite',
    'WebSearch',
    'BashOutput',
    'KillShell',
    'Skill',
    'SlashCommand',
];
export class ClaudeCodeLanguageModel {
    specificationVersion = 'v2';
    provider = 'claude-code';
    modelId;
    constructor(config) {
        this.modelId = config.modelId;
    }
    get supportedUrls() {
        // Claude supports various image formats
        return {
            'image/*': [/.*/],
        };
    }
    /**
     * Convert tools from Vercel AI SDK format to our internal format
     */
    convertTools(tools) {
        if (!tools || tools.length === 0) {
            return undefined;
        }
        const toolsMap = {};
        for (const tool of tools) {
            if (typeof tool !== 'object' || !tool || !('name' in tool))
                continue;
            // Vercel AI SDK uses 'inputSchema' field for the JSON Schema
            const parameters = ('inputSchema' in tool && tool.inputSchema) ||
                ('parameters' in tool && tool.parameters) ||
                { type: 'object', properties: {} };
            toolsMap[String(tool.name)] = {
                type: 'function',
                name: String(tool.name),
                description: 'description' in tool ? String(tool.description) : undefined,
                parameters: parameters,
            };
        }
        return toolsMap;
    }
    /**
     * Simple message fingerprint for detecting changes
     * Returns a hash of role + first 100 chars of text content
     */
    getMessageFingerprint(message) {
        const content = Array.isArray(message.content) ? message.content : [message.content];
        const textParts = content
            .filter((part) => typeof part === 'object' && part.type === 'text')
            .map((part) => part.text)
            .join('');
        // Simple fingerprint: role + first 100 chars
        const preview = textParts.slice(0, 100);
        return `${message.role}:${preview}`;
    }
    /**
     * Detect if message history has been rewound or modified
     * Returns true if inconsistency detected
     */
    detectMessageInconsistency(messages, lastProcessedCount, lastMessageFingerprints) {
        // If no fingerprints provided, can't detect inconsistency
        if (!lastMessageFingerprints || lastMessageFingerprints.length === 0) {
            return false;
        }
        // Check if message count decreased (rewind)
        if (messages.length < lastProcessedCount) {
            return true;
        }
        // Check if fingerprints of previously sent messages match
        const checkCount = Math.min(lastProcessedCount, lastMessageFingerprints.length, messages.length);
        for (let i = 0; i < checkCount; i++) {
            const currentFingerprint = this.getMessageFingerprint(messages[i]);
            if (currentFingerprint !== lastMessageFingerprints[i]) {
                return true; // Message was modified
            }
        }
        return false;
    }
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
    convertMessagesToString(options, isResuming) {
        const promptParts = [];
        const messages = options.prompt;
        // Extract provider options
        const providerOptions = options.providerOptions?.['claude-code'];
        const lastProcessedCount = providerOptions && 'lastProcessedMessageCount' in providerOptions &&
            typeof providerOptions.lastProcessedMessageCount === 'number'
            ? providerOptions.lastProcessedMessageCount
            : undefined;
        const lastMessageFingerprints = providerOptions && 'messageFingerprints' in providerOptions &&
            Array.isArray(providerOptions.messageFingerprints)
            ? providerOptions.messageFingerprints
            : undefined;
        // Detect if messages were rewound or modified
        let shouldForceNewSession = false;
        if (isResuming && lastProcessedCount !== undefined) {
            const inconsistent = this.detectMessageInconsistency(messages, lastProcessedCount, lastMessageFingerprints);
            if (inconsistent) {
                // Message history changed - can't safely resume, force new session
                shouldForceNewSession = true;
                isResuming = false; // Treat as new session
            }
        }
        // Determine which messages to process
        let messagesToProcess = messages;
        if (isResuming) {
            if (lastProcessedCount !== undefined) {
                // Skip already processed messages
                messagesToProcess = messages.slice(lastProcessedCount);
            }
            else {
                // No tracking info - only send last user message and any tool results after it
                // This is safer than sending full history which would duplicate
                const lastUserIndex = messages.findLastIndex((m) => m.role === 'user');
                if (lastUserIndex !== -1) {
                    messagesToProcess = messages.slice(lastUserIndex);
                }
            }
        }
        // Convert messages to prompt string
        for (const message of messagesToProcess) {
            if (message.role === 'user') {
                // Handle both array and non-array content
                const content = Array.isArray(message.content) ? message.content : [message.content];
                const textParts = content
                    .filter((part) => typeof part === 'object' && part.type === 'text')
                    .map((part) => part.text);
                if (textParts.length > 0) {
                    promptParts.push(textParts.join('\n'));
                }
            }
            else if (message.role === 'assistant') {
                // Handle both array and non-array content
                const content = Array.isArray(message.content) ? message.content : [message.content];
                const textParts = content
                    .filter((part) => typeof part === 'object' && part.type === 'text')
                    .map((part) => part.text);
                if (textParts.length > 0) {
                    // Prefix assistant messages for context
                    promptParts.push(`Previous assistant response: ${textParts.join('\n')}`);
                }
            }
            else if (message.role === 'tool') {
                // Convert tool results to XML format for Claude
                const content = Array.isArray(message.content) ? message.content : [message.content];
                const toolResults = [];
                for (const part of content) {
                    if (typeof part === 'object' && 'toolCallId' in part && 'output' in part) {
                        // Check if it's an error
                        const isError = part.output &&
                            typeof part.output === 'object' &&
                            'type' in part.output &&
                            (part.output.type === 'error-text' || part.output.type === 'error-json');
                        let resultValue;
                        if (part.output && typeof part.output === 'object' && 'value' in part.output) {
                            resultValue = part.output.value;
                        }
                        else {
                            resultValue = part.output;
                        }
                        toolResults.push(formatToolResult(part.toolCallId, resultValue, isError));
                    }
                }
                if (toolResults.length > 0) {
                    promptParts.push(toolResults.join('\n\n'));
                }
            }
        }
        // Generate fingerprints for all messages (for next call's consistency check)
        const messageFingerprints = messages.map((msg) => this.getMessageFingerprint(msg));
        return {
            prompt: promptParts.join('\n\n'),
            shouldForceNewSession,
            messageFingerprints,
        };
    }
    /**
     * Extract system prompt from messages
     */
    extractSystemPrompt(options) {
        const systemMessages = options.prompt.filter((msg) => msg.role === 'system');
        if (systemMessages.length === 0) {
            return undefined;
        }
        const systemTexts = systemMessages
            .flatMap((msg) => {
            // Handle both array and non-array content
            const content = Array.isArray(msg.content) ? msg.content : [msg.content];
            return content
                .filter((part) => typeof part === 'object' && part.type === 'text')
                .map((part) => part.text);
        })
            .join('\n');
        return systemTexts || undefined;
    }
    /**
     * Build query options from call options
     */
    buildQueryOptions(options, tools, includePartialMessages = false) {
        // Build system prompt
        let systemPrompt = this.extractSystemPrompt(options) || '';
        // Add tools description to system prompt if tools are provided
        if (tools && Object.keys(tools).length > 0) {
            const toolsPrompt = generateToolsSystemPrompt(tools);
            systemPrompt = systemPrompt ? `${systemPrompt}\n\n${toolsPrompt}` : toolsPrompt;
        }
        // Build query options
        const queryOptions = {
            model: this.modelId,
            settingSources: [],
            disallowedTools: CLAUDE_CODE_BUILTIN_TOOLS,
        };
        if (systemPrompt) {
            queryOptions.systemPrompt = systemPrompt;
        }
        if (includePartialMessages) {
            queryOptions.includePartialMessages = true;
        }
        // Extract provider-specific options
        const providerOptions = options.providerOptions?.['claude-code'];
        // Add maxThinkingTokens from providerOptions if provided
        if (providerOptions &&
            'maxThinkingTokens' in providerOptions &&
            typeof providerOptions.maxThinkingTokens === 'number') {
            queryOptions.maxThinkingTokens = providerOptions.maxThinkingTokens;
        }
        // Add sessionId (resume) from providerOptions if provided
        // This allows reusing Claude Code sessions instead of creating new ones each time
        if (providerOptions &&
            'sessionId' in providerOptions &&
            typeof providerOptions.sessionId === 'string') {
            queryOptions.resume = providerOptions.sessionId;
        }
        return { queryOptions, systemPrompt };
    }
    /**
     * Extract usage tokens from result event
     */
    extractUsage(event) {
        if (!event ||
            typeof event !== 'object' ||
            !('usage' in event) ||
            !event.usage ||
            typeof event.usage !== 'object') {
            return { inputTokens: 0, outputTokens: 0 };
        }
        const usage = event.usage;
        const inputTokens = (typeof usage.input_tokens === 'number' ? usage.input_tokens : 0) +
            (typeof usage.cache_creation_input_tokens === 'number'
                ? usage.cache_creation_input_tokens
                : 0) +
            (typeof usage.cache_read_input_tokens === 'number' ? usage.cache_read_input_tokens : 0);
        const outputTokens = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0;
        return { inputTokens, outputTokens };
    }
    /**
     * Check and handle result errors
     */
    handleResultError(event) {
        if (!event || typeof event !== 'object' || !('subtype' in event)) {
            return;
        }
        if (event.subtype === 'error_max_turns') {
            throw new Error('Claude Code reached maximum turns limit');
        }
        else if (event.subtype === 'error_during_execution') {
            throw new Error('Error occurred during Claude Code execution');
        }
    }
    async doGenerate(options) {
        try {
            // Convert tools and build query options
            const tools = this.convertTools(options.tools || []);
            const { queryOptions } = this.buildQueryOptions(options, tools);
            // Check if resuming existing session
            const isResuming = !!queryOptions.resume;
            // Convert messages - will skip already processed messages if resuming
            // Also detects message inconsistencies (rewind/edit)
            const { prompt: promptString, shouldForceNewSession, messageFingerprints } = this.convertMessagesToString(options, isResuming);
            // If inconsistency detected, clear resume to create new session
            if (shouldForceNewSession) {
                delete queryOptions.resume;
            }
            // Execute query
            const queryResult = query({
                prompt: promptString,
                options: queryOptions,
            });
            // Collect results
            const contentParts = [];
            let inputTokens = 0;
            let outputTokens = 0;
            let finishReason = 'stop';
            let sessionId;
            for await (const event of queryResult) {
                // Extract session ID from any event (all events have session_id)
                if ('session_id' in event && typeof event.session_id === 'string') {
                    sessionId = event.session_id;
                }
                if (event.type === 'assistant') {
                    // Extract content from assistant message
                    const content = event.message.content;
                    for (const block of content) {
                        if (block.type === 'thinking') {
                            // Handle thinking/reasoning blocks
                            contentParts.push({
                                type: 'reasoning',
                                reasoning: block.thinking,
                            });
                        }
                        else if (block.type === 'text') {
                            // Parse text for tool calls if tools are available
                            if (tools && Object.keys(tools).length > 0) {
                                const parsedBlocks = parseContentBlocks(block.text);
                                for (const parsedBlock of parsedBlocks) {
                                    if (parsedBlock.type === 'text') {
                                        contentParts.push({
                                            type: 'text',
                                            text: parsedBlock.text,
                                        });
                                    }
                                    else if (parsedBlock.type === 'tool_use') {
                                        contentParts.push({
                                            type: 'tool-call',
                                            toolCallId: parsedBlock.toolCallId,
                                            toolName: parsedBlock.toolName,
                                            input: JSON.stringify(parsedBlock.arguments),
                                        });
                                        finishReason = 'tool-calls';
                                    }
                                }
                            }
                            else {
                                // No tools, just add text
                                contentParts.push({
                                    type: 'text',
                                    text: block.text,
                                });
                            }
                        }
                    }
                    // Check stop reason
                    if (event.message.stop_reason === 'end_turn') {
                        // Keep tool-calls finish reason if we detected tool calls
                        if (finishReason !== 'tool-calls') {
                            finishReason = 'stop';
                        }
                    }
                    else if (event.message.stop_reason === 'max_tokens') {
                        finishReason = 'length';
                    }
                }
                else if (event.type === 'result') {
                    this.handleResultError(event);
                    const usage = this.extractUsage(event);
                    inputTokens = usage.inputTokens;
                    outputTokens = usage.outputTokens;
                }
            }
            // Calculate total message count for next call
            const totalMessageCount = options.prompt.length;
            // Build response headers with session tracking info
            const headers = {};
            if (sessionId) {
                headers['x-claude-code-session-id'] = sessionId;
                headers['x-claude-code-message-count'] = String(totalMessageCount);
                // Include fingerprints for next call's consistency check
                headers['x-claude-code-message-fingerprints'] = JSON.stringify(messageFingerprints);
            }
            // Add warning if session was force-created due to inconsistency
            if (shouldForceNewSession) {
                headers['x-claude-code-session-forced-new'] = 'true';
            }
            return {
                content: contentParts,
                finishReason,
                usage: {
                    inputTokens: inputTokens,
                    outputTokens: outputTokens,
                    totalTokens: inputTokens + outputTokens,
                },
                warnings: shouldForceNewSession
                    ? [
                        'Message history inconsistency detected (rewind or edit). Created new Claude Code session.',
                    ]
                    : [],
                response: {
                    headers,
                },
            };
        }
        catch (error) {
            // Log detailed error information
            console.error('Claude Code error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                modelId: this.modelId,
            });
            throw new Error(`Claude Code execution failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    doStream(options) {
        try {
            // Convert tools and build query options
            const tools = this.convertTools(options.tools || []);
            const { queryOptions } = this.buildQueryOptions(options, tools, true);
            // Check if resuming existing session
            const isResuming = !!queryOptions.resume;
            // Convert messages - will skip already processed messages if resuming
            // Also detects message inconsistencies (rewind/edit)
            const { prompt: promptString, shouldForceNewSession, messageFingerprints } = this.convertMessagesToString(options, isResuming);
            // If inconsistency detected, clear resume to create new session
            if (shouldForceNewSession) {
                delete queryOptions.resume;
            }
            // Calculate total message count for metadata
            const totalMessageCount = options.prompt.length;
            // Execute query
            const queryResult = query({
                prompt: promptString,
                options: queryOptions,
            });
            // Bind helper methods to preserve `this` context
            const handleResultError = this.handleResultError.bind(this);
            const extractUsage = this.extractUsage.bind(this);
            // Create streaming response
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        let inputTokens = 0;
                        let outputTokens = 0;
                        let finishReason = 'stop';
                        let hasStartedText = false;
                        let hasEmittedTextEnd = false;
                        let sessionId;
                        // Track thinking block indices for streaming
                        const thinkingBlockIndices = new Set();
                        // XML parser for streaming tool call detection
                        const xmlParser = tools && Object.keys(tools).length > 0 ? new StreamingXMLParser() : null;
                        for await (const event of queryResult) {
                            // Extract session ID from any event (all events have session_id)
                            if ('session_id' in event && typeof event.session_id === 'string') {
                                sessionId = event.session_id;
                            }
                            // Handle streaming events from Anthropic SDK
                            if (event.type === 'stream_event') {
                                const streamEvent = event.event;
                                // Handle content block start (thinking or text)
                                if (streamEvent.type === 'content_block_start') {
                                    if (streamEvent.content_block.type === 'thinking') {
                                        // Start of thinking block - emit reasoning-start
                                        thinkingBlockIndices.add(streamEvent.index);
                                        controller.enqueue({
                                            type: 'reasoning-start',
                                            id: `reasoning-${streamEvent.index}`,
                                        });
                                    }
                                }
                                // Handle content block deltas
                                else if (streamEvent.type === 'content_block_delta') {
                                    if (streamEvent.delta.type === 'thinking_delta') {
                                        // Thinking delta - emit reasoning-delta
                                        controller.enqueue({
                                            type: 'reasoning-delta',
                                            id: `reasoning-${streamEvent.index}`,
                                            delta: streamEvent.delta.thinking,
                                        });
                                    }
                                    else if (streamEvent.delta.type === 'text_delta') {
                                        // Text delta - parse through XML parser if tools available
                                        if (xmlParser) {
                                            // All text should be wrapped in <text> tags per system prompt
                                            for (const xmlEvent of xmlParser.processChunk(streamEvent.delta.text)) {
                                                if (xmlEvent.type === 'text-start') {
                                                    if (!hasStartedText) {
                                                        controller.enqueue({
                                                            type: 'text-start',
                                                            id: 'text-0',
                                                        });
                                                        hasStartedText = true;
                                                    }
                                                }
                                                else if (xmlEvent.type === 'text-delta') {
                                                    controller.enqueue({
                                                        type: 'text-delta',
                                                        id: 'text-0',
                                                        delta: xmlEvent.delta,
                                                    });
                                                }
                                                else if (xmlEvent.type === 'tool-input-start') {
                                                    controller.enqueue({
                                                        type: 'tool-input-start',
                                                        id: xmlEvent.toolCallId,
                                                        toolName: xmlEvent.toolName,
                                                    });
                                                }
                                                else if (xmlEvent.type === 'tool-input-delta') {
                                                    controller.enqueue({
                                                        type: 'tool-input-delta',
                                                        id: xmlEvent.toolCallId,
                                                        delta: xmlEvent.delta,
                                                    });
                                                }
                                                else if (xmlEvent.type === 'tool-input-end') {
                                                    controller.enqueue({
                                                        type: 'tool-input-end',
                                                        id: xmlEvent.toolCallId,
                                                    });
                                                }
                                                else if (xmlEvent.type === 'tool-call-complete') {
                                                    controller.enqueue({
                                                        type: 'tool-call',
                                                        toolCallId: xmlEvent.toolCallId,
                                                        toolName: xmlEvent.toolName,
                                                        input: JSON.stringify(xmlEvent.arguments),
                                                    });
                                                    finishReason = 'tool-calls';
                                                }
                                            }
                                        }
                                        else {
                                            // No tools - emit text directly
                                            if (!hasStartedText) {
                                                controller.enqueue({
                                                    type: 'text-start',
                                                    id: 'text-0',
                                                });
                                                hasStartedText = true;
                                            }
                                            controller.enqueue({
                                                type: 'text-delta',
                                                id: 'text-0',
                                                delta: streamEvent.delta.text,
                                            });
                                        }
                                    }
                                }
                                // Handle content block stop
                                else if (streamEvent.type === 'content_block_stop') {
                                    if (thinkingBlockIndices.has(streamEvent.index)) {
                                        // End of thinking block - emit reasoning-end
                                        controller.enqueue({
                                            type: 'reasoning-end',
                                            id: `reasoning-${streamEvent.index}`,
                                        });
                                        thinkingBlockIndices.delete(streamEvent.index);
                                    }
                                    else if (hasStartedText) {
                                        // End of text block - flush XML parser if tools are available
                                        if (xmlParser) {
                                            for (const xmlEvent of xmlParser.flush()) {
                                                if (xmlEvent.type === 'text-delta') {
                                                    controller.enqueue({
                                                        type: 'text-delta',
                                                        id: 'text-0',
                                                        delta: xmlEvent.delta,
                                                    });
                                                }
                                                else if (xmlEvent.type === 'text-end') {
                                                    controller.enqueue({
                                                        type: 'text-end',
                                                        id: 'text-0',
                                                    });
                                                    hasEmittedTextEnd = true;
                                                }
                                                else if (xmlEvent.type === 'tool-input-delta') {
                                                    controller.enqueue({
                                                        type: 'tool-input-delta',
                                                        id: xmlEvent.toolCallId,
                                                        delta: xmlEvent.delta,
                                                    });
                                                }
                                                else if (xmlEvent.type === 'tool-input-end') {
                                                    controller.enqueue({
                                                        type: 'tool-input-end',
                                                        id: xmlEvent.toolCallId,
                                                    });
                                                }
                                                else if (xmlEvent.type === 'tool-call-complete') {
                                                    controller.enqueue({
                                                        type: 'tool-call',
                                                        toolCallId: xmlEvent.toolCallId,
                                                        toolName: xmlEvent.toolName,
                                                        input: JSON.stringify(xmlEvent.arguments),
                                                    });
                                                    finishReason = 'tool-calls';
                                                }
                                            }
                                        }
                                        // Emit text-end if flush didn't emit it
                                        if (!hasEmittedTextEnd) {
                                            controller.enqueue({
                                                type: 'text-end',
                                                id: 'text-0',
                                            });
                                            hasEmittedTextEnd = true;
                                        }
                                    }
                                }
                            }
                            else if (event.type === 'assistant') {
                                // Extract content from assistant message
                                // Note: With includePartialMessages: true, content has already been streamed
                                // via stream_event. We only need to handle final metadata here.
                                const content = event.message.content;
                                for (const block of content) {
                                    if (block.type === 'thinking') {
                                        // Thinking blocks are handled via stream_event
                                    }
                                    else if (block.type === 'text') {
                                        // Text has already been streamed via stream_event with includePartialMessages: true
                                        // Skip re-emitting to avoid duplication
                                    }
                                }
                                // Check stop reason
                                if (event.message.stop_reason === 'end_turn') {
                                    // Keep tool-calls finish reason if we detected tool calls
                                    if (finishReason !== 'tool-calls') {
                                        finishReason = 'stop';
                                    }
                                }
                                else if (event.message.stop_reason === 'max_tokens') {
                                    finishReason = 'length';
                                }
                            }
                            else if (event.type === 'result') {
                                // Check for errors
                                try {
                                    handleResultError(event);
                                }
                                catch (error) {
                                    controller.error(error);
                                    return;
                                }
                                // Extract usage
                                const usage = extractUsage(event);
                                inputTokens = usage.inputTokens;
                                outputTokens = usage.outputTokens;
                            }
                        }
                        // Emit text-end if we started text but haven't emitted text-end yet
                        if (hasStartedText && !hasEmittedTextEnd) {
                            controller.enqueue({
                                type: 'text-end',
                                id: 'text-0',
                            });
                        }
                        // Emit finish
                        controller.enqueue({
                            type: 'finish',
                            finishReason,
                            usage: {
                                inputTokens: inputTokens,
                                outputTokens: outputTokens,
                                totalTokens: inputTokens + outputTokens,
                            },
                            providerMetadata: sessionId
                                ? {
                                    'claude-code': {
                                        sessionId,
                                        messageCount: totalMessageCount,
                                        messageFingerprints: messageFingerprints,
                                        forcedNewSession: shouldForceNewSession,
                                    },
                                }
                                : {},
                        });
                        controller.close();
                    }
                    catch (error) {
                        controller.error(error);
                    }
                },
            });
            return {
                stream,
                response: { headers: {} },
                warnings: [],
            };
        }
        catch (error) {
            throw new Error(`Claude Code streaming failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=claude-code-language-model.js.map