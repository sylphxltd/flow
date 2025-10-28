/**
 * Storage service - Data persistence layer
 * All storage implementations and interfaces
 */

// Core storage interfaces
export type { VectorDocument, VectorStorage } from './vector-storage.js';

// Database storage implementations
export { default as MemoryStorage } from './memory-storage.js';
export { default as CacheStorage } from './cache-storage.js';
export { default as SeparatedStorage } from './separated-storage.js';

// Vector storage implementations
export { default as LanceDBVectorStorage } from './lancedb-vector-storage.js';

// Database drivers
export { default as DrizzleStorage } from './drizzle-storage.js';
