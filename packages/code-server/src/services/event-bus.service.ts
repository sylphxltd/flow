/**
 * Event Bus Service
 * Central pub/sub system for reactive UI updates
 *
 * Architecture:
 * - Single source of truth for all state changes
 * - Type-safe events with Zod schemas
 * - Works with tRPC subscriptions for real-time sync
 */

import { EventEmitter } from 'node:events';
import { z } from 'zod';

// Event schemas for type safety
const SessionEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session-created'),
    sessionId: z.string(),
    provider: z.string(),
    model: z.string(),
  }),
  z.object({
    type: z.literal('session-updated'),
    sessionId: z.string(),
    field: z.enum(['title', 'model', 'provider', 'enabledRuleIds']),
    value: z.string(),
  }),
  z.object({
    type: z.literal('session-deleted'),
    sessionId: z.string(),
  }),
]);

const TodoEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('todos-updated'),
    sessionId: z.string(),
    todos: z.array(z.object({
      id: z.number(),
      content: z.string(),
      activeForm: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']),
      ordering: z.number(),
    })),
  }),
]);

const MessageEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('message-added'),
    sessionId: z.string(),
    messageId: z.string(),
    role: z.enum(['user', 'assistant']),
  }),
  z.object({
    type: z.literal('message-updated'),
    messageId: z.string(),
    field: z.enum(['parts', 'status', 'usage']),
  }),
]);

const ConfigEventSchema = z.discriminatedUnion('type', [
  // Coarse-grained: Full config update (for load/save)
  z.object({
    type: z.literal('config-updated'),
    config: z.any(),
  }),
  // Fine-grained: Specific field updates
  z.object({
    type: z.literal('config:default-provider-updated'),
    provider: z.string(),
  }),
  z.object({
    type: z.literal('config:default-model-updated'),
    model: z.string(),
  }),
  z.object({
    type: z.literal('config:provider-added'),
    providerId: z.string(),
    config: z.any(),
  }),
  z.object({
    type: z.literal('config:provider-updated'),
    providerId: z.string(),
    field: z.string(), // 'defaultModel', 'apiKey', etc.
    value: z.any(),
  }),
  z.object({
    type: z.literal('config:provider-removed'),
    providerId: z.string(),
  }),
]);

// Union of all events
const AppEventSchema = z.discriminatedUnion('type', [
  ...SessionEventSchema.options,
  ...TodoEventSchema.options,
  ...MessageEventSchema.options,
  ...ConfigEventSchema.options,
]);

export type AppEvent = z.infer<typeof AppEventSchema>;
export type SessionEvent = z.infer<typeof SessionEventSchema>;
export type TodoEvent = z.infer<typeof TodoEventSchema>;
export type MessageEvent = z.infer<typeof MessageEventSchema>;
export type ConfigEvent = z.infer<typeof ConfigEventSchema>;

/**
 * Global event bus for server-side events
 * Singleton pattern - one instance per server process
 */
class EventBus extends EventEmitter {
  /**
   * Emit typed event
   * @param event Event to emit
   */
  emitEvent(event: AppEvent): void {
    // Validate event shape
    const validated = AppEventSchema.parse(event);

    // Emit on specific channel
    this.emit('app-event', validated);
  }

  /**
   * Subscribe to all app events
   * Returns unsubscribe function
   */
  onAppEvent(handler: (event: AppEvent) => void): () => void {
    this.on('app-event', handler);
    return () => this.off('app-event', handler);
  }
}

// Export singleton instance
export const eventBus = new EventBus();
