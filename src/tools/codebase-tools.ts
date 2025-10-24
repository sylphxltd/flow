/**
 * Codebase tools - 代碼庫工具
 * All tools for working with project source code and files
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchDocuments } from '../utils/tfidf.js';
import { SeparatedMemoryStorage } from '../utils/separated-storage.js';
import { getDefaultEmbeddingProvider } from '../utils/embeddings.js';

// Global instance
const memoryStorage = new SeparatedMemoryStorage();

/**
 * Register codebase search tool
 */
export function registerCodebaseSearchTool(server: McpServer): void {
  server.registerTool(
    'search_codebase',
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
        // Initialize memory storage
        await memoryStorage.initialize();

        // Get all codebase files and their TF-IDF data
        const allFiles = await memoryStorage.getAllCodebaseFiles();

        // Check if codebase is indexed at all
        if (allFiles.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '📭 No codebase files indexed yet. The codebase needs to be indexed first before searching.\n\n**To index the codebase:**\n- Use CLI: `sylphx search reindex`\n- Or check if indexing is in progress\n\n**Current Status:** Not indexed',
              },
            ],
          };
        }

        // Apply filters
        let files = allFiles;
        if (file_extensions && file_extensions.length > 0) {
          files = files.filter((file) =>
            file_extensions.some((ext: string) => file.path.endsWith(ext))
          );
        }

        if (path_filter) {
          files = files.filter((file) => file.path.includes(path_filter));
        }

        if (exclude_paths && exclude_paths.length > 0) {
          files = files.filter(
            (file) => !exclude_paths.some((exclude: string) => file.path.includes(exclude))
          );
        }

        if (files.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `📭 No codebase files found matching the filters.\n\n**Total indexed files:** ${allFiles.length}\n**Applied filters:**\n${file_extensions ? `- File extensions: ${file_extensions.join(', ')}` : ''}\n${path_filter ? `- Path filter: "${path_filter}"` : ''}\n${exclude_paths ? `- Exclude paths: ${exclude_paths.join(', ')}` : ''}\n\n**Suggestions:**\n- Try broader filters or remove some restrictions\n- Check available files with: \`sylphx search status\``,
              },
            ],
          };
        }

        if (path_filter) {
          files = files.filter((file) => file.path.includes(path_filter));
        }

        if (exclude_paths && exclude_paths.length > 0) {
          files = files.filter(
            (file) => !exclude_paths.some((exclude: string) => file.path.includes(exclude))
          );
        }

        if (files.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '📭 No codebase files found matching the filters. Try adjusting the filters or check if files are indexed.',
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
                text: '📭 No searchable content found in filtered files.',
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

        // Try semantic search first, fallback to TF-IDF
        let results;
        try {
          const embeddingProvider = getDefaultEmbeddingProvider();
          console.log('[INFO] Attempting semantic search...');
          // TODO: Implement proper semantic search with vector storage
          console.log('[INFO] Semantic search not available, using TF-IDF fallback');
        } catch (error) {
          console.log('[INFO] Using TF-IDF search');
        }

        // TF-IDF search (with sensible defaults)
        results = await searchDocuments(query, index, {
          limit,
          minScore: 0.1, // Internal default, user doesn't need to specify
        });

        const summary = `Found ${results.length} codebase result(s) for "${query}":\n\n`;
        const formattedResults = results
          .map((result: any, i: number) => {
            const filename = result.uri?.replace('file://', '') || 'Unknown';
            let content = '';

            if (include_content) {
              const doc = searchDocs.find((d) => d.uri === result.uri);
              content = doc?.content
                ? `\n\`\`\`\n${doc.content.substring(0, 500)}${doc.content.length > 500 ? '...' : ''}\n\`\`\``
                : '';
            }

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
}

/**
 * Register all codebase tools
 */
export function registerCodebaseTools(server: McpServer): void {
  registerCodebaseSearchTool(server);
}
