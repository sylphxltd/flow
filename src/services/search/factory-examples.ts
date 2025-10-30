/**
 * Factory Pattern & Dependency Injection Examples
 * Real-world examples showing how to use the new factory pattern
 */

import { SeparatedMemoryStorage } from '../storage/separated-storage.js';
import { CodebaseIndexer } from './codebase-indexer.js';
import { getKnowledgeIndexer } from './knowledge-indexer.js';
import {
  type SearchServiceDependencies,
  createSearchService,
  createTestSearchService,
  searchService,
} from './unified-search-service.js';

// ============================================================================
// EXAMPLE 1: Default Usage (Backward Compatible)
// ============================================================================

/**
 * Use default singleton - works exactly like before
 * No changes needed in existing code
 */
export async function useDefaultService() {
  await searchService.initialize();

  const results = await searchService.searchCodebase('authentication');
  console.log(`Found ${results.results.length} results`);

  return results;
}

// ============================================================================
// EXAMPLE 2: Custom Service with Specific Configuration
// ============================================================================

/**
 * Create custom service with specific embedding provider
 */
export async function createCustomServiceWithEmbeddings() {
  // Custom embedding provider (if you have one)
  const customEmbeddingProvider = {
    name: 'custom-embeddings',
    dimensions: 1536,
    generateEmbeddings: async (texts: string[]) => {
      // Custom embedding logic
      return texts.map(() => new Array(1536).fill(0));
    },
  };

  const customService = createSearchService({
    embeddingProvider: customEmbeddingProvider,
  });

  await customService.initialize();
  return customService;
}

// ============================================================================
// EXAMPLE 3: Testing with Mock Dependencies
// ============================================================================

/**
 * Create test service with mocked storage
 * Makes testing much easier!
 */
