export declare class CLIError extends Error {
    code?: string | undefined;
    constructor(message: string, code?: string | undefined);
}
export declare function handleError(error: unknown, context?: string): never;
export declare function createAsyncHandler<T extends Record<string, any>>(handler: (options: T) => Promise<void>, context?: string): (options: T) => Promise<void>;
