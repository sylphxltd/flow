/**
 * Unified search tools - 統一搜尋工具
 * Codebase 同 knowledge 使用相同架構，只係 source 唔同
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchDocuments } from '../utils/tfidf.js';
import { SeparatedMemoryStorage } from '../utils/separated-storage.js';
import { getKnowledgeIndexer } from '../utils/knowledge-indexer.js';
import { getDefaultEmbeddingProvider } from '../utils/embeddings.js';

// Global instances
const memoryStorage = new SeparatedMemoryStorage();
const knowledgeIndexer = getKnowledgeIndexer();
/**
 * Register codebase search tool (independent)
 */
export function registerCodebaseSearchTool(server: McpServer): void {
  server.tool(
    'search_codebase',
    'Search project source files, documentation, and code. Supports both semantic search (preferred) and TF-IDF fallback. Use this to find implementations, functions, classes, or any code-related content.',
    {
      query: {
        type: z.string(),
        description: 'Search query - use natural language, function names, or technical terms',
      },
      limit: {
        type: z.number().default(10).optional(),
        description: 'Maximum number of results to return (default: 10)',
      },
      semantic: {
        type: z.boolean().default(true).optional(),
        description: 'Use semantic search if available, fallback to TF-IDF if not (default: true)',
      },
      min_score: {
        type: z.number().default(0.1).optional(),
        description: 'Minimum relevance score threshold (default: 0.1)',
      },
      include_content: {
        type: z.boolean().default(true).optional(),
        description: 'Include file content snippets in results (default: true)',
      },
    },
    async ({ query, limit = 10, semantic = true, min_score = 0.1, include_content = true }) => {
      try {
        // Initialize memory storage
        await memoryStorage.initialize();

        // Get all codebase files and their TF-IDF data
        const files = await memoryStorage.getAllCodebaseFiles();

        if (files.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '📭 No codebase files indexed yet. The codebase needs to be indexed first before searching.',
              },
            ],
          };
        }

        // Build search documents from file data
        const searchDocs: any[] = [];
        for (const file of files) {
          const tfidfDoc = await memoryStorage.getTFIDFDocument(file.path);
          if (tfidfDoc) {
            // Parse rawTerms from JSON string
            const rawTerms = JSON.parse(tfidfDoc.rawTerms || '{}');

            // Convert to Map<string, number>
            const rawTermsMap = new Map<string, number>();
            for (const [term, freq] of Object.entries(rawTerms)) {
              rawTermsMap.set(term, freq as number);
            }

            searchDocs.push({
              uri: `file://${file.path}`,
              content: file.content || '',
              terms: rawTermsMap, // Use rawTerms as terms for TF-IDF
              rawTerms: rawTermsMap,
              magnitude: tfidfDoc.magnitude || 0,
            });
          }
        }

        if (searchDocs.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '📭 No searchable content found in indexed files.',
              },
            ],
          };
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

        let results;

        // Try semantic search first if requested
        if (semantic) {
          try {
            const embeddingProvider = getDefaultEmbeddingProvider();
            const vectorIndexPath = '.sylphx-flow/vector-index';

            // This is a simplified semantic search - in production you'd have proper vector storage
            console.log('[INFO] Attempting semantic search...');
            // TODO: Implement proper semantic search with vector storage
            // For now, fallback to TF-IDF
            console.log('[INFO] Semantic search not available, using TF-IDF fallback');
          } catch (error) {
            console.log('[INFO] Semantic search failed, using TF-IDF fallback');
          }
        }

        // TF-IDF search
        results = await searchDocuments(query, index, {
          limit,
          minScore: min_score,
        });

        const summary = `Found ${results.length} codebase result(s) for "${query}":\n\n`;
        const formattedResults = results
          .map((result: any, i: number) => {
            const filename = result.uri?.replace('file://', '') || 'Unknown';
            const doc = searchDocs.find((d) => d.uri === result.uri);
            const content = doc?.content
              ? `\n\`\`\`\n${doc.content.substring(0, 500)}${doc.content.length > 500 ? '...' : ''}\n\`\`\``
              : '';

            return `${i + 1}. **${filename}** (Score: ${result.score?.toFixed(3) || 'N/A'})${content}`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: summary + formattedResults,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Knowledge search error: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );
}

/**
 * Register both search tools (convenience function)
 */
export function registerUnifiedSearchTools(server: McpServer): void {
  registerCodebaseSearchTool(server);
  registerKnowledgeSearchTool(server);
}

/**
 * Register knowledge search tool (independent)
 */
export function registerKnowledgeSearchTool(server: McpServer): void {
  server.tool(
    'search_knowledge',
    'Search knowledge base, documentation, guides, and reference materials. Supports both semantic search (preferred) and TF-IDF fallback. Use this for domain knowledge, best practices, setup instructions, and conceptual information.',
    {
      query: {
        type: z.string(),
        description: 'Search query - use natural language, technology names, or topic keywords',
      },
      limit: {
        type: z.number().default(10).optional(),
        description: 'Maximum number of results to return (default: 10)',
      },
      semantic: {
        type: z.boolean().default(true).optional(),
        description: 'Use semantic search if available, fallback to TF-IDF if not (default: true)',
      },
      min_score: {
        type: z.number().default(0.1).optional(),
        description: 'Minimum relevance score threshold (default: 0.1)',
      },
    },
    async ({ query, limit = 10, semantic = true, min_score = 0.1 }) => {
      try {
        let results;

        // Try semantic search first if requested
        if (semantic) {
          try {
            const embeddingProvider = getDefaultEmbeddingProvider();
            console.log('[INFO] Attempting semantic search for knowledge...');
            // TODO: Implement proper semantic search with vector storage
            console.log('[INFO] Semantic search not available, using TF-IDF fallback');
          } catch (error) {
            console.log('[INFO] Semantic search failed, using TF-IDF fallback');
          }
        }

        // Load knowledge index and search with TF-IDF
        const index = await knowledgeIndexer.loadIndex();
        results = await searchDocuments(query, index, {
          limit,
          minScore: min_score,
        });

        const summary = `Found ${results.length} knowledge result(s) for "${query}":\n\n`;
        const formattedResults = results
          .map((result: any, i: number) => {
            const title = result.metadata?.title || result.uri?.split('/').pop() || 'Unknown';

            return `${i + 1}. **${title}**\n   *Score: ${result.score?.toFixed(3) || 'N/A'}*\n   *Source: ${result.uri}*`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: summary + formattedResults,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Knowledge search error: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );
}
