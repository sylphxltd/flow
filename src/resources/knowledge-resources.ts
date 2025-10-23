import fs from 'node:fs';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getKnowledgeDir } from '../utils/paths.js';
import { semanticSearch, getSearchIndexStats } from '../utils/semantic-search.js';

/**
 * Parse YAML frontmatter from markdown file
 */
function parseFrontmatter(content: string): {
  metadata: Record<string, string>;
  content: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, content };
  }

  const [, frontmatter, mainContent] = match;
  const metadata: Record<string, string> = {};

  for (const line of frontmatter.split('\n')) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      metadata[key.trim()] = valueParts.join(':').trim();
    }
  }

  return { metadata, content: mainContent };
}

/**
 * Recursively scan knowledge directory for .md files
 */
function scanKnowledgeFiles(
  dir: string,
  baseDir: string
): Array<{
  relativePath: string;
  fullPath: string;
  uri: string;
  name: string;
  description: string;
  category: string;
}> {
  const results: Array<{
    relativePath: string;
    fullPath: string;
    uri: string;
    name: string;
    description: string;
    category: string;
  }> = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...scanKnowledgeFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relativePath = path.relative(baseDir, fullPath);
      const uriPath = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');

      const content = fs.readFileSync(fullPath, 'utf8');
      const { metadata } = parseFrontmatter(content);

      // Derive category from first path segment (stacks/react-app.md → stacks)
      const category = uriPath.split('/')[0] || '';

      results.push({
        relativePath,
        fullPath,
        uri: `knowledge://${uriPath}`,
        name: metadata.name || uriPath,
        description: metadata.description || '',
        category,
      });
    }
  }

  return results;
}

/**
 * Get all knowledge resources by scanning directory
 */
export function getAllKnowledgeResources() {
  const knowledgeDir = getKnowledgeDir();

  if (!fs.existsSync(knowledgeDir)) {
    return [];
  }

  return scanKnowledgeFiles(knowledgeDir, knowledgeDir);
}

/**
 * Get knowledge content from URI
 */
