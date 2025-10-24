/**
 * Knowledge tools - 知識庫工具
 * All tools for working with knowledge base, documentation, and guides
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchService } from '../utils/unified-search-service.js';

/**
 * Register knowledge search tool
 */
export function registerKnowledgeSearchTool(server: McpServer): void {
  server.registerTool(
    'knowledge_search',
    {
      description: `Search knowledge base, documentation, guides, and reference materials. Use this for domain knowledge, best practices, setup instructions, and conceptual information.

**IMPORTANT: Use this tool PROACTIVELY before starting work, not reactively when stuck.**

This tool searches across all knowledge resources and returns the most relevant matches. Use include_content=false to reduce context usage, then use knowledge_get for specific documents.

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
            'Include full content in results (default: true). Use false to reduce context, then knowledge_get for specific docs'
          ),
      },
    },
    async ({ query, limit = 10, include_content = true }) => {
      try {
        // 使用統一搜索服務 - 同 CLI 用相同邏輯
        await searchService.initialize();

        // 檢查知識庫狀態
        const status = await searchService.getStatus();

        if (status.knowledge.isIndexing) {
          return {
            content: [
              {
                type: 'text',
                text: `⏳ **Knowledge Indexing in Progress**\n\n- Progress: ${status.knowledge.progress || 0}%\n- Status: Building search index\n\n*This typically takes <1 second for knowledge base.*\n\n**Please wait a moment and try again.**`,
              },
            ],
          };
        }

        if (!status.knowledge.indexed) {
          return {
            content: [
              {
                type: 'text',
                text: `📭 **No Knowledge Documents Available**\n\nThe knowledge base appears to be empty or not properly initialized.\n\n**To fix:**\n- Check if knowledge files exist in assets/knowledge/\n- Try restarting the MCP server to trigger indexing\n- Use CLI: \`sylphx search status\` for diagnostics\n\n**Expected knowledge files:**\n- stacks/ (framework-specific patterns)\n- guides/ (architecture guidance)\n- universal/ (cross-cutting concerns)\n- data/ (database patterns)`,
              },
            ],
          };
        }

        // 使用統一搜索服務搜索知識庫
        const result = await searchService.searchKnowledge(query, {
          limit,
          include_content,
        });

        // 返回 MCP 格式 - 使用統一服務嘅格式化方法
        return searchService.formatResultsForMCP(result.results, query, result.totalIndexed);
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
    'knowledge_get',
    {
      description: `Get knowledge resource by exact URI.

**NOTE: Prefer using 'knowledge_search' with include_content=false first, then use this tool for specific documents.**

This tool retrieves a specific knowledge resource when you already know its exact URI from search results.

The available URIs are dynamically generated from the indexed knowledge base. Use 'knowledge_search' to discover relevant URIs first.`,
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

        // 動態獲取可用 URI
        const availableURIs = await searchService.getAvailableKnowledgeURIs();
        const uriList =
          availableURIs.length > 0
            ? availableURIs.map((uri) => `• ${uri}`).join('\n')
            : 'No knowledge documents available';

        return {
          content: [
            {
              type: 'text',
              text: `❌ Error: ${errorMessage}\n\nAvailable knowledge URIs:\n${uriList}`,
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
