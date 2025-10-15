/**
 * JSONC (JSON with Comments) utilities
 * Provides functions to parse and stringify JSONC files while preserving comments
 */
/**
 * Parse JSONC content (JSON with Comments)
 * @param content - The JSONC string to parse
 * @returns The parsed JavaScript object
 */
export declare function parseJSONC(content: string): any;
/**
 * Stringify an object to JSON format with optional schema
 * @param obj - The object to stringify
 * @param schema - Optional schema URL to include
 * @param indent - Indentation spaces (default: 2)
 * @returns The formatted JSON string
 */
export declare function stringifyJSONC(obj: any, schema?: string, indent?: number): string;
/**
 * Read and parse a JSONC file
 * @param filePath - Path to the JSONC file
 * @returns The parsed object
 */
export declare function readJSONCFile(filePath: string): Promise<any>;
/**
 * Write an object to a JSONC file
 * @param filePath - Path to the JSONC file
 * @param obj - The object to write
 * @param schema - Optional schema URL
 * @param indent - Indentation spaces
 */
export declare function writeJSONCFile(filePath: string, obj: any, schema?: string, indent?: number): Promise<void>;
