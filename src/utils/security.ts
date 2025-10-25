/**
 * Security utilities for input validation, sanitization, and safe operations
 * Implements defense-in-depth security principles
 */

import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const execFileAsync = promisify(execFile);

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

/**
 * Security-focused validation schemas
 */
export const securitySchemas = {
  /** Project name validation - prevents command injection and path traversal */
  projectName: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name too long')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Project name can only contain letters, numbers, hyphens, and underscores'
    )
    .refine((name) => !/^\.+$/.test(name), 'Project name cannot be only dots')
    .refine((name) => !/[<>:"|?*]/.test(name), 'Project name contains invalid characters'),

  /** Branch name validation - prevents command injection */
  branchName: z
    .string()
    .min(1, 'Branch name is required')
    .max(255, 'Branch name too long')
    .regex(
      /^[a-zA-Z0-9/_-]+$/,
      'Branch name can only contain letters, numbers, slashes, hyphens, and underscores'
    )
    .refine((name) => !name.includes('..'), 'Branch name cannot contain ".."')
    .refine((name) => !/^[/\\]/.test(name), 'Branch name cannot start with path separators')
    .refine((name) => !/[<>:"|?*$]/.test(name), 'Branch name contains invalid characters'),

  /** File path validation - prevents path traversal */
  filePath: z
    .string()
    .min(1, 'File path is required')
    .max(1000, 'File path too long')
    .refine(
      (filePath) => !filePath.includes('..'),
      'File path cannot contain ".." for path traversal protection'
    )
    .refine((filePath) => !/^[<>:"|?*]/.test(filePath), 'File path contains invalid characters'),

  /** Command argument validation - prevents command injection */
  commandArg: z
    .string()
    .max(1000, 'Command argument too long')
    .refine(
      (arg) => !/[<>|;&$`'"\\]/.test(arg),
      'Command argument contains potentially dangerous characters'
    ),

  /** Environment variable validation */
  envVarName: z
    .string()
    .regex(/^[A-Z_][A-Z0-9_]*$/, 'Invalid environment variable name format')
    .max(100, 'Environment variable name too long'),

  /** URL validation for API endpoints */
  url: z
    .string()
    .url('Invalid URL format')
    .refine(
      (url) => url.startsWith('https://') || url.startsWith('http://localhost'),
      'URL must be HTTPS or localhost'
    )
    .refine((url) => !url.includes('javascript:'), 'URL cannot contain javascript protocol'),

  /** API key validation */
  apiKey: z
    .string()
    .min(10, 'API key too short')
    .max(500, 'API key too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid API key format'),
};

// ============================================================================
// PATH SECURITY UTILITIES
// ============================================================================

/**
 * Secure path utilities to prevent path traversal attacks
 */
export const pathSecurity = {
  /**
   * Validates and sanitizes a file path to prevent path traversal
   */
  validatePath: (inputPath: string, allowedBase?: string): string => {
    const validated = securitySchemas.filePath.parse(inputPath);

    // Normalize the path
    const normalizedPath = path.normalize(validated);

    // Check for path traversal attempts
    if (normalizedPath.includes('..')) {
      throw new Error('Path traversal detected in file path');
    }

    // If base path is provided, ensure the resolved path is within bounds
    if (allowedBase) {
      const resolvedPath = path.resolve(allowedBase, normalizedPath);
      const resolvedBase = path.resolve(allowedBase);

      if (!resolvedPath.startsWith(resolvedBase)) {
        throw new Error('File path escapes allowed base directory');
      }

      return resolvedPath;
    }

    return normalizedPath;
  },

  /**
   * Checks if a path is within allowed boundaries
   */
  isPathSafe: (targetPath: string, allowedBase: string): boolean => {
    try {
      const resolvedTarget = path.resolve(targetPath);
      const resolvedBase = path.resolve(allowedBase);
      return resolvedTarget.startsWith(resolvedBase);
    } catch {
      return false;
    }
  },

  /**
   * Creates a safe file path within a base directory
   */
  safeJoin: (basePath: string, ...paths: string[]): string => {
    const result = path.join(basePath, ...paths);

    // Normalize and verify it stays within base
    const normalized = path.normalize(result);
    const resolvedBase = path.resolve(basePath);
    const resolvedResult = path.resolve(normalized);

    if (!resolvedResult.startsWith(resolvedBase)) {
      throw new Error('Path traversal attempt detected in safeJoin');
    }

    return resolvedResult;
  },
};

// ============================================================================
// COMMAND EXECUTION SECURITY
// ============================================================================

/**
 * Secure command execution utilities to prevent command injection
 */
export const commandSecurity = {
  /**
   * Safely executes a command with arguments, preventing command injection
   */
  async safeExecFile(
    command: string,
    args: string[],
    options: {
      cwd?: string;
      timeout?: number;
      maxBuffer?: number;
      env?: Record<string, string>;
    } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    // Validate command
    if (!/^[a-zA-Z0-9._-]+$/.test(command)) {
      throw new Error(`Invalid command: ${command}`);
    }

    // Validate arguments
    const validatedArgs = args.map((arg) => {
      try {
        return securitySchemas.commandArg.parse(arg);
      } catch (_error) {
        throw new Error(`Invalid command argument: ${arg}`);
      }
    });

    // Set secure defaults
    const secureOptions = {
      timeout: options.timeout || 30000, // 30 seconds default
      maxBuffer: options.maxBuffer || 1024 * 1024, // 1MB default
      env: { ...process.env, ...options.env },
      cwd: options.cwd || process.cwd(),
      shell: false, // Never use shell to prevent injection
      encoding: 'utf8' as const,
    };

    // Validate working directory
    if (secureOptions.cwd) {
      pathSecurity.validatePath(secureOptions.cwd);
    }

    try {
      return await execFileAsync(command, validatedArgs, secureOptions);
    } catch (error: any) {
      // Sanitize error message to prevent information disclosure
      const sanitizedError = new Error(`Command execution failed: ${command}`);
      sanitizedError.code = error.code;
      sanitizedError.signal = error.signal;
      throw sanitizedError;
    }
  },

  /**
   * Validates that a command argument is safe for execution
   */
  validateCommandArgs: (args: string[]): string[] => {
    return args.map((arg) => {
      const validated = securitySchemas.commandArg.parse(arg);

      // Additional checks for common injection patterns
      const dangerousPatterns = [
        /[;&|`'"\\$()]/,
        /\.\./,
        /\/etc\//,
        /\/proc\//,
        /windows\\system32/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(validated)) {
          throw new Error(`Dangerous pattern detected in command argument: ${arg}`);
        }
      }

      return validated;
    });
  },
};

// ============================================================================
// INPUT SANITIZATION UTILITIES
// ============================================================================

/**
 * Input sanitization utilities
 */
export const sanitize = {
  /**
   * Sanitizes a string for safe display
   */
  string: (input: string, maxLength = 1000): string => {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove null bytes and control characters except newlines and tabs
    const sanitized = input
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .substring(0, maxLength);

    return sanitized;
  },

  /**
   * Sanitizes text for log messages (prevents log injection)
   */
  logMessage: (input: string): string => {
    return input
      .replace(/[\r\n]/g, ' ') // Remove line breaks
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .substring(0, 500); // Limit length
  },

  /**
   * Sanitizes user input for file names
   */
  fileName: (input: string): string => {
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  },

  /**
   * Sanitizes content for YAML front matter
   */
  yamlContent: (input: string): string => {
    // Basic YAML sanitization - remove potentially dangerous content
    return input
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/<!\[CDATA\[.*?\]\]>/gs, '') // Remove CDATA sections
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove scripts
  },
};

// ============================================================================
// ENVIRONMENT VARIABLE SECURITY
// ============================================================================

/**
 * Environment variable validation utilities
 */
export const envSecurity = {
  /**
   * Validates an environment variable name and value
   */
  validateEnvVar: (name: string, value?: string): { name: string; value: string } => {
    const validatedName = securitySchemas.envVarName.parse(name);

    if (value === undefined) {
      throw new Error(`Environment variable ${validatedName} is required but not set`);
    }

    // Validate based on variable type
    if (validatedName.includes('URL') || validatedName.includes('BASE_URL')) {
      securitySchemas.url.parse(value);
    } else if (validatedName.includes('KEY') || validatedName.includes('SECRET')) {
      // For keys, check minimum length and allowed characters
      if (value.length < 10) {
        throw new Error(`API key ${validatedName} is too short`);
      }
    }

    return { name: validatedName, value };
  },

  /**
   * Safely gets an environment variable with validation
   */
  getEnvVar: (name: string, defaultValue?: string): string | undefined => {
    try {
      const value = process.env[name];
      if (value === undefined) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new Error(`Environment variable ${name} is not set`);
      }

      const validated = envSecurity.validateEnvVar(name, value);
      return validated.value;
    } catch (error) {
      console.warn(`Environment variable validation failed for ${name}:`, error);
      return defaultValue;
    }
  },

  /**
   * Validates multiple environment variables
   */
  validateEnvVars: (
    vars: Record<string, { required?: boolean; schema?: z.ZodSchema }>
  ): Record<string, string> => {
    const result: Record<string, string> = {};

    for (const [name, config] of Object.entries(vars)) {
      const value = process.env[name];

      if (value === undefined) {
        if (config.required) {
          throw new Error(`Required environment variable ${name} is not set`);
        }
        continue;
      }

      try {
        // Use custom schema if provided, otherwise use default validation
        if (config.schema) {
          result[name] = config.schema.parse(value);
        } else {
          const validated = envSecurity.validateEnvVar(name, value);
          result[name] = validated.value;
        }
      } catch (error) {
        throw new Error(`Environment variable ${name} validation failed: ${error}`);
      }
    }

    return result;
  },
};

