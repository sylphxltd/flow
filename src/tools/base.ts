/**
 * Base Tool Definitions
 * Types and interfaces for AI SDK tools
 */

import type { CoreTool } from 'ai';
import { z } from 'zod';

/**
 * Tool definition for registering tools
 */
export interface ToolDefinition<TParams = any, TResult = any> {
  name: string;
  description: string;
  parameters: z.ZodSchema<TParams>;
  execute: (params: TParams) => Promise<TResult>;
}

/**
 * Convert ToolDefinition to AI SDK CoreTool format
 */
export function createCoreTool<TParams, TResult>(
  tool: ToolDefinition<TParams, TResult>
): CoreTool<TParams, TResult> {
  return {
    description: tool.description,
    parameters: tool.parameters,
    execute: tool.execute,
  };
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Create a successful tool result
 */
export function success(data: any): ToolResult {
  return { success: true, data };
}

/**
 * Create a failed tool result
 */
export function failure(error: string): ToolResult {
  return { success: false, error };
}
