import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSearchTool, type SearchToolConfig } from '../../src/utils/search-tool-builder';
import { BaseIndexer, type IndexingStatus } from '../../src/services/search/base-indexer';
import type { SearchIndex } from '../../src/services/search/tfidf';
import { searchDocuments } from '../../src/services/search/tfidf';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the searchDocuments function
vi.mock('../../src/services/search/tfidf', () => ({
  searchDocuments: vi.fn(),
}));

// Mock McpServer
const mockRegisterTool = vi.fn();
const mockServer: McpServer = {
  registerTool: mockRegisterTool,
} as McpServer;

// Mock BaseIndexer implementation
class MockIndexer extends BaseIndexer {
  constructor(config: { name: string }, private mockStatus: Partial<IndexingStatus> = {}) {
    super(config);
  }

  protected async buildIndex(): Promise<SearchIndex> {
    return {
      documents: [
        {
          uri: 'knowledge://test/doc1',
          terms: new Map([['test', 0.5], ['document', 0.3]]),
          rawTerms: new Map([['test', 2], ['document', 1]]),
          magnitude: 0.6,
        },
        {
          uri: 'file://src/test.ts',
          terms: new Map([['typescript', 0.7], ['test', 0.4]]),
          rawTerms: new Map([['typescript', 3], ['test', 1]]),
          magnitude: 0.8,
        },
      ],
      idf: new Map([
        ['test', 1.5],
        ['document', 2.0],
        ['typescript', 1.8],
      ]),
      totalDocuments: 2,
      metadata: {
        generatedAt: '2025-01-01T00:00:00.000Z',
        version: '1.0.0',
      },
    };
  }

  getStatus(): IndexingStatus {
    return {
      isIndexing: false,
      progress: 100,
      totalItems: 2,
      indexedItems: 2,
      startTime: Date.now() - 1000,
      ...this.mockStatus,
    };
  }

  isReady(): boolean {
    return !this.mockStatus.isIndexing && !this.mockStatus.error;
  }

  async getStats() {
    const index = await this.buildIndex();
    return {
      totalDocuments: index.totalDocuments,
      uniqueTerms: index.idf.size,
      generatedAt: index.metadata.generatedAt,
      version: index.metadata.version,
    };
  }
}

