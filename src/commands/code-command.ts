import React from 'react';
import { render } from 'ink';
import chalk from 'chalk';
import { Command } from 'commander';
import {
  getConfiguredProviders,
  loadAIConfig,
} from '../config/ai-config.js';
import { getProvider } from '../providers/index.js';
import { createAIStream } from '../core/ai-sdk.js';
import {
  createSession,
  loadLastSession,
  addMessage,
  saveSession,
  type Session,
} from '../utils/session-manager.js';
import App from '../ui/App.js';
import type { CommandOptions } from '../types.js';

/**
 * Code command - AI chatbot powered by Sylphx Flow AI SDK
 * Multi-provider support (Anthropic, OpenAI, Google, OpenRouter)
 * Supports both TUI and headless modes
 * Includes filesystem, shell, and search tools
 */

/**
 * Get or create session for headless mode
 */
async function getOrCreateSession(continueSession: boolean): Promise<Session | null> {
  const cwd = process.cwd();
  const configResult = await loadAIConfig(cwd);

  if (configResult._tag === 'Failure') {
    console.error(chalk.red('✗ Failed to load AI config'));
    return null;
  }

  const config = configResult.value;
  const configuredProviders = await getConfiguredProviders(cwd);

  if (configuredProviders.length === 0) {
    console.error(chalk.yellow('\n⚠️  No AI provider configured\n'));
    console.error(chalk.dim('Run: sylphx code (to configure AI)\n'));
    return null;
  }

  const providerId = config.defaultProvider ?? configuredProviders[0];
  if (!providerId) {
    console.error(chalk.yellow('\n⚠️  No provider configured\n'));
    return null;
  }

  const providerConfig = config.providers?.[providerId];
  const modelName = config.defaultModel ?? providerConfig?.defaultModel;

  if (!providerConfig?.apiKey || !modelName) {
    console.error(chalk.yellow('\n⚠️  Provider not fully configured\n'));
    return null;
  }

  // Try to continue last session
  if (continueSession) {
    const lastSession = await loadLastSession();
    if (lastSession) {
      console.error(chalk.dim(`Continuing session: ${lastSession.id}`));
      console.error(chalk.dim(`Messages: ${lastSession.messages.length}\n`));
      return lastSession;
    }
    console.error(chalk.yellow('No previous session found, creating new one\n'));
  }

  // Create new session
  return await createSession(providerId, modelName);
}

/**
 * Start interactive TUI app
 */
async function startTUIApp(options: CommandOptions): Promise<void> {
  // Render React + Ink app
  render(React.createElement(App));
}

/**
 * Headless mode - execute prompt and get response
 */
