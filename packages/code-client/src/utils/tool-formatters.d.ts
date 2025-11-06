/**
 * Tool Formatters
 * Generic utility functions and types for tool display formatting
 * Does not contain tool-specific logic - tools define their own formatters
 */
/**
 * Utility functions
 */
export declare const truncateString: (str: string, maxLength?: number) => string;
export declare const getRelativePath: (filePath: string) => string;
export declare const isDefaultCwd: (dir: string | undefined) => boolean;
export declare const pluralize: (count: number, singular: string, plural?: string) => string;
/**
 * Tool formatter types
 */
export type ArgsFormatter = (args: Record<string, unknown>) => string;
export type FormattedResult = {
    lines: string[];
    summary?: string;
};
export type ResultFormatter = (result: unknown) => FormattedResult;
//# sourceMappingURL=tool-formatters.d.ts.map