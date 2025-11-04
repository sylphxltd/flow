/**
 * Config Router
 * Backend-only configuration management (file system access)
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { loadAIConfig, saveAIConfig, getAIConfigPaths } from '@sylphx/code-core';

const AIConfigSchema = z.object({
  defaultProvider: z.enum(['anthropic', 'openai', 'google', 'openrouter', 'claude-code', 'zai']).optional(),
  defaultModel: z.string().optional(),
  providers: z.record(
    z.string(),
    z.object({
      defaultModel: z.string().optional(),
    }).passthrough()
  ).optional(),
});

export const configRouter = router({
  /**
   * Load AI config from file system
   * Backend reads files, UI stays clean
   */
  load: publicProcedure
    .input(z.object({ cwd: z.string().default(process.cwd()) }))
    .query(async ({ input }) => {
      const result = await loadAIConfig(input.cwd);
      if (result._tag === 'Success') {
        return { success: true as const, config: result.value };
      }
      // No config yet - return empty
      return { success: true as const, config: { providers: {} } };
    }),

  /**
   * Save AI config to file system
   * Backend writes files, UI stays clean
   */
  save: publicProcedure
    .input(
      z.object({
        config: AIConfigSchema,
        cwd: z.string().default(process.cwd()),
      })
    )
    .mutation(async ({ input }) => {
      const result = await saveAIConfig(input.config, input.cwd);
      if (result._tag === 'Success') {
        return { success: true as const };
      }
      return { success: false as const, error: result.error.message };
    }),

  /**
   * Get config file paths
   * Useful for debugging
   */
  getPaths: publicProcedure
    .input(z.object({ cwd: z.string().default(process.cwd()) }))
    .query(async ({ input }) => {
      return getAIConfigPaths(input.cwd);
    }),
});
