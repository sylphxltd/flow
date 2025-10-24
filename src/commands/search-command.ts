/**
 * Search CLI commands - 搜尋 CLI 命令
 * Complete search functionality: status, reindex, and direct search
 */

import { Command } from 'commander';
import { searchService } from '../utils/unified-search-service.js';
import { CodebaseIndexer } from '../utils/codebase-indexer.js';

// 統一使用 searchService - CLI 同 MCP 用相同邏輯

/**
 * Search status command
 */
export const searchStatusCommand = new Command('status')
  .description('Get status of all search systems (codebase + knowledge)')
  .option('-d, --detailed', 'Show detailed status information')
  .action(async (options) => {
    try {
      console.log('\n🔍 Search Systems Status\n');

      await searchService.initialize();
      const status = await searchService.getStatus();

      // Codebase status
      console.log('### 🔍 Codebase Search');
      if (!status.codebase.indexed) {
        console.log('**Status:** ⚠️ Not indexed');
        console.log('**Files:** 0 files indexed');
        console.log('**Note:** Run "sylphx search reindex" to index codebase');
      } else {
        console.log(`**Status:** ✅ Ready`);
        console.log(`**Files:** ${status.codebase.fileCount} files indexed`);
        if (status.codebase.indexedAt) {
          console.log(`**Indexed:** ${new Date(status.codebase.indexedAt).toLocaleString()}`);
        }
      }

      console.log('');

      // Knowledge status
      console.log('### 📚 Knowledge Search');
      if (!status.knowledge.indexed) {
        if (status.knowledge.isIndexing) {
          console.log(`**Status:** 🔄 Building index (${status.knowledge.progress || 0}%)`);
        } else {
          console.log('**Status:** ⚠️ Not initialized');
          console.log('**Note:** Will auto-index on first search');
        }
      } else {
        console.log(`**Status:** ✅ Ready`);
        console.log(`**Documents:** ${status.knowledge.documentCount} files`);
      }

      console.log('');

      // System summary
      console.log('### 📊 System Summary');
      if (options.detailed) {
        console.log('**Available CLI Commands:**');
        console.log('- sylphx search status - Show search system status');
        console.log('- sylphx search reindex - Reindex codebase files');
        console.log('- sylphx search <query> - Search codebase directly');
        console.log('- sylphx search --knowledge <query> - Search knowledge base');
        console.log('- sylphx memory - Memory management');
        console.log('\n**Available MCP Tools:**');
        console.log('- codebase_search - Search project files and code');
        console.log('- knowledge_search - Search knowledge base and docs');
        console.log('- knowledge_get - Get specific knowledge document by URI');
        console.log('- memory_set - Store information');
        console.log('- memory_get - Retrieve information');
      } else {
        console.log('**Overall:** Use "sylphx search status --detailed" for more info');
      }
    } catch (error) {
      console.error(`❌ Error getting search status: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * Reindex command
 */
export const reindexCommand = new Command('reindex')
  .description('Reindex codebase files for search')
  .option('-f, --force', 'Force reindex all files (ignore cache)')
  .action(async (options) => {
    try {
      console.log('🔄 Starting codebase reindexing...');

      const indexer = new CodebaseIndexer();

      if (options.force) {
        console.log('🔥 Force reindex: clearing cache...');
        await indexer.clearCache();
      }

      console.log('📂 Scanning and indexing files...');
      const result = await indexer.indexCodebase({ force: options.force });

      console.log(`✅ Indexing complete!`);
      console.log(`📊 Stats:`);
      console.log(`   - Total files found: ${result.stats.totalFiles}`);
      console.log(`   - Files indexed: ${result.stats.indexedFiles}`);
      console.log(`   - Files skipped: ${result.stats.skippedFiles}`);
      console.log(`   - Cache hit: ${result.stats.cacheHit ? 'Yes' : 'No'}`);

      if (result.vectorStorage) {
        console.log(`   - Vector embeddings: Generated`);
      }

      console.log('\n💡 Ready to search! Use "sylphx search <query>" or MCP search tools');
    } catch (error) {
      console.error(`❌ Reindexing error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * Direct search command
 */
export const searchDirectCommand = new Command('search')
  .description('Search codebase directly from CLI')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Maximum results to return', '10')
  .option('-k, --knowledge', 'Search knowledge base instead of codebase')
  .option('--no-content', 'Exclude content snippets (show file paths only)')
  .action(async (query, options) => {
    try {
      const limit = parseInt(options.limit);
      const includeContent = options.content !== false;

      await searchService.initialize();

      if (options.knowledge) {
        console.log(`📚 Searching knowledge base for: "${query}"`);

        try {
          const result = await searchService.searchKnowledge(query, {
            limit,
            include_content: includeContent,
          });

          if (result.results.length === 0) {
            console.log('📭 No results found');
            return;
          }

          console.log(`\n✅ Found ${result.results.length} results:\n`);
          result.results.forEach((item, i) => {
            console.log(`${i + 1}. **${item.title}** (Score: ${item.score.toFixed(3)})`);
            console.log(`   Source: ${item.uri}`);
          });
        } catch (error) {
          console.log(`📭 ${(error as Error).message}`);
        }
      } else {
        console.log(`🔍 Searching codebase for: "${query}"`);

        try {
          const result = await searchService.searchCodebase(query, {
            limit,
            include_content: includeContent,
          });

          if (result.results.length === 0) {
            console.log('📭 No results found');
            return;
          }

          const formattedOutput = searchService.formatResultsForCLI(
            result.results,
            query,
            result.totalIndexed
          );
          console.log(formattedOutput);
        } catch (error) {
          console.log(`📭 ${(error as Error).message}`);
        }
      }
    } catch (error) {
      console.error(`❌ Search error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

/**
 * Search command group
 */
export const searchCommand = new Command('search')
  .description('Search system commands')
  .addCommand(searchStatusCommand)
  .addCommand(reindexCommand)
  .addCommand(searchDirectCommand);
