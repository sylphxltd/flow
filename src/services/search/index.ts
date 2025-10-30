/**
 * Search Services Index - 搜索服務統一入口
 * 提供所有搜索相關服務嘅統一接口
 */

export { SemanticSearchService, getSearchService } from './search-service.js';
export { IndexerService, getIndexerService } from './indexer.js';
export {
  EmbeddingsProviderService,
  defaultEmbeddingsProvider,
  createEmbeddingsProvider,
} from './embeddings-provider.js';

export type {
  SearchResult,
  SearchOptions,
  ContentMetadata,
} from './search-service.js';

export type {
  IndexingOptions,
  IndexingProgress,
} from './indexer.js';

export type {
  EmbeddingConfig,
  EmbeddingResult,
} from './embeddings-provider.js';

// 便捷函數：快速搜索
export async function quickSearch(
  query: string,
  domain: 'codebase' | 'knowledge' | 'all' = 'all',
  limit = 10
) {
  const searchService = getSearchService();
  return await searchService.search(query, { domain, limit });
}

// 便捷函數：批量索引
export async function quickIndex(
  domains: Array<'knowledge' | 'codebase'>,
  options?: { batchSize?: number; includeVectorIndex?: boolean }
) {
  const indexerService = getIndexerService();
  const results = await Promise.allSettled(
    domains.map((domain) => indexerService.buildIndex(domain, options))
  );

  return {
    results,
    successful: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}
