/**
 * Codebase CLI commands - 代碼庫 CLI 命令
 * Codebase search and management functionality
 */

import { Command } from 'commander';
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
      console.log('\n### 🔍 Codebase Search Status\n');

      await searchService.initialize();
      const status = await searchService.getStatus();

      if (status.codebase.indexed) {
        console.log(`**Status:** ✅ Ready`);
        console.log(`**Files:** ${status.codebase.fileCount} files indexed`);
        if (status.codebase.indexedAt) {
          console.log(`**Indexed:** ${new Date(status.codebase.indexedAt).toLocaleString()}`);
        }
      } else {
        console.log('**Status:** ⚠️ Not indexed');
        console.log('**Files:** 0 files indexed');
        console.log('**Note:** Run "sylphx codebase reindex" to index codebase');
      }

      console.log('\n**Available Commands:**');
      console.log('• sylphx codebase search <query> - Search codebase');
      console.log('• sylphx codebase reindex - Reindex files');
      console.log('• sylphx codebase status - Show this status');
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
