/**
 * Unified Indexer Service - 統一索引服務
 * 處理所有domain嘅索引建立和維護
 */

import fs from 'node:fs';
import path from 'node:path';
import type { EmbeddingProvider } from '../../utils/embeddings.js';
import { VectorStorage } from '../../utils/lancedb-vector-storage.js';
import { buildSearchIndex, type SearchIndex } from '../../utils/tfidf.js';
import type { ContentMetadata } from './search-service.js';

export interface IndexingOptions {
  batchSize?: number;
  includeVectorIndex?: boolean;
  forceRebuild?: boolean;
}

export interface IndexingProgress {
  domain: string;
  totalFiles: number;
  processedFiles: number;
  status: 'scanning' | 'indexing' | 'vectorizing' | 'complete' | 'error';
  error?: string;
}

/**
 * Internal state for IndexerService
 */
interface IndexerServiceState {
  readonly embeddingProvider?: EmbeddingProvider;
  readonly vectorStorages: ReadonlyMap<string, VectorStorage>;
  readonly progressCallbacks: ReadonlySet<(progress: IndexingProgress) => void>;
}

/**
 * IndexerService Interface
 * Unified indexer for building and maintaining search indices
 */
export interface IndexerService {
  readonly initialize: () => Promise<void>;
  readonly onProgress: (callback: (progress: IndexingProgress) => void) => void;
  readonly offProgress: (callback: (progress: IndexingProgress) => void) => void;
  readonly buildIndex: (
    domain: 'knowledge' | 'codebase',
    options?: IndexingOptions
  ) => Promise<SearchIndex>;
  readonly updateIndex: (domain: string, content: ContentMetadata) => Promise<void>;
  readonly removeFromIndex: (domain: string, uri: string) => Promise<void>;
}

/**
 * Create Indexer Service (Factory Function)
 * Handles all domain indexing and maintenance
 */
