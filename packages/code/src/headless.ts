import { getTRPCClient } from '@sylphx/code-client';
import chalk from 'chalk';

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
    let hasOutput = false;

    // Promise to wait for completion
    await new Promise<void>((resolve, reject) => {
      // Handle streaming events
      client.message.streamResponse.subscribe(
        {
          sessionId: options.continue ? undefined : null, // undefined = continue last, null = new session
          userMessage: prompt,
        },
        {
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
                  console.error(
                    chalk.dim(`[Result: ${JSON.stringify(event.result).substring(0, 100)}...]`)
                  );
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
                reject(new Error(event.error));
                return;
            }
          },
          onError: (err: Error) => {
            console.error(chalk.red(`\n✗ Subscription error: ${err.message}`));
            reject(err);
          },
          onComplete: () => {
            if (!hasOutput) {
              console.error(
                chalk.yellow('\n⚠️  No output received. Model may not support tool calling.')
              );
              reject(new Error('No output received'));
            } else {
              resolve();
            }
          },
        }
      );
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
