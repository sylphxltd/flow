/**
 * Config Router
 * Backend-only configuration management (file system access)
 * REACTIVE: Emits events for all state changes
 */

import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, publicProcedure } from '../trpc.js';
import { loadAIConfig, saveAIConfig, getAIConfigPaths, getProvider } from '@sylphx/code-core';
import type { AIConfig, ProviderId } from '@sylphx/code-core';
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

/**
 * Mask a sensitive value (show first 7 chars, rest as ***)
 * Examples:
 * - "sk-ant-1234567890" → "sk-ant-***"
 * - "AIzaSyABC123" → "AIzaSyA***"
 */
function maskSensitiveValue(value: string): string {
  if (typeof value !== 'string' || value.length === 0) return '***';

  const showChars = Math.min(7, Math.floor(value.length / 2));
  return value.substring(0, showChars) + '***';
}

/**
 * Sanitize AI config by masking sensitive fields
 * SECURITY: Uses provider ConfigField schema to determine which fields are secret
 *
 * @param config - Raw config from file system
 * @returns Sanitized config with masked sensitive fields
 */
function sanitizeAIConfig(config: AIConfig): AIConfig {
  if (!config.providers) {
    return config;
  }

  const sanitizedProviders: Record<string, any> = {};

  for (const [providerId, providerConfig] of Object.entries(config.providers)) {
    const sanitizedProvider: Record<string, any> = {};

    // Get provider schema to know which fields are secret
    let secretFields: Set<string>;
    try {
      const provider = getProvider(providerId as ProviderId);
      const configSchema = provider.getConfigSchema();
      // Extract field keys marked as secret
      secretFields = new Set(
        configSchema
          .filter(field => field.secret === true)
          .map(field => field.key)
      );
    } catch (error) {
      // Fallback: if provider not found, mask nothing (better than breaking)
      console.warn(`Provider ${providerId} not found for config sanitization`);
      secretFields = new Set();
    }

    for (const [fieldName, fieldValue] of Object.entries(providerConfig)) {
      if (secretFields.has(fieldName) && typeof fieldValue === 'string') {
        // Mask secret field
        sanitizedProvider[fieldName] = maskSensitiveValue(fieldValue);
      } else {
        // Keep non-secret field as-is
        sanitizedProvider[fieldName] = fieldValue;
      }
    }

    sanitizedProviders[providerId] = sanitizedProvider;
  }

  return {
    ...config,
    providers: sanitizedProviders,
  };
}

export const configRouter = router({
  /**
   * Load AI config from file system
   * Backend reads files, UI stays clean
   *
   * SECURITY: Sanitizes sensitive fields (API keys) before returning to client
   * - API keys are masked: "sk-ant-..." → "sk-ant-***" (shows first 7 chars)
   * - Other sensitive fields (passwords, tokens) also masked
   * - Non-sensitive fields (provider, model) returned as-is
   */
  load: publicProcedure
    .input(z.object({ cwd: z.string().default(process.cwd()) }))
    .query(async ({ input }) => {
      const result = await loadAIConfig(input.cwd);
      if (result._tag === 'Success') {
        // Sanitize config: mask sensitive fields
        const sanitizedConfig = sanitizeAIConfig(result.value);
        return { success: true as const, config: sanitizedConfig };
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
