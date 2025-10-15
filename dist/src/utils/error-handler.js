export class CLIError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'CLIError';
    }
}
export function handleError(error, context) {
    const message = error instanceof Error ? error.message : String(error);
    const contextMsg = context ? ` (${context})` : '';
    console.error(`❌ Error${contextMsg}: ${message}`);
    if (error instanceof CLIError && error.code) {
        console.error(`   Code: ${error.code}`);
    }
    process.exit(1);
}
export function createAsyncHandler(handler, context) {
    return async (options) => {
        try {
            await handler(options);
        }
        catch (error) {
            handleError(error, context);
        }
    };
}