async function runHeadless(prompt: string, options: any): Promise<void> {
  // Get or create session
  const session = await getOrCreateSession(options.continue || false);
  if (!session) {
    process.exit(1);
  }

  // Get provider and model
  const providerInstance = getProvider(session.provider);
  const configResult = await loadAIConfig();
  if (configResult._tag === 'Failure') {
    console.error(chalk.red('✗ Failed to load config'));
    process.exit(1);
  }

  const config = configResult.value;
  const apiKey = config.providers?.[session.provider]?.apiKey;
  if (!apiKey) {
    console.error(chalk.red('✗ No API key found'));
    process.exit(1);
  }

  const model = providerInstance.createClient(apiKey, session.model);

  // Add user message to session
  const updatedSession = addMessage(session, 'user', prompt);

  // Show user message (unless quiet)
  if (!options.quiet) {
    console.error(chalk.dim(`\n${session.provider} · ${session.model}\n`));
  }

  try {
    // Convert session messages to AI SDK format
    const messages = updatedSession.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Output assistant response
    let fullResponse = '';
    let hasOutput = false;

    // Track active tool calls for streaming UI
    const activeTools = new Map<string, { name: string; args: unknown; startTime: number }>();

    // Create AI stream using our SDK
    for await (const chunk of createAIStream({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })) {
      if (chunk.type === 'text-delta') {
        if (!hasOutput) {
          hasOutput = true;
          // Add newline before first text output if tools were called
          if (activeTools.size > 0 || !options.quiet) {
            process.stdout.write('\n');
          }
        }
        if (chunk.textDelta) {
          process.stdout.write(chunk.textDelta);
          fullResponse += chunk.textDelta;
        }
      } else if (chunk.type === 'reasoning') {
        if (!hasOutput) {
          hasOutput = true;
          // Add newline before first text output if tools were called
          if (activeTools.size > 0 || !options.quiet) {
            process.stdout.write('\n');
          }
        }
        if (chunk.text) {
          process.stdout.write(chunk.text);
          fullResponse += chunk.text;
        }
      } else if (chunk.type === 'tool-call') {
        // Flush stdout to ensure proper ordering
        if (hasOutput) {
          process.stdout.write('\n');
        }

        // Show tool call start with flashing green dot
        activeTools.set(chunk.toolCallId, {
          name: chunk.toolName,
          args: chunk.args,
          startTime: Date.now(),
        });

        if (!options.quiet) {
          // Format arguments nicely
          const argsStr = Object.keys(chunk.args || {}).length === 0
            ? ''
            : JSON.stringify(chunk.args, null, 2);

          if (argsStr) {
            const lines = argsStr.split('\n');
            const truncatedArgs = lines.length > 5
              ? lines.slice(0, 5).join('\n') + chalk.dim('\n     … +' + (lines.length - 5) + ' lines (ctrl+o to expand)')
              : argsStr;

            process.stderr.write(`\n${chalk.green('⏺')} ${chalk.bold(chunk.toolName)}\n`);
            process.stderr.write(chalk.dim(`  ⎿ ${truncatedArgs.split('\n').join('\n     ')}\n`));
          } else {
            process.stderr.write(`\n${chalk.green('⏺')} ${chalk.bold(chunk.toolName)}\n`);
          }
        }
      } else if (chunk.type === 'tool-result') {
        // Show tool completion with green dot
        const tool = activeTools.get(chunk.toolCallId);
        if (tool && !options.quiet) {
          const duration = Date.now() - tool.startTime;

          // Format result nicely
          const resultStr = JSON.stringify(chunk.result, null, 2);
          const lines = resultStr.split('\n');
          const truncatedResult = lines.length > 5
            ? lines.slice(0, 5).join('\n') + chalk.dim('\n     … +' + (lines.length - 5) + ' lines (ctrl+o to expand)')
            : resultStr;

          process.stderr.write(`${chalk.green('●')} ${chalk.bold(tool.name)} ${chalk.dim(`(${duration}ms)`)}\n`);
          process.stderr.write(chalk.dim(`  ⎿ ${truncatedResult.split('\n').join('\n     ')}\n\n`));
        }
        activeTools.delete(chunk.toolCallId);
      }
    }

    if (options.verbose) {
      console.error(chalk.dim(`\n[Stream complete. Response length: ${fullResponse.length}]`));
    }

    // If no output, model may not support multi-step tool calling
    if (!hasOutput || fullResponse.length === 0) {
      console.error(chalk.red('\n✗ No text response received from model\n'));
      console.error(
        chalk.yellow('The model may have called tools but did not generate a final text response.')
      );
      console.error(
        chalk.yellow('This usually means:\n')
      );
      console.error(chalk.dim('  • The current model does not fully support multi-step tool calling'));
      console.error(chalk.dim('  • Some models can call tools but cannot process results and respond\n'));
      console.error(chalk.green('Recommended models with full tool support:'));
      console.error(chalk.green('  • anthropic/claude-3.5-sonnet'));
      console.error(chalk.green('  • anthropic/claude-3.5-haiku'));
      console.error(chalk.green('  • openai/gpt-4o'));
      console.error(chalk.green('  • google/gemini-2.0-flash-exp\n'));
      console.error(chalk.dim('💡 Tip: Ask questions that don\'t require tools, or switch to a model above'));
      console.error(chalk.dim('To configure: Run `sylphx code` (TUI mode) then press Ctrl+P\n'));
      process.exit(1);
    }

    console.log('\n');

    // Add assistant message to session and save
    const finalSession = addMessage(updatedSession, 'assistant', fullResponse);
    await saveSession(finalSession);

    if (options.verbose) {
      console.error(chalk.dim(`\nSession: ${finalSession.id}`));
      console.error(chalk.dim(`Messages: ${finalSession.messages.length}\n`));
    }
  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : String(error));
    if (options.verbose && error instanceof Error) {
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }
}

/**
 * Create code command
 */
export const codeCommand = new Command('code')
  .description('AI development assistant with filesystem tools - TUI or headless mode')
  .argument('[prompt]', 'Headless mode: Send prompt and get response (if not provided, starts TUI)')
  .option('-c, --continue', 'Continue last session in headless mode')
  .option('-q, --quiet', 'Quiet mode - only output assistant response')
  .option('-v, --verbose', 'Show detailed output including tool calls')
  .action(async (prompt, options) => {
    if (prompt && prompt.trim()) {
      // Headless mode with tools and session support
      await runHeadless(prompt, options);
    } else {
      // Interactive TUI mode
      await startTUIApp(options);
    }
  });
