import { z } from 'zod';

// ============================================================================
// MCP SERVER CONFIGURATION INTERFACES
// ============================================================================

/**
 * Base MCP server configuration with common fields
 */
export interface BaseMCPServerConfig {
  /** Server identifier */
  id?: string;
  /** Server name */
  name?: string;
  /** Server description */
  description?: string;
  /** Whether the server is enabled */
  enabled?: boolean;
  /** Server tags for categorization */
  tags?: string[];
  /** Custom server properties */
  properties?: Record<string, unknown>;
}

/**
 * Enhanced MCP server configuration for stdio type
 */
export interface EnhancedMCPServerConfig extends BaseMCPServerConfig {
  type: 'stdio';
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Working directory */
  cwd?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    attempts?: number;
    delay?: number;
  };
}

/**
 * Enhanced MCP server configuration for HTTP type
 */
export interface EnhancedMCPServerConfigHTTP extends BaseMCPServerConfig {
  type: 'http';
  /** Server URL */
  url: string;
  /** HTTP headers */
  headers?: Record<string, string>;
  /** Authentication configuration */
  auth?: {
    type: 'bearer' | 'basic' | 'api-key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
  };
  /** Request timeout */
  timeout?: number;
  /** SSL configuration */
  ssl?: {
    rejectUnauthorized?: boolean;
    cert?: string;
    key?: string;
    ca?: string;
  };
}

/**
 * Enhanced MCP server configuration for legacy local type
 */
export interface EnhancedMCPServerConfigLegacy extends BaseMCPServerConfig {
  type: 'local';
  /** Command and arguments as array */
  command: string[];
  /** Environment variables */
  environment?: Record<string, string>;
  /** Working directory */
  cwd?: string;
  /** Shell configuration */
  shell?: boolean | string;
}

/**
 * Enhanced MCP server configuration for legacy remote type
 */
export interface EnhancedMCPServerConfigHTTPLegacy extends BaseMCPServerConfig {
  type: 'remote';
  /** Server URL */
  url: string;
  /** HTTP headers */
  headers?: Record<string, string>;
  /** Authentication information */
  auth?: Record<string, string>;
  /** Request timeout */
  timeout?: number;
}

/**
 * Union type for all enhanced MCP server configurations
 */
export type EnhancedMCPServerConfigUnion =
  | EnhancedMCPServerConfig
  | EnhancedMCPServerConfigHTTP
  | EnhancedMCPServerConfigLegacy
  | EnhancedMCPServerConfigHTTPLegacy;

/**
 * MCP server registry configuration
 */
export interface MCPServerRegistryConfig {
  /** Registry name */
  name: string;
  /** Registry URL */
  url: string;
  /** Authentication configuration */
  auth?: {
    type: 'bearer' | 'basic';
    token?: string;
    username?: string;
    password?: string;
  };
  /** Cache configuration */
  cache?: {
    enabled?: boolean;
    ttl?: number;
    maxSize?: number;
  };
  /** Registry metadata */
  metadata?: Record<string, unknown>;
}

/**
 * MCP server transformation options
 */
export interface MCPTransformationOptions {
  /** Target server ID */
  serverId?: string;
  /** Target environment */
  environment?: 'development' | 'production' | 'testing';
  /** Whether to validate configuration */
  validate?: boolean;
  /** Whether to normalize configuration */
  normalize?: boolean;
  /** Custom transformation rules */
  rules?: TransformationRule[];
}

/**
 * Transformation rule for MCP configurations
 */
export interface TransformationRule {
  /** Rule name */
  name: string;
  /** Rule type */
  type: 'map' | 'filter' | 'validate' | 'transform';
  /** Rule condition */
  condition?: (config: EnhancedMCPServerConfigUnion) => boolean;
  /** Rule transformation function */
  transform: (config: EnhancedMCPServerConfigUnion) => EnhancedMCPServerConfigUnion;
  /** Rule priority */
  priority?: number;
}

/**
 * MCP server validation result
 */
export interface MCPServerValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validated configuration */
  config?: EnhancedMCPServerConfigUnion;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Validation metadata */
  metadata?: {
    validatedAt: string;
    validatorVersion: string;
  };
}

// ============================================================================
// ZOD SCHEMAS FOR RUNTIME VALIDATION
// ============================================================================

/**
 * Base schema for MCP server configurations
 */
const BaseMCPServerConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  properties: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for EnhancedMCPServerConfig
 */
export const EnhancedMCPServerConfigSchema = BaseMCPServerConfigSchema.extend({
  type: z.literal('stdio'),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  timeout: z.number().optional(),
  retry: z
    .object({
      attempts: z.number().optional(),
      delay: z.number().optional(),
    })
    .optional(),
});

/**
 * Zod schema for EnhancedMCPServerConfigHTTP
 */
export const EnhancedMCPServerConfigHTTPSchema = BaseMCPServerConfigSchema.extend({
  type: z.literal('http'),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  auth: z
    .object({
      type: z.enum(['bearer', 'basic', 'api-key']),
      token: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      apiKey: z.string().optional(),
    })
    .optional(),
  timeout: z.number().optional(),
  ssl: z
    .object({
      rejectUnauthorized: z.boolean().optional(),
      cert: z.string().optional(),
      key: z.string().optional(),
      ca: z.string().optional(),
    })
    .optional(),
});

