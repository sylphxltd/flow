/**
 * Codebase Tools Tests
 * Tests for the codebase search tool (MCP tool)
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  registerCodebaseSearchTool,
  registerCodebaseTools,
} from '../../../src/domains/codebase/tools.js';

// Mock MCP server
class MockMCPServer {
  private tools: Map<string, any> = new Map();

  registerTool(name: string, config: any, handler: any) {
    this.tools.set(name, { config, handler });
  }

  getTool(name: string) {
    return this.tools.get(name);
  }

  async callTool(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return await tool.handler(args);
  }
}

describe('Codebase Tools', () => {
  let mockServer: MockMCPServer;
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temp directory
    testDir = join(tmpdir(), `codebase-tools-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Change to test directory
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Create fresh mock server
    mockServer = new MockMCPServer();
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);

    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('registerCodebaseSearchTool', () => {
    it('should register codebase_search tool', () => {
      registerCodebaseSearchTool(mockServer as any);

      const tool = mockServer.getTool('codebase_search');
      expect(tool).toBeDefined();
      expect(tool.config).toBeDefined();
      expect(tool.config.description).toContain('Search project source files');
      expect(tool.handler).toBeDefined();
    });

    it('should have correct input schema', () => {
      registerCodebaseSearchTool(mockServer as any);

      const tool = mockServer.getTool('codebase_search');
      expect(tool.config.inputSchema).toBeDefined();
      expect(tool.config.inputSchema.query).toBeDefined();
      expect(tool.config.inputSchema.limit).toBeDefined();
      expect(tool.config.inputSchema.include_content).toBeDefined();
      expect(tool.config.inputSchema.file_extensions).toBeDefined();
      expect(tool.config.inputSchema.path_filter).toBeDefined();
      expect(tool.config.inputSchema.exclude_paths).toBeDefined();
    });
  });

  describe('registerCodebaseTools', () => {
    it('should register all codebase tools', () => {
      registerCodebaseTools(mockServer as any);

      const codebaseSearchTool = mockServer.getTool('codebase_search');
      expect(codebaseSearchTool).toBeDefined();
    });
  });

  describe('codebase_search tool execution', () => {
    beforeEach(() => {
      registerCodebaseSearchTool(mockServer as any);
    });

    it('should handle search when codebase not indexed', async () => {
      // Clear codebase index to ensure clean state for this specific test
      // This prevents shared database state from interfering with the test
      const { getSearchService } = await import(
        '../../../src/services/search/unified-search-service.js'
      );
      const searchService = getSearchService();
      await searchService.initialize();
      const storage = (searchService as any).memoryStorage;
      await storage.clearCodebaseIndex();

      const result = await mockServer.callTool('codebase_search', {
        query: 'test query',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Codebase Not Indexed');
    });

    it('should accept query parameter', async () => {
      const result = await mockServer.callTool('codebase_search', {
        query: 'function authenticate',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should accept limit parameter', async () => {
      const result = await mockServer.callTool('codebase_search', {
        query: 'test',
        limit: 5,
      });

      expect(result).toBeDefined();
    });

    it('should accept include_content parameter', async () => {
      const result = await mockServer.callTool('codebase_search', {
        query: 'test',
        include_content: false,
      });

      expect(result).toBeDefined();
    });

    it('should accept file_extensions filter', async () => {
      const result = await mockServer.callTool('codebase_search', {
        query: 'test',
        file_extensions: ['.ts', '.tsx'],
      });

      expect(result).toBeDefined();
    });

    it('should accept path_filter', async () => {
      const result = await mockServer.callTool('codebase_search', {
        query: 'test',
        path_filter: 'src/components',
      });

      expect(result).toBeDefined();
    });

    it('should accept exclude_paths', async () => {
      const result = await mockServer.callTool('codebase_search', {
        query: 'test',
        exclude_paths: ['node_modules', 'dist'],
      });

      expect(result).toBeDefined();
    });

    it('should accept all parameters together', async () => {
      const result = await mockServer.callTool('codebase_search', {
        query: 'function component',
        limit: 20,
        include_content: true,
        file_extensions: ['.ts', '.tsx'],
        path_filter: 'src',
        exclude_paths: ['node_modules', '.git'],
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should return MCP-formatted response', async () => {
      const result = await mockServer.callTool('codebase_search', {
        query: 'test',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
    });

    it('should handle errors gracefully', async () => {
      // Try to search with invalid parameters (query is required)
      const result = await mockServer.callTool('codebase_search', {
        query: '',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      // Should either return error or empty results
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('Integration Tests', () => {
    it('should register and execute tool end-to-end', async () => {
      registerCodebaseTools(mockServer as any);

      const result = await mockServer.callTool('codebase_search', {
        query: 'authentication',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle multiple searches', async () => {
      registerCodebaseSearchTool(mockServer as any);

      const result1 = await mockServer.callTool('codebase_search', {
        query: 'database',
      });

      const result2 = await mockServer.callTool('codebase_search', {
        query: 'auth',
      });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.content[0].type).toBe('text');
      expect(result2.content[0].type).toBe('text');
    });
  });
});
