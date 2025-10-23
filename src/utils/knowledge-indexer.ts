/**
 * Knowledge indexer implementation
 * Extends BaseIndexer for knowledge base indexing
 */

import fs from 'node:fs';
import path from 'node:path';
import { BaseIndexer } from './base-indexer.js';
import { buildSearchIndex, type SearchIndex } from './tfidf.js';
import { getKnowledgeDir } from './paths.js';

/**
 * Knowledge indexer singleton
 */
class KnowledgeIndexer extends BaseIndexer {
  constructor() {
    super({ name: 'knowledge', autoStart: true });
  }

  /**
   * Scan knowledge directory for markdown files
   */
  private scanKnowledgeFiles(dir: string): Array<{ uri: string; content: string }> {
    const results: Array<{ uri: string; content: string }> = [];

    const scan = (currentDir: string, baseDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          scan(fullPath, baseDir);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const relativePath = path.relative(baseDir, fullPath);
          const uriPath = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');
          const content = fs.readFileSync(fullPath, 'utf8');

          results.push({
            uri: `knowledge://${uriPath}`,
            content,
          });
        }
      }
    };

    scan(dir, dir);
    return results;
  }

  /**
   * Build knowledge index
   */
  protected async buildIndex(): Promise<SearchIndex> {
    const knowledgeDir = getKnowledgeDir();

    if (!fs.existsSync(knowledgeDir)) {
      throw new Error(`Knowledge directory not found: ${knowledgeDir}`);
    }

    const files = this.scanKnowledgeFiles(knowledgeDir);
    console.error(`[INFO] Found ${files.length} knowledge files`);

    const index = buildSearchIndex(files);
    return index;
  }
}

// Singleton instance
let knowledgeIndexer: KnowledgeIndexer | null = null;

export function getKnowledgeIndexer(): KnowledgeIndexer {
  if (!knowledgeIndexer) {
    knowledgeIndexer = new KnowledgeIndexer();
  }
  return knowledgeIndexer;
}
