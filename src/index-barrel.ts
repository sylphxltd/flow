/**
 * Root barrel export for Sylphx Flow
 * Provides clean, organized access to all modules and utilities
 */

// ============================================================================
// CORE APPLICATION EXPORTS
// ============================================================================

// Main application
export * from './index.js';

// CLI entry point
export * from './cli.js';

// ============================================================================
// ORGANIZED FEATURE EXPORTS
// ============================================================================

// Shared utilities (newly organized)
export * from './shared/index.js';

// Feature-based utilities
export * from './utils/features/index.js';

// Organized types
export * from './types/index.js';

// ============================================================================
// MODULE-SPECIFIC EXPORTS
// ============================================================================

// Commands
export * from './commands/index.js';

// Configuration
export * from './config/index.js';

// Core functionality
export * from './core/index.js';

// Database
export * from './db/index.js';

// Services
export * from './services/index.js';

// Tools
export * from './tools/index.js';

// Resources
export * from './resources/knowledge-resources.js';

// Servers
export * from './servers/sylphx-flow-mcp-server.js';

// Targets
export * from './targets/claude-code.js';
export * from './targets/opencode.js';
