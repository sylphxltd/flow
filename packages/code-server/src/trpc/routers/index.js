/**
 * Root App Router
 * Combines all domain routers into a single tRPC router
 */
import { router } from '../trpc.js';
import { sessionRouter } from './session.router.js';
import { messageRouter } from './message.router.js';
import { todoRouter } from './todo.router.js';
import { configRouter } from './config.router.js';
/**
 * Main application router
 * Namespaced by domain for clarity
 */
export const appRouter = router({
    session: sessionRouter,
    message: messageRouter,
    todo: todoRouter,
    config: configRouter,
});
//# sourceMappingURL=index.js.map