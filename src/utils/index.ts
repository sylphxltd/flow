/**
 * Centralized utility exports
 * Provides both legacy organization and new feature-based organization
 */

// ============================================================================
// FEATURE-BASED ORGANIZATION (Removed - migrated to domains/ and services/)
// ============================================================================
// Features now organized in:
// - src/domains/ for domain-specific logic
// - src/services/ for shared infrastructure

// ============================================================================
// LEGACY ORGANIZATION (Backward Compatibility)
// ============================================================================
// Direct exports for backward compatibility - @deprecated

// File operations
export * from './file-operations.js';

// JSONC utilities
export * from './jsonc.js';

// Path utilities
export * from './paths.js';

// Security utilities
export * from './security.js';

// Error handling
export * from './error-handler.js';
export * from './errors.js';

// Logger utilities
export * from './logger.js';

// Target configuration
export * from './target-config.js';

// Database utilities
export * from './drizzle-storage.js';
export * from './memory-storage.js';
export * from './cache-storage.js';

// Search and indexing - moved to services/search/

// Console UI utilities
export * from './console-ui.js';

// Prompt utilities
export * from './prompts.js';

// Template engine
export * from './template-engine.js';

// Command builder
export * from './command-builder.js';

// Secret utilities
export * from './secret-utils.js';

// Embeddings and TF-IDF - moved to services/search/

// Help utilities
export * from './help.js';

// Target utilities
export * from './target-utils.js';

// Migration examples - removed (obsolete)
// Test utilities - removed (obsolete)

// Shared utilities
export * from '../shared.js';

// Base indexer - moved to services/search/

// Vector storage
export * from './vector-storage.js';

// LanceDB vector storage
export * from './lancedb-vector-storage.js';

// Separated storage
export * from './separated-storage.js';

// Target config types
export * from './target-config.js';

// Settings utilities
export * from './settings.js';
