/**
 * Streaming Service
 * Backend service for AI streaming - used by tRPC subscription
 *
 * Architecture:
 * - Loads session data from database
 * - Builds message context for AI
 * - Streams AI response
 * - Saves results to database
 * - Emits events to subscription observer
 *
 * This service is called by message.streamResponse subscription procedure
 */
import { observable } from '@trpc/server/observable';
import { createAIStream, getSystemStatus, buildSystemStatusFromMetadata, injectSystemStatusToOutput, buildSystemPrompt, } from '@sylphx/code-core';
import { processStream } from '@sylphx/code-core';
import { getProvider } from '@sylphx/code-core';
import { buildTodoContext } from '@sylphx/code-core';
import { DEFAULT_AGENT_ID } from '@sylphx/code-core';
/**
 * Stream AI response as Observable<StreamEvent>
 *
 * This function:
 * 1. Loads session from database
 * 2. Adds user message to session
 * 3. Builds message context for AI
 * 4. Streams AI response
 * 5. Emits events to observer
 * 6. Saves final result to database
 */
export function streamAIResponse(opts) {
    return observable((observer) => {
        let aborted = false;
        // Async execution wrapped in promise
        (async () => {
            try {
                const { sessionRepository, aiConfig, sessionId: inputSessionId, agentId: inputAgentId, provider: inputProvider, model: inputModel, userMessage, attachments = [], abortSignal, } = opts;
                // 1. Handle session creation if sessionId is null
                let sessionId = inputSessionId;
                let isNewSession = false;
                if (!sessionId) {
                    // Create new session
                    if (!inputProvider || !inputModel) {
                        observer.error(new Error('Provider and model required when creating new session'));
                        return;
                    }
                    const providerConfig = aiConfig?.providers?.[inputProvider];
                    if (!providerConfig) {
                        observer.next({
                            type: 'error',
                            error: '[ERROR] Provider not configured\\n\\nPlease configure your provider using settings.',
                        });
                        observer.complete();
                        return;
                    }
                    // Create session in database
                    const agentId = inputAgentId || DEFAULT_AGENT_ID;
                    const newSession = await sessionRepository.createSession(inputProvider, inputModel, agentId);
                    sessionId = newSession.id;
                    isNewSession = true;
                    // Emit session-created event
                    observer.next({
                        type: 'session-created',
                        sessionId: sessionId,
                        provider: inputProvider,
                        model: inputModel,
                    });
                }
                // 2. Load session from database
                const session = await sessionRepository.getSessionById(sessionId);
                if (!session) {
                    observer.error(new Error('Session not found'));
                    return;
                }
                // 2. Check AI configuration
                const provider = session.provider;
                const modelName = session.model;
                const providerConfig = aiConfig?.providers?.[provider];
                if (!providerConfig) {
                    observer.next({
                        type: 'error',
                        error: '[ERROR] Provider not configured\\n\\nPlease configure your provider using the /provider command.',
                    });
                    observer.complete();
                    return;
                }
                const providerInstance = getProvider(provider);
                if (!providerInstance.isConfigured(providerConfig)) {
                    observer.next({
                        type: 'error',
                        error: `[ERROR] ${providerInstance.name} is not properly configured\\n\\nPlease check your settings with the /provider command.`,
                    });
                    observer.complete();
                    return;
                }
                // 3. Add user message to session (with system status + attachments)
                const systemStatus = getSystemStatus();
                const messageId = await sessionRepository.addMessage(sessionId, 'user', [{ type: 'text', content: userMessage, status: 'completed' }], // MessagePart schema
                attachments, undefined, undefined, {
                    cpu: systemStatus.cpu,
                    memory: systemStatus.memory,
                }, session.todos // Capture current todos for this message
                );
                // 4. Reload session to get updated messages
                const updatedSession = await sessionRepository.getSessionById(sessionId);
                if (!updatedSession) {
                    observer.error(new Error('Session not found after adding message'));
                    return;
                }
                // 5. Build ModelMessage[] for AI (same logic as useChat.ts)
                const messages = await Promise.all(updatedSession.messages.map(async (msg) => {
                    if (msg.role === 'user') {
                        const contentParts = [];
                        // Inject system status from metadata
                        if (msg.metadata) {
                            const systemStatusString = buildSystemStatusFromMetadata({
                                timestamp: new Date(msg.timestamp).toISOString(),
                                cpu: msg.metadata.cpu || 'N/A',
                                memory: msg.metadata.memory || 'N/A',
                            });
                            contentParts.push({ type: 'text', text: systemStatusString });
                        }
                        // Inject todo context from snapshot
                        if (msg.todoSnapshot && msg.todoSnapshot.length > 0) {
                            const todoContext = buildTodoContext(msg.todoSnapshot);
                            contentParts.push({ type: 'text', text: todoContext });
                        }
                        // Add message content
                        msg.content.forEach((part) => {
                            if (part.type === 'text' && part.content) {
                                contentParts.push({ type: 'text', text: part.content });
                            }
                        });
                        // Add file attachments
                        if (msg.attachments && msg.attachments.length > 0) {
                            for (const attachment of msg.attachments) {
                                const fs = await import('node:fs/promises');
                                try {
                                    const content = await fs.readFile(attachment.path, 'utf-8');
                                    contentParts.push({
                                        type: 'file',
                                        data: content,
                                        mimeType: 'text/plain',
                                    });
                                }
                                catch (error) {
                                    console.error(`Failed to read attachment: ${attachment.path}`, error);
                                }
                            }
                        }
                        return { role: msg.role, content: contentParts };
                    }
                    else {
                        // Assistant message
                        const contentParts = msg.content.flatMap((part) => {
                            switch (part.type) {
                                case 'text':
                                    return [{ type: 'text', text: part.content }];
                                case 'reasoning':
                                    return [{ type: 'reasoning', text: part.content }];
                                case 'tool': {
                                    const parts = [
                                        {
                                            type: 'tool-call',
                                            toolCallId: part.toolId,
                                            toolName: part.name,
                                            input: part.args,
                                        },
                                    ];
                                    if (part.result !== undefined) {
                                        parts.push({
                                            type: 'tool-result',
                                            toolCallId: part.toolId,
                                            toolName: part.name,
                                            output: part.result,
                                        });
                                    }
                                    return parts;
                                }
                                case 'error':
                                    return [{ type: 'text', text: `[Error: ${part.error}]` }];
                                default:
                                    return [];
                            }
                        });
                        // Add status annotation
                        if (msg.status === 'abort') {
                            contentParts.push({
                                type: 'text',
                                text: '[This response was aborted by the user]',
                            });
                        }
                        else if (msg.status === 'error') {
                            contentParts.push({
                                type: 'text',
                                text: '[This response ended with an error]',
                            });
                        }
                        return { role: msg.role, content: contentParts };
                    }
                }));
                // 6. Determine agentId and build system prompt
                // STATELESS: Use explicit parameters from AppContext
                const agentId = inputAgentId || session.agentId || DEFAULT_AGENT_ID;
                const agents = opts.appContext.agentManager.getAll();
                const enabledRuleIds = session.enabledRuleIds || [];
                const enabledRules = opts.appContext.ruleManager.getEnabled(enabledRuleIds);
                const systemPrompt = buildSystemPrompt(agentId, agents, enabledRules);
                // 7. Create AI model
                const model = providerInstance.createClient(providerConfig, modelName);
                // 8. Create AI stream with system prompt
                const stream = createAIStream({
                    model,
                    messages,
                    system: systemPrompt,
                    ...(abortSignal ? { abortSignal } : {}),
                    onTransformToolResult: (output, toolName) => {
                        const systemStatus = getSystemStatus();
                        return injectSystemStatusToOutput(output, systemStatus);
                    },
                });
                // 9. Create assistant message in database (status: active)
                const assistantMessageId = await sessionRepository.addMessage(sessionId, 'assistant', [], // Empty content initially
                undefined, undefined, undefined, undefined, undefined, 'active');
                // 9.1. Emit assistant message created event
                observer.next({ type: 'assistant-message-created', messageId: assistantMessageId });
                // 10. Process stream and emit events
                const callbacks = {
                    onTextStart: () => observer.next({ type: 'text-start' }),
                    onTextDelta: (text) => observer.next({ type: 'text-delta', text }),
                    onTextEnd: () => observer.next({ type: 'text-end' }),
                    onReasoningStart: () => observer.next({ type: 'reasoning-start' }),
                    onReasoningDelta: (text) => observer.next({ type: 'reasoning-delta', text }),
                    onReasoningEnd: (duration) => observer.next({ type: 'reasoning-end', duration }),
                    onToolCall: (toolCallId, toolName, args) => observer.next({ type: 'tool-call', toolCallId, toolName, args }),
                    onToolResult: (toolCallId, toolName, result, duration) => observer.next({ type: 'tool-result', toolCallId, toolName, result, duration }),
                    onToolError: (toolCallId, toolName, error, duration) => observer.next({ type: 'tool-error', toolCallId, toolName, error, duration }),
                    onAbort: () => {
                        aborted = true;
                        observer.next({ type: 'abort' });
                    },
                    onError: (error) => {
                        observer.next({ type: 'error', error });
                    },
                };
                const result = await processStream(stream, callbacks);
                // 11. Save final message to database
                await sessionRepository.updateMessageParts(assistantMessageId, result.messageParts);
                await sessionRepository.updateMessageStatus(assistantMessageId, aborted ? 'abort' : result.usage ? 'completed' : 'error', result.finishReason);
                if (result.usage) {
                    await sessionRepository.updateMessageUsage(assistantMessageId, result.usage);
                }
                // 12. Generate title if this is a new session (first message)
                if (isNewSession && !aborted && result.usage) {
                    try {
                        // Import title generation utility
                        const { generateSessionTitleWithStreaming } = await import('../../utils/session-title.js');
                        const { getProvider } = await import('../../providers/index.js');
                        // Get provider config
                        const provider = session.provider;
                        const modelName = session.model;
                        const providerConfig = aiConfig?.providers?.[provider];
                        if (providerConfig) {
                            const providerInstance = getProvider(provider);
                            // Only generate title if provider is configured
                            if (providerInstance.isConfigured(providerConfig)) {
                                observer.next({ type: 'session-title-start' });
                                const finalTitle = await generateSessionTitleWithStreaming(userMessage, provider, modelName, providerConfig, (chunk) => {
                                    observer.next({ type: 'session-title-delta', text: chunk });
                                });
                                // Update session title in database
                                await sessionRepository.updateSession(sessionId, { title: finalTitle });
                                observer.next({ type: 'session-title-complete', title: finalTitle });
                            }
                        }
                    }
                    catch (error) {
                        // Silently fail title generation - not critical
                        console.error('[Title Generation] Error:', error);
                    }
                }
                // 13. Emit complete event
                observer.next({
                    type: 'complete',
                    usage: result.usage,
                    finishReason: result.finishReason,
                });
                observer.complete();
            }
            catch (error) {
                observer.next({
                    type: 'error',
                    error: error instanceof Error ? error.message : String(error),
                });
                observer.complete();
            }
        })();
        // Cleanup function
        return () => {
            aborted = true;
        };
    });
}
//# sourceMappingURL=streaming.service.js.map