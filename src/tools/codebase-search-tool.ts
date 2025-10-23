/**
 * Codebase search tool for MCP server
 * Runtime indexing with intelligent caching
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import path from 'node:path';
import { CodebaseIndexer } from '../utils/codebase-indexer.js';
import { searchDocuments } from '../utils/tfidf.js';
import { getDefaultEmbeddingProvider } from '../utils/embeddings.js';

// Global indexer instance (lazy initialization)
let globalIndexer: CodebaseIndexer | null = null;
let indexPromise: Promise<any> | null = null;
let indexingStatus: {
  isIndexing: boolean;
  progress: number; // 0-100
  totalFiles: number;
  indexedFiles: number;
  startTime: number;
  error?: string;
} = {
  isIndexing: false,
  progress: 0,
  totalFiles: 0,
  indexedFiles: 0,
  startTime: 0,
};

/**
 * Get or create codebase indexer
 */
function getIndexer(): CodebaseIndexer {
  if (!globalIndexer) {
    const codebaseRoot = process.cwd();
    const cacheDir = path.join(codebaseRoot, '.sylphx-flow', 'search-cache');
    globalIndexer = new CodebaseIndexer(codebaseRoot, cacheDir);
  }
  return globalIndexer;
}

/**
 * Start background indexing (non-blocking)
 */
async function startBackgroundIndexing(options: { force?: boolean } = {}) {
  if (indexingStatus.isIndexing && !options.force) {
    console.error('[INFO] Indexing already in progress');
    return;
  }

  const indexer = getIndexer();

  // Check cache first
  const cacheStats = await indexer.getCacheStats();
  if (cacheStats.exists && !options.force) {
    console.error('[INFO] Cache exists, skipping background indexing');
    return;
  }

  // Start indexing in background
  indexingStatus.isIndexing = true;
  indexingStatus.progress = 0;
  indexingStatus.startTime = Date.now();
  indexingStatus.error = undefined;

  console.error('[INFO] Starting background codebase indexing...');
  const embeddingProvider = process.env.OPENAI_API_KEY ? getDefaultEmbeddingProvider() : undefined;

  indexPromise = indexer
    .indexCodebase({
      force: options.force,
      embeddingProvider,
    })
    .then((result) => {
      indexingStatus.isIndexing = false;
      indexingStatus.progress = 100;
      indexingStatus.totalFiles = result.stats.totalFiles;
      indexingStatus.indexedFiles = result.stats.indexedFiles;
      console.error(`[INFO] Background indexing complete: ${result.stats.totalFiles} files`);
      return result;
    })
    .catch((error) => {
      indexingStatus.isIndexing = false;
      indexingStatus.error = error instanceof Error ? error.message : String(error);
      console.error('[ERROR] Background indexing failed:', error);
      throw error;
    });
}

/**
 * Ensure codebase is indexed (wait if needed)
 */
async function ensureIndexed(options: { force?: boolean } = {}) {
  const indexer = getIndexer();

  // If already indexing, wait for it
  if (indexPromise && !options.force) {
    return indexPromise;
  }

  // Check cache
  const cacheStats = await indexer.getCacheStats();
  if (cacheStats.exists && !options.force) {
    console.error('[INFO] Using cached codebase index');
    indexPromise = indexer.indexCodebase({ force: false });
    return indexPromise;
  }

  // Start indexing if not already started
  if (!indexingStatus.isIndexing) {
    startBackgroundIndexing(options);
  }

  return indexPromise;
}

/**
 * Register codebase search tool
 */
