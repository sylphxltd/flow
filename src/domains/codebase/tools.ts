/**
 * Codebase tools
 * All tools for working with project source code and files
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchService } from '../../services/search/unified-search-service.js';

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
        // Use UnifiedSearchService - same logic as CLI
        await searchService.initialize();

        // Check codebase status
        const status = await searchService.getStatus();

        // If indexing in progress, show progress
        if (status.codebase.isIndexing) {
          const progressBar = '█'.repeat(Math.floor(status.codebase.progress / 5)) +
                              '░'.repeat(20 - Math.floor(status.codebase.progress / 5));
          return {
            content: [
              {
                type: 'text',
                text: `⏳ **Codebase Indexing In Progress**\n\nThe codebase is currently being indexed. Please wait...\n\n**Progress:** ${status.codebase.progress}%\n\`${progressBar}\`\n\n**Status:**\n- Files indexed: ${status.codebase.progress > 0 ? Math.floor(status.codebase.fileCount * status.codebase.progress / 100) : 0}/${status.codebase.fileCount}\n${status.codebase.currentFile ? `- Current file: \`${status.codebase.currentFile}\`` : ''}\n\n**Estimated time:** ${status.codebase.progress > 0 ? 'Less than 1 minute' : 'Starting...'}\n\n💡 **Tip:** Try your search again in a few seconds.`,
              },
            ],
          };
        }

        if (!status.codebase.indexed) {
          return {
            content: [
              {
                type: 'text',
                text: `📭 **Codebase Not Indexed**\n\nThe codebase has not been indexed yet.\n\n**To fix:**\n- Run: \`sylphx codebase reindex\` from the command line\n- This will create a search index for all source files\n\n**Why this is needed:**\nThe first time you use codebase search, you need to build an index of all files. This only needs to be done once (or when files change significantly).`,
              },
            ],
          };
        }

        // Perform search using unified service
        const result = await searchService.searchCodebase(query, {
          limit,
          include_content,
          file_extensions,
          path_filter,
          exclude_paths,
        });

        // Return MCP-formatted results
        return searchService.formatResultsForMCP(result.results, query, result.totalIndexed);
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
