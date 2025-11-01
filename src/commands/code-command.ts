import React from 'react';
import { render } from 'ink';
import chalk from 'chalk';
import { Command } from 'commander';
import { loadAIConfig } from '../config/ai-config.js';
import { getProvider } from '../providers/index.js';
import { createAIStream } from '../core/ai-sdk.js';
import { processStream } from '../core/stream-handler.js';
import { createHeadlessDisplay } from '../core/headless-display.js';
import { getOrCreateSession, showModelToolSupportError } from '../core/session-service.js';
import { addMessage, saveSession } from '../utils/session-manager.js';
import App from '../ui/App.js';

/**
 * Code command - AI chatbot powered by Sylphx Flow AI SDK
 * Multi-provider support (Anthropic, OpenAI, Google, OpenRouter)
 * Supports both TUI and headless modes
 * Includes filesystem, shell, and search tools
 */


/**
 * Start interactive TUI app
 */
async function startTUIApp(): Promise<void> {
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
  const providerConfig = config.providers?.[session.provider];
  if (!providerConfig) {
    console.error(chalk.red(`✗ Provider ${session.provider} not configured`));
    process.exit(1);
  }

  // Check if provider is properly configured
  if (!providerInstance.isConfigured(providerConfig)) {
    console.error(chalk.red(`✗ ${providerInstance.name} is not properly configured`));
    process.exit(1);
  }

  const model = providerInstance.createClient(providerConfig, session.model);

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

    // Create display callbacks
    const display = createHeadlessDisplay(options.quiet || false);

    // Create AI stream
    const stream = createAIStream({
      model,
      messages,
    });

    // Process stream with unified handler
    const { fullResponse } = await processStream(stream, {
      onTextDelta: display.onTextDelta,
      onToolCall: display.onToolCall,
      onToolResult: display.onToolResult,
      onComplete: display.onComplete,
    });

    if (options.verbose) {
      console.error(chalk.dim(`\n[Stream complete. Response length: ${fullResponse.length}]`));
    }

    // If no output, model may not support multi-step tool calling
    if (!display.hasOutput() || fullResponse.length === 0) {
      showModelToolSupportError();
      process.exit(1);
    }

    // Add assistant message to session and save
    const finalSession = addMessage(updatedSession, 'assistant', fullResponse);
    await saveSession(finalSession);

    if (options.verbose) {
      console.error(chalk.dim(`\nSession: ${finalSession.id}`));
      console.error(chalk.dim(`Messages: ${finalSession.messages.length}\n`));
    }
  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : String(error));

    // Provide helpful context for common errors
    if (error instanceof Error && 'statusCode' in error && (error as any).statusCode === 401) {
      console.error(chalk.yellow('\nThis usually means:'));
      console.error(chalk.dim('  • Invalid or missing API key'));
      console.error(chalk.dim('  • API key has expired'));
      console.error(chalk.dim('  • Authentication credentials not found\n'));
      console.error(chalk.green('To fix: Run `sylphx code` (TUI mode) then type /provider to configure'));
    }

    if (options.verbose && error instanceof Error) {
      console.error(chalk.dim('\nStack trace:'));
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
      await startTUIApp();
    }
  });
