import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { Command } from 'commander';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type { LanguageModelV1 } from 'ai';
import {
  AI_PROVIDERS,
  getConfiguredProviders,
  loadAIConfig,
  type ProviderId,
} from '../config/ai-config.js';
import { configureAI, quickSetupAI } from '../utils/ai-config-tui.js';
import type { CommandOptions } from '../types.js';

/**
 * Code command - AI chatbot powered by Vercel AI SDK v5
 * Multi-provider support (Anthropic, OpenAI, Google)
 * No env variables - all config via TUI
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Get AI model from configuration
 */
async function getAIModel(cwd: string = process.cwd()): Promise<{
  model: LanguageModelV1;
  providerName: string;
  modelName: string;
} | null> {
  const configResult = await loadAIConfig(cwd);

  if (configResult._tag === 'Failure') {
    return null;
  }

  const config = configResult.value;

  // Check if any provider is configured
  const configuredProviders = await getConfiguredProviders(cwd);

  if (configuredProviders.length === 0) {
    return null;
  }

  // Use default provider or first configured
  const providerId = config.defaultProvider || configuredProviders[0];
  const providerInfo = AI_PROVIDERS[providerId];
  const providerConfig = config.providers?.[providerId];

  if (!providerConfig?.apiKey) {
    return null;
  }

  // Get model name
  const modelName =
    config.defaultModel || providerConfig.defaultModel || providerInfo.models[0];

  // Create model instance based on provider
  let model: LanguageModelV1;

  switch (providerId) {
    case 'anthropic':
      model = anthropic(modelName, { apiKey: providerConfig.apiKey });
      break;

    case 'openai':
      model = openai(modelName, {
        apiKey: providerConfig.apiKey,
        baseURL: (providerConfig as any).baseUrl,
      });
      break;

    case 'google':
      model = google(modelName, { apiKey: providerConfig.apiKey });
      break;

    default:
      return null;
  }

  return {
    model,
    providerName: providerInfo.name,
    modelName,
  };
}

/**
 * Start interactive chat session
 */
async function startChatSession(options: CommandOptions): Promise<void> {
  const cwd = process.cwd();

  // Get configured model
  const modelInfo = await getAIModel(cwd);

  if (!modelInfo) {
    console.log(chalk.yellow('\n⚠️  No AI provider configured\n'));
    console.log(chalk.dim('Run configuration wizard...\n'));

    const configured = await quickSetupAI(cwd);

    if (!configured) {
      console.error(chalk.red('\n✗ Configuration failed\n'));
      process.exit(1);
    }

    // Retry getting model
    const retryModel = await getAIModel(cwd);
    if (!retryModel) {
      console.error(chalk.red('\n✗ Failed to load AI model\n'));
      process.exit(1);
    }

    return startChatSession(options);
  }

  const { model, providerName, modelName } = modelInfo;

  // Conversation history
  const messages: Message[] = [];

  // System prompt
  const systemPrompt = `You are a helpful coding assistant. You help users with programming tasks, code review, debugging, and software development.

Key capabilities:
- Write clean, functional code
- Explain complex concepts clearly
- Debug issues systematically
- Follow best practices
- Provide examples and documentation`;

  console.log(chalk.cyan.bold('\n🤖 Sylphx Flow AI Chat\n'));
  console.log(chalk.dim(`Provider: ${providerName}`));
  console.log(chalk.dim(`Model: ${modelName}`));
  console.log(chalk.dim('Powered by Vercel AI SDK v5'));
  console.log(chalk.dim('Type your message and press Enter. Type "exit" or "quit" to end.\n'));

  // Create readline interface
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('You: '),
  });

  rl.prompt();

  rl.on('line', async (input: string) => {
    const userMessage = input.trim();

    // Exit commands
    if (userMessage.toLowerCase() === 'exit' || userMessage.toLowerCase() === 'quit') {
      console.log(chalk.cyan('\n👋 Goodbye!\n'));
      rl.close();
      process.exit(0);
    }

    // Skip empty messages
    if (!userMessage) {
      rl.prompt();
      return;
    }

    // Add user message to history
    messages.push({ role: 'user', content: userMessage });

    try {
      // Stream response
      console.log(chalk.blue('\nAssistant: '));

      const { textStream } = streamText({
        model,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      let assistantMessage = '';

      // Stream tokens to console
      for await (const textPart of textStream) {
        process.stdout.write(textPart);
        assistantMessage += textPart;
      }

      console.log('\n'); // New line after response

      // Add assistant response to history
      messages.push({ role: 'assistant', content: assistantMessage });

      // Show prompt again
      rl.prompt();
    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : String(error));
      console.log('');
      rl.prompt();
    }
  });

  rl.on('close', () => {
    console.log(chalk.cyan('\n👋 Chat session ended\n'));
    process.exit(0);
  });
}

/**
 * One-shot prompt (non-interactive)
 */
async function runPrompt(prompt: string, options: CommandOptions): Promise<void> {
  const cwd = process.cwd();

  // Get configured model
  const modelInfo = await getAIModel(cwd);

  if (!modelInfo) {
    console.log(chalk.yellow('\n⚠️  No AI provider configured\n'));
    console.log(chalk.dim('Run: npx @sylphx/flow code config\n'));
    process.exit(1);
  }

  const { model, providerName, modelName } = modelInfo;

  if (options.verbose) {
    console.log(chalk.dim(`Provider: ${providerName}`));
    console.log(chalk.dim(`Model: ${modelName}`));
  }

  const systemPrompt = `You are a helpful coding assistant. Provide clear, concise responses.`;

  try {
    if (options.stream === false) {
      // Non-streaming response
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt,
      });

      console.log(chalk.blue('\nAssistant:'));
      console.log(text);
      console.log('');
    } else {
      // Streaming response (default)
      console.log(chalk.blue('\nAssistant: '));

      const { textStream } = streamText({
        model,
        system: systemPrompt,
        prompt,
      });

      for await (const textPart of textStream) {
        process.stdout.write(textPart);
      }

      console.log('\n');
    }
  } catch (error) {
    console.error(chalk.red('✗ Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Create code command
 */
export const codeCommand = new Command('code')
  .description('AI chatbot powered by Vercel AI SDK v5 (multi-provider support)')
  .argument('[prompt]', 'One-shot prompt (optional - if not provided, starts interactive chat)')
  .option('--no-stream', 'Disable streaming output (return full response at once)')
  .option('--verbose', 'Show detailed output')
  .action(async (prompt, options) => {
    if (prompt && prompt.trim()) {
      // One-shot mode
      await runPrompt(prompt, options);
    } else {
      // Interactive chat mode
      await startChatSession(options);
    }
  });

// Add config subcommand
codeCommand
  .command('config')
  .description('Configure AI providers and models (TUI)')
  .action(async () => {
    await configureAI(process.cwd());
  });
