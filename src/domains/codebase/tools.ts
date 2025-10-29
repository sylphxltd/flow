/**
 * Codebase tools - 代碼庫工具
 * All tools for working with project source code and files
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { UnifiedSearchService } from '../../services/search/unified-search-service.js';
import { CodebaseIndexer } from '../../services/search/codebase-indexer.js';
import { getDefaultEmbeddingProvider } from '../../services/search/embeddings.js';

/**
 * Register codebase search tool
 */
export function registerCodebaseSearchTool(server: McpServer): void {
  server.registerTool(
    'codebase_search',
    {
      description: `Search project source files, documentation, and code. Use this to find implementations, functions, classes, or any code-related content.

**IMPORTANT: Use this tool PROACTIVELY before starting work, not reactively when stuck.**

This tool searches across all codebase files and returns the most relevant matches with content snippets.

When to use this tool (BEFORE starting work):
- **Before implementation**: Find existing patterns, similar functions, or reusable components
- **Before refactoring**: Understand current implementation and dependencies
- **Before adding features**: Check for existing similar functionality or conflicting code
- **Before debugging**: Search for error messages, function names, or related code
- **Before writing tests**: Find existing test patterns and test utilities

The search includes:
- Source code files (.ts, .js, .tsx, .jsx, etc.)
- Configuration files (.json, .yaml, .toml, etc.)
- Documentation files (.md, .txt, etc.)
- Build and deployment files

**Best Practice**: Search the codebase BEFORE writing new code to avoid duplication and follow existing patterns.`,
      inputSchema: {
        query: z
          .string()
          .describe('Search query - use natural language, function names, or technical terms'),
        limit: z
          .number()
          .default(10)
          .optional()
          .describe('Maximum number of results to return (default: 10)'),
        include_content: z
          .boolean()
          .default(true)
          .optional()
          .describe('Include file content snippets in results (default: true)'),
        file_extensions: z
          .array(z.string())
          .optional()
          .describe('Filter by file extensions (e.g., [".ts", ".tsx", ".js"])'),
        path_filter: z
          .string()
          .optional()
          .describe('Filter by path pattern (e.g., "src/components", "tests", "docs")'),
        exclude_paths: z
          .array(z.string())
          .optional()
          .describe(
            'Exclude paths containing these patterns (e.g., ["node_modules", ".git", "dist"])'
          ),
      },
    },
    async ({
      query,
      limit = 10,
      include_content = true,
      file_extensions,
      path_filter,
      exclude_paths,
    }) => {
      try {
        // 直接使用 CodebaseIndexer - 與 CLI 相同的邏輯
        const codebaseIndexer = new CodebaseIndexer();
        const embeddingProvider = await getDefaultEmbeddingProvider();

        // 確保已索引
        try {
          const stats = await codebaseIndexer.getCacheStats();
          if (stats.fileCount === 0) {
            await codebaseIndexer.indexCodebase({ embeddingProvider });
          }
        } catch {
          // 如果檢查失敗，直接索引
          await codebaseIndexer.indexCodebase({ embeddingProvider });
        }

        // 執行搜索
        const searchResults = await codebaseIndexer.search(query, {
          limit,
          minScore: 0.0, // 設置為 0 確保有結果
          includeContent: include_content,
        });

        // 格式化結果為 MCP 格式
        const formattedResults = searchResults.map((result, index) => ({
          uri: `file://${result.path}`,
          score: result.score || 0,
          title: result.path.split('/').pop() || result.path,
          content: include_content && result.content ?
            (result.content.length > 500 ? result.content.substring(0, 500) + '...' : result.content) :
            undefined,
        }));

        // 構建回應文本
        let responseText = `Found ${searchResults.length} result(s) for "${query}":\n\n`;
        formattedResults.forEach((result, index) => {
          responseText += `${index + 1}. **${result.title}** (Score: ${result.score.toFixed(3)})\n`;
          responseText += `   📁 Path: \`${result.uri.replace('file://', '')}\`\n`;
          if (result.content) {
            responseText += `   📄 Content: ${result.content}\n`;
          }
          responseText += '\n';
        });

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `✗ Codebase search error: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );
}

/**
 * Register all codebase tools
 */
export function registerCodebaseTools(server: McpServer): void {
  registerCodebaseSearchTool(server);
}