// ============================================================================
// CRYPTOGRAPHIC UTILITIES
// ============================================================================

/**
 * Cryptographic utilities for security
 */
export const cryptoUtils = {
  /**
   * Generates a secure random string
   */
  generateSecureRandom: (length = 32): string => {
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Generates a cryptographically secure random ID
   */
  generateSecureId: (): string => {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `${timestamp}-${random}`;
  },

  /**
   * Creates a secure hash of data
   */
  hash: (data: string): string => {
    return crypto.createHash('sha256').update(data).digest('hex');
  },

  /**
   * Verifies data integrity with HMAC
   */
  verifyHMAC: (data: string, signature: string, secret: string): boolean => {
    const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  },
};

// ============================================================================
// RATE LIMITING UTILITIES
// ============================================================================

/**
 * Simple in-memory rate limiting
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests = 100,
    private windowMs = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    let timestamps = this.requests.get(identifier) || [];

    // Remove old requests outside the window
    timestamps = timestamps.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    timestamps.push(now);
    this.requests.set(identifier, timestamps);

    return true;
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter((timestamp) => timestamp > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, filtered);
      }
    }
  }
}

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

/**
 * Security middleware for common patterns
 */
export const securityMiddleware = {
  /**
   * Rate limiting middleware
   */
  rateLimit: (limiter: RateLimiter, getIdentifier: (req: any) => string) => {
    return (req: any, res: any, next: any) => {
      const identifier = getIdentifier(req);

      if (!limiter.isAllowed(identifier)) {
        return res.status(429).json({ error: 'Too many requests' });
      }

      next();
    };
  },

  /**
   * Input validation middleware
   */
  validateInput: (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return (req: any, res: any, next: any) => {
      try {
        const data = req[source];
        const validated = schema.parse(data);
        req[source] = validated;
        next();
      } catch (error) {
        return res.status(400).json({ error: 'Invalid input', details: error });
      }
    };
  },
};

export default {
  securitySchemas,
  pathSecurity,
  commandSecurity,
  sanitize,
  envSecurity,
  cryptoUtils,
  RateLimiter,
  securityMiddleware,
};
