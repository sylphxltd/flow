/**
 * Centralized utility exports
 * Provides both legacy organization and new feature-based organization
 */

// ============================================================================
// FEATURE-BASED ORGANIZATION (Preferred)
// ============================================================================
// Import from feature-based modules for better organization

export * from './features/index.js';

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

// Search and indexing
export * from './semantic-search.js';
export * from './codebase-indexer.js';
export * from './knowledge-indexer.js';

// Console UI utilities
export * from './console-ui.js';

// Prompt utilities
export * from './prompts.js';

// Template engine
export * from './template-engine.js';

// Text processing
export * from './text-processing.js';

// Command builder
export * from './command-builder.js';

// Secret utilities
export * from './secret-utils.js';

// Embeddings utilities
export * from './embeddings.js';

// TF-IDF utilities
export * from './tfidf.js';

// Help utilities
export * from './help.js';

// Target utilities
export * from './target-utils.js';

// Migration examples
export * from './migration-examples.js';

// Test utilities
export * from './test-utilities.js';

// Shared utilities
export * from '../shared.js';

// Base indexer
export * from './base-indexer.js';

// Vector storage
export * from './vector-storage.js';

// LanceDB vector storage
export * from './lancedb-vector-storage.js';

// Separated storage
export * from './separated-storage.js';

// Unified search service
export * from './unified-search-service.js';

// Target config types
export * from './target-config.js';

// Time tools
export * from '../tools/time-tools.js';

// Settings utilities
export * from './settings.js';
