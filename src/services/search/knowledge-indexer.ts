/**
 * Knowledge indexer implementation
 * Extends BaseIndexer for knowledge base indexing
 *
 * Features:
 * - Auto-indexing on startup (mandatory)
 * - File watching for automatic re-indexing on changes
 * - Debounced re-indexing (2 seconds after last change)
 */

import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { getKnowledgeDir } from '../../utils/paths.js';
import { VectorStorage } from '../storage/lancedb-vector-storage.js';
import { BaseIndexer } from './base-indexer.js';
import type { EmbeddingProvider } from './embeddings.js';
import { getDefaultEmbeddingProvider } from './embeddings.js';
import { type Indexer, createIndexer } from './functional-indexer.js';
import { type SearchIndex, buildSearchIndex } from './tfidf.js';
import { logger } from '../../utils/logger.js';

/**
 * Knowledge indexer singleton
 */
class KnowledgeIndexer extends BaseIndexer {
  private embeddingProvider?: EmbeddingProvider;
  private vectorStorage?: VectorStorage;
  private watcher?: chokidar.FSWatcher;
  private reindexTimer?: NodeJS.Timeout;

  constructor(embeddingProvider?: EmbeddingProvider, options?: { autoWatch?: boolean }) {
    super({ name: 'knowledge' });
    this.embeddingProvider = embeddingProvider;

    // Start file watching only if explicitly enabled or in MCP server context
    // This prevents file watchers from starting during init command or other non-server contexts
    const shouldAutoWatch = options?.autoWatch ?? process.env.MCP_SERVER_MODE === 'true';
    if (shouldAutoWatch) {
      this.startWatching();
    }
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
    logger.info('Found knowledge files', { count: files.length });

    // Build TF-IDF index
    const index = await buildSearchIndex(files);

    // Build vector index if embedding provider is available
    if (this.embeddingProvider && files.length > 0) {
      logger.info('Building vector index for knowledge');

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

          logger.info('Processed knowledge files', {
            processed: Math.min(i + batchSize, files.length),
            total: files.length,
          });
        }

        await this.vectorStorage.save();
        logger.info('Vector index built successfully');
      } catch (error) {
        logger.error(' Failed to build vector index:', error);
        this.vectorStorage = undefined;
      }
    }

    return index;
  }

  /**
   * Start watching knowledge directory for changes
   * MANDATORY: Auto-enabled to prevent stale data from misleading users
   */
  private startWatching(): void {
    const knowledgeDir = getKnowledgeDir();

    if (!fs.existsSync(knowledgeDir)) {
      logger.warn('Knowledge directory not found', { knowledgeDir });
      return;
    }

    try {
      this.watcher = chokidar.watch(`${knowledgeDir}/**/*.md`, {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: true, // Don't trigger on initial scan
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      });

      this.watcher.on('all', (event, filePath) => {
        logger.debug('Knowledge file changed', { event, file: path.basename(filePath) });

        // Debounce: Wait 2 seconds after last change before re-indexing
        if (this.reindexTimer) {
          clearTimeout(this.reindexTimer);
        }

        this.reindexTimer = setTimeout(() => {
          logger.info('Re-indexing knowledge base due to file changes');
          this.clearCache();
          this.startBackgroundIndexing();
        }, 2000);
      });

      logger.info('Watching knowledge directory for changes', { knowledgeDir });
    } catch (error) {
      logger.error(' Failed to start file watching:', error);
      // Don't throw - indexing can still work without watching
    }
  }

  /**
   * Stop watching (for cleanup)
   */
  stopWatching(): void {
    if (this.reindexTimer) {
      clearTimeout(this.reindexTimer);
      this.reindexTimer = undefined;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      logger.info('Stopped watching knowledge directory');
    }
  }

  /**
   * Override clearCache to also stop any pending reindex
   */
  clearCache(): void {
    if (this.reindexTimer) {
      clearTimeout(this.reindexTimer);
      this.reindexTimer = undefined;
    }
    super.clearCache();
  }
}

// Singleton instance
let knowledgeIndexer: KnowledgeIndexer | null = null;

