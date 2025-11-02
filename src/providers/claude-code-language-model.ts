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
import { query } from '@anthropic-ai/claude-agent-sdk';

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
   * Convert Vercel AI SDK tool schemas to Anthropic tool format
   * Note: This is for schema definition only - Vercel framework handles execution
   */
  private convertToolSchemas(vercelTools: any[]): any[] | undefined {
    if (!vercelTools || vercelTools.length === 0) {
      return undefined;
    }

    return vercelTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema || { type: 'object', properties: {} },
    }));
  }

  /**
   * Convert Vercel AI SDK messages to a single string prompt
   * Note: Claude Agent SDK works better with string prompts than async iterables
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
      }
    }

    return promptParts.join('\n\n');
  }

  /**
   * Extract system prompt from messages
   */
  private extractSystemPrompt(options: LanguageModelV2CallOptions): string | undefined {
    const systemMessages = options.prompt.filter((msg: any) => msg.role === 'system');
    if (systemMessages.length === 0) {
      return undefined;
    }

    const systemTexts = systemMessages
      .flatMap((msg: any) => {
        // Handle both array and non-array content
        const content = Array.isArray(msg.content) ? msg.content : [msg.content];
        return content
          .filter((part: any) => typeof part === 'object' && part.type === 'text')
          .map((part: any) => part.text);
      })
      .join('\n');

    return systemTexts || undefined;
  }

  async doGenerate(
    options: LanguageModelV2CallOptions
  ): Promise<Awaited<ReturnType<LanguageModelV2['doGenerate']>>> {
    try {
      // Convert tool schemas to Anthropic format
      const tools = this.convertToolSchemas(options.tools as any);

      // Convert messages to string prompt
      const promptString = this.convertMessagesToString(options);
      const systemPrompt = this.extractSystemPrompt(options);

      // Build query options
      const queryOptions: any = {
        model: this.modelId,
        // Disable Claude Code built-in tools - only use Vercel AI SDK tools
        settingSources: [],
        tools: tools || [],
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
              contentParts.push({
                type: 'text',
                text: block.text,
              });
            } else if (block.type === 'tool_use') {
              // Tool call detected - add to content and set finish reason
              contentParts.push({
                type: 'tool-call',
                toolCallId: block.id,
                toolName: block.name,
                args: block.input,
              });
              finishReason = 'tool-calls';
            }
          }

          // Check stop reason
          if (event.message.stop_reason === 'end_turn') {
            finishReason = 'stop';
          } else if (event.message.stop_reason === 'tool_use') {
            finishReason = 'tool-calls';
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

  async doStream(
    options: LanguageModelV2CallOptions
  ): Promise<Awaited<ReturnType<LanguageModelV2['doStream']>>> {
    try {
      // Convert tool schemas to Anthropic format
      const tools = this.convertToolSchemas(options.tools as any);

      // Convert messages to string prompt
      const promptString = this.convertMessagesToString(options);
      const systemPrompt = this.extractSystemPrompt(options);

      // Build query options
      const queryOptions: any = {
        model: this.modelId,
        // Disable Claude Code built-in tools - only use Vercel AI SDK tools
        settingSources: [],
        tools: tools || [],
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
                      delta: block.text,
                    });
                  } else if (block.type === 'tool_use') {
                    // Tool call detected - emit as tool-call-delta
                    controller.enqueue({
                      type: 'tool-call-delta',
                      toolCallId: block.id,
                      toolName: block.name,
                      argsTextDelta: JSON.stringify(block.input),
                    });
                    finishReason = 'tool-calls';
                  }
                }

                // Check stop reason
                if (event.message.stop_reason === 'end_turn') {
                  finishReason = 'stop';
                } else if (event.message.stop_reason === 'tool_use') {
                  finishReason = 'tool-calls';
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