export const createIndexerService = (embeddingProvider?: EmbeddingProvider): IndexerService => {
  // Mutable state in closure (will be updated immutably)
  let state: IndexerServiceState = {
    embeddingProvider,
    vectorStorages: new Map(),
    progressCallbacks: new Set(),
  };

  // Helper: Update state immutably
  const updateState = (updates: Partial<IndexerServiceState>): void => {
    state = { ...state, ...updates };
  };

  /**
   * 初始化索引服務
   */
  const initialize = async (): Promise<void> => {
    if (!state.embeddingProvider) {
      // Import here to avoid circular dependencies
      const { getDefaultEmbeddingProvider } = await import('../../utils/embeddings.js');
      const provider = await getDefaultEmbeddingProvider();
      updateState({ embeddingProvider: provider });
    }
  };

  /**
   * 註冊進度回調
   */
  const onProgress = (callback: (progress: IndexingProgress) => void): void => {
    const newCallbacks = new Set(state.progressCallbacks);
    newCallbacks.add(callback);
    updateState({ progressCallbacks: newCallbacks });
  };

  /**
   * 移除進度回調
   */
  const offProgress = (callback: (progress: IndexingProgress) => void): void => {
    const newCallbacks = new Set(state.progressCallbacks);
    newCallbacks.delete(callback);
    updateState({ progressCallbacks: newCallbacks });
  };

  /**
   * 報告進度
   */
  const reportProgress = (progress: IndexingProgress): void => {
    state.progressCallbacks.forEach((callback) => callback(progress));
  };

  /**
   * 為指定domain建立索引
   */
  const buildIndex = async (
    domain: 'knowledge' | 'codebase',
    options: IndexingOptions = {}
  ): Promise<SearchIndex> => {
    const { batchSize = 10, includeVectorIndex = true, forceRebuild = false } = options;

    reportProgress({
      domain,
      totalFiles: 0,
      processedFiles: 0,
      status: 'scanning',
    });

    try {
      // 掃描文件
      const files = await scanDomainFiles(domain);

      reportProgress({
        domain,
        totalFiles: files.length,
        processedFiles: 0,
        status: 'indexing',
      });

      // 建立TF-IDF索引
      const searchIndex = buildSearchIndex(files);

      reportProgress({
        domain,
        totalFiles: files.length,
        processedFiles: files.length,
        status: includeVectorIndex ? 'vectorizing' : 'complete',
      });

      // 建立向量索引
      if (includeVectorIndex && state.embeddingProvider) {
        await buildVectorIndex(domain, files, batchSize);
      }

      reportProgress({
        domain,
        totalFiles: files.length,
        processedFiles: files.length,
        status: 'complete',
      });

      return searchIndex;
    } catch (error) {
      reportProgress({
        domain,
        totalFiles: 0,
        processedFiles: 0,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  /**
   * 掃描指定domain嘅文件
   */
  const scanDomainFiles = async (
    domain: string
  ): Promise<Array<{ uri: string; content: string }>> => {
    switch (domain) {
      case 'knowledge':
        return scanKnowledgeFiles();
      case 'codebase':
        return scanCodebaseFiles();
      default:
        throw new Error(`Unknown domain: ${domain}`);
    }
  };

  /**
   * 掃描knowledge文件
   */
  const scanKnowledgeFiles = async (): Promise<Array<{ uri: string; content: string }>> => {
    const { getKnowledgeDir } = await import('../../utils/paths.js');
    const knowledgeDir = getKnowledgeDir();

    if (!fs.existsSync(knowledgeDir)) {
      return [];
    }

    const files: Array<{ uri: string; content: string }> = [];

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

          files.push({
            uri: `knowledge://${uriPath}`,
            content,
          });
        }
      }
    };

    scan(knowledgeDir, knowledgeDir);
    return files;
  };

  /**
   * 掃描codebase文件
   */
  const scanCodebaseFiles = async (): Promise<Array<{ uri: string; content: string }>> => {
    // 實現codebase文件掃描邏輯
    // 這裡需要根據實際需求實現
    return [];
  };

  /**
   * 建立向量索引
   */
  const buildVectorIndex = async (
    domain: string,
    files: Array<{ uri: string; content: string }>,
    batchSize: number
  ): Promise<void> => {
    if (!state.embeddingProvider) {
      throw new Error('Embedding provider not available');
    }

    // 初始化向量存儲
    const vectorPath = path.join(process.cwd(), '.sylphx-flow', `${domain}-vectors.hnsw`);

    const vectorStorage = new VectorStorage(vectorPath, state.embeddingProvider.dimensions || 1536);
    await vectorStorage.initialize();

    // FUNCTIONAL: Update map immutably
    const newStorages = new Map(state.vectorStorages);
    newStorages.set(domain, vectorStorage);
    updateState({ vectorStorages: newStorages });

    // 批量處理文件
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const embeddings = await state.embeddingProvider.generateEmbeddings(
        batch.map((file) => file.content)
      );

      for (let j = 0; j < batch.length; j++) {
        const file = batch[j];
        const embedding = embeddings[j];

        await vectorStorage.addDocument({
          id: file.uri,
          embedding,
          metadata: {
            type: domain,
            content: file.content.slice(0, 500),
            language: detectLanguage(file.uri),
          },
        });
      }

      // 報告向量化進度
      const progress = Math.min(i + batchSize, files.length);
      reportProgress({
        domain,
        totalFiles: files.length,
        processedFiles: progress,
        status: 'vectorizing',
      });
    }

    await vectorStorage.save();
  };

  /**
   * 檢測文件語言
   */
  const detectLanguage = (uri: string): string => {
    const ext = path.extname(uri).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.jsx': 'jsx',
      '.tsx': 'tsx',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.md': 'markdown',
      '.txt': 'text',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.sql': 'sql',
    };

    return languageMap[ext] || 'unknown';
  };

  /**
   * 更新索引
   */
  const updateIndex = async (domain: string, content: ContentMetadata): Promise<void> => {
    // 更新TF-IDF索引（需要重新建立整個index）
    // 更新向量索引（可以單獨更新）
    if (state.vectorStorages.has(domain) && state.embeddingProvider) {
      const vectorStorage = state.vectorStorages.get(domain)!;
      const embedding = await state.embeddingProvider.generateEmbeddings([content.content]);

      await vectorStorage.addDocument({
        id: content.uri,
        embedding: embedding[0],
        metadata: {
          type: content.type,
          content: content.content.slice(0, 500),
          category: content.category,
          language: content.language,
          path: content.path,
        },
      });

      await vectorStorage.save();
    }
  };

  /**
   * 從索引中移除文檔
   */
  const removeFromIndex = async (domain: string, uri: string): Promise<void> => {
    // 從向量索引中移除
    if (state.vectorStorages.has(domain)) {
      const vectorStorage = state.vectorStorages.get(domain)!;
      await vectorStorage.removeDocument(uri);
      await vectorStorage.save();
    }
  };

  // Return service interface
  return {
    initialize,
    onProgress,
    offProgress,
    buildIndex,
    updateIndex,
    removeFromIndex,
  };
};

// Factory function for creating default instance
export function getIndexerService(): IndexerService {
  return createIndexerService();
}
