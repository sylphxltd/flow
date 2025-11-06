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
declare const SessionEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"session-created">;
    sessionId: z.ZodString;
    provider: z.ZodString;
    model: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-updated">;
    sessionId: z.ZodString;
    field: z.ZodEnum<{
        model: "model";
        provider: "provider";
        title: "title";
        enabledRuleIds: "enabledRuleIds";
    }>;
    value: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-deleted">;
    sessionId: z.ZodString;
}, z.core.$strip>], "type">;
declare const TodoEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"todos-updated">;
    sessionId: z.ZodString;
    todos: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
        activeForm: z.ZodString;
        status: z.ZodEnum<{
            pending: "pending";
            in_progress: "in_progress";
            completed: "completed";
        }>;
        ordering: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>], "type">;
declare const MessageEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"message-added">;
    sessionId: z.ZodString;
    messageId: z.ZodString;
    role: z.ZodEnum<{
        assistant: "assistant";
        user: "user";
    }>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"message-updated">;
    messageId: z.ZodString;
    field: z.ZodEnum<{
        status: "status";
        usage: "usage";
        parts: "parts";
    }>;
}, z.core.$strip>], "type">;
declare const ConfigEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"config-updated">;
    config: z.ZodAny;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config:default-provider-updated">;
    provider: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config:default-model-updated">;
    model: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config:provider-added">;
    providerId: z.ZodString;
    config: z.ZodAny;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config:provider-updated">;
    providerId: z.ZodString;
    field: z.ZodString;
    value: z.ZodAny;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config:provider-removed">;
    providerId: z.ZodString;
}, z.core.$strip>], "type">;
declare const AppEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"session-created">;
    sessionId: z.ZodString;
    provider: z.ZodString;
    model: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-updated">;
    sessionId: z.ZodString;
    field: z.ZodEnum<{
        model: "model";
        provider: "provider";
        title: "title";
        enabledRuleIds: "enabledRuleIds";
    }>;
    value: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"session-deleted">;
    sessionId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"todos-updated">;
    sessionId: z.ZodString;
    todos: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        content: z.ZodString;
        activeForm: z.ZodString;
        status: z.ZodEnum<{
            pending: "pending";
            in_progress: "in_progress";
            completed: "completed";
        }>;
        ordering: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"message-added">;
    sessionId: z.ZodString;
    messageId: z.ZodString;
    role: z.ZodEnum<{
        assistant: "assistant";
        user: "user";
    }>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"message-updated">;
    messageId: z.ZodString;
    field: z.ZodEnum<{
        status: "status";
        usage: "usage";
        parts: "parts";
    }>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config-updated">;
    config: z.ZodAny;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config:default-provider-updated">;
    provider: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config:default-model-updated">;
    model: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config:provider-added">;
    providerId: z.ZodString;
    config: z.ZodAny;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config:provider-updated">;
    providerId: z.ZodString;
    field: z.ZodString;
    value: z.ZodAny;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"config:provider-removed">;
    providerId: z.ZodString;
}, z.core.$strip>], "type">;
export type AppEvent = z.infer<typeof AppEventSchema>;
export type SessionEvent = z.infer<typeof SessionEventSchema>;
export type TodoEvent = z.infer<typeof TodoEventSchema>;
export type MessageEvent = z.infer<typeof MessageEventSchema>;
export type ConfigEvent = z.infer<typeof ConfigEventSchema>;
/**
 * Global event bus for server-side events
 * Singleton pattern - one instance per server process
 */
declare class EventBus extends EventEmitter {
    /**
     * Emit typed event
     * @param event Event to emit
     */
    emitEvent(event: AppEvent): void;
    /**
     * Subscribe to all app events
     * Returns unsubscribe function
     */
    onAppEvent(handler: (event: AppEvent) => void): () => void;
}
export declare const eventBus: EventBus;
export {};
//# sourceMappingURL=event-bus.service.d.ts.map