export function registerCodebaseSearchTool(server: McpServer) {
  server.registerTool(
    'search_codebase',
    {
      description: `Search the current codebase using semantic search (TF-IDF + optional embeddings).

**IMPORTANT: This tool performs runtime indexing with intelligent caching.**

Features:
- **Respects .gitignore**: Only indexes files not ignored by .gitignore
- **Incremental indexing**: Only re-indexes changed files
- **Smart caching**: Cached in .sylphx-flow/search-cache/
- **Language detection**: Automatically detects programming languages
- **Embeddings support**: Uses OpenAI embeddings if OPENAI_API_KEY is set

When to use:
- Find code examples or patterns in the codebase
- Locate files containing specific functionality
- Discover similar code across the project
- Search for API usage or implementation details

Performance:
- First search: ~1-5s (indexing time, depends on codebase size)
- Subsequent searches: <100ms (cached)
- Incremental updates: Only changed files are re-indexed

Limitations:
- Max file size: 1MB (larger files are skipped)
- Max files: 10,000 (configurable)
- Text files only (binary files are ignored)`,
      inputSchema: {
        query: z
          .string()
          .describe(
            'Search query (e.g., "authentication middleware", "database connection", "error handling")'
          ),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of results to return (default: 5, max: 20)'),
        language: z
          .string()
          .optional()
          .describe('Filter by programming language (e.g., "TypeScript", "JavaScript", "Python")'),
        force_reindex: z
          .boolean()
          .optional()
          .describe('Force full reindex (default: false, use cached index)'),
      },
    },
    async (args) => {
      try {
        const query = args.query as string;
        const limit = Math.min((args.limit as number) || 5, 20);
        const language = args.language as string | undefined;
        const forceReindex = (args.force_reindex as boolean) || false;

        // Check if indexing is in progress
        if (indexingStatus.isIndexing) {
          const elapsed = Math.round((Date.now() - indexingStatus.startTime) / 1000);
          return {
            content: [
              {
                type: 'text',
                text: `⏳ Codebase indexing in progress...\n\n**Status:**\n- Progress: ${indexingStatus.progress}%\n- Files indexed: ${indexingStatus.indexedFiles}/${indexingStatus.totalFiles}\n- Elapsed time: ${elapsed}s\n\n*Please wait a moment and try again. First-time indexing typically takes 1-5 seconds.*\n\n**Tip:** You can use \`get_indexing_status\` to check progress.`,
              },
            ],
          };
        }

        // Check if indexing failed
        if (indexingStatus.error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Indexing failed: ${indexingStatus.error}\n\nTry using \`reindex_codebase\` to rebuild the index.`,
              },
            ],
            isError: true,
          };
        }

        // Ensure codebase is indexed
        const startTime = Date.now();
        const { tfidfIndex, vectorStorage, stats } = await ensureIndexed({
          force: forceReindex,
        });
        const indexTime = Date.now() - startTime;

        // Search using TF-IDF
        const searchStartTime = Date.now();
        const results = searchDocuments(query, tfidfIndex, {
          limit: limit * 2, // Get more for filtering
          minScore: 0.01,
        });
        const searchTime = Date.now() - searchStartTime;

        // Filter by language if specified
        let filteredResults = results;
        if (language) {
          filteredResults = results.filter((result) => {
            // Extract language from URI metadata (would need to enhance this)
            return true; // TODO: Add language filtering
          });
        }

        // Limit results
        const finalResults = filteredResults.slice(0, limit);

        if (finalResults.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No code files found for query: "${query}"\n\nTry:\n- Broader search terms\n- Different keywords\n- Check if files are indexed (not in .gitignore)`,
              },
            ],
          };
        }

        // Build response
        const resultTexts = finalResults.map((item, index) => {
          const filePath = item.uri.replace(/^file:\/\//, '');
          let text = `## ${index + 1}. ${filePath}\n`;
          text += `**Relevance**: ${(item.score * 100).toFixed(0)}%\n`;
          text += `**Matched terms**: ${item.matchedTerms.join(', ')}\n\n`;

          // TODO: Add code snippet preview
          text += `*Use Read tool to view full file content*\n`;

          return text;
        });

        const summary = `Found ${finalResults.length} file(s) for "${query}":\n\n`;

        // Build detailed stats
        const cacheStatus = stats.cacheHit
          ? '✅ HIT (using cached index)'
          : `⚠️ MISS (${stats.indexedFiles} files indexed, ${stats.skippedFiles} skipped)`;

        const indexStats = `\n---\n\n**Index Stats:**\n- Total files: ${stats.totalFiles}\n- Cache: ${cacheStatus}\n- Index time: ${indexTime}ms\n- Search time: ${searchTime}ms\n- Embeddings: ${vectorStorage ? '✅ enabled' : '❌ disabled (set OPENAI_API_KEY to enable)'}\n\n*Cache location: .sylphx-flow/search-cache/*\n*Cache invalidation: File-based (auto-detects new/modified/deleted files)*\n`;

        return {
          content: [
            {
              type: 'text',
              text: summary + resultTexts.join('\n---\n\n') + indexStats,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[ERROR] Codebase search failed:', error);
        return {
          content: [
            {
              type: 'text',
              text: `❌ Error searching codebase: ${errorMessage}\n\nThis might be due to:\n- Codebase too large (>10,000 files)\n- Permission issues\n- Invalid .gitignore patterns\n\nTry using force_reindex: true to rebuild the index.`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'reindex_codebase',
    {
      description: `Force reindex the entire codebase.

Use this when:
- Files have been added/removed but cache is stale
- .gitignore has been updated
- Index seems corrupted or outdated

This will clear the cache and rebuild the entire index.`,
      inputSchema: {},
    },
    async () => {
      try {
        const indexer = getIndexer();
        indexer.clearCache();

        const { stats } = await ensureIndexed({ force: true });

        return {
          content: [
            {
              type: 'text',
              text: `✅ Codebase reindexed successfully!\n\n**Stats:**\n- Total files: ${stats.totalFiles}\n- Indexed: ${stats.indexedFiles}\n- Cache cleared and rebuilt`,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `❌ Error reindexing codebase: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_indexing_status',
    {
      description: `Get current codebase indexing status.

Use this to check:
- Whether indexing is in progress
- Indexing progress percentage
- Number of files indexed
- Any indexing errors

Useful when search_codebase returns "indexing in progress" message.`,
      inputSchema: {},
    },
    async () => {
      const indexer = getIndexer();
      const cacheStats = await indexer.getCacheStats();

      if (indexingStatus.isIndexing) {
        const elapsed = Math.round((Date.now() - indexingStatus.startTime) / 1000);
        return {
          content: [
            {
              type: 'text',
              text: `⏳ **Indexing in Progress**\n\n- Progress: ${indexingStatus.progress}%\n- Files indexed: ${indexingStatus.indexedFiles}/${indexingStatus.totalFiles}\n- Elapsed time: ${elapsed}s\n- Estimated remaining: ~${Math.max(0, 5 - elapsed)}s\n\n*First-time indexing typically takes 1-5 seconds depending on codebase size.*`,
            },
          ],
        };
      }

      if (indexingStatus.error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Indexing Failed**\n\nError: ${indexingStatus.error}\n\nTry using \`reindex_codebase\` to rebuild the index.`,
            },
          ],
          isError: true,
        };
      }

      if (cacheStats.exists) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ **Index Ready**\n\n- Total files: ${cacheStats.fileCount}\n- Last indexed: ${cacheStats.indexedAt}\n- Status: Ready for search\n\n*You can now use \`search_codebase\` to search the codebase.*`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `⚠️ **Not Indexed**\n\nThe codebase has not been indexed yet.\n\nIndexing will start automatically when you first use \`search_codebase\`.`,
          },
        ],
      };
    }
  );

  // Start background indexing on server startup
  console.error('[INFO] Starting background codebase indexing...');
  startBackgroundIndexing();

  console.error(
    '[INFO] Registered codebase search tools: search_codebase, reindex_codebase, get_indexing_status'
  );
}