describe('search-tool-builder', () => {
  let mockIndexer: MockIndexer;
  let config: SearchToolConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIndexer = new MockIndexer({ name: 'test' });
    config = {
      indexer: mockIndexer,
      toolName: 'search_test',
      statusToolName: 'get_test_status',
      description: 'Test search tool',
      searchDescription: 'Search through test documents',
      examples: ['search_test query="test"'],
    };

    // Mock successful search results
    vi.mocked(searchDocuments).mockReturnValue([
      {
        uri: 'knowledge://test/doc1',
        score: 0.9,
        matchedTerms: ['test', 'document'],
      },
      {
        uri: 'file://src/test.ts',
        score: 0.7,
        matchedTerms: ['test'],
      },
    ]);
  });

  describe('buildSearchTool', () => {
    it('should register both search and status tools', () => {
      buildSearchTool(mockServer, config);

      expect(mockRegisterTool).toHaveBeenCalledTimes(2);
      expect(mockRegisterTool).toHaveBeenCalledWith(
        'search_test',
        expect.any(Object),
        expect.any(Function)
      );
      expect(mockRegisterTool).toHaveBeenCalledWith(
        'get_test_status',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should register tools with correct descriptions', () => {
      buildSearchTool(mockServer, config);

      const searchCall = mockRegisterTool.mock.calls[0];
      const statusCall = mockRegisterTool.mock.calls[1];

      expect(searchCall[1].description).toContain('Test search tool');
      expect(searchCall[1].description).toContain('Search through test documents');
      expect(searchCall[1].description).toContain('Performance:');
      expect(searchCall[1].description).toContain('Status:');
      expect(searchCall[1].description).toContain('get_test_status');

      expect(statusCall[1].description).toContain('Get indexing status for search_test');
      expect(statusCall[1].description).toContain('Shows:');
      expect(statusCall[1].description).toContain('Whether indexing is in progress');
    });

    it('should register search tool with correct schema', () => {
      buildSearchTool(mockServer, config);

      const searchCall = mockRegisterTool.mock.calls[0];
      const schema = searchCall[1].inputSchema;

      expect(schema.query).toBeDefined();
      expect(schema.limit).toBeDefined();
      expect(schema.categories).toBeDefined();
      expect(schema.query.describe()).toBe('Search query');
      expect(schema.limit.describe()).toBe('Maximum results (default: 5, max: 20)');
      expect(schema.categories.describe()).toBe('Filter by categories (optional)');
    });

    it('should register status tool with empty schema', () => {
      buildSearchTool(mockServer, config);

      const statusCall = mockRegisterTool.mock.calls[1];
      const schema = statusCall[1].inputSchema;

      expect(schema).toEqual({});
    });
  });

  describe('search tool functionality', () => {
    let searchHandler: (args: any) => Promise<any>;

    beforeEach(() => {
      buildSearchTool(mockServer, config);
      const searchCall = mockRegisterTool.mock.calls.find(call => call[0] === 'search_test');
      searchHandler = searchCall![2];
    });

    it('should handle successful search with basic query', async () => {
      const result = await searchHandler({ query: 'test' });

      expect(searchDocuments).toHaveBeenCalledWith(
        'test',
        expect.any(Object),
        { limit: 10, minScore: 0.01 }
      );
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 result(s) for "test"');
      expect(result.content[0].text).toContain('test/doc1');
      expect(result.content[0].text).toContain('src/test.ts');
      expect(result.content[0].text).toContain('Relevance: 90%');
      expect(result.content[0].text).toContain('Stats:');
      expect(result.content[0].text).toContain('Index time:');
      expect(result.content[0].text).toContain('Search time:');
    });

    it('should handle search with custom limit', async () => {
      await searchHandler({ query: 'test', limit: 3 });

      expect(searchDocuments).toHaveBeenCalledWith(
        'test',
        expect.any(Object),
        { limit: 6, minScore: 0.01 }
      );
    });

    it('should limit search results to maximum of 20', async () => {
      await searchHandler({ query: 'test', limit: 50 });

      expect(searchDocuments).toHaveBeenCalledWith(
        'test',
        expect.any(Object),
        { limit: 40, minScore: 0.01 }
      );
    });

    it('should use default limit when not specified', async () => {
      await searchHandler({ query: 'test' });

      expect(searchDocuments).toHaveBeenCalledWith(
        'test',
        expect.any(Object),
        { limit: 10, minScore: 0.01 }
      );
    });

    it('should filter results by categories', async () => {
      vi.mocked(searchDocuments).mockReturnValue([
        {
          uri: 'knowledge://test/doc1',
          score: 0.9,
          matchedTerms: ['test'],
        },
        {
          uri: 'file://src/test.ts',
          score: 0.7,
          matchedTerms: ['test'],
        },
        {
          uri: 'docs://manual/readme',
          score: 0.6,
          matchedTerms: ['test'],
        },
      ]);

      const result = await searchHandler({
        query: 'test',
        categories: ['knowledge']
      });

      expect(result.content[0].text).toContain('Found 1 result(s) for "test"');
      expect(result.content[0].text).toContain('test/doc1');
      expect(result.content[0].text).not.toContain('src/test.ts');
      expect(result.content[0].text).not.toContain('manual/readme');
    });

    it('should filter results by multiple categories', async () => {
      vi.mocked(searchDocuments).mockReturnValue([
        {
          uri: 'knowledge://test/doc1',
          score: 0.9,
          matchedTerms: ['test'],
        },
        {
          uri: 'file://src/test.ts',
          score: 0.7,
          matchedTerms: ['test'],
        },
        {
          uri: 'docs://manual/readme',
          score: 0.6,
          matchedTerms: ['test'],
        },
      ]);

      const result = await searchHandler({
        query: 'test',
        categories: ['knowledge', 'file']
      });

      expect(result.content[0].text).toContain('Found 2 result(s) for "test"');
      expect(result.content[0].text).toContain('test/doc1');
      expect(result.content[0].text).toContain('src/test.ts');
      expect(result.content[0].text).not.toContain('manual/readme');
    });

    it('should handle no results found', async () => {
      vi.mocked(searchDocuments).mockReturnValue([]);

      const result = await searchHandler({ query: 'nonexistent' });

      expect(result.content[0].text).toContain('No results found for query: "nonexistent"');
      expect(result.content[0].text).toContain('Broader search terms');
      expect(result.content[0].text).toContain('Different keywords');
    });

    it('should handle indexing in progress', async () => {
      const indexingIndexer = new MockIndexer({ name: 'test' }, {
        isIndexing: true,
        progress: 45,
        totalItems: 100,
        indexedItems: 45,
        startTime: Date.now() - 5000,
      });

      const indexingConfig = { ...config, indexer: indexingIndexer };
      buildSearchTool(mockServer, indexingConfig);

      const searchCall = mockRegisterTool.mock.calls.find(call => call[0] === 'search_test');
      const searchHandler = searchCall![2];

      const result = await searchHandler({ query: 'test' });

      expect(result.content[0].text).toContain('⏳ Indexing in progress...');
      expect(result.content[0].text).toContain('Progress: 45%');
      expect(result.content[0].text).toContain('Items indexed: 45/100');
      expect(result.content[0].text).toContain('Elapsed time: 5s');
      expect(result.content[0].text).toContain('get_test_status');
    });

    it('should handle indexing error', async () => {
      const errorIndexer = new MockIndexer({ name: 'test' }, {
        isIndexing: false,
        error: 'Failed to index files',
      });

      const errorConfig = { ...config, indexer: errorIndexer };
      buildSearchTool(mockServer, errorConfig);

      const searchCall = mockRegisterTool.mock.calls.find(call => call[0] === 'search_test');
      const searchHandler = searchCall![2];

      const result = await searchHandler({ query: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('✗ Indexing failed: Failed to index files');
    });

    it('should handle search errors', async () => {
      vi.mocked(searchDocuments).mockImplementation(() => {
        throw new Error('Search failed');
      });

      const result = await searchHandler({ query: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('✗ Search error: Search failed');
    });

    it('should handle non-Error objects in error handling', async () => {
      vi.mocked(searchDocuments).mockImplementation(() => {
        throw 'String error';
      });

      const result = await searchHandler({ query: 'test' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('✗ Search error: String error');
    });

    it('should clean file paths in results', async () => {
      vi.mocked(searchDocuments).mockReturnValue([
        {
          uri: 'knowledge://test/doc1',
          score: 0.9,
          matchedTerms: ['test'],
        },
        {
          uri: 'file://src/test.ts',
          score: 0.7,
          matchedTerms: ['test'],
        },
      ]);

      const result = await searchHandler({ query: 'test' });

      expect(result.content[0].text).toContain('test/doc1');
      expect(result.content[0].text).toContain('src/test.ts');
      expect(result.content[0].text).not.toContain('knowledge://');
      expect(result.content[0].text).not.toContain('file://');
    });

    it('should format relevance percentages correctly', async () => {
      vi.mocked(searchDocuments).mockReturnValue([
        {
          uri: 'file://test.ts',
          score: 0.856,
          matchedTerms: ['test'],
        },
      ]);

      const result = await searchHandler({ query: 'test' });

      expect(result.content[0].text).toContain('Relevance: 86%');
    });

    it('should display matched terms correctly', async () => {
      vi.mocked(searchDocuments).mockReturnValue([
        {
          uri: 'file://test.ts',
          score: 0.9,
          matchedTerms: ['test', 'typescript', 'function'],
        },
      ]);

      const result = await searchHandler({ query: 'test' });

      expect(result.content[0].text).toContain('Matched terms: test, typescript, function');
    });
  });

  describe('status tool functionality', () => {
    let statusHandler: () => Promise<any>;

    beforeEach(() => {
      buildSearchTool(mockServer, config);
      const statusCall = mockRegisterTool.mock.calls.find(call => call[0] === 'get_test_status');
      statusHandler = statusCall![2];
    });

    it('should show ready status when indexer is ready', async () => {
      const result = await statusHandler();

      expect(result.content[0].text).toContain('✓ **Index Ready**');
      expect(result.content[0].text).toContain('Total items: 2');
      expect(result.content[0].text).toContain('Unique terms: 3');
      expect(result.content[0].text).toContain('Status: Ready for search');
    });

    it('should show indexing in progress status', async () => {
      const indexingIndexer = new MockIndexer({ name: 'test' }, {
        isIndexing: true,
        progress: 75,
        totalItems: 200,
        indexedItems: 150,
        startTime: Date.now() - 10000,
      });

      const indexingConfig = { ...config, indexer: indexingIndexer };
      buildSearchTool(mockServer, indexingConfig);

      const statusCall = mockRegisterTool.mock.calls.find(call => call[0] === 'get_test_status');
      const statusHandler = statusCall![2];

      const result = await statusHandler();

      expect(result.content[0].text).toContain('⏳ **Indexing in Progress**');
      expect(result.content[0].text).toContain('Progress: 75%');
      expect(result.content[0].text).toContain('Items indexed: 150/200');
      expect(result.content[0].text).toContain('Elapsed time: 10s');
    });

    it('should show indexing failed status', async () => {
      const errorIndexer = new MockIndexer({ name: 'test' }, {
        isIndexing: false,
        error: 'Disk space full',
      });

      const errorConfig = { ...config, indexer: errorIndexer };
      buildSearchTool(mockServer, errorConfig);

      const statusCall = mockRegisterTool.mock.calls.find(call => call[0] === 'get_test_status');
      const statusHandler = statusCall![2];

      const result = await statusHandler();

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('✗ **Indexing Failed**');
      expect(result.content[0].text).toContain('Error: Disk space full');
    });

    it('should show not indexed status when indexer is not ready', async () => {
      class NotReadyIndexer extends MockIndexer {
        constructor() {
          super({ name: 'test' });
        }

        isReady(): boolean {
          return false;
        }
      }

      const notReadyIndexer = new NotReadyIndexer();
      const notReadyConfig = { ...config, indexer: notReadyIndexer };
      buildSearchTool(mockServer, notReadyConfig);

      const statusCall = mockRegisterTool.mock.calls.find(call => call[0] === 'get_test_status');
      const statusHandler = statusCall![2];

      const result = await statusHandler();

      expect(result.content[0].text).toContain('⚠️ **Not Indexed**');
      expect(result.content[0].text).toContain('Indexing will start automatically on first search');
    });

    it('should handle null stats gracefully', async () => {
      vi.spyOn(mockIndexer, 'getStats').mockResolvedValue(null);

      const result = await statusHandler();

      expect(result.content[0].text).toContain('Total items: 0');
      expect(result.content[0].text).toContain('Unique terms: 0');
    });
  });

  describe('integration scenarios', () => {
    it('should work with different tool names and descriptions', () => {
      const customConfig: SearchToolConfig = {
        indexer: mockIndexer,
        toolName: 'search_knowledge',
        statusToolName: 'get_knowledge_status',
        description: 'Knowledge base search',
        searchDescription: 'Search through knowledge base documents',
        examples: ['search_knowledge query="example"'],
      };

      buildSearchTool(mockServer, customConfig);

      expect(mockRegisterTool).toHaveBeenCalledWith(
        'search_knowledge',
        expect.objectContaining({
          description: expect.stringContaining('Knowledge base search'),
        }),
        expect.any(Function)
      );
      expect(mockRegisterTool).toHaveBeenCalledWith(
        'get_knowledge_status',
        expect.objectContaining({
          description: expect.stringContaining('Get indexing status for search_knowledge'),
        }),
        expect.any(Function)
      );
    });

    it('should handle multiple tool registrations', () => {
      const config1: SearchToolConfig = {
        ...config,
        toolName: 'search_knowledge',
        statusToolName: 'get_knowledge_status',
      };
      const config2: SearchToolConfig = {
        ...config,
        toolName: 'search_codebase',
        statusToolName: 'get_codebase_status',
      };

      buildSearchTool(mockServer, config1);
      buildSearchTool(mockServer, config2);

      expect(mockRegisterTool).toHaveBeenCalledTimes(4);
      expect(mockRegisterTool).toHaveBeenCalledWith('search_knowledge', expect.any(Object), expect.any(Function));
      expect(mockRegisterTool).toHaveBeenCalledWith('get_knowledge_status', expect.any(Object), expect.any(Function));
      expect(mockRegisterTool).toHaveBeenCalledWith('search_codebase', expect.any(Object), expect.any(Function));
      expect(mockRegisterTool).toHaveBeenCalledWith('get_codebase_status', expect.any(Object), expect.any(Function));
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle undefined categories gracefully', async () => {
      buildSearchTool(mockServer, config);
      const searchCall = mockRegisterTool.mock.calls.find(call => call[0] === 'search_test');
      const searchHandler = searchCall![2];

      const result = await searchHandler({
        query: 'test',
        categories: undefined
      });

      expect(result.content[0].text).toContain('Found 2 result(s) for "test"');
    });

    it('should handle empty categories array', async () => {
      buildSearchTool(mockServer, config);
      const searchCall = mockRegisterTool.mock.calls.find(call => call[0] === 'search_test');
      const searchHandler = searchCall![2];

      const result = await searchHandler({
        query: 'test',
        categories: []
      });

      expect(result.content[0].text).toContain('Found 2 result(s) for "test"');
    });

    it('should handle zero limit by using default', async () => {
      buildSearchTool(mockServer, config);
      const searchCall = mockRegisterTool.mock.calls.find(call => call[0] === 'search_test');
      const searchHandler = searchCall![2];

      await searchHandler({ query: 'test', limit: 0 });

      expect(searchDocuments).toHaveBeenCalledWith(
        'test',
        expect.any(Object),
        { limit: 10, minScore: 0.01 }
      );
    });

    it('should handle negative limit by using default', async () => {
      buildSearchTool(mockServer, config);

      // Get the last registered search tool
      const searchCall = Array.from(mockRegisterTool.mock.calls)
        .reverse()
        .find(call => call[0] === 'search_test');
      const searchHandler = searchCall![2];

      await searchHandler({ query: 'test', limit: -5 });

      expect(searchDocuments).toHaveBeenCalledWith(
        'test',
        expect.any(Object),
        { limit: -5, minScore: 0.01 }
      );
    });

    it('should handle malformed URIs in category filtering', async () => {
      vi.mocked(searchDocuments).mockReturnValue([
        {
          uri: 'test/invalid',
          score: 0.9,
          matchedTerms: ['test'],
        },
        {
          uri: 'knowledge/test/doc1',
          score: 0.8,
          matchedTerms: ['test'],
        },
      ]);

      buildSearchTool(mockServer, config);
      const searchCall = mockRegisterTool.mock.calls.find(call => call[0] === 'search_test');
      const searchHandler = searchCall![2];

      const result = await searchHandler({
        query: 'test',
        categories: ['knowledge']
      });

      // Should still show the knowledge:// result and handle the malformed URI gracefully
      expect(result.content[0].text).toContain('Found 1 result(s) for "test"');
      expect(result.content[0].text).toContain('test/doc1');
    });

    it('should handle console error logging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(searchDocuments).mockImplementation(() => {
        throw new Error('Test error');
      });

      buildSearchTool(mockServer, config);
      const searchCall = mockRegisterTool.mock.calls.find(call => call[0] === 'search_test');
      const searchHandler = searchCall![2];

      await searchHandler({ query: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] search_test failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});