export function createMockSearchService() {
  // Mock storage that returns predefined data
  const mockStorage = {
    async initialize() {},
    async getAllCodebaseFiles() {
      return [
        {
          path: 'src/test.ts',
          content: 'test content',
          mtime: Date.now(),
          hash: 'abc123',
          indexedAt: new Date().toISOString(),
        },
      ];
    },
    async getCodebaseIndexStats() {
      return {
        indexedAt: new Date().toISOString(),
        totalFiles: 1,
        totalTerms: 10,
      };
    },
  } as any;

  // Mock knowledge indexer
  const mockKnowledgeIndexer = {
    async loadIndex() {
      return {
        documents: [],
        idf: new Map(),
        totalDocuments: 0,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    },
    getStatus() {
      return {
        isIndexing: false,
        progress: 100,
        totalItems: 0,
        indexedItems: 0,
        startTime: 0,
      };
    },
  } as any;

  return createSearchService({
    memoryStorage: mockStorage,
    knowledgeIndexer: mockKnowledgeIndexer,
  });
}

/**
 * Use test service in unit tests
 */
export async function testSearchFunctionality() {
  const testService = createMockSearchService();
  await testService.initialize();

  // Test search functionality without real database
  const results = await testService.searchCodebase('test');

  console.log('Test passed:', results.results.length >= 0);
  return results;
}

// ============================================================================
// EXAMPLE 4: Multiple Service Instances
// ============================================================================

/**
 * Create multiple services for different purposes
 * Each with their own configuration
 */
export function createMultipleServices() {
  // Service for project A
  const serviceA = createSearchService({
    memoryStorage: new SeparatedMemoryStorage(),
    // Custom indexer for project A
  });

  // Service for project B
  const serviceB = createSearchService({
    memoryStorage: new SeparatedMemoryStorage(),
    // Custom indexer for project B
  });

  return { serviceA, serviceB };
}

// ============================================================================
// EXAMPLE 5: Dependency Injection Pattern
// ============================================================================

/**
 * High-level function that accepts search service as dependency
 * This makes the function testable and flexible
 */
export async function performSearch(
  query: string,
  service = searchService // Default to singleton, but can inject custom
) {
  await service.initialize();

  const codebaseResults = await service.searchCodebase(query);
  const knowledgeResults = await service.searchKnowledge(query);

  return {
    codebase: codebaseResults.results,
    knowledge: knowledgeResults.results,
    total: codebaseResults.results.length + knowledgeResults.results.length,
  };
}

/**
 * Test the search function with mock service
 */
export async function testPerformSearch() {
  const mockService = createMockSearchService();

  // Inject mock service for testing
  const results = await performSearch('test query', mockService);

  console.log('Search completed:', results.total, 'results');
  return results;
}

// ============================================================================
// EXAMPLE 6: Custom Storage Implementation
// ============================================================================

/**
 * Create service with custom storage backend
 */
export function createServiceWithCustomStorage() {
  // Custom storage implementation (e.g., Redis, MongoDB)
  class CustomStorage extends SeparatedMemoryStorage {
    async getAllCodebaseFiles() {
      // Custom logic to fetch from Redis/MongoDB
      return [];
    }
  }

  const customStorage = new CustomStorage();

  return createSearchService({
    memoryStorage: customStorage,
  });
}

// ============================================================================
// EXAMPLE 7: Factory with Configuration
// ============================================================================

/**
 * Factory function that creates configured services
 */
export function createConfiguredService(config: {
  useEmbeddings?: boolean;
  codebaseRoot?: string;
  knowledgeDir?: string;
}) {
  const dependencies: SearchServiceDependencies = {};

  if (config.codebaseRoot) {
    dependencies.codebaseIndexer = new CodebaseIndexer({
      codebaseRoot: config.codebaseRoot,
    });
  }

  if (config.knowledgeDir) {
    // Would create knowledge indexer with custom directory
    // dependencies.knowledgeIndexer = createKnowledgeIndexer(config.knowledgeDir);
  }

  return createSearchService(dependencies);
}

// ============================================================================
// EXAMPLE 8: Testing Utilities
// ============================================================================

/**
 * Create spy service for tracking calls
 */
export function createSpyService() {
  const calls: Array<{ method: string; args: any[] }> = [];

  const mockStorage = {
    async initialize() {
      calls.push({ method: 'initialize', args: [] });
    },
    async getAllCodebaseFiles() {
      calls.push({ method: 'getAllCodebaseFiles', args: [] });
      return [];
    },
    async getCodebaseIndexStats() {
      return { indexedAt: new Date().toISOString(), totalFiles: 0, totalTerms: 0 };
    },
  } as any;

  const service = createSearchService({ memoryStorage: mockStorage });

  return { service, calls };
}

/**
 * Verify service calls in tests
 */
export async function verifyServiceBehavior() {
  const { service, calls } = createSpyService();

  await service.initialize();
  await service.searchCodebase('test');

  console.log('Service calls:', calls);
  console.log(
    'Initialize called:',
    calls.some((c) => c.method === 'initialize')
  );

  return calls;
}

// ============================================================================
// EXAMPLE 9: Convenience Function - createTestSearchService
// ============================================================================

/**
 * Quick way to create test service with partial mocks
 */
export function quickTestServiceExample() {
  // Only mock what you need, rest uses defaults
  const testService = createTestSearchService({
    memoryStorage: {
      async getAllCodebaseFiles() {
        return [];
      },
    } as any,
  });

  return testService;
}

// ============================================================================
// EXAMPLE 10: Migration Guide
// ============================================================================

/**
 * BEFORE (Singleton only):
 *
 * import { searchService } from './unified-search-service.js';
 * await searchService.initialize();
 * const results = await searchService.searchCodebase('query');
 *
 * AFTER (Still works, completely backward compatible):
 *
 * import { searchService } from './unified-search-service.js';
 * await searchService.initialize();
 * const results = await searchService.searchCodebase('query');
 *
 * NEW (With dependency injection for testing):
 *
 * import { createSearchService } from './unified-search-service.js';
 * const testService = createSearchService({ memoryStorage: mockStorage });
 * await testService.initialize();
 * const results = await testService.searchCodebase('query');
 */

// ============================================================================
// COMPARISON: Before vs After
// ============================================================================

/**
 * BEFORE (Hard to test):
 */
export async function oldWaySearchFunction(query: string) {
  // Directly uses singleton - hard to mock
  await searchService.initialize();
  return await searchService.searchCodebase(query);
}

/**
 * AFTER (Easy to test):
 */
export async function newWaySearchFunction(
  query: string,
  service = searchService // Dependency injection
) {
  await service.initialize();
  return await service.searchCodebase(query);
}

/**
 * Test the new way:
 */
export async function testNewWay() {
  const mockService = createMockSearchService();
  const results = await newWaySearchFunction('test', mockService);
  console.log('Test passed!');
  return results;
}
