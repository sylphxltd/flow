/**
 * Todo Router
 * Efficient todo management per session
 * REACTIVE: Emits events for all state changes
 */

import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { router, publicProcedure } from '../trpc.js';
import { eventBus } from '../../services/event-bus.service.js';

const TodoSchema = z.object({
  id: z.number(),
  content: z.string(),
  activeForm: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  ordering: z.number(),
});

export const todoRouter = router({
  /**
   * Update todos for session
   * Atomically replaces all todos
   * REACTIVE: Emits todos-updated event
   */
  update: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        todos: z.array(TodoSchema),
        nextTodoId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.sessionRepository.updateTodos(input.sessionId, input.todos, input.nextTodoId);

      // Emit event for reactive clients
      eventBus.emitEvent({
        type: 'todos-updated',
        sessionId: input.sessionId,
        todos: input.todos,
      });
    }),

  /**
   * Subscribe to todo changes (SUBSCRIPTION)
   * Real-time sync for all clients
   *
   * Emits events:
   * - todos-updated: Todo list changed for a session
   */
  onChange: publicProcedure
    .input(
      z.object({
        sessionId: z.string().optional(), // Optional - subscribe to all if not provided
      })
    )
    .subscription(({ input }) => {
      return observable<{
        type: 'todos-updated';
        sessionId: string;
        todos: Array<{
          id: number;
          content: string;
          activeForm: string;
          status: 'pending' | 'in_progress' | 'completed';
          ordering: number;
        }>;
      }>((emit) => {
        // Subscribe to event bus
        const unsubscribe = eventBus.onAppEvent((event) => {
          // Filter todo events
          if (event.type === 'todos-updated') {
            // If sessionId filter provided, only emit matching events
            if (!input.sessionId || event.sessionId === input.sessionId) {
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
