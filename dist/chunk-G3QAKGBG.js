// src/utils/error-handler.ts
var CLIError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "CLIError";
  }
};
function handleError(error, context) {
  const message = error instanceof Error ? error.message : String(error);
  const contextMsg = context ? ` (${context})` : "";
  console.error(`\u274C Error${contextMsg}: ${message}`);
  if (error instanceof CLIError && error.code) {
    console.error(`   Code: ${error.code}`);
  }
  process.exit(1);
}
function createAsyncHandler(handler, context) {
  return async (options) => {
    try {
      await handler(options);
    } catch (error) {
      handleError(error, context);
    }
  };
}

export {
  CLIError,
  createAsyncHandler
};
