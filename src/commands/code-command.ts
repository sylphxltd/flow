import React from 'react';
import { render } from 'ink';
import chalk from 'chalk';
import { Command } from 'commander';
import { streamText } from 'ai';
import {
  getConfiguredProviders,
  loadAIConfig,
} from '../config/ai-config.js';
import { getProvider } from '../providers/index.js';
import { getAISDKTools } from '../tools/index.js';
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
 * Code command - AI chatbot powered by Vercel AI SDK v5
 * Multi-provider support (Anthropic, OpenAI, Google, OpenRouter)
 * Supports both TUI and headless modes
 * Includes filesystem, shell, and search tools
 */

const SYSTEM_PROMPT = `You are a helpful coding assistant with access to filesystem and shell tools. You help users with programming tasks, code review, debugging, and software development.

Key capabilities:
- Write clean, functional code
- Read and write files using tools
- Execute shell commands
- Search for files and content
- Explain complex concepts clearly
- Debug issues systematically
- Follow best practices

Available tools:
- read_file: Read file contents
- write_file: Write content to files
- list_directory: List files in directories
- file_stats: Get file information
- execute_bash: Run shell commands
- get_cwd: Get current working directory
- glob_files: Search files by pattern
- grep_content: Search content in files

Use tools proactively to help users with their tasks.`;

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

  const providerId = config.defaultProvider || configuredProviders[0];
  const providerConfig = config.providers?.[providerId];
  const modelName = config.defaultModel || providerConfig?.defaultModel;

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

  // Get tools
  const tools = getAISDKTools();

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

    // Stream response with tools
    const result = await streamText({
      model,
      system: SYSTEM_PROMPT,
      messages,
      tools,
      maxSteps: 5,
      onStepFinish: (step) => {
        // Show tool calls if verbose
        if (options.verbose && step.toolCalls && step.toolCalls.length > 0) {
          for (const call of step.toolCalls) {
            console.error(
              chalk.dim(`\n🔧 Tool: ${call.toolName}(${JSON.stringify(call.args)})\n`)
            );
          }
        }
      },
    });

    // Output assistant response
    let fullResponse = '';
    let hasOutput = false;

    for await (const chunk of result.textStream) {
      if (!hasOutput) {
        hasOutput = true;
      }
      process.stdout.write(chunk);
      fullResponse += chunk;
    }

    // If no output, model might not support tools
    if (!hasOutput || fullResponse.length === 0) {
      console.error(chalk.yellow('\n⚠️  No response from model'));
      console.error(
        chalk.dim(
          'This model might not support function calling/tools. Try a different model:\n'
        )
      );
      console.error(chalk.dim('- anthropic/claude-3.5-sonnet'));
      console.error(chalk.dim('- openai/gpt-4o'));
      console.error(chalk.dim('- google/gemini-2.0-flash-exp\n'));
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
  .description('AI development assistant - TUI or headless mode with filesystem tools')
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
