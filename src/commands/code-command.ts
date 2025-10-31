import React from 'react';
import { render } from 'ink';
import chalk from 'chalk';
import { Command } from 'commander';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText } from 'ai';
import type { LanguageModelV1 } from 'ai';
import {
  AI_PROVIDERS,
  getConfiguredProviders,
  loadAIConfig,
  type ProviderId,
} from '../config/ai-config.js';
import App from '../ui/App.js';
import type { CommandOptions } from '../types.js';

/**
 * Code command - AI chatbot powered by Vercel AI SDK v5
 * Multi-provider support (Anthropic, OpenAI, Google, OpenRouter)
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

    case 'openrouter':
      {
        const openrouter = createOpenRouter({ apiKey: providerConfig.apiKey });
        model = openrouter(modelName);
      }
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
 * Start interactive TUI app
 */
async function startTUIApp(options: CommandOptions): Promise<void> {
  // Render React + Ink app
  render(React.createElement(App));
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
  .description('AI development assistant with React + Ink TUI')
  .argument('[prompt]', 'One-shot prompt (optional - if not provided, starts interactive TUI)')
  .option('--no-stream', 'Disable streaming output (return full response at once)')
  .option('--verbose', 'Show detailed output')
  .action(async (prompt, options) => {
    if (prompt && prompt.trim()) {
      // One-shot mode
      await runPrompt(prompt, options);
    } else {
      // Interactive TUI mode
      await startTUIApp(options);
    }
  });