export function getKnowledgeIndexer(
  embeddingProvider?: EmbeddingProvider,
  options?: { autoWatch?: boolean }
): KnowledgeIndexer {
  if (!knowledgeIndexer) {
    knowledgeIndexer = new KnowledgeIndexer(embeddingProvider, options);
  }
  return knowledgeIndexer;
}

export async function getKnowledgeIndexerWithEmbeddings(): Promise<KnowledgeIndexer> {
  const embeddingProvider = await getDefaultEmbeddingProvider();
  return getKnowledgeIndexer(embeddingProvider);
}

// ============================================================================
// FUNCTIONAL ALTERNATIVE (Composition over Inheritance)
// ============================================================================

/**
 * Create functional knowledge indexer using composition
 * Modern alternative to class-based KnowledgeIndexer
 *
 * @example
 * const indexer = createKnowledgeIndexerFunctional();
 * const status = indexer.getStatus();
 * const index = await indexer.loadIndex();
 */
export function createKnowledgeIndexerFunctional(
  embeddingProvider?: EmbeddingProvider
): Indexer & { stopWatching: () => void } {
  const knowledgeDir = getKnowledgeDir();
  let watcher: chokidar.FSWatcher | undefined;
  let reindexTimer: NodeJS.Timeout | undefined;

  // Core indexer with pure functions
  const coreIndexer = createIndexer({
    name: 'knowledge',
    buildIndex: async (): Promise<SearchIndex> => {
      if (!fs.existsSync(knowledgeDir)) {
        throw new Error(`Knowledge directory not found: ${knowledgeDir}`);
      }

      // Scan knowledge files
      const scanKnowledgeFiles = (dir: string): Array<{ uri: string; content: string }> => {
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
      };

      const files = scanKnowledgeFiles(knowledgeDir);
      logger.info('Found knowledge files', { count: files.length });

      // Build TF-IDF index
      const index = await buildSearchIndex(files);

      // Build vector index if embedding provider available
      if (embeddingProvider && files.length > 0) {
        logger.info('Building vector index for knowledge');

        try {
          const vectorPath = path.join(
            knowledgeDir,
            '..',
            '.sylphx-flow',
            'knowledge-vectors.hnsw'
          );
          const vectorStorage = new VectorStorage(vectorPath, embeddingProvider.dimensions || 1536);
          await vectorStorage.initialize();

          // Process in batches
          const batchSize = 10;
          for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const embeddings = await embeddingProvider.generateEmbeddings(
              batch.map((file) => file.content)
            );

            for (let j = 0; j < batch.length; j++) {
              const file = batch[j];
              const embedding = embeddings[j];

              await vectorStorage.addDocument({
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

          logger.info('Processed knowledge files', {
            processed: Math.min(i + batchSize, files.length),
            total: files.length,
          });
          }

          await vectorStorage.save();
          logger.info('Vector index built successfully');
        } catch (error) {
          logger.error(' Failed to build vector index:', error);
        }
      }

      return index;
    },
  });

  // Add file watching
  if (fs.existsSync(knowledgeDir)) {
    try {
      watcher = chokidar.watch(`${knowledgeDir}/**/*.md`, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      });

      watcher.on('all', (event, filePath) => {
        logger.debug('Knowledge file changed', { event, file: path.basename(filePath) });

        // Debounce: Wait 2 seconds after last change
        if (reindexTimer) {
          clearTimeout(reindexTimer);
        }

        reindexTimer = setTimeout(() => {
          logger.info('Re-indexing knowledge base due to file changes');
          coreIndexer.clearCache();
          coreIndexer.startBackgroundIndexing();
        }, 2000);
      });

      logger.info('Watching knowledge directory for changes', { knowledgeDir });
    } catch (error) {
      logger.error(' Failed to start file watching:', error);
    }
  }

  // Return enhanced indexer with watching capabilities
  return {
    ...coreIndexer,
    stopWatching: () => {
      if (reindexTimer) {
        clearTimeout(reindexTimer);
        reindexTimer = undefined;
      }
      if (watcher) {
        watcher.close();
        watcher = undefined;
        logger.info('Stopped watching knowledge directory');
      }
    },
  };
}
