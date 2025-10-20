// Deprecated: Migrated to Effect DbService
// Use src/services/db.service.ts and src/layers/db.layer.ts instead
// This file is kept for backward compatibility but should not be used for new development.

import { DbService } from '../services/db.service.js';

export const memoryStorage = {
  set: (key: string, value: any, namespace = 'default') =>
    Effect.gen(function* (_) {
      const db = yield* _(DbService);
      return yield* _(db.set(key, value, namespace));
    }),
  get: (key: string, namespace = 'default') =>
    Effect.gen(function* (_) {
      const db = yield* _(DbService);
      return yield* _(db.get(key, namespace));
    }),
  // Add other methods similarly...
};

export type { MemoryEntry } from '../services/db.service'; // If defined
