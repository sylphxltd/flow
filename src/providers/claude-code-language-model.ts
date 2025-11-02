/**
 * Claude Code Language Model
 * Custom LanguageModelV2 implementation using Claude Agent SDK
 * Supports Vercel AI SDK tools (executed by Vercel framework via MCP delegation)
 */

import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
  LanguageModelV2FinishReason,
} from '@ai-sdk/provider';
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import {
  generateToolsSystemPrompt,
  parseContentBlocks,
  formatToolResult,
  type ToolDefinition,
} from './text-based-tools.js';
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

export interface ClaudeCodeLanguageModelConfig {
  modelId: string;
}

export class ClaudeCodeLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly provider = 'claude-code' as const;
  readonly modelId: string;

  private config: ClaudeCodeLanguageModelConfig;

  constructor(config: ClaudeCodeLanguageModelConfig) {
    this.config = config;
    this.modelId = config.modelId;
  }

  get supportedUrls(): Record<string, RegExp[]> {
    // Claude supports various image formats
    return {
      'image/*': [/.*/],
    };
  }

  /**
   * Convert tools from Vercel AI SDK format to our internal format
   */
  private convertTools(tools: any[]): Record<string, ToolDefinition> | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    const toolsMap: Record<string, ToolDefinition> = {};
    for (const tool of tools) {
      // Vercel AI SDK uses 'inputSchema' field for the JSON Schema
      const parameters = tool.inputSchema || tool.parameters || { type: 'object', properties: {} };

      toolsMap[tool.name] = {
        type: 'function',
        name: tool.name,
        description: tool.description,
        parameters: parameters,
      };
    }
    return toolsMap;
  }

  /**
   * Convert Vercel AI SDK messages to a single string prompt
   * Handles tool results by converting them to XML format
   */
  private convertMessagesToString(options: LanguageModelV2CallOptions): string {
    const promptParts: string[] = [];

    for (const message of options.prompt) {
      if (message.role === 'user') {
        // Handle both array and non-array content
        const content = Array.isArray(message.content) ? message.content : [message.content];
        const textParts = content
          .filter((part) => typeof part === 'object' && part.type === 'text')
          .map((part) => part.text);

        if (textParts.length > 0) {
          promptParts.push(textParts.join('\n'));
        }
      } else if (message.role === 'assistant') {
        // Handle both array and non-array content
        const content = Array.isArray(message.content) ? message.content : [message.content];
        const textParts = content
          .filter((part) => typeof part === 'object' && part.type === 'text')
          .map((part) => part.text);

        if (textParts.length > 0) {
          // Prefix assistant messages for context
          promptParts.push(`Previous assistant response: ${textParts.join('\n')}`);
        }
      } else if (message.role === 'tool') {
        // Convert tool results to XML format for Claude
        const content = Array.isArray(message.content) ? message.content : [message.content];
        const toolResults: string[] = [];

        for (const part of content) {
          if (typeof part === 'object' && 'toolCallId' in part && 'output' in part) {
            // Check if it's an error
            const isError =
              part.output &&
              typeof part.output === 'object' &&
              'type' in part.output &&
              (part.output.type === 'error-text' || part.output.type === 'error-json');

            let resultValue: unknown;
            if (part.output && typeof part.output === 'object' && 'value' in part.output) {
              resultValue = part.output.value;
            } else {
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

    return promptParts.join('\n\n');
  }

  /**
   * Extract system prompt from messages
   */
  private extractSystemPrompt(options: LanguageModelV2CallOptions): string | undefined {
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

  async doGenerate(
    options: LanguageModelV2CallOptions
  ): Promise<Awaited<ReturnType<LanguageModelV2['doGenerate']>>> {
    try {
      // Convert tools to internal format
      const tools = this.convertTools(options.tools || []);

      // Convert messages to string prompt
      const promptString = this.convertMessagesToString(options);
      let systemPrompt = this.extractSystemPrompt(options) || '';

      // Add tools description to system prompt if tools are provided
      if (tools && Object.keys(tools).length > 0) {
        const toolsPrompt = generateToolsSystemPrompt(tools);
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${toolsPrompt}` : toolsPrompt;
      }

      // Build query options
      const queryOptions: Options = {
        model: this.modelId,
        // Disable all Claude Code built-in tools
        settingSources: [],
        disallowedTools: CLAUDE_CODE_BUILTIN_TOOLS,
      };

      if (systemPrompt) {
        queryOptions.systemPrompt = systemPrompt;
      }

      // Add maxThinkingTokens from providerOptions if provided
      const providerOptions = options.providerOptions?.['claude-code'] as Record<string, any> | undefined;
      if (providerOptions?.maxThinkingTokens) {
        queryOptions.maxThinkingTokens = providerOptions.maxThinkingTokens as number;
      }

      // Execute query
      const queryResult = query({
        prompt: promptString,
        options: queryOptions,
      });

      // Collect results
      const contentParts: any[] = [];
      let inputTokens = 0;
      let outputTokens = 0;
      let finishReason: LanguageModelV2FinishReason = 'stop';

      for await (const event of queryResult) {
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
            } else if (block.type === 'text') {
              // Parse text for tool calls if tools are available
              if (tools && Object.keys(tools).length > 0) {
                const parsedBlocks = parseContentBlocks(block.text);
                for (const parsedBlock of parsedBlocks) {
                  if (parsedBlock.type === 'text') {
                    contentParts.push({
                      type: 'text',
                      text: parsedBlock.text,
                    });
                  } else if (parsedBlock.type === 'tool_use') {
                    contentParts.push({
                      type: 'tool-call',
                      toolCallId: parsedBlock.toolCallId,
                      toolName: parsedBlock.toolName,
                      input: JSON.stringify(parsedBlock.arguments),
                    });
                    finishReason = 'tool-calls';
                  }
                }
              } else {
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
          } else if (event.message.stop_reason === 'max_tokens') {
            finishReason = 'length';
          }
        } else if (event.type === 'result') {
          // Check for errors
          if (event.subtype === 'error_max_turns') {
            throw new Error('Claude Code reached maximum turns limit');
          } else if (event.subtype === 'error_during_execution') {
            throw new Error('Error occurred during Claude Code execution');
          }

          // Extract usage from result (final, includes cache tokens)
          if (event.usage) {
            const usage = event.usage;
            inputTokens =
              (usage.input_tokens || 0) +
              (usage.cache_creation_input_tokens || 0) +
              (usage.cache_read_input_tokens || 0);
            outputTokens = usage.output_tokens || 0;
          }
        }
      }

      return {
        content: contentParts,
        finishReason,
        usage: {
          inputTokens: inputTokens,
          outputTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        warnings: [],
        rawResponse: { headers: {} },
      };
    } catch (error) {
      // Log detailed error information
      console.error('Claude Code error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        modelId: this.modelId,
      });
      throw new Error(
        `Claude Code execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  doStream(
    options: LanguageModelV2CallOptions
  ): Promise<Awaited<ReturnType<LanguageModelV2['doStream']>>> {
    try {
      // Convert tools to internal format
      const tools = this.convertTools(options.tools || []);

      // Convert messages to string prompt
      const promptString = this.convertMessagesToString(options);
      let systemPrompt = this.extractSystemPrompt(options) || '';

      // Add tools description to system prompt if tools are provided
      if (tools && Object.keys(tools).length > 0) {
        const toolsPrompt = generateToolsSystemPrompt(tools);
        systemPrompt = systemPrompt ? `${systemPrompt}\n\n${toolsPrompt}` : toolsPrompt;
      }

      // Build query options
      const queryOptions: Options = {
        model: this.modelId,
        // Disable all Claude Code built-in tools
        settingSources: [],
        disallowedTools: CLAUDE_CODE_BUILTIN_TOOLS,
        // Enable partial messages for streaming events
        includePartialMessages: true,
      };

      if (systemPrompt) {
        queryOptions.systemPrompt = systemPrompt;
      }

      // Add maxThinkingTokens from providerOptions if provided
      const providerOptions = options.providerOptions?.['claude-code'] as Record<string, any> | undefined;
      if (providerOptions?.maxThinkingTokens) {
        queryOptions.maxThinkingTokens = providerOptions.maxThinkingTokens as number;
      }

      // Execute query
      const queryResult = query({
        prompt: promptString,
        options: queryOptions,
      });

      // Create streaming response
      const stream = new ReadableStream<LanguageModelV2StreamPart>({
        async start(controller) {
          try {
            let inputTokens = 0;
            let outputTokens = 0;
            let finishReason: LanguageModelV2FinishReason = 'stop';
            let hasStartedText = false;
            let hasEmittedTextEnd = false;
            // Track thinking block indices for streaming
            const thinkingBlockIndices = new Set<number>();
            // XML parser for streaming tool call detection
            const xmlParser = tools && Object.keys(tools).length > 0 ? new StreamingXMLParser() : null;

            for await (const event of queryResult) {
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
                  } else if (streamEvent.delta.type === 'text_delta') {
                    // Text delta - parse through XML parser if tools available, otherwise emit directly
                    if (xmlParser) {
                      // Parse text through XML parser to filter out tool call XML tags
                      for (const xmlEvent of xmlParser.processChunk(streamEvent.delta.text)) {
                        if (xmlEvent.type === 'text-start') {
                          if (!hasStartedText) {
                            controller.enqueue({
                              type: 'text-start',
                              id: 'text-0',
                            });
                            hasStartedText = true;
                          }
                        } else if (xmlEvent.type === 'text-delta') {
                          controller.enqueue({
                            type: 'text-delta',
                            id: 'text-0',
                            delta: xmlEvent.delta,
                          });
                        } else if (xmlEvent.type === 'tool-input-start') {
                          controller.enqueue({
                            type: 'tool-input-start',
                            id: xmlEvent.toolCallId,
                            toolName: xmlEvent.toolName,
                          });
                        } else if (xmlEvent.type === 'tool-input-delta') {
                          controller.enqueue({
                            type: 'tool-input-delta',
                            id: xmlEvent.toolCallId,
                            delta: xmlEvent.delta,
                          });
                        } else if (xmlEvent.type === 'tool-input-end') {
                          controller.enqueue({
                            type: 'tool-input-end',
                            id: xmlEvent.toolCallId,
                          });
                        } else if (xmlEvent.type === 'tool-call-complete') {
                          controller.enqueue({
                            type: 'tool-call',
                            toolCallId: xmlEvent.toolCallId,
                            toolName: xmlEvent.toolName,
                            input: JSON.stringify(xmlEvent.arguments),
                          });
                          finishReason = 'tool-calls';
                        }
                      }
                    } else {
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
                  } else if (hasStartedText) {
                    // End of text block - flush XML parser if tools are available
                    if (xmlParser) {
                      for (const xmlEvent of xmlParser.flush()) {
                        if (xmlEvent.type === 'text-delta') {
                          controller.enqueue({
                            type: 'text-delta',
                            id: 'text-0',
                            delta: xmlEvent.delta,
                          });
                        } else if (xmlEvent.type === 'text-end') {
                          controller.enqueue({
                            type: 'text-end',
                            id: 'text-0',
                          });
                          hasEmittedTextEnd = true;
                        } else if (xmlEvent.type === 'tool-input-delta') {
                          controller.enqueue({
                            type: 'tool-input-delta',
                            id: xmlEvent.toolCallId,
                            delta: xmlEvent.delta,
                          });
                        } else if (xmlEvent.type === 'tool-input-end') {
                          controller.enqueue({
                            type: 'tool-input-end',
                            id: xmlEvent.toolCallId,
                          });
                        } else if (xmlEvent.type === 'tool-call-complete') {
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
              } else if (event.type === 'assistant') {
                // Extract content from assistant message
                // Note: With includePartialMessages: true, content has already been streamed
                // via stream_event. We only need to handle final metadata here.
                const content = event.message.content;
                for (const block of content) {
                  if (block.type === 'thinking') {
                    // Thinking blocks are handled via stream_event
                  } else if (block.type === 'text') {
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
                } else if (event.message.stop_reason === 'max_tokens') {
                  finishReason = 'length';
                }
              } else if (event.type === 'result') {
                // Check for errors
                if (event.subtype === 'error_max_turns') {
                  controller.error(new Error('Claude Code reached maximum turns limit'));
                  return;
                } else if (event.subtype === 'error_during_execution') {
                  controller.error(new Error('Error occurred during Claude Code execution'));
                  return;
                }

                // Extract usage from result (final, includes cache tokens)
                if (event.usage) {
                  const usage = event.usage;
                  inputTokens =
                    (usage.input_tokens || 0) +
                    (usage.cache_creation_input_tokens || 0) +
                    (usage.cache_read_input_tokens || 0);
                  outputTokens = usage.output_tokens || 0;
                }
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
              providerMetadata: {},
            });

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return {
        stream,
        rawResponse: { headers: {} },
        warnings: [],
      };
    } catch (error) {
      throw new Error(
        `Claude Code streaming failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