/**
 * Zod schema for EnhancedMCPServerConfigLegacy
 */
export const EnhancedMCPServerConfigLegacySchema = BaseMCPServerConfigSchema.extend({
  type: z.literal('local'),
  command: z.array(z.string()),
  environment: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  shell: z.union([z.boolean(), z.string()]).optional(),
});

/**
 * Zod schema for EnhancedMCPServerConfigHTTPLegacy
 */
export const EnhancedMCPServerConfigHTTPLegacySchema = BaseMCPServerConfigSchema.extend({
  type: z.literal('remote'),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  auth: z.record(z.string()).optional(),
  timeout: z.number().optional(),
});

/**
 * Zod schema for EnhancedMCPServerConfigUnion
 */
export const EnhancedMCPServerConfigUnionSchema = z.discriminatedUnion('type', [
  EnhancedMCPServerConfigSchema,
  EnhancedMCPServerConfigHTTPSchema,
  EnhancedMCPServerConfigLegacySchema,
  EnhancedMCPServerConfigHTTPLegacySchema,
]);

/**
 * Zod schema for MCPServerRegistryConfig
 */
export const MCPServerRegistryConfigSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  auth: z
    .object({
      type: z.enum(['bearer', 'basic']),
      token: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
  cache: z
    .object({
      enabled: z.boolean().optional(),
      ttl: z.number().optional(),
      maxSize: z.number().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for MCPTransformationOptions
 */
export const MCPTransformationOptionsSchema = z.object({
  serverId: z.string().optional(),
  environment: z.enum(['development', 'production', 'testing']).optional(),
  validate: z.boolean().optional(),
  normalize: z.boolean().optional(),
  rules: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(['map', 'filter', 'validate', 'transform']),
        condition: z.function().optional(),
        transform: z.function(),
        priority: z.number().optional(),
      })
    )
    .optional(),
});

/**
 * Zod schema for MCPServerValidationResult
 */
export const MCPServerValidationResultSchema = z.object({
  isValid: z.boolean(),
  config: EnhancedMCPServerConfigUnionSchema.optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  metadata: z
    .object({
      validatedAt: z.string(),
      validatorVersion: z.string(),
    })
    .optional(),
});

// ============================================================================
// TYPE GUARDS FOR RUNTIME TYPE CHECKING
// ============================================================================

/**
 * Type guard to check if value is EnhancedMCPServerConfig
 */
export function isEnhancedMCPServerConfig(value: unknown): value is EnhancedMCPServerConfig {
  return EnhancedMCPServerConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is EnhancedMCPServerConfigHTTP
 */
export function isEnhancedMCPServerConfigHTTP(
  value: unknown
): value is EnhancedMCPServerConfigHTTP {
  return EnhancedMCPServerConfigHTTPSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is EnhancedMCPServerConfigLegacy
 */
export function isEnhancedMCPServerConfigLegacy(
  value: unknown
): value is EnhancedMCPServerConfigLegacy {
  return EnhancedMCPServerConfigLegacySchema.safeParse(value).success;
}

/**
 * Type guard to check if value is EnhancedMCPServerConfigHTTPLegacy
 */
export function isEnhancedMCPServerConfigHTTPLegacy(
  value: unknown
): value is EnhancedMCPServerConfigHTTPLegacy {
  return EnhancedMCPServerConfigHTTPLegacySchema.safeParse(value).success;
}

/**
 * Type guard to check if value is EnhancedMCPServerConfigUnion
 */
export function isEnhancedMCPServerConfigUnion(
  value: unknown
): value is EnhancedMCPServerConfigUnion {
  return EnhancedMCPServerConfigUnionSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is MCPServerRegistryConfig
 */
export function isMCPServerRegistryConfig(value: unknown): value is MCPServerRegistryConfig {
  return MCPServerRegistryConfigSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is MCPServerValidationResult
 */
export function isMCPServerValidationResult(value: unknown): value is MCPServerValidationResult {
  return MCPServerValidationResultSchema.safeParse(value).success;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate MCP server configuration
 */
export function validateMCPServerConfig(config: unknown): MCPServerValidationResult {
  const result = EnhancedMCPServerConfigUnionSchema.safeParse(config);

  if (result.success) {
    return {
      isValid: true,
      config: result.data,
      errors: [],
      warnings: [],
      metadata: {
        validatedAt: new Date().toISOString(),
        validatorVersion: '1.0.0',
      },
    };
  } else {
    return {
      isValid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      warnings: [],
      metadata: {
        validatedAt: new Date().toISOString(),
        validatorVersion: '1.0.0',
      },
    };
  }
}

/**
 * Transform legacy MCP config to enhanced config
 */
export function transformLegacyToEnhanced(
  legacyConfig: unknown
): EnhancedMCPServerConfigUnion | null {
  // This would contain the transformation logic
  // For now, just validate and return if valid
  const result = EnhancedMCPServerConfigUnionSchema.safeParse(legacyConfig);
  return result.success ? result.data : null;
}
