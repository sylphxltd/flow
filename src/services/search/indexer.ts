/**
 * Unified Indexer Service - 統一索引服務
 * 處理所有domain嘅索引建立和維護
 */

import fs from 'node:fs';
import path from 'node:path';
import type { EmbeddingProvider } from '../../utils/embeddings.js';
import { VectorStorage } from '../../utils/lancedb-vector-storage.js';
import { type SearchIndex, buildSearchIndex } from '../../utils/tfidf.js';
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
 * 統一索引服務
 */
export class IndexerService {
  private embeddingProvider?: EmbeddingProvider;
  private vectorStorages: Map<string, VectorStorage> = new Map();
  private progressCallbacks: Set<(progress: IndexingProgress) => void> = new Set();

  constructor(embeddingProvider?: EmbeddingProvider) {
    this.embeddingProvider = embeddingProvider;
  }

  /**
   * 初始化索引服務
   */
  async initialize(): Promise<void> {
    if (!this.embeddingProvider) {
      // Import here to avoid circular dependencies
      const { getDefaultEmbeddingProvider } = await import('../../utils/embeddings.js');
      this.embeddingProvider = await getDefaultEmbeddingProvider();
    }
  }

  /**
   * 註冊進度回調
   */
  onProgress(callback: (progress: IndexingProgress) => void): void {
    this.progressCallbacks.add(callback);
  }

  /**
   * 移除進度回調
   */
  offProgress(callback: (progress: IndexingProgress) => void): void {
    this.progressCallbacks.delete(callback);
  }

  /**
   * 報告進度
   */
  private reportProgress(progress: IndexingProgress): void {
    this.progressCallbacks.forEach((callback) => callback(progress));
  }

  /**
   * 為指定domain建立索引
   */
  async buildIndex(
    domain: 'knowledge' | 'codebase',
    options: IndexingOptions = {}
  ): Promise<SearchIndex> {
    const { batchSize = 10, includeVectorIndex = true, forceRebuild = false } = options;

    this.reportProgress({
      domain,
      totalFiles: 0,
      processedFiles: 0,
      status: 'scanning',
    });

    try {
      // 掃描文件
      const files = await this.scanDomainFiles(domain);

      this.reportProgress({
        domain,
        totalFiles: files.length,
        processedFiles: 0,
        status: 'indexing',
      });

      // 建立TF-IDF索引
      const searchIndex = buildSearchIndex(files);

      this.reportProgress({
        domain,
        totalFiles: files.length,
        processedFiles: files.length,
        status: includeVectorIndex ? 'vectorizing' : 'complete',
      });

      // 建立向量索引
      if (includeVectorIndex && this.embeddingProvider) {
        await this.buildVectorIndex(domain, files, batchSize);
      }

      this.reportProgress({
        domain,
        totalFiles: files.length,
        processedFiles: files.length,
        status: 'complete',
      });

      return searchIndex;
    } catch (error) {
      this.reportProgress({
        domain,
        totalFiles: 0,
        processedFiles: 0,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 掃描指定domain嘅文件
   */
  private async scanDomainFiles(domain: string): Promise<Array<{ uri: string; content: string }>> {
    switch (domain) {
      case 'knowledge':
        return this.scanKnowledgeFiles();
      case 'codebase':
        return this.scanCodebaseFiles();
      default:
        throw new Error(`Unknown domain: ${domain}`);
    }
  }

  /**
   * 掃描knowledge文件
   */
  private async scanKnowledgeFiles(): Promise<Array<{ uri: string; content: string }>> {
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
  }

  /**
   * 掃描codebase文件
   */
  private async scanCodebaseFiles(): Promise<Array<{ uri: string; content: string }>> {
    // 實現codebase文件掃描邏輯
    // 這裡需要根據實際需求實現
    return [];
  }

  
  /**
   * 建立向量索引
   */
  private async buildVectorIndex(
    domain: string,
    files: Array<{ uri: string; content: string }>,
    batchSize: number
  ): Promise<void> {
    if (!this.embeddingProvider) {
      throw new Error('Embedding provider not available');
    }

    // 初始化向量存儲
    const vectorPath = path.join(process.cwd(), '.sylphx-flow', `${domain}-vectors.hnsw`);

    const vectorStorage = new VectorStorage(vectorPath, this.embeddingProvider.dimensions || 1536);
    await vectorStorage.initialize();

    this.vectorStorages.set(domain, vectorStorage);

    // 批量處理文件
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const embeddings = await this.embeddingProvider.generateEmbeddings(
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
            language: this.detectLanguage(file.uri),
          },
        });
      }

      // 報告向量化進度
      const progress = Math.min(i + batchSize, files.length);
      this.reportProgress({
        domain,
        totalFiles: files.length,
        processedFiles: progress,
        status: 'vectorizing',
      });
    }

    await vectorStorage.save();
  }

  /**
   * 檢測文件語言
   */
  private detectLanguage(uri: string): string {
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
  }

  /**
   * 更新索引
   */
  async updateIndex(domain: string, content: ContentMetadata): Promise<void> {
    // 更新TF-IDF索引（需要重新建立整個index）
    // 更新向量索引（可以單獨更新）
    if (this.vectorStorages.has(domain) && this.embeddingProvider) {
      const vectorStorage = this.vectorStorages.get(domain)!;
      const embedding = await this.embeddingProvider.generateEmbeddings([content.content]);

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
  }

  /**
   * 從索引中移除文檔
   */
  async removeFromIndex(domain: string, uri: string): Promise<void> {
    // 從向量索引中移除
    if (this.vectorStorages.has(domain)) {
      const vectorStorage = this.vectorStorages.get(domain)!;
      await vectorStorage.removeDocument(uri);
      await vectorStorage.save();
    }
  }
}

// Singleton instance
let indexerService: IndexerService | null = null;

export function getIndexerService(): IndexerService {
  if (!indexerService) {
    indexerService = new IndexerService();
  }
  return indexerService;
}
