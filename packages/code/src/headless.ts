import chalk from 'chalk';
import { getTRPCClient } from '@sylphx/code-client';

/**
 * Headless mode - execute prompt and get response via tRPC
 * All logic handled by code-server
 */
export async function runHeadless(prompt: string, options: any): Promise<void> {
  try {
    const client = getTRPCClient();

    // Show provider/model info (unless quiet)
    if (!options.quiet) {
      // TODO: Get current session provider/model from server
      console.error(chalk.dim(`\nConnecting to code-server...\n`));
    }

    // Stream response from server
    const subscription = client.message.streamResponse.subscribe({
      sessionId: options.continue ? undefined : null,  // undefined = continue last, null = new session
      userMessage: prompt,
    });

    let hasOutput = false;

    // Handle streaming events
    subscription.subscribe({
      onData: (event: any) => {
        switch (event.type) {
          case 'session-created':
            if (options.verbose) {
              console.error(chalk.dim(`Session: ${event.sessionId}`));
            }
            break;

          case 'text-delta':
            process.stdout.write(event.text);
            hasOutput = true;
            break;

          case 'tool-call':
            if (options.verbose) {
              console.error(chalk.yellow(`\n[Tool: ${event.toolName}]`));
            }
            break;

          case 'tool-result':
            if (options.verbose) {
              console.error(chalk.dim(`[Result: ${JSON.stringify(event.result).substring(0, 100)}...]`));
            }
            break;

          case 'complete':
            if (!options.quiet) {
              console.error(chalk.dim(`\n\n[Complete]`));
            }
            if (options.verbose && event.usage) {
              console.error(chalk.dim(`Tokens: ${event.usage.totalTokens || 'N/A'}`));
            }
            break;

          case 'error':
            console.error(chalk.red(`\n✗ Error: ${event.error}`));
            process.exit(1);
            break;
        }
      },
      onError: (err: Error) => {
        console.error(chalk.red(`\n✗ Subscription error: ${err.message}`));
        process.exit(1);
      },
      onComplete: () => {
        if (!hasOutput) {
          console.error(chalk.yellow('\n⚠️  No output received. Model may not support tool calling.'));
          process.exit(1);
        }
      },
    });

    // Wait for subscription to complete
    await new Promise((resolve) => {
      subscription.subscribe({
        onComplete: resolve,
        onError: resolve,
      });
    });

  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : String(error));

    if (error instanceof Error && 'statusCode' in error && (error as any).statusCode === 401) {
      console.error(chalk.yellow('\nThis usually means:'));
      console.error(chalk.dim('  • Invalid or missing API key'));
      console.error(chalk.dim('  • API key has expired'));
      console.error(chalk.dim('  • Authentication credentials not found\n'));
      console.error(chalk.green('To fix: Configure your provider settings'));
    }

    if (options.verbose && error instanceof Error) {
      console.error(chalk.dim('\nStack trace:'));
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }
}
