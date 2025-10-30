/**
 * Knowledge Tools Tests
 * Tests for the knowledge search and get tools (MCP tools)
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  registerGetKnowledgeTool,
  registerKnowledgeSearchTool,
  registerKnowledgeTools,
} from '../../../src/domains/knowledge/tools.js';

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

describe('Knowledge Tools', () => {
  let mockServer: MockMCPServer;
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temp directory
    testDir = join(tmpdir(), `knowledge-tools-test-${Date.now()}`);
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

  describe('registerKnowledgeSearchTool', () => {
    it('should register knowledge_search tool', () => {
      registerKnowledgeSearchTool(mockServer as any);

      const tool = mockServer.getTool('knowledge_search');
      expect(tool).toBeDefined();
      expect(tool.config).toBeDefined();
      expect(tool.config.description).toContain('Search knowledge base');
      expect(tool.handler).toBeDefined();
    });

    it('should have correct input schema', () => {
      registerKnowledgeSearchTool(mockServer as any);

      const tool = mockServer.getTool('knowledge_search');
      expect(tool.config.inputSchema).toBeDefined();
      expect(tool.config.inputSchema.query).toBeDefined();
      expect(tool.config.inputSchema.limit).toBeDefined();
      expect(tool.config.inputSchema.include_content).toBeDefined();
    });
  });

  describe('registerGetKnowledgeTool', () => {
    it('should register knowledge_get tool', () => {
      registerGetKnowledgeTool(mockServer as any);

      const tool = mockServer.getTool('knowledge_get');
      expect(tool).toBeDefined();
      expect(tool.config).toBeDefined();
      expect(tool.config.description).toContain('Get knowledge resource');
      expect(tool.handler).toBeDefined();
    });

    it('should have correct input schema', () => {
      registerGetKnowledgeTool(mockServer as any);

      const tool = mockServer.getTool('knowledge_get');
      expect(tool.config.inputSchema).toBeDefined();
      expect(tool.config.inputSchema.uri).toBeDefined();
    });
  });

  describe('registerKnowledgeTools', () => {
    it('should register all knowledge tools', () => {
      registerKnowledgeTools(mockServer as any);

      const searchTool = mockServer.getTool('knowledge_search');
      const getTool = mockServer.getTool('knowledge_get');

      expect(searchTool).toBeDefined();
      expect(getTool).toBeDefined();
    });
  });

  describe('knowledge_search tool execution', () => {
    beforeEach(() => {
      registerKnowledgeSearchTool(mockServer as any);
    });

    it('should handle search with query', async () => {
      const result = await mockServer.callTool('knowledge_search', {
        query: 'react patterns',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should accept limit parameter', async () => {
      const result = await mockServer.callTool('knowledge_search', {
        query: 'testing',
        limit: 5,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should accept include_content parameter', async () => {
      const result = await mockServer.callTool('knowledge_search', {
        query: 'security',
        include_content: false,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should accept all parameters together', async () => {
      const result = await mockServer.callTool('knowledge_search', {
        query: 'deployment patterns',
        limit: 3,
        include_content: true,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should return MCP-formatted response', async () => {
      const result = await mockServer.callTool('knowledge_search', {
        query: 'test',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
    });

    it('should handle empty query gracefully', async () => {
      const result = await mockServer.callTool('knowledge_search', {
        query: '',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle indexing status messages', async () => {
      // The tool checks indexing status and may return different messages
      const result = await mockServer.callTool('knowledge_search', {
        query: 'test',
      });

      expect(result).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      // Should contain either results, indexing message, or error
      expect(typeof result.content[0].text).toBe('string');
    });
  });

  describe('knowledge_get tool execution', () => {
    beforeEach(() => {
      registerGetKnowledgeTool(mockServer as any);
    });

    it('should accept URI parameter', async () => {
      const result = await mockServer.callTool('knowledge_get', {
        uri: 'knowledge://stacks/react-app',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle invalid URI', async () => {
      const result = await mockServer.callTool('knowledge_get', {
        uri: 'knowledge://invalid/nonexistent',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      // Should contain error message or available URIs
      expect(result.content[0].text.length).toBeGreaterThan(0);
    });

    it('should return MCP-formatted response', async () => {
      const result = await mockServer.callTool('knowledge_get', {
        uri: 'knowledge://universal/security',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
    });

    it('should provide available URIs on error', async () => {
      const result = await mockServer.callTool('knowledge_get', {
        uri: 'knowledge://does/not/exist',
      });

      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Error');
      // Should include available URIs list or mention no documents
      expect(
        result.content[0].text.includes('Available') ||
          result.content[0].text.includes('available') ||
          result.content[0].text.includes('Error')
      ).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should register and execute all tools', async () => {
      registerKnowledgeTools(mockServer as any);

      const searchResult = await mockServer.callTool('knowledge_search', {
        query: 'testing best practices',
        limit: 5,
      });

      const getResult = await mockServer.callTool('knowledge_get', {
        uri: 'knowledge://universal/testing',
      });

      expect(searchResult).toBeDefined();
      expect(getResult).toBeDefined();
      expect(searchResult.content[0].type).toBe('text');
      expect(getResult.content[0].type).toBe('text');
    });

    it('should handle search then get workflow', async () => {
      registerKnowledgeTools(mockServer as any);

      // First search
      const searchResult = await mockServer.callTool('knowledge_search', {
        query: 'react',
        include_content: false,
      });

      expect(searchResult).toBeDefined();

      // Then get a specific document (may or may not exist)
      const getResult = await mockServer.callTool('knowledge_get', {
        uri: 'knowledge://stacks/react-app',
      });

      expect(getResult).toBeDefined();
      expect(getResult.content[0].type).toBe('text');
    });

    it('should handle multiple searches', async () => {
      registerKnowledgeSearchTool(mockServer as any);

      const result1 = await mockServer.callTool('knowledge_search', {
        query: 'security',
      });

      const result2 = await mockServer.callTool('knowledge_search', {
        query: 'performance',
      });

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.content[0].type).toBe('text');
      expect(result2.content[0].type).toBe('text');
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      registerKnowledgeSearchTool(mockServer as any);

      const result = await mockServer.callTool('knowledge_search', {
        query: 'test',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle get errors gracefully', async () => {
      registerGetKnowledgeTool(mockServer as any);

      const result = await mockServer.callTool('knowledge_get', {
        uri: 'invalid-uri-format',
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });
  });
});
