/**
 * Base Tool Definitions
 * Types and interfaces for AI SDK tools
 */

import { zodSchema, type Tool } from 'ai';
import type { z } from 'zod';

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
 * Convert ToolDefinition to AI SDK Tool format
 */
export function createTool<TParams, TResult>(
  def: ToolDefinition<TParams, TResult>
): Tool<TParams, TResult> {
  return {
    description: def.description,
    inputSchema: zodSchema(def.parameters),
    type: 'function' as const,
    execute: async (params, options) => {
      console.log(`[Tool Execute] ${def.name} called with params:`, JSON.stringify(params));
      const result = await def.execute(params);
      console.log(`[Tool Execute] ${def.name} result:`, JSON.stringify(result));
      // Unwrap ToolResult format for AI SDK
      if (result && typeof result === 'object' && 'success' in result) {
        const toolResult = result as ToolResult;
        if (!toolResult.success) {
          throw new Error(toolResult.error || 'Tool execution failed');
        }
        return toolResult.data as TResult;
      }
      return result;
    },
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
