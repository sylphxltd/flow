import fs from 'node:fs';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getKnowledgeDir } from '../utils/paths.js';

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
 * Register knowledge resources with MCP server
 * Dynamically scans knowledge directory and registers all .md files
 */
export function registerKnowledgeResources(server: McpServer) {
  const resources = getAllKnowledgeResources();

  // Register as resources (primary method)
  for (const resource of resources) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        description: resource.description,
        mimeType: 'text/markdown',
      },
      async () => {
        const content = getKnowledgeContent(resource.uri);
        return {
          contents: [
            {
              uri: resource.uri,
              text: content,
              mimeType: 'text/markdown',
            },
          ],
        };
      }
    );
  }

  console.error(`[INFO] Registered ${resources.length} knowledge resources`);
}

/**
 * Register knowledge tools with MCP server
 * Fallback for environments that don't properly support resources
 */
export function registerKnowledgeTools(server: McpServer) {
  const resources = getAllKnowledgeResources();

  // Build description with all available knowledge
  const knowledgeList = resources.map((r) => `• ${r.uri}\n  ${r.description}`).join('\n\n');

  server.registerTool(
    'get_knowledge',
    {
      description: `Access domain-specific knowledge and best practices for software development.

Available knowledge resources:

${knowledgeList}

Use this when you need:
- Specific framework patterns (React hooks, Next.js App Router, Node.js APIs)
- Database guidance (SQL optimization, indexing, migrations)
- Security best practices (OWASP, auth patterns, vulnerabilities)
- Performance optimization (profiling, caching, optimization)
- Testing strategies (TDD, unit/integration/e2e)
- Deployment patterns (Docker, CI/CD, monitoring)
- Architecture guidance (SaaS patterns, tech stack decisions, UI/UX)

The knowledge is curated for LLM code generation - includes decision trees, common bugs, and practical patterns.`,
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

  server.registerTool(
    'list_knowledge',
    {
      description: 'List all available knowledge resources with descriptions',
      inputSchema: {},
    },
    () => {
      const list = resources
        .map(
          (r) =>
            `**${r.name}** (${r.category})\n` + `URI: ${r.uri}\n` + `Description: ${r.description}`
        )
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `# Available Knowledge Resources\n\n${list}\n\nUse get_knowledge(uri) to access specific knowledge.`,
          },
        ],
      };
    }
  );

  console.error(`[INFO] Registered ${resources.length} knowledge tools`);
}