export function getKnowledgeContent(uri: string): string {
  const uriPath = uri.replace(/^knowledge:\/\//, '');
  const knowledgeDir = getKnowledgeDir();
  const filePath = path.join(knowledgeDir, `${uriPath}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Knowledge resource not found: ${uri}`);
  }

  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Simple fuzzy search scoring
 * Returns score 0-1 based on keyword matches in name, description, category
 */
function scoreKnowledgeResource(
  resource: { name: string; description: string; category: string; uri: string },
  query: string
): number {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  let score = 0;
  const searchText =
    `${resource.name} ${resource.description} ${resource.category} ${resource.uri}`.toLowerCase();

  for (const keyword of keywords) {
    if (searchText.includes(keyword)) {
      // Boost score if keyword appears in name (more important)
      if (resource.name.toLowerCase().includes(keyword)) {
        score += 0.5;
      }
      // Boost if in description
      if (resource.description.toLowerCase().includes(keyword)) {
        score += 0.3;
      }
      // Boost if in category
      if (resource.category.toLowerCase().includes(keyword)) {
        score += 0.2;
      }
    }
  }

  // Normalize by number of keywords
  return Math.min(1, score / keywords.length);
}

/**
 * Register knowledge tools with MCP server
 */
export function registerKnowledgeTools(server: McpServer) {
  const resources = getAllKnowledgeResources();

  // Build description with all available knowledge
  const knowledgeList = resources.map((r) => `• ${r.uri}\n  ${r.description}`).join('\n\n');

  server.registerTool(
    'search_knowledge',
    {
      description: `Search and retrieve domain-specific knowledge and best practices for software development.

**IMPORTANT: Use this tool PROACTIVELY before starting work, not reactively when stuck.**

This tool searches across all knowledge resources and returns the most relevant matches with full content.

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
          .describe(
            'Search query (e.g., "react performance", "security auth", "database indexing")'
          ),
        limit: z
          .number()
          .optional()
          .describe('Maximum number of results to return (default: 5, max: 10)'),
        categories: z
          .array(z.string())
          .optional()
          .describe('Filter by categories: stacks, data, guides, universal'),
        include_content: z
          .boolean()
          .optional()
          .describe('Include full content in results (default: true)'),
      },
    },
    (args) => {
      const query = args.query as string;
      const limit = Math.min((args.limit as number) || 5, 10);
      const categories = args.categories as string[] | undefined;
      const includeContent = (args.include_content as boolean) ?? true;

      // Try semantic search first (TF-IDF based)
      const semanticResults = semanticSearch(query, {
        limit,
        categories,
        minScore: 0.01,
      });

      let scored: Array<{
        resource: { uri: string; name: string; description: string; category: string };
        score: number;
      }>;

      if (semanticResults.length > 0) {
        // Use semantic search results
        scored = semanticResults.map((result) => {
          const resource = resources.find((r) => r.uri === result.uri);
          return {
            resource: resource || {
              uri: result.uri,
              name: result.uri,
              description: '',
              category: result.uri.split('/')[1] || '',
            },
            score: result.score,
          };
        });
      } else {
        // Fallback to fuzzy search
        let filteredResources = resources;
        if (categories && categories.length > 0) {
          filteredResources = resources.filter((r) => categories.includes(r.category));
        }

        scored = filteredResources
          .map((r) => ({
            resource: r,
            score: scoreKnowledgeResource(r, query),
          }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      }

      if (scored.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No knowledge resources found for query: "${query}"\n\nAvailable categories: stacks, data, guides, universal\n\nTry broader search terms or check available resources with different keywords.`,
            },
          ],
        };
      }

      // Build response
      const results = scored.map((item) => {
        const { resource, score } = item;
        let result = `## ${resource.name} (${resource.category})\n`;
        result += `**URI**: ${resource.uri}\n`;
        result += `**Relevance**: ${(score * 100).toFixed(0)}%\n`;
        result += `**Description**: ${resource.description}\n\n`;

        if (includeContent) {
          try {
            const content = getKnowledgeContent(resource.uri);
            result += `---\n\n${content}\n\n`;
          } catch (error) {
            result += `*Error loading content*\n\n`;
          }
        }

        return result;
      });

      const indexStats = getSearchIndexStats();
      const searchMethod = semanticResults.length > 0 ? 'semantic (TF-IDF)' : 'fuzzy keyword';
      const summary = `Found ${scored.length} relevant knowledge resource(s) for "${query}" using ${searchMethod} search:\n${indexStats ? `\n*Search index: ${indexStats.totalDocuments} docs, ${indexStats.uniqueTerms} terms*\n` : ''}\n`;

      return {
        content: [
          {
            type: 'text',
            text: summary + results.join('\n---\n\n'),
          },
        ],
      };
    }
  );

  server.registerTool(
    'get_knowledge',
    {
      description: `Get knowledge resource by exact URI.

**NOTE: Prefer using 'search_knowledge' instead - it's easier and doesn't require knowing exact URIs.**

This tool retrieves a specific knowledge resource when you already know its exact URI.

Available URIs:
${knowledgeList}

For most use cases, use 'search_knowledge' with keywords instead of this tool.`,
      inputSchema: {
        uri: z
          .string()
          .describe(
            `Knowledge URI to access (e.g., "knowledge://stacks/react-app"). Available: ${resources.map((r) => r.uri).join(', ')}`
          ),
      },
    },
    (args) => {
      const uri = args.uri as string;
      try {
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
              text: `❌ Error: ${errorMessage}\n\nAvailable knowledge URIs:\n${resources.map((r) => `• ${r.uri}`).join('\n')}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  console.error(`[INFO] Registered knowledge tools: search_knowledge, get_knowledge`);
}
