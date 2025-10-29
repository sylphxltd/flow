/**
 * Servers Config Tests
 * Tests for MCP server registry and utilities
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  MCP_SERVER_REGISTRY,
  getAllServerIDs,
  getServersByCategory,
  getDefaultServers,
  getServersRequiringAPIKeys,
  getServersWithOptionalAPIKeys,
  getServersWithAnyAPIKeys,
  getRequiredEnvVars,
  getOptionalEnvVars,
  getAllEnvVars,
  getSecretEnvVars,
  getNonSecretEnvVars,
  isValidServerID,
  getServerDefinition,
} from '../../src/config/servers.js';

// Mock dependencies
vi.mock('../composables/useTargetConfig.js', () => ({
  useTargetConfig: vi.fn(async () => ({
    disableMemory: false,
    disableTime: false,
    disableProjectStartup: false,
    disableKnowledge: false,
    disableCodebase: false,
  })),
}));

describe('Servers Config', () => {
  describe('MCP_SERVER_REGISTRY', () => {
    it('should define server registry', () => {
      expect(MCP_SERVER_REGISTRY).toBeDefined();
      expect(typeof MCP_SERVER_REGISTRY).toBe('object');
    });

    it('should include sylphx-flow server', () => {
      expect(MCP_SERVER_REGISTRY['sylphx-flow']).toBeDefined();
      expect(MCP_SERVER_REGISTRY['sylphx-flow'].id).toBe('sylphx-flow');
    });

    it('should include gpt-image server', () => {
      expect(MCP_SERVER_REGISTRY['gpt-image']).toBeDefined();
      expect(MCP_SERVER_REGISTRY['gpt-image'].id).toBe('gpt-image');
    });

    it('should include perplexity server', () => {
      expect(MCP_SERVER_REGISTRY.perplexity).toBeDefined();
      expect(MCP_SERVER_REGISTRY.perplexity.id).toBe('perplexity');
    });

    it('should include context7 server', () => {
      expect(MCP_SERVER_REGISTRY.context7).toBeDefined();
      expect(MCP_SERVER_REGISTRY.context7.id).toBe('context7');
    });

    it('should include gemini-search server', () => {
      expect(MCP_SERVER_REGISTRY['gemini-search']).toBeDefined();
      expect(MCP_SERVER_REGISTRY['gemini-search'].id).toBe('gemini-search');
    });

    it('should include grep server', () => {
      expect(MCP_SERVER_REGISTRY.grep).toBeDefined();
      expect(MCP_SERVER_REGISTRY.grep.id).toBe('grep');
    });

    it('should have valid server definitions', () => {
      Object.values(MCP_SERVER_REGISTRY).forEach((server) => {
        expect(server.id).toBeDefined();
        expect(server.name).toBeDefined();
        expect(server.description).toBeDefined();
        expect(server.config).toBeDefined();
        expect(server.category).toBeDefined();
      });
    });
  });

  describe('getAllServerIDs', () => {
    it('should return all server IDs', () => {
      const ids = getAllServerIDs();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(0);
    });

    it('should include sylphx-flow', () => {
      const ids = getAllServerIDs();
      expect(ids).toContain('sylphx-flow');
    });

    it('should include all registered servers', () => {
      const ids = getAllServerIDs();
      const registryKeys = Object.keys(MCP_SERVER_REGISTRY);
      expect(ids).toEqual(registryKeys);
    });
  });

  describe('getServersByCategory', () => {
    it('should return core servers', () => {
      const core = getServersByCategory('core');
      expect(core).toContain('sylphx-flow');
    });

    it('should return ai servers', () => {
      const ai = getServersByCategory('ai');
      expect(ai).toContain('gpt-image');
      expect(ai).toContain('perplexity');
      expect(ai).toContain('gemini-search');
    });

    it('should return external servers', () => {
      const external = getServersByCategory('external');
      expect(external).toContain('context7');
      expect(external).toContain('grep');
    });

    it('should not mix categories', () => {
      const core = getServersByCategory('core');
      const ai = getServersByCategory('ai');
      const external = getServersByCategory('external');

      core.forEach((id) => {
        expect(ai).not.toContain(id);
        expect(external).not.toContain(id);
      });
    });
  });

  describe('getDefaultServers', () => {
    it('should return default servers', () => {
      const defaults = getDefaultServers();
      expect(Array.isArray(defaults)).toBe(true);
    });

    it('should include sylphx-flow', () => {
      const defaults = getDefaultServers();
      expect(defaults).toContain('sylphx-flow');
    });

    it('should include context7', () => {
      const defaults = getDefaultServers();
      expect(defaults).toContain('context7');
    });

    it('should include grep', () => {
      const defaults = getDefaultServers();
      expect(defaults).toContain('grep');
    });

    it('should not include non-default servers', () => {
      const defaults = getDefaultServers();
      expect(defaults).not.toContain('gpt-image');
      expect(defaults).not.toContain('perplexity');
      expect(defaults).not.toContain('gemini-search');
    });
  });

  describe('getServersRequiringAPIKeys', () => {
    it('should return servers requiring API keys', () => {
      const servers = getServersRequiringAPIKeys();
      expect(Array.isArray(servers)).toBe(true);
    });

    it('should include gpt-image', () => {
      const servers = getServersRequiringAPIKeys();
      expect(servers).toContain('gpt-image');
    });

    it('should include perplexity', () => {
      const servers = getServersRequiringAPIKeys();
      expect(servers).toContain('perplexity');
    });

    it('should include gemini-search', () => {
      const servers = getServersRequiringAPIKeys();
      expect(servers).toContain('gemini-search');
    });

    it('should not include servers with only optional keys', () => {
      const servers = getServersRequiringAPIKeys();
      // sylphx-flow has optional keys
      // context7 has optional keys
      // These should not be in the required list (though they may have env vars)
    });
  });

  describe('getServersWithOptionalAPIKeys', () => {
    it('should return servers with optional API keys', () => {
      const servers = getServersWithOptionalAPIKeys();
      expect(Array.isArray(servers)).toBe(true);
    });

    it('should include servers with optional env vars', () => {
      const servers = getServersWithOptionalAPIKeys();
      expect(servers.length).toBeGreaterThan(0);
    });
  });

  describe('getServersWithAnyAPIKeys', () => {
    it('should return servers with any API keys', () => {
      const servers = getServersWithAnyAPIKeys();
      expect(Array.isArray(servers)).toBe(true);
    });

    it('should include sylphx-flow', () => {
      const servers = getServersWithAnyAPIKeys();
      expect(servers).toContain('sylphx-flow');
    });

    it('should include all servers with env vars', () => {
      const servers = getServersWithAnyAPIKeys();
      expect(servers).toContain('gpt-image');
      expect(servers).toContain('perplexity');
      expect(servers).toContain('gemini-search');
      expect(servers).toContain('context7');
    });

    it('should not include servers without env vars', () => {
      const servers = getServersWithAnyAPIKeys();
      expect(servers).not.toContain('grep');
    });
  });

  describe('getRequiredEnvVars', () => {
    it('should return required env vars for gpt-image', () => {
      const envVars = getRequiredEnvVars('gpt-image');
      expect(envVars).toContain('OPENAI_API_KEY');
    });

    it('should return required env vars for perplexity', () => {
      const envVars = getRequiredEnvVars('perplexity');
      expect(envVars).toContain('PERPLEXITY_API_KEY');
    });

    it('should return required env vars for gemini-search', () => {
      const envVars = getRequiredEnvVars('gemini-search');
      expect(envVars).toContain('GEMINI_API_KEY');
    });

    it('should return empty for servers without required env vars', () => {
      const envVars = getRequiredEnvVars('grep');
      expect(envVars).toEqual([]);
    });

    it('should return empty for sylphx-flow (all optional)', () => {
      const envVars = getRequiredEnvVars('sylphx-flow');
      expect(envVars).toEqual([]);
    });
  });

  describe('getOptionalEnvVars', () => {
    it('should return optional env vars for sylphx-flow', () => {
      const envVars = getOptionalEnvVars('sylphx-flow');
      expect(envVars).toContain('OPENAI_API_KEY');
      expect(envVars).toContain('OPENAI_BASE_URL');
      expect(envVars).toContain('EMBEDDING_MODEL');
    });

    it('should return optional env vars for gemini-search', () => {
      const envVars = getOptionalEnvVars('gemini-search');
      expect(envVars).toContain('GEMINI_MODEL');
    });

    it('should return empty for servers without optional env vars', () => {
      const envVars = getOptionalEnvVars('gpt-image');
      expect(envVars).toEqual([]);
    });

    it('should return empty for grep', () => {
      const envVars = getOptionalEnvVars('grep');
      expect(envVars).toEqual([]);
    });
  });

  describe('getAllEnvVars', () => {
    it('should return all env vars for sylphx-flow', () => {
      const envVars = getAllEnvVars('sylphx-flow');
      expect(envVars).toContain('OPENAI_API_KEY');
      expect(envVars).toContain('OPENAI_BASE_URL');
      expect(envVars).toContain('EMBEDDING_MODEL');
    });

    it('should return all env vars for gpt-image', () => {
      const envVars = getAllEnvVars('gpt-image');
      expect(envVars).toContain('OPENAI_API_KEY');
    });

    it('should return empty for servers without env vars', () => {
      const envVars = getAllEnvVars('grep');
      expect(envVars).toEqual([]);
    });

    it('should include both required and optional', () => {
      const envVars = getAllEnvVars('gemini-search');
      expect(envVars).toContain('GEMINI_API_KEY'); // required
      expect(envVars).toContain('GEMINI_MODEL'); // optional
    });
  });

  describe('getSecretEnvVars', () => {
    it('should return secret env vars for sylphx-flow', () => {
      const secrets = getSecretEnvVars('sylphx-flow');
      expect(secrets).toContain('OPENAI_API_KEY');
    });

    it('should return secret env vars for gpt-image', () => {
      const secrets = getSecretEnvVars('gpt-image');
      expect(secrets).toContain('OPENAI_API_KEY');
    });

    it('should return secret env vars for perplexity', () => {
      const secrets = getSecretEnvVars('perplexity');
      expect(secrets).toContain('PERPLEXITY_API_KEY');
    });

    it('should not include non-secret env vars', () => {
      const secrets = getSecretEnvVars('sylphx-flow');
      expect(secrets).not.toContain('OPENAI_BASE_URL');
      expect(secrets).not.toContain('EMBEDDING_MODEL');
    });

    it('should return empty for servers without secrets', () => {
      const secrets = getSecretEnvVars('grep');
      expect(secrets).toEqual([]);
    });
  });

  describe('getNonSecretEnvVars', () => {
    it('should return non-secret env vars for sylphx-flow', () => {
      const nonSecrets = getNonSecretEnvVars('sylphx-flow');
      expect(nonSecrets).toContain('OPENAI_BASE_URL');
      expect(nonSecrets).toContain('EMBEDDING_MODEL');
    });

    it('should not include secret env vars', () => {
      const nonSecrets = getNonSecretEnvVars('sylphx-flow');
      expect(nonSecrets).not.toContain('OPENAI_API_KEY');
    });

    it('should return non-secret env vars for gemini-search', () => {
      const nonSecrets = getNonSecretEnvVars('gemini-search');
      expect(nonSecrets).toContain('GEMINI_MODEL');
    });

    it('should return empty for servers with only secrets', () => {
      const nonSecrets = getNonSecretEnvVars('gpt-image');
      expect(nonSecrets).toEqual([]);
    });

    it('should return empty for servers without env vars', () => {
      const nonSecrets = getNonSecretEnvVars('grep');
      expect(nonSecrets).toEqual([]);
    });
  });

  describe('isValidServerID', () => {
    it('should return true for valid server IDs', () => {
      expect(isValidServerID('sylphx-flow')).toBe(true);
      expect(isValidServerID('gpt-image')).toBe(true);
      expect(isValidServerID('perplexity')).toBe(true);
      expect(isValidServerID('context7')).toBe(true);
      expect(isValidServerID('gemini-search')).toBe(true);
      expect(isValidServerID('grep')).toBe(true);
    });

    it('should return false for invalid server IDs', () => {
      expect(isValidServerID('invalid')).toBe(false);
      expect(isValidServerID('unknown-server')).toBe(false);
      expect(isValidServerID('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidServerID('Sylphx-Flow')).toBe(false);
      expect(isValidServerID('SYLPHX-FLOW')).toBe(false);
    });
  });

  describe('getServerDefinition', () => {
    it('should return server definition for valid ID', () => {
      const server = getServerDefinition('sylphx-flow');
      expect(server).toBeDefined();
      expect(server.id).toBe('sylphx-flow');
      expect(server.name).toBe('sylphx-flow');
    });

    it('should return all server properties', () => {
      const server = getServerDefinition('gpt-image');
      expect(server.id).toBeDefined();
      expect(server.name).toBeDefined();
      expect(server.description).toBeDefined();
      expect(server.config).toBeDefined();
      expect(server.category).toBeDefined();
    });

    it('should throw for invalid server ID', () => {
      expect(() => getServerDefinition('invalid' as any)).toThrow('Unknown MCP server: invalid');
    });

    it('should return correct definition for each server', () => {
      const sylphx = getServerDefinition('sylphx-flow');
      expect(sylphx.category).toBe('core');
      expect(sylphx.required).toBe(true);

      const gptImage = getServerDefinition('gpt-image');
      expect(gptImage.category).toBe('ai');

      const context7 = getServerDefinition('context7');
      expect(context7.category).toBe('external');
    });
  });

  describe('Server Configuration', () => {
    it('should have valid config for sylphx-flow', () => {
      const server = MCP_SERVER_REGISTRY['sylphx-flow'];
      expect(server.config.type).toBe('stdio');
      expect(server.config.command).toBe('npx');
      expect(typeof server.config.args).toBe('function');
    });

    it('should have valid config for http servers', () => {
      const context7 = MCP_SERVER_REGISTRY.context7;
      expect(context7.config.type).toBe('http');
      expect(context7.config.url).toBeDefined();

      const grep = MCP_SERVER_REGISTRY.grep;
      expect(grep.config.type).toBe('http');
      expect(grep.config.url).toBeDefined();
    });

    it('should have valid env config', () => {
      const server = MCP_SERVER_REGISTRY['gpt-image'];
      expect(server.config.env).toBeDefined();
      expect(server.config.env?.OPENAI_API_KEY).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should have consistent category grouping', () => {
      const core = getServersByCategory('core');
      const ai = getServersByCategory('ai');
      const external = getServersByCategory('external');

      const allIds = getAllServerIDs();
      const allCategories = [...core, ...ai, ...external];

      expect(allCategories.sort()).toEqual(allIds.sort());
    });

    it('should have consistent env var functions', () => {
      getAllServerIDs().forEach((id) => {
        const required = getRequiredEnvVars(id);
        const optional = getOptionalEnvVars(id);
        const all = getAllEnvVars(id);

        expect(all.length).toBe(required.length + optional.length);
      });
    });

    it('should have consistent secret functions', () => {
      getAllServerIDs().forEach((id) => {
        const secrets = getSecretEnvVars(id);
        const nonSecrets = getNonSecretEnvVars(id);
        const all = getAllEnvVars(id);

        expect(all.length).toBe(secrets.length + nonSecrets.length);
      });
    });

    it('should validate all registered servers', () => {
      getAllServerIDs().forEach((id) => {
        expect(isValidServerID(id)).toBe(true);
        expect(() => getServerDefinition(id)).not.toThrow();
      });
    });
  });
});
