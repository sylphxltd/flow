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

export * from './cache-storage.js';
export * from './database-errors.js';
// Database utilities
export * from './drizzle-storage.js';
// Error handling
export * from './error-handler.js';
// File operations
export * from './file-operations.js';
// JSONC utilities
export * from './jsonc.js';
// Logger utilities
export * from './logger.js';
export * from './memory-storage.js';
// Path utilities
export * from './paths.js';
// Security utilities
export * from './security.js';
export * from './simplified-errors.js';
// Target configuration
export * from './target-config.js';

// Search and indexing - moved to services/search/

// Command builder
export * from './command-builder.js';
// Console UI utilities
export * from './console-ui.js';
// Prompt utilities
export * from './prompts.js';
// Secret utilities
export * from './secret-utils.js';
// Template engine
export * from './template-engine.js';

// Embeddings and TF-IDF - moved to services/search/

// Help utilities
export * from './help.js';

// Target utilities
export * from './target-utils.js';

// Migration examples - removed (obsolete)
// Test utilities - removed (obsolete)

// Shared utilities
export * from '../shared/index.js';

// Base indexer - moved to services/search/

// LanceDB vector storage
export * from './lancedb-vector-storage.js';
// Separated storage
export * from './separated-storage.js';
// Settings utilities
export * from './settings.js';

// Target config types
export * from './target-config.js';
// Vector storage
export * from './vector-storage.js';
