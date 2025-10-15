"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIError = void 0;
exports.handleError = handleError;
exports.createAsyncHandler = createAsyncHandler;
class CLIError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'CLIError';
    }
}
exports.CLIError = CLIError;
function handleError(error, context) {
    const message = error instanceof Error ? error.message : String(error);
    const contextMsg = context ? ` (${context})` : '';
    console.error(`❌ Error${contextMsg}: ${message}`);
    if (error instanceof CLIError && error.code) {
        console.error(`   Code: ${error.code}`);
    }
    process.exit(1);
}
function createAsyncHandler(handler, context) {
    return async (options) => {
        try {
            await handler(options);
        }
        catch (error) {
            handleError(error, context);
        }
    };
}
