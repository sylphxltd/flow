/**
 * Unified search tools - 統一搜尋工具
 * Codebase 同 knowledge 使用相同架構，只係 source 唔同
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchDocuments } from '../utils/tfidf.js';
import { SeparatedMemoryStorage } from '../utils/separated-storage.js';
import { getKnowledgeIndexer } from '../utils/knowledge-indexer.js';

// Global instances
const memoryStorage = new SeparatedMemoryStorage();
const knowledgeIndexer = getKnowledgeIndexer();

/**
 * Register unified search tools
 */
export function registerUnifiedSearchTools(server: McpServer): void {
  // === SEARCH TOOLS ===

  // Search codebase
  server.tool(
    'search_codebase',
    'Search project source files, documentation, and code. Use this to find implementations, functions, classes, or any code-related content.',
    {
      query: {
        type: z.string(),
        description: 'Search query - use specific keywords, function names, or technical terms',
      },
      limit: {
        type: z.number().default(10).optional(),
        description: 'Maximum number of results to return (default: 10)',
      },
    },
    async ({ query, limit = 10 }) => {
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

        // Search using TF-IDF
        const results = await searchDocuments(query, index, { limit });

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
              text: `❌ Codebase search error: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // Search knowledge
  server.tool(
    'search_knowledge',
    'Search knowledge base, documentation, guides, and reference materials. Use this for domain knowledge, best practices, setup instructions, and conceptual information.',
    {
      query: {
        type: z.string(),
        description: 'Search query - use conceptual terms, technology names, or topic keywords',
      },
      limit: {
        type: z.number().default(10).optional(),
        description: 'Maximum number of results to return (default: 10)',
      },
    },
    async ({ query, limit = 10 }) => {
      try {
        // Load knowledge index
        const index = await knowledgeIndexer.loadIndex();
        const results = await searchDocuments(query, index, { limit });

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
