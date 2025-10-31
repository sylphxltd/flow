import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { Command } from 'commander';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, streamText } from 'ai';
import type { CommandOptions } from '../types.js';

/**
 * Code command - AI chatbot powered by Vercel AI SDK v5
 * Goal: Build a Claude Code-like experience
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Start interactive chat session
 */
async function startChatSession(options: CommandOptions): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error(chalk.red('✗ ANTHROPIC_API_KEY environment variable is required'));
    console.error(chalk.dim('  Set it with: export ANTHROPIC_API_KEY="your-key-here"'));
    process.exit(1);
  }

  // Model selection
  const model = anthropic('claude-3-5-sonnet-20241022');

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
  console.log(chalk.dim('Powered by Claude 3.5 Sonnet + Vercel AI SDK v5'));
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
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error(chalk.red('✗ ANTHROPIC_API_KEY environment variable is required'));
    console.error(chalk.dim('  Set it with: export ANTHROPIC_API_KEY="your-key-here"'));
    process.exit(1);
  }

  const model = anthropic('claude-3-5-sonnet-20241022');

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
  .description('AI chatbot powered by Vercel AI SDK v5 (like Claude Code)')
  .argument('[prompt]', 'One-shot prompt (optional - if not provided, starts interactive chat)')
  .option('--no-stream', 'Disable streaming output (return full response at once)')
  .option('--model <name>', 'Model to use (default: claude-3-5-sonnet-20241022)')
  .option('--verbose', 'Show detailed output')
  .action(async (prompt, options) => {
    if (options.verbose) {
      console.log(chalk.dim('Model: claude-3-5-sonnet-20241022'));
      console.log(chalk.dim('Provider: Anthropic'));
      console.log(chalk.dim('SDK: Vercel AI SDK v5\n'));
    }

    if (prompt && prompt.trim()) {
      // One-shot mode
      await runPrompt(prompt, options);
    } else {
      // Interactive chat mode
      await startChatSession(options);
    }
  });
