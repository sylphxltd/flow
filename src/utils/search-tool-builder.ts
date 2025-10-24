/**
 * Unified search tool builder
 * Creates consistent search and status tools for indexers
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { BaseIndexer } from './base-indexer.js';
import { searchDocuments } from './tfidf.js';

export interface SearchToolConfig {
  indexer: BaseIndexer;
  toolName: string; // e.g., 'search_knowledge', 'search_codebase'
  statusToolName: string; // e.g., 'get_knowledge_status', 'get_indexing_status'
  description: string;
  searchDescription: string;
  examples: string[];
}

/**
 * Build search tool with consistent pattern
 */
export function buildSearchTool(server: McpServer, config: SearchToolConfig) {
  const { indexer, toolName, statusToolName, description, searchDescription } = config;

  // Register search tool
  server.registerTool(
    toolName,
    {
      description: `${description}

${searchDescription}

**Performance:**
- First search: ~1-5s (indexing time)
- Subsequent searches: <100ms (cached)
- Background indexing: Starts automatically on server startup

**Status:**
- Use \`${statusToolName}\` to check indexing progress
- If indexing in progress, returns progress message`,
      inputSchema: {
        query: z.string().describe('Search query'),
        limit: z.number().optional().describe('Maximum results (default: 5, max: 20)'),
        categories: z.array(z.string()).optional().describe('Filter by categories (optional)'),
      },
    },
    async (args) => {
      try {
        const query = args.query as string;
        const limit = Math.min((args.limit as number) || 5, 20);
        const categories = args.categories as string[] | undefined;

        // Check if indexing is in progress
        const status = indexer.getStatus();
        if (status.isIndexing) {
          const elapsed = Math.round((Date.now() - status.startTime) / 1000);
          return {
            content: [
              {
                type: 'text',
                text: `⏳ Indexing in progress...\n\n**Status:**\n- Progress: ${status.progress}%\n- Items indexed: ${status.indexedItems}/${status.totalItems}\n- Elapsed time: ${elapsed}s\n\n*Please wait and try again. Use \`${statusToolName}\` to check progress.*`,
              },
            ],
          };
        }

        // Check for errors
        if (status.error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Indexing failed: ${status.error}\n\nPlease check the error and try again.`,
              },
            ],
            isError: true,
          };
        }

        // Perform search
        const startTime = Date.now();
        const index = await indexer.loadIndex();
        const indexTime = Date.now() - startTime;

        const searchStartTime = Date.now();
        const results = searchDocuments(query, index, {
          limit: limit * 2,
          minScore: 0.01,
        });
        const searchTime = Date.now() - searchStartTime;

        // Filter by categories if specified
        let filtered = results;
        if (categories && categories.length > 0) {
          filtered = results.filter((result) => {
            const category = result.uri.split('/')[1];
            return categories.includes(category);
          });
        }

        const finalResults = filtered.slice(0, limit);

        if (finalResults.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No results found for query: "${query}"\n\nTry:\n- Broader search terms\n- Different keywords\n- Check available categories`,
              },
            ],
          };
        }

        // Build response
        const resultTexts = finalResults.map((item, index) => {
          const filePath = item.uri.replace(/^(knowledge|file):\/\//, '');
          let text = `## ${index + 1}. ${filePath}\n`;
          text += `**Relevance**: ${(item.score * 100).toFixed(0)}%\n`;
          text += `**Matched terms**: ${item.matchedTerms.join(', ')}\n\n`;
          return text;
        });

        const summary = `Found ${finalResults.length} result(s) for "${query}":\n\n`;
        const stats = `\n---\n\n**Stats:**\n- Total items: ${index.totalDocuments}\n- Index time: ${indexTime}ms\n- Search time: ${searchTime}ms\n`;

        return {
          content: [
            {
              type: 'text',
              text: summary + resultTexts.join('\n---\n\n') + stats,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[ERROR] ${toolName} failed:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `❌ Search error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register status tool
  server.registerTool(
    statusToolName,
    {
      description: `Get indexing status for ${toolName}.

Shows:
- Whether indexing is in progress
- Progress percentage
- Number of items indexed
- Any errors`,
      inputSchema: {},
    },
    async () => {
      const status = indexer.getStatus();

      if (status.isIndexing) {
        const elapsed = Math.round((Date.now() - status.startTime) / 1000);
        return {
          content: [
            {
              type: 'text',
              text: `⏳ **Indexing in Progress**\n\n- Progress: ${status.progress}%\n- Items indexed: ${status.indexedItems}/${status.totalItems}\n- Elapsed time: ${elapsed}s`,
            },
          ],
        };
      }

      if (status.error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Indexing Failed**\n\nError: ${status.error}`,
            },
          ],
          isError: true,
        };
      }

      if (indexer.isReady()) {
        const stats = await indexer.getStats();
        return {
          content: [
            {
              type: 'text',
              text: `✓ **Index Ready**\n\n- Total items: ${stats?.totalDocuments || 0}\n- Unique terms: ${stats?.uniqueTerms || 0}\n- Status: Ready for search`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `⚠️ **Not Indexed**\n\nIndexing will start automatically on first search.`,
          },
        ],
      };
    }
  );
}
