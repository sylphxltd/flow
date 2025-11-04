/**
 * Todo Router
 * Efficient todo management per session
 */
import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
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
     */
    update: publicProcedure
        .input(z.object({
        sessionId: z.string(),
        todos: z.array(TodoSchema),
        nextTodoId: z.number(),
    }))
        .mutation(async ({ ctx, input }) => {
        await ctx.sessionRepository.updateTodos(input.sessionId, input.todos, input.nextTodoId);
    }),
});
//# sourceMappingURL=todo.router.js.map