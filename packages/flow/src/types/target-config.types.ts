import { z } from 'zod';

// ============================================================================
// TARGET CONFIGURATION INTERFACES
// ============================================================================

/**
 * Generic metadata structure for agents and configurations
 */
export interface AgentMetadata {
  /** Agent name or identifier */
  name?: string;
  /** Agent description */
  description?: string;
  /** Agent version */
  version?: string;
  /** Agent author */
  author?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Agent category or type */
  category?: string;
  /** Whether the agent is enabled */
  enabled?: boolean;
  /** Custom properties */
  properties?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt?: string;
  /** Last updated timestamp */
  updatedAt?: string;
  /** Source file path */
  sourcePath?: string;
}

/**
 * Target-specific configuration data structure
 */
export interface TargetConfigurationData {
  /** Core configuration settings */
  settings: Record<string, unknown>;
  /** MCP server configurations */
  mcpServers?: Record<string, unknown>;
  /** Agent-specific configurations */
  agents?: Record<string, AgentMetadata>;
  /** Extension-specific settings */
  extensions?: Record<string, unknown>;
  /** Custom user preferences */
  preferences?: Record<string, unknown>;
}

/**
 * Front matter metadata for markdown files
 */
export interface FrontMatterMetadata {
  /** Title of the document */
  title?: string;
  /** Description of the document */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Author information */
  author?: string;
  /** Creation date */
  date?: string;
  /** Last modified date */
  modified?: string;
  /** Document status (draft, published, etc.) */
  status?: 'draft' | 'published' | 'archived';
  /** Document category */
  category?: string;
  /** Custom metadata fields */
  [key: string]: unknown;
}

/**
 * OpenCode specific metadata structure
 */
export interface OpenCodeMetadata {
  /** Project name */
  name?: string;
  /** Project description */
  description?: string;
  /** Project version */
  version?: string;
  /** Author information */
  author?: string;
  /** Repository URL */
  repository?: string;
  /** License information */
  license?: string;
  /** Main entry point */
  main?: string;
  /** Scripts configuration */
  scripts?: Record<string, string>;
  /** Dependencies */
  dependencies?: Record<string, string>;
  /** Development dependencies */
  devDependencies?: Record<string, string>;
  /** Project keywords */
  keywords?: string[];
  /** Custom configuration */
  config?: Record<string, unknown>;
}

/**
 * Claude Code specific metadata structure
 */
export interface ClaudeCodeMetadata {
  /** Agent name */
  name?: string;
  /** Agent description */
  description?: string;
  /** Agent instructions */
  instructions?: string;
  /** Agent capabilities */
  capabilities?: string[];
  /** Agent tools */
  tools?: string[];
  /** Agent model configuration */
  model?: {
    name?: string;
    temperature?: number;
    maxTokens?: number;
  };
  /** Agent constraints */
  constraints?: string[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ZOD SCHEMAS FOR RUNTIME VALIDATION
// ============================================================================

/**
 * Zod schema for AgentMetadata
 */
export const AgentMetadataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  enabled: z.boolean().optional(),
  properties: z.record(z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  sourcePath: z.string().optional(),
});

/**
 * Zod schema for TargetConfigurationData
 */
export const TargetConfigurationDataSchema = z.object({
  settings: z.record(z.unknown()),
  mcpServers: z.record(z.unknown()).optional(),
  agents: z.record(AgentMetadataSchema).optional(),
  extensions: z.record(z.unknown()).optional(),
  preferences: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for FrontMatterMetadata
 */
export const FrontMatterMetadataSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    date: z.string().optional(),
    modified: z.string().optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    category: z.string().optional(),
  })
  .catchall(z.unknown());

/**
 * Zod schema for OpenCodeMetadata
 */
export const OpenCodeMetadataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  main: z.string().optional(),
  scripts: z.record(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

/**
 * Zod schema for ClaudeCodeMetadata
 */
export const ClaudeCodeMetadataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  model: z
    .object({
      name: z.string().optional(),
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
    })
    .optional(),
  constraints: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================================
// TYPE GUARDS FOR RUNTIME TYPE CHECKING
// ============================================================================

/**
 * Type guard to check if value is AgentMetadata
 */
export function isAgentMetadata(value: unknown): value is AgentMetadata {
  return AgentMetadataSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is TargetConfigurationData
 */
export function isTargetConfigurationData(value: unknown): value is TargetConfigurationData {
  return TargetConfigurationDataSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is FrontMatterMetadata
 */
export function isFrontMatterMetadata(value: unknown): value is FrontMatterMetadata {
  return FrontMatterMetadataSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is OpenCodeMetadata
 */
export function isOpenCodeMetadata(value: unknown): value is OpenCodeMetadata {
  return OpenCodeMetadataSchema.safeParse(value).success;
}

/**
 * Type guard to check if value is ClaudeCodeMetadata
 */
export function isClaudeCodeMetadata(value: unknown): value is ClaudeCodeMetadata {
  return ClaudeCodeMetadataSchema.safeParse(value).success;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic configuration object with dynamic properties
 */
export type DynamicConfig<T = Record<string, unknown>> = T & {
  [key: string]: unknown;
};

/**
 * Generic transformation result
 */
export interface TransformationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

/**
 * Generic validation result
 */
export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

/**
 * Generic operation result with metadata
 */
export interface OperationResult<T = unknown, M = Record<string, unknown>> {
  success: boolean;
  data?: T;
  metadata?: M;
  error?: string;
  timestamp: string;
}
