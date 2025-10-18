import { describe, it, expect } from 'vitest';
import {
  MCP_SERVER_REGISTRY,
  getDefaultServers,
  getServersRequiringAPIKeys,
  getServerDefinition,
  isValidServerID,
  getAllServerIDs,
} from '../src/config/servers';

describe('Server Registry Tests', () => {
  describe('MCP_SERVER_REGISTRY', () => {
    it('should contain all expected servers', () => {
      const expectedServers = [
        'sylphx-flow',
        'gpt-image',
        'perplexity',
        'context7',
        'gemini-search',
        'grep',
      ];

      expectedServers.forEach((serverId) => {
        expect(MCP_SERVER_REGISTRY[serverId as keyof typeof MCP_SERVER_REGISTRY]).toBeDefined();
      });
    });

    it('should have proper server definitions with required fields', () => {
      Object.values(MCP_SERVER_REGISTRY).forEach((server) => {
        expect(server).toHaveProperty('id');
        expect(server).toHaveProperty('name');
        expect(server).toHaveProperty('description');
        expect(server).toHaveProperty('config');
        expect(server).toHaveProperty('category');
      });
    });
  });

  describe('getDefaultServers', () => {
    it('should return servers that are marked as default in init', () => {
      const defaultServers = getDefaultServers();

      // Should include servers with defaultInInit: true
      expect(defaultServers).toContain('context7');
      expect(defaultServers).toContain('gpt-image');
      expect(defaultServers).toContain('perplexity');
      expect(defaultServers).toContain('grep');
      expect(defaultServers).toContain('gemini-search');

      // Should not include servers with defaultInInit: false or undefined
      expect(defaultServers).not.toContain('filesystem');
      expect(defaultServers).not.toContain('brave-search');
    });
  });

  describe('getServersRequiringAPIKeys', () => {
    it('should return servers that have required environment variables', () => {
      const serversWithKeys = getServersRequiringAPIKeys();

      // Should include servers with requiredEnvVars
      expect(serversWithKeys).toContain('gpt-image');
      expect(serversWithKeys).toContain('perplexity');
      expect(serversWithKeys).toContain('gemini-search');

      // Should not include servers with no requiredEnvVars
      expect(serversWithKeys).not.toContain('grep');
      expect(serversWithKeys).not.toContain('filesystem');
      expect(serversWithKeys).not.toContain('sequential-thinking');
      expect(serversWithKeys).not.toContain('puppeteer');
      expect(serversWithKeys).not.toContain('fetch');
    });
  });

  describe('getServerDefinition', () => {
    it('should return correct server definition for valid IDs', () => {
      const context7Def = getServerDefinition('context7');
      expect(context7Def).toBeDefined();
      expect(context7Def?.id).toBe('context7');
      expect(context7Def?.name).toBe('context7');
      expect(context7Def?.envVars?.CONTEXT7_API_KEY?.required).toBe(false);
    });

    it('should throw for invalid IDs', () => {
      expect(() => getServerDefinition('invalid-server' as any)).toThrow(
        'Unknown MCP server: invalid-server'
      );
    });
  });

  describe('isValidServerID', () => {
    it('should return true for valid server IDs', () => {
      expect(isValidServerID('context7')).toBe(true);
      expect(isValidServerID('gpt-image')).toBe(true);
      expect(isValidServerID('grep')).toBe(true);
    });

    it('should return false for invalid server IDs', () => {
      expect(isValidServerID('invalid-server')).toBe(false);
      expect(isValidServerID('')).toBe(false);
      expect(isValidServerID(null as any)).toBe(false);
      expect(isValidServerID(undefined as any)).toBe(false);
    });
  });

  describe('getAllServerIDs', () => {
    it('should return all server IDs', () => {
      const allIds = getAllServerIDs();

      // Should contain all expected server IDs
      expect(allIds).toContain('sylphx-flow');
      expect(allIds).toContain('context7');
      expect(allIds).toContain('gpt-image');
      expect(allIds).toContain('perplexity');
      expect(allIds).toContain('grep');
      expect(allIds).toContain('gemini-search');

      // Should have the correct count
      expect(allIds.length).toBe(Object.keys(MCP_SERVER_REGISTRY).length);
    });
  });

  describe('Server Configuration Validation', () => {
    it('should validate context7 server configuration', () => {
      const context7 = MCP_SERVER_REGISTRY.context7;

      expect(context7.id).toBe('context7');
      expect(context7.name).toBe('context7');
      expect(context7.description).toBe('Context7 HTTP MCP server for documentation retrieval');
      expect(context7.config.type).toBe('remote');
      if (context7.config.type === 'remote') {
        expect(context7.config.url).toBe('https://mcp.context7.com/mcp');
      }
      expect(context7.envVars).toEqual({
        CONTEXT7_API_KEY: {
          description: 'Context7 API key for enhanced documentation access',
          required: false,
        },
      });
      expect(context7.category).toBe('external');
      expect(context7.defaultInInit).toBe(true);
    });

    it('should validate gpt-image server configuration', () => {
      const gptImage = MCP_SERVER_REGISTRY['gpt-image'];

      expect(gptImage.id).toBe('gpt-image');
      expect(gptImage.name).toBe('gpt-image-1-mcp');
      expect(gptImage.description).toBe('GPT Image generation MCP server');
      expect(gptImage.config.type).toBe('local');
      expect(gptImage.envVars).toEqual({
        OPENAI_API_KEY: {
          description: 'OpenAI API key for image generation',
          required: true,
        },
      });
      expect(gptImage.category).toBe('ai');
      expect(gptImage.defaultInInit).toBe(true);
    });

    it('should validate gemini-search server configuration', () => {
      const geminiSearch = MCP_SERVER_REGISTRY['gemini-search'];

      expect(geminiSearch.id).toBe('gemini-search');
      expect(geminiSearch.name).toBe('gemini-google-search');
      expect(geminiSearch.description).toBe('Gemini Google Search MCP server');
      expect(geminiSearch.config.type).toBe('local');
      expect(geminiSearch.envVars).toEqual({
        GEMINI_API_KEY: {
          description: 'Google Gemini API key for search functionality',
          required: true,
        },
        GEMINI_MODEL: {
          description: 'Gemini model to use for search',
          required: false,
          default: 'gemini-2.5-flash',
        },
      });
      expect(geminiSearch.category).toBe('ai');
      expect(geminiSearch.defaultInInit).toBe(true);
    });

    it('should validate grep server configuration', () => {
      const grep = MCP_SERVER_REGISTRY.grep;

      expect(grep.id).toBe('grep');
      expect(grep.name).toBe('grep');
      expect(grep.description).toBe('GitHub grep MCP server for searching GitHub repositories');
      expect(grep.config.type).toBe('remote');
      expect(grep.envVars).toBeUndefined();
      expect(grep.category).toBe('external');
      expect(grep.defaultInInit).toBe(true);
    });
  });
});
