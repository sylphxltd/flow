/**
 * Security utilities for input validation, sanitization, and safe operations
 * Implements defense-in-depth security principles
 */
import { z } from 'zod';
/**
 * Security-focused validation schemas
 */
export declare const securitySchemas: {
    /** Project name validation - prevents command injection and path traversal */
    projectName: z.ZodString;
    /** Branch name validation - prevents command injection */
    branchName: z.ZodString;
    /** File path validation - prevents path traversal */
    filePath: z.ZodString;
    /** Command argument validation - prevents command injection */
    commandArg: z.ZodString;
    /** Environment variable validation */
    envVarName: z.ZodString;
    /** URL validation for API endpoints */
    url: z.ZodString;
    /** API key validation */
    apiKey: z.ZodString;
};
/**
 * Secure path utilities to prevent path traversal attacks
 */
export declare const pathSecurity: {
    /**
     * Validates and sanitizes a file path to prevent path traversal
     */
    validatePath: (inputPath: string, allowedBase?: string) => string;
    /**
     * Checks if a path is within allowed boundaries
     */
    isPathSafe: (targetPath: string, allowedBase: string) => boolean;
    /**
     * Creates a safe file path within a base directory
     */
    safeJoin: (basePath: string, ...paths: string[]) => string;
};
/**
 * Secure command execution utilities to prevent command injection
 */
export declare const commandSecurity: {
    /**
     * Safely executes a command with arguments, preventing command injection
     */
    safeExecFile(command: string, args: string[], options?: {
        cwd?: string;
        timeout?: number;
        maxBuffer?: number;
        env?: Record<string, string>;
    }): Promise<{
        stdout: string;
        stderr: string;
    }>;
    /**
     * Validates that a command argument is safe for execution
     */
    validateCommandArgs: (args: string[]) => string[];
};
/**
 * Input sanitization utilities
 */
export declare const sanitize: {
    /**
     * Sanitizes a string for safe display
     */
    string: (input: string, maxLength?: number) => string;
    /**
     * Sanitizes text for log messages (prevents log injection)
     */
    logMessage: (input: string) => string;
    /**
     * Sanitizes user input for file names
     */
    fileName: (input: string) => string;
    /**
     * Sanitizes content for YAML front matter
     */
    yamlContent: (input: string) => string;
};
/**
 * Environment variable validation utilities
 */
export declare const envSecurity: {
    /**
     * Validates an environment variable name and value
     */
    validateEnvVar: (name: string, value?: string) => {
        name: string;
        value: string;
    };
    /**
     * Safely gets an environment variable with validation
     */
    getEnvVar: (name: string, defaultValue?: string) => string | undefined;
    /**
     * Validates multiple environment variables
     */
    validateEnvVars: (vars: Record<string, {
        required?: boolean;
        schema?: z.ZodSchema;
    }>) => Record<string, string>;
};
/**
 * Cryptographic utilities for security
 */
export declare const cryptoUtils: {
    /**
     * Generates a secure random string
     */
    generateSecureRandom: (length?: number) => string;
    /**
     * Generates a cryptographically secure random ID
     */
    generateSecureId: () => string;
    /**
     * Creates a secure hash of data
     */
    hash: (data: string) => string;
    /**
     * Verifies data integrity with HMAC
     */
    verifyHMAC: (data: string, signature: string, secret: string) => boolean;
};
/**
 * Simple in-memory rate limiting
 */
export declare class RateLimiter {
    private maxRequests;
    private windowMs;
    private requests;
    constructor(maxRequests?: number, windowMs?: number);
    isAllowed(identifier: string): boolean;
    cleanup(): void;
}
/**
 * Security middleware for common patterns
 */
export declare const securityMiddleware: {
    /**
     * Rate limiting middleware
     */
    rateLimit: (limiter: RateLimiter, getIdentifier: (req: any) => string) => (req: any, res: any, next: any) => any;
    /**
     * Input validation middleware
     */
    validateInput: (schema: z.ZodSchema, source?: "body" | "query" | "params") => (req: any, res: any, next: any) => any;
};
declare const _default: {
    securitySchemas: {
        /** Project name validation - prevents command injection and path traversal */
        projectName: z.ZodString;
        /** Branch name validation - prevents command injection */
        branchName: z.ZodString;
        /** File path validation - prevents path traversal */
        filePath: z.ZodString;
        /** Command argument validation - prevents command injection */
        commandArg: z.ZodString;
        /** Environment variable validation */
        envVarName: z.ZodString;
        /** URL validation for API endpoints */
        url: z.ZodString;
        /** API key validation */
        apiKey: z.ZodString;
    };
    pathSecurity: {
        /**
         * Validates and sanitizes a file path to prevent path traversal
         */
        validatePath: (inputPath: string, allowedBase?: string) => string;
        /**
         * Checks if a path is within allowed boundaries
         */
        isPathSafe: (targetPath: string, allowedBase: string) => boolean;
        /**
         * Creates a safe file path within a base directory
         */
        safeJoin: (basePath: string, ...paths: string[]) => string;
    };
    commandSecurity: {
        /**
         * Safely executes a command with arguments, preventing command injection
         */
        safeExecFile(command: string, args: string[], options?: {
            cwd?: string;
            timeout?: number;
            maxBuffer?: number;
            env?: Record<string, string>;
        }): Promise<{
            stdout: string;
            stderr: string;
        }>;
        /**
         * Validates that a command argument is safe for execution
         */
        validateCommandArgs: (args: string[]) => string[];
    };
    sanitize: {
        /**
         * Sanitizes a string for safe display
         */
        string: (input: string, maxLength?: number) => string;
        /**
         * Sanitizes text for log messages (prevents log injection)
         */
        logMessage: (input: string) => string;
        /**
         * Sanitizes user input for file names
         */
        fileName: (input: string) => string;
        /**
         * Sanitizes content for YAML front matter
         */
        yamlContent: (input: string) => string;
    };
    envSecurity: {
        /**
         * Validates an environment variable name and value
         */
        validateEnvVar: (name: string, value?: string) => {
            name: string;
            value: string;
        };
        /**
         * Safely gets an environment variable with validation
         */
        getEnvVar: (name: string, defaultValue?: string) => string | undefined;
        /**
         * Validates multiple environment variables
         */
        validateEnvVars: (vars: Record<string, {
            required?: boolean;
            schema?: z.ZodSchema;
        }>) => Record<string, string>;
    };
    cryptoUtils: {
        /**
         * Generates a secure random string
         */
        generateSecureRandom: (length?: number) => string;
        /**
         * Generates a cryptographically secure random ID
         */
        generateSecureId: () => string;
        /**
         * Creates a secure hash of data
         */
        hash: (data: string) => string;
        /**
         * Verifies data integrity with HMAC
         */
        verifyHMAC: (data: string, signature: string, secret: string) => boolean;
    };
    RateLimiter: typeof RateLimiter;
    securityMiddleware: {
        /**
         * Rate limiting middleware
         */
        rateLimit: (limiter: RateLimiter, getIdentifier: (req: any) => string) => (req: any, res: any, next: any) => any;
        /**
         * Input validation middleware
         */
        validateInput: (schema: z.ZodSchema, source?: "body" | "query" | "params") => (req: any, res: any, next: any) => any;
    };
};
export default _default;
//# sourceMappingURL=security.d.ts.map