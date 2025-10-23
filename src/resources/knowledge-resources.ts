import fs from 'node:fs';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

      results.push({
        relativePath,
        fullPath,
        uri: `knowledge://${uriPath}`,
        name: metadata.name || uriPath,
        description: metadata.description || '',
        category: metadata.category || '',
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
