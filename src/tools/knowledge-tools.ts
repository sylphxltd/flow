/**
 * Knowledge tools - 知識庫工具
 * All tools for working with knowledge base, documentation, and guides
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchDocuments } from '../utils/tfidf.js';
import { getKnowledgeIndexer } from '../utils/knowledge-indexer.js';
import { getDefaultEmbeddingProvider } from '../utils/embeddings.js';

// Global instance
const knowledgeIndexer = getKnowledgeIndexer();

/**
 * Register knowledge search tool
 */
export function registerKnowledgeSearchTool(server: McpServer): void {
  server.registerTool(
    'search_knowledge',
    {
      description: `Search knowledge base, documentation, guides, and reference materials. Use this for domain knowledge, best practices, setup instructions, and conceptual information.

**IMPORTANT: Use this tool PROACTIVELY before starting work, not reactively when stuck.**

This tool searches across all knowledge resources and returns the most relevant matches. Use include_content=false to reduce context usage, then use get_knowledge for specific documents.

When to use this tool (BEFORE starting work):
- **Before research/clarification**: Check relevant stack/universal knowledge to understand domain constraints
- **Before design/architecture**: Review architecture patterns, security, and performance best practices
- **Before implementation**: Consult framework-specific patterns, common pitfalls, and best practices
- **Before testing/QA**: Review testing strategies, coverage requirements, and quality standards
- **Before deployment**: Check deployment patterns, infrastructure, and monitoring guidance

Available knowledge categories:
- **stacks**: Framework-specific patterns (React, Next.js, Node.js)
- **data**: Database patterns (SQL, indexing, migrations)
- **guides**: Architecture guidance (SaaS, tech stack, UI/UX)
- **universal**: Cross-cutting concerns (security, performance, testing, deployment)

The knowledge is curated for LLM code generation - includes decision trees, common bugs, and practical patterns.

**Best Practice**: Check relevant knowledge BEFORE making decisions or writing code, not after encountering issues.`,
      inputSchema: {
        query: z
          .string()
          .describe('Search query - use natural language, technology names, or topic keywords'),
        limit: z
          .number()
          .default(10)
          .optional()
          .describe('Maximum number of results to return (default: 10)'),
        include_content: z
          .boolean()
          .default(true)
          .optional()
          .describe(
            'Include full content in results (default: true). Use false to reduce context, then get_knowledge for specific docs'
          ),
      },
    },
    async ({ query, limit = 10, include_content = true }) => {
      try {
        // Check indexing status first
        const status = knowledgeIndexer.getStatus();

        if (status.isIndexing) {
          return {
            content: [
              {
                type: 'text',
                text: `⏳ **Knowledge Indexing in Progress**\n\n- Progress: ${status.progress}%\n- Indexed: ${status.indexedItems}/${status.totalItems} files\n- Status: Building search index\n\n*This typically takes <1 second for knowledge base.*\n\n**Please wait a moment and try again.**`,
              },
            ],
          };
        }

        if (status.error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ **Knowledge Indexing Failed**\n\nError: ${status.error}\n\n**To fix:**\n- Check knowledge files in assets/knowledge/\n- Try restarting the MCP server\n- Use CLI: \`sylphx search status\` for details`,
              },
            ],
            isError: true,
          };
        }

        // Try semantic search first, fallback to TF-IDF
        let results;
        try {
          const embeddingProvider = getDefaultEmbeddingProvider();
          console.log('[INFO] Attempting semantic search for knowledge...');
          // TODO: Implement proper semantic search with vector storage
          console.log('[INFO] Semantic search not available, using TF-IDF fallback');
        } catch (error) {
          console.log('[INFO] Using TF-IDF search');
        }

        // Load knowledge index and search with TF-IDF
        const index = await knowledgeIndexer.loadIndex();

        // Check if index has any documents
        if (index.totalDocuments === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `📭 **No Knowledge Documents Available**\n\nThe knowledge base appears to be empty or not properly initialized.\n\n**To fix:**\n- Check if knowledge files exist in assets/knowledge/\n- Try restarting the MCP server to trigger indexing\n- Use CLI: \`sylphx search status\` for diagnostics\n\n**Expected knowledge files:**\n- stacks/ (framework-specific patterns)\n- guides/ (architecture guidance)\n- universal/ (cross-cutting concerns)\n- data/ (database patterns)`,
              },
            ],
          };
        }

        results = await searchDocuments(query, index, {
          limit,
          minScore: 0.1, // Internal default
        });

        const summary = `Found ${results.length} knowledge result(s) for "${query}":\n\n`;

        let formattedResults: string[];
        if (include_content) {
          // Load content for each result
          const { getKnowledgeContent } = await import('../resources/knowledge-resources.js');
          formattedResults = await Promise.all(
            results.map(async (result: any, i: number) => {
              const title = result.metadata?.title || result.uri?.split('/').pop() || 'Unknown';
              let content = '';

              try {
                content = getKnowledgeContent(result.uri);
                content = `\n\n---\n\n${content}`;
              } catch (error) {
                content = '\n\n*Error loading content*';
              }

              return `${i + 1}. **${title}**\n   *Score: ${result.score?.toFixed(3) || 'N/A'}*\n   *Source: ${result.uri}*${content}`;
            })
          );
        } else {
          // Just metadata without content
          formattedResults = results.map((result: any, i: number) => {
            const title = result.metadata?.title || result.uri?.split('/').pop() || 'Unknown';
            return `${i + 1}. **${title}**\n   *Score: ${result.score?.toFixed(3) || 'N/A'}*\n   *Source: ${result.uri}*`;
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: summary + formattedResults.join('\n\n'),
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
 * Register get_knowledge tool (for retrieving specific knowledge documents)
 */
export function registerGetKnowledgeTool(server: McpServer): void {
  server.registerTool(
    'get_knowledge',
    {
      description: `Get knowledge resource by exact URI.

**NOTE: Prefer using 'search_knowledge' with include_content=false first, then use this tool for specific documents.**

This tool retrieves a specific knowledge resource when you already know its exact URI.

Available URIs:
- knowledge://stacks/react-app
- knowledge://stacks/nextjs-app  
- knowledge://stacks/node-api
- knowledge://data/sql
- knowledge://guides/saas-template
- knowledge://guides/tech-stack
- knowledge://guides/ui-ux
- knowledge://universal/security
- knowledge://universal/performance
- knowledge://universal/testing
- knowledge://universal/deployment

For most use cases, use 'search_knowledge' with keywords first to find relevant URIs.`,
      inputSchema: {
        uri: z.string().describe('Knowledge URI to access (e.g., "knowledge://stacks/react-app")'),
      },
    },
    async ({ uri }) => {
      try {
        const { getKnowledgeContent } = await import('../resources/knowledge-resources.js');
        const content = getKnowledgeContent(uri);
        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `❌ Error: ${errorMessage}\n\nAvailable knowledge URIs:\n• knowledge://stacks/react-app\n• knowledge://stacks/nextjs-app\n• knowledge://stacks/node-api\n• knowledge://data/sql\n• knowledge://guides/saas-template\n• knowledge://guides/tech-stack\n• knowledge://guides/ui-ux\n• knowledge://universal/security\n• knowledge://universal/performance\n• knowledge://universal/testing\n• knowledge://universal/deployment`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

/**
 * Register all knowledge tools
 */
export function registerKnowledgeTools(server: McpServer): void {
  registerKnowledgeSearchTool(server);
  registerGetKnowledgeTool(server);
}
