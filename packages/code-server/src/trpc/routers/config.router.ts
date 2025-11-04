/**
 * Config Router
 * Backend-only configuration management (file system access)
 * REACTIVE: Emits events for all state changes
 */

import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, publicProcedure } from '../trpc.js';
import { loadAIConfig, saveAIConfig, getAIConfigPaths } from '@sylphx/code-core';
import { eventBus } from '../../services/event-bus.service.js';

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
   * Update default provider
   * REACTIVE: Emits config:default-provider-updated event
   */
  updateDefaultProvider: publicProcedure
    .input(
      z.object({
        provider: z.enum(['anthropic', 'openai', 'google', 'openrouter', 'claude-code', 'zai']),
        cwd: z.string().default(process.cwd()),
      })
    )
    .mutation(async ({ input }) => {
      const result = await loadAIConfig(input.cwd);
      if (result._tag === 'Failure') {
        return { success: false as const, error: result.error.message };
      }

      const updated = { ...result.value, defaultProvider: input.provider };
      const saveResult = await saveAIConfig(updated, input.cwd);

      if (saveResult._tag === 'Success') {
        eventBus.emitEvent({
          type: 'config:default-provider-updated',
          provider: input.provider,
        });
        return { success: true as const };
      }
      return { success: false as const, error: saveResult.error.message };
    }),

  /**
   * Update default model
   * REACTIVE: Emits config:default-model-updated event
   */
  updateDefaultModel: publicProcedure
    .input(
      z.object({
        model: z.string(),
        cwd: z.string().default(process.cwd()),
      })
    )
    .mutation(async ({ input }) => {
      const result = await loadAIConfig(input.cwd);
      if (result._tag === 'Failure') {
        return { success: false as const, error: result.error.message };
      }

      const updated = { ...result.value, defaultModel: input.model };
      const saveResult = await saveAIConfig(updated, input.cwd);

      if (saveResult._tag === 'Success') {
        eventBus.emitEvent({
          type: 'config:default-model-updated',
          model: input.model,
        });
        return { success: true as const };
      }
      return { success: false as const, error: saveResult.error.message };
    }),

  /**
   * Update provider configuration
   * REACTIVE: Emits config:provider-updated or config:provider-added event
   */
  updateProviderConfig: publicProcedure
    .input(
      z.object({
        providerId: z.string(),
        config: z.record(z.any()), // Provider-specific config
        cwd: z.string().default(process.cwd()),
      })
    )
    .mutation(async ({ input }) => {
      const result = await loadAIConfig(input.cwd);
      if (result._tag === 'Failure') {
        return { success: false as const, error: result.error.message };
      }

      const isNewProvider = !result.value.providers?.[input.providerId];
      const updated = {
        ...result.value,
        providers: {
          ...result.value.providers,
          [input.providerId]: input.config,
        },
      };

      const saveResult = await saveAIConfig(updated, input.cwd);

      if (saveResult._tag === 'Success') {
        if (isNewProvider) {
          eventBus.emitEvent({
            type: 'config:provider-added',
            providerId: input.providerId,
            config: input.config,
          });
        } else {
          // Emit events for each changed field
          const oldConfig = result.value.providers?.[input.providerId] || {};
          for (const [field, value] of Object.entries(input.config)) {
            if (oldConfig[field] !== value) {
              eventBus.emitEvent({
                type: 'config:provider-updated',
                providerId: input.providerId,
                field,
                value,
              });
            }
          }
        }
        return { success: true as const };
      }
      return { success: false as const, error: saveResult.error.message };
    }),

  /**
   * Remove provider configuration
   * REACTIVE: Emits config:provider-removed event
   */
  removeProvider: publicProcedure
    .input(
      z.object({
        providerId: z.string(),
        cwd: z.string().default(process.cwd()),
      })
    )
    .mutation(async ({ input }) => {
      const result = await loadAIConfig(input.cwd);
      if (result._tag === 'Failure') {
        return { success: false as const, error: result.error.message };
      }

      const providers = { ...result.value.providers };
      delete providers[input.providerId];

      const updated = { ...result.value, providers };
      const saveResult = await saveAIConfig(updated, input.cwd);

      if (saveResult._tag === 'Success') {
        eventBus.emitEvent({
          type: 'config:provider-removed',
          providerId: input.providerId,
        });
        return { success: true as const };
      }
      return { success: false as const, error: saveResult.error.message };
    }),

  /**
   * Save AI config to file system
   * Backend writes files, UI stays clean
   * REACTIVE: Emits config-updated event
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
        // Emit event for reactive clients
        eventBus.emitEvent({
          type: 'config-updated',
          config: input.config,
        });

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

  /**
   * Subscribe to config changes (SUBSCRIPTION)
   * Real-time sync for all clients with fine-grained events
   *
   * Emits events:
   * - config-updated: Full config save (coarse-grained)
   * - config:default-provider-updated: Default provider changed
   * - config:default-model-updated: Default model changed
   * - config:provider-added: New provider added
   * - config:provider-updated: Provider field updated
   * - config:provider-removed: Provider removed
   */
  onChange: publicProcedure
    .input(
      z.object({
        providerId: z.string().optional(), // Optional - filter by provider
      })
    )
    .subscription(({ input }) => {
      return observable<
        | { type: 'config-updated'; config: any }
        | { type: 'config:default-provider-updated'; provider: string }
        | { type: 'config:default-model-updated'; model: string }
        | { type: 'config:provider-added'; providerId: string; config: any }
        | { type: 'config:provider-updated'; providerId: string; field: string; value: any }
        | { type: 'config:provider-removed'; providerId: string }
      >((emit) => {
        // Subscribe to event bus
        const unsubscribe = eventBus.onAppEvent((event) => {
          // Filter config events
          if (
            event.type === 'config-updated' ||
            event.type === 'config:default-provider-updated' ||
            event.type === 'config:default-model-updated'
          ) {
            emit.next(event);
          } else if (
            event.type === 'config:provider-added' ||
            event.type === 'config:provider-updated' ||
            event.type === 'config:provider-removed'
          ) {
            // If providerId filter provided, only emit matching events
            if (!input.providerId || event.providerId === input.providerId) {
              emit.next(event);
            }
          }
        });

        // Cleanup on unsubscribe
        return () => {
          unsubscribe();
        };
      });
    }),
});
