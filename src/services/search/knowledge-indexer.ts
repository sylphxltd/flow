/**
 * Knowledge indexer implementation
 * Extends BaseIndexer for knowledge base indexing
 */

import fs from 'node:fs';
import path from 'node:path';
import { getKnowledgeDir } from '../../utils/paths.js';
import { VectorStorage } from '../storage/lancedb-vector-storage.js';
import { BaseIndexer } from './base-indexer.js';
import type { EmbeddingProvider } from './embeddings.js';
import { getDefaultEmbeddingProvider } from './embeddings.js';
import { type SearchIndex, buildSearchIndex } from './tfidf.js';

/**
 * Knowledge indexer singleton
 */
class KnowledgeIndexer extends BaseIndexer {
  private embeddingProvider?: EmbeddingProvider;
  private vectorStorage?: VectorStorage;

  constructor(embeddingProvider?: EmbeddingProvider) {
    super({ name: 'knowledge', autoStart: true });
    this.embeddingProvider = embeddingProvider;
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

    // Build TF-IDF index
    const index = buildSearchIndex(files);

    // Build vector index if embedding provider is available
    if (this.embeddingProvider && files.length > 0) {
      console.error('[INFO] Building vector index for knowledge...');

      try {
        const vectorPath = path.join(
          getKnowledgeDir(),
          '..',
          '.sylphx-flow',
          'knowledge-vectors.hnsw'
        );
        this.vectorStorage = new VectorStorage(
          vectorPath,
          this.embeddingProvider.dimensions || 1536
        );
        await this.vectorStorage.initialize();

        // Process files in batches
        const batchSize = 10;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          const embeddings = await this.embeddingProvider.generateEmbeddings(
            batch.map((file) => file.content)
          );

          for (let j = 0; j < batch.length; j++) {
            const file = batch[j];
            const embedding = embeddings[j];

            await this.vectorStorage.addDocument({
              id: file.uri,
              embedding,
              metadata: {
                type: 'knowledge',
                content: file.content.slice(0, 500),
                category: 'knowledge',
                language: 'markdown',
              },
            });
          }

          console.error(
            `[INFO] Processed ${Math.min(i + batchSize, files.length)}/${files.length} knowledge files`
          );
        }

        await this.vectorStorage.save();
        console.error('[INFO] Vector index built successfully');
      } catch (error) {
        console.error('[ERROR] Failed to build vector index:', error);
        this.vectorStorage = undefined;
      }
    }

    return index;
  }
}

// Singleton instance
let knowledgeIndexer: KnowledgeIndexer | null = null;

export function getKnowledgeIndexer(embeddingProvider?: EmbeddingProvider): KnowledgeIndexer {
  if (!knowledgeIndexer) {
    knowledgeIndexer = new KnowledgeIndexer(embeddingProvider);
  }
  return knowledgeIndexer;
}

export async function getKnowledgeIndexerWithEmbeddings(): Promise<KnowledgeIndexer> {
  const embeddingProvider = await getDefaultEmbeddingProvider();
  return getKnowledgeIndexer(embeddingProvider);
}
