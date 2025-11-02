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
      toolsMap[tool.name] = {
        type: 'function',
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || { type: 'object', properties: {} },
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
          .filter((part: any) => typeof part === 'object' && part.type === 'text')
          .map((part: any) => part.text);

        if (textParts.length > 0) {
          promptParts.push(textParts.join('\n'));
        }
      } else if (message.role === 'assistant') {
        // Handle both array and non-array content
        const content = Array.isArray(message.content) ? message.content : [message.content];
        const textParts = content
          .filter((part: any) => typeof part === 'object' && part.type === 'text')
          .map((part: any) => part.text);

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
            if (block.type === 'text') {
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
      };

      if (systemPrompt) {
        queryOptions.systemPrompt = systemPrompt;
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

            for await (const event of queryResult) {
              if (event.type === 'assistant') {
                // Extract content from assistant message
                const content = event.message.content;
                for (const block of content) {
                  if (block.type === 'text') {
                    // Parse text for tool calls if tools are available
                    if (tools && Object.keys(tools).length > 0) {
                      const parsedBlocks = parseContentBlocks(block.text);
                      for (const parsedBlock of parsedBlocks) {
                        if (parsedBlock.type === 'text') {
                          // Emit text-start before first text-delta
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
                            delta: parsedBlock.text,
                          });
                        } else if (parsedBlock.type === 'tool_use') {
                          // Tool call detected - emit as tool-call
                          controller.enqueue({
                            type: 'tool-call',
                            toolCallId: parsedBlock.toolCallId,
                            toolName: parsedBlock.toolName,
                            input: JSON.stringify(parsedBlock.arguments),
                          });
                          finishReason = 'tool-calls';
                        }
                      }
                    } else {
                      // No tools, just emit text
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
                        delta: block.text,
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

            // Emit text-end if we started text
            if (hasStartedText) {
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
              providerMetadata: undefined,
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
