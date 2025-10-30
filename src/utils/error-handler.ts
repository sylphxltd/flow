/**
 * Legacy error handling utilities
 * @deprecated Use core/functional/error-handler.ts instead
 *
 * MIGRATION PATH:
 * 1. Replace CLIError with cliError from error-types.ts
 * 2. Replace handleError with exitWithError from error-handler.ts
 * 3. Replace createAsyncHandler with createAsyncHandler from error-handler.ts
 *
 * Kept for backward compatibility during migration
 */

export class CLIError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

/**
 * @deprecated Use exitWithError from core/functional/error-handler.ts
 */
export function handleError(error: unknown, context?: string): never {
  const message = error instanceof Error ? error.message : String(error);
  const contextMsg = context ? ` (${context})` : '';

  console.error(`✗ Error${contextMsg}: ${message}`);

  if (error instanceof CLIError && error.code) {
    console.error(`   Code: ${error.code}`);
  }

  process.exit(1);
}

/**
 * @deprecated Use createAsyncHandler from core/functional/error-handler.ts
 */
export function createAsyncHandler<T extends Record<string, any>>(
  handler: (options: T) => Promise<void>,
  context?: string
) {
  return async (options: T): Promise<void> => {
    try {
      await handler(options);
    } catch (error) {
      handleError(error, context);
    }
  };
}
