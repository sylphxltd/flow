// Add batch operations for refactor
// For example, batchSet: array of sets in transaction

import * as Effect from '@effect/io/Effect';
// ... existing imports

// Add to DbService if needed, but for tools, add batch
export async function memoryBatchSet(args: { items: Array<{key: string, value: string, namespace?: string}> }): Promise<CallToolResult> {
  return Effect.runPromise(
    pipe(
      Effect.gen(function* (_) {
        const db = yield* _(DbService);
        yield* _(
          db.transaction(
            Effect.forEach(args.items, (item) =>
              pipe(
                Effect.tryPromise({ try: () => JSON.parse(item.value), catch: () => item.value }),
                Effect.flatMap((parsed) => db.set(item.key, parsed, item.namespace))
              )
            )
          )
        );
        yield* _(logInfo(`Batch stored ${args.items.length} memories`));
        return {
          content: [{ type: 'text', text: `✅ Batch stored ${args.items.length} memories` }],
        };
      }),
      Effect.catchAll((e) => /* error handling */ Effect.succeed({ ... } as CallToolResult)),
      Effect.provide(Layer.merge(DbServiceLive))
    )
  );
}

// Register the batch tool
// server.registerTool('memory_batch_set', ..., memoryBatchSet);

// Update registerMemoryTools to include batch if needed
// For low-volume concurrency, use Scope.make to limit
