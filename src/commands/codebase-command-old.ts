/**
 * Codebase CLI commands - 代碼庫 CLI 命令
 * Codebase search and management functionality
 */

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { CodebaseStatusUI } from '../components/CodebaseStatusUI.js';
import { CodebaseIndexer } from '../utils/codebase-indexer.js';
import { CLIError } from '../utils/error-handler.js';
import { searchService } from '../utils/unified-search-service.js';

/**
 * Codebase search command
 */
export const codebaseSearchCommand = new Command('search')
  .description('Search codebase files and source code')
  .argument('<query>', 'Search query - use natural language, function names, or technical terms')
  .option('-l, --limit <number>', 'Maximum number of results to return (default: 10)', '10')
  .option('--include-content', 'Include file content snippets in results (default: true)', 'true')
  .option('--extensions <exts...>', 'Filter by file extensions (e.g., .ts .tsx .js)')
  .option('--path <pattern>', 'Filter by path pattern (e.g., src/components)')
  .option('--exclude <patterns...>', 'Exclude paths containing these patterns')
  .action(async (query, options) => {
    try {
      console.log(`🔍 Searching codebase for: "${query}"`);

      await searchService.initialize();

      const result = await searchService.searchCodebase(query, {
        limit: Number.parseInt(options.limit),
        include_content: options.includeContent !== 'false',
        file_extensions: options.extensions,
        path_filter: options.path,
        exclude_paths: options.exclude,
      });

      const output = searchService.formatResultsForCLI(result.results, query, result.totalIndexed);
      console.log(output);
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * Codebase reindex command
 */
export const codebaseReindexCommand = new Command('reindex')
  .description('Reindex all codebase files')
  .action(async () => {
    try {
      console.log('🔄 Starting codebase reindexing...');
      console.log('📂 Scanning and indexing files...');

      const indexer = new CodebaseIndexer();
      const embeddingProvider = await (
        await import('../utils/embeddings.js')
      ).getDefaultEmbeddingProvider();
      await indexer.indexCodebase({ embeddingProvider });

      console.log('✅ Indexing complete!');
    } catch (error) {
      throw new CLIError(`Codebase status failed: ${(error as Error).message}`);
    }
  });

/**
 * Codebase status command
 */
export const codebaseStatusCommand = new Command('status')
  .description('Get codebase search system status')
  .action(async () => {
    try {
      await searchService.initialize();
      const status = await searchService.getStatus();

      render(
        React.createElement(CodebaseStatusUI, {
          indexed: status.codebase.indexed,
          fileCount: status.codebase.fileCount || 0,
          indexedAt: status.codebase.indexedAt,
        })
      );
    } catch (error) {
      console.error(`❌ Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * Main codebase command
 */
export const codebaseCommand = new Command('codebase').description(
  'Codebase search and management commands'
);

// Add subcommands
codebaseCommand.addCommand(codebaseSearchCommand);
codebaseCommand.addCommand(codebaseReindexCommand);
codebaseCommand.addCommand(codebaseStatusCommand);
