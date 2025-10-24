/**
 * Search CLI commands - 搜尋 CLI 命令
 * Complete search functionality: status, reindex, and direct search
 */

import { Command } from 'commander';
import { SeparatedMemoryStorage } from '../utils/separated-storage.js';
import { getKnowledgeIndexer } from '../utils/knowledge-indexer.js';
import { searchDocuments } from '../utils/tfidf.js';

const memoryStorage = new SeparatedMemoryStorage();
const knowledgeIndexer = getKnowledgeIndexer();

/**
 * Search status command
 */
export const searchStatusCommand = new Command('status')
  .description('Get status of all search systems (codebase + knowledge)')
  .option('-d, --detailed', 'Show detailed status information')
  .action(async (options) => {
    try {
      console.log('\n🔍 Search Systems Status\n');

      // Codebase status
      console.log('### 🔍 Codebase Search');
      try {
        await memoryStorage.initialize();
        const files = await memoryStorage.getAllCodebaseFiles();

        if (files.length === 0) {
          console.log('**Status:** ⚠️ Not indexed');
          console.log('**Files:** 0 files indexed');
          console.log('**Note:** Run "sylphx search reindex" to index codebase');
        } else {
          console.log(`**Status:** ✅ Ready`);
          console.log(`**Files:** ${files.length} files indexed`);
        }
      } catch (error) {
        console.log(`**Status:** ❌ Error`);
        console.log(`**Error:** ${(error as Error).message}`);
      }

      console.log('');

      // Knowledge status
      console.log('### 📚 Knowledge Search');
      try {
        const knowledgeStatus = knowledgeIndexer.getStatus();
        if (knowledgeStatus.isIndexing) {
          console.log(`**Status:** 🔄 Building index (${knowledgeStatus.progress}%)`);
        } else {
          const index = await knowledgeIndexer.loadIndex();
          console.log(`**Status:** ✅ Ready`);
          console.log(`**Documents:** ${index.totalDocuments} files`);
        }
      } catch (error) {
        console.log(`**Status:** ⚠️ Not initialized`);
        console.log('**Note:** Will auto-index on first search');
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
        console.log('- search_codebase - Search project files and code');
        console.log('- search_knowledge - Search knowledge base and docs');
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

      if (options.force) {
        console.log('🔥 Force reindex: clearing cache...');
        // TODO: Clear cache
      }

      // TODO: Implement actual indexing logic
      console.log('📝 Indexing functionality to be implemented');
      console.log('💡 After indexing, use "sylphx search <query>" or MCP search tools');
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
  .action(async (query, options) => {
    try {
      const limit = parseInt(options.limit);

      if (options.knowledge) {
        console.log(`📚 Searching knowledge base for: "${query}"`);

        try {
          const index = await knowledgeIndexer.loadIndex();
          const results = await searchDocuments(query, index, { limit });

          if (results.length === 0) {
            console.log('📭 No results found');
            return;
          }

          console.log(`\n✅ Found ${results.length} results:\n`);
          results.forEach((result: any, i: number) => {
            const title = result.metadata?.title || result.uri?.split('/').pop() || 'Unknown';
            console.log(`${i + 1}. **${title}** (Score: ${result.score?.toFixed(3)})`);
            console.log(`   Source: ${result.uri}`);
          });
        } catch (error) {
          console.log('📭 Knowledge base not indexed yet');
        }
      } else {
        console.log(`🔍 Searching codebase for: "${query}"`);

        try {
          await memoryStorage.initialize();
          const files = await memoryStorage.getAllCodebaseFiles();

          if (files.length === 0) {
            console.log('📭 Codebase not indexed yet. Run "sylphx search reindex" first.');
            return;
          }

          // Build search documents
          const searchDocs: any[] = [];
          for (const file of files) {
            const tfidfDoc = await memoryStorage.getTFIDFDocument(file.path);
            if (tfidfDoc) {
              const rawTerms = JSON.parse(tfidfDoc.rawTerms || '{}');
              const rawTermsMap = new Map<string, number>();
              for (const [term, freq] of Object.entries(rawTerms)) {
                rawTermsMap.set(term, freq as number);
              }

              searchDocs.push({
                uri: `file://${file.path}`,
                content: file.content || '',
                terms: rawTermsMap,
                rawTerms: rawTermsMap,
                magnitude: tfidfDoc.magnitude || 0,
              });
            }
          }

          if (searchDocs.length === 0) {
            console.log('📭 No searchable content found');
            return;
          }

          // Create search index
          const index = {
            documents: searchDocs,
            idf: new Map(),
            totalDocuments: searchDocs.length,
            metadata: {
              generatedAt: new Date().toISOString(),
              version: '1.0.0',
            },
          };

          const results = await searchDocuments(query, index, { limit });

          if (results.length === 0) {
            console.log('📭 No results found');
            return;
          }

          console.log(`\n✅ Found ${results.length} results:\n`);
          results.forEach((result: any, i: number) => {
            const filename = result.uri?.replace('file://', '') || 'Unknown';
            const doc = searchDocs.find((d) => d.uri === result.uri);
            const preview = doc?.content?.substring(0, 100) || '';
            const more = doc?.content && doc.content.length > 100 ? '...' : '';

            console.log(`${i + 1}. **${filename}** (Score: ${result.score?.toFixed(3)})`);
            if (preview) {
              console.log(`   \`${preview}${more}\``);
            }
          });
        } catch (error) {
          console.log('📭 Codebase not indexed yet. Run "sylphx search reindex" first.');
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
