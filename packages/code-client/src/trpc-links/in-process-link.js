/**
 * In-Process tRPC Link
 * Zero-overhead communication via direct function calls
 *
 * Inspired by graphql-yoga's execute() pattern
 * Performance: ~0.1ms vs ~3ms for HTTP localhost
 *
 * Usage:
 * ```typescript
 * import { CodeServer } from '@sylphx/code-server';
 * import { inProcessLink } from '@sylphx/code-client';
 *
 * const server = new CodeServer();
 * await server.initialize();
 *
 * const client = createTRPCClient({
 *   links: [inProcessLink({
 *     router: server.getRouter(),
 *     createContext: server.getContext()
 *   })]
 * });
 * ```
 */
import { observable } from '@trpc/server/observable';
/**
 * Create in-process tRPC link for zero-overhead communication
 * Uses tRPC server-side caller API for proper procedure invocation
 */
export function inProcessLink(options) {
    return () => {
        return ({ op, next }) => {
            return observable((observer) => {
                const { type, path, input } = op;
                // Execute procedure via server-side caller
                (async () => {
                    try {
                        // Create context for this request
                        const ctx = await options.createContext();
                        // Create server-side caller with context
                        const caller = options.router.createCaller(ctx);
                        // Navigate to the procedure using path (e.g., 'session.getLast')
                        const procedureFn = getProcedureFunction(caller, path);
                        if (!procedureFn) {
                            throw new Error(`Procedure not found: ${path}`);
                        }
                        // Execute procedure based on type
                        if (type === 'query' || type === 'mutation') {
                            // Regular query/mutation
                            const result = await procedureFn(input);
                            observer.next({ result: { type: 'data', data: result } });
                            observer.complete();
                        }
                        else if (type === 'subscription') {
                            // Subscription - stream results
                            const subscription = await procedureFn(input);
                            if (Symbol.asyncIterator in subscription) {
                                // Async iterable subscription
                                for await (const data of subscription) {
                                    observer.next({ result: { type: 'data', data } });
                                }
                                observer.complete();
                            }
                            else {
                                // Observable subscription
                                const sub = subscription.subscribe({
                                    next: (data) => {
                                        observer.next({ result: { type: 'data', data } });
                                    },
                                    error: (err) => {
                                        observer.error(err);
                                    },
                                    complete: () => {
                                        observer.complete();
                                    },
                                });
                                // Return unsubscribe function
                                return () => {
                                    sub.unsubscribe();
                                };
                            }
                        }
                    }
                    catch (error) {
                        observer.error(error);
                    }
                })();
            });
        };
    };
}
/**
 * Get procedure function from caller by path
 *
 * Navigates the caller object using dot notation path:
 * 'session.getLast' -> caller.session.getLast
 * 'message.streamResponse' -> caller.message.streamResponse
 */
function getProcedureFunction(caller, path) {
    const parts = path.split('.');
    let current = caller;
    for (const part of parts) {
        if (!current[part]) {
            return null;
        }
        current = current[part];
    }
    return current;
}
//# sourceMappingURL=in-process-link.js.map