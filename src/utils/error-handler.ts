export class CLIError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export function handleError(error: unknown, context?: string): never {
  const message = error instanceof Error ? error.message : String(error);
  const contextMsg = context ? ` (${context})` : '';

  console.error(`✗ Error${contextMsg}: ${message}`);

  if (error instanceof CLIError && error.code) {
    console.error(`   Code: ${error.code}`);
  }

  process.exit(1);
}

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
