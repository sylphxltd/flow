import { describe, expect, it } from 'vitest';
import {
  buildDryRunOutput,
  buildInitPlan,
  buildMCPServerSelection,
  getServersNeedingConfig,
  includeRequiredServers,
  updatePlanWithMCPServers,
  validateInitOptions,
  validateTarget,
} from '../../../src/commands/functional/init-logic.js';

describe('init-logic', () => {
  describe('validateInitOptions', () => {
    it('should require target', () => {
      const result = validateInitOptions({});
      expect(result._tag).toBe('Failure');
    });

    it('should validate with defaults', () => {
      const result = validateInitOptions({ target: 'claude-code' });
      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        expect(result.value).toEqual({
          target: 'claude-code',
          verbose: false,
          dryRun: false,
          clear: false,
          mcp: true,
        });
      }
    });

    it('should preserve provided options', () => {
      const result = validateInitOptions({
        target: 'opencode',
        verbose: true,
        dryRun: true,
        clear: true,
        mcp: false,
      });
      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        expect(result.value).toEqual({
          target: 'opencode',
          verbose: true,
          dryRun: true,
          clear: true,
          mcp: false,
        });
      }
    });
  });

  describe('validateTarget', () => {
    it('should accept valid target', () => {
      const result = validateTarget('claude-code', ['claude-code', 'opencode']);
      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        expect(result.value).toBe('claude-code');
      }
    });

    it('should reject invalid target', () => {
      const result = validateTarget('invalid', ['claude-code', 'opencode']);
      expect(result._tag).toBe('Failure');
    });
  });

  describe('buildInitPlan', () => {
    it('should build basic plan without MCP', () => {
      const result = buildInitPlan(
        {
          target: 'claude-code',
          verbose: false,
          dryRun: false,
          clear: false,
          mcp: false,
        },
        false,
        ['claude-code']
      );

      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        expect(result.value.steps).toContainEqual({
          type: 'validate-target',
          target: 'claude-code',
        });
        expect(result.value.steps).toContainEqual({ type: 'install-agents' });
        expect(result.value.steps).toContainEqual({ type: 'install-rules' });
        expect(result.value.steps).not.toContainEqual({ type: 'select-mcp-servers' });
      }
    });

    it('should include MCP steps when enabled', () => {
      const result = buildInitPlan(
        {
          target: 'claude-code',
          verbose: false,
          dryRun: false,
          clear: false,
          mcp: true,
        },
        true,
        ['claude-code']
      );

      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        expect(result.value.steps).toContainEqual({ type: 'select-mcp-servers' });
      }
    });

    it('should fail for unsupported target', () => {
      const result = buildInitPlan(
        {
          target: 'invalid',
          verbose: false,
          dryRun: false,
          clear: false,
          mcp: false,
        },
        false,
        ['claude-code']
      );

      expect(result._tag).toBe('Failure');
    });
  });

  describe('getServersNeedingConfig', () => {
    it('should identify servers with env vars', () => {
      const servers = getServersNeedingConfig(['server1' as any, 'server2' as any], {
        server1: { envVars: { KEY: 'value' } },
        server2: {},
      });

      expect(servers).toEqual(['server1']);
    });

    it('should return empty for servers without env vars', () => {
      const servers = getServersNeedingConfig(['server1' as any, 'server2' as any], {
        server1: {},
        server2: {},
      });

      expect(servers).toEqual([]);
    });
  });

  describe('includeRequiredServers', () => {
    it('should add required servers', () => {
      const result = includeRequiredServers(
        ['server1' as any],
        ['server1' as any, 'server2' as any, 'server3' as any],
        {
          server1: {},
          server2: { required: true },
          server3: {},
        }
      );

      expect(result).toContain('server1' as any);
      expect(result).toContain('server2' as any);
      expect(result).not.toContain('server3' as any);
    });

    it('should deduplicate servers', () => {
      const result = includeRequiredServers(
        ['server1' as any],
        ['server1' as any, 'server2' as any],
        {
          server1: { required: true },
          server2: {},
        }
      );

      expect(result).toEqual(['server1']);
    });
  });

  describe('buildMCPServerSelection', () => {
    it('should build server selection', () => {
      const selection = buildMCPServerSelection(
        ['server1' as any],
        ['server1' as any, 'server2' as any],
        {
          server1: { envVars: { KEY: 'value' } },
          server2: { required: true },
        }
      );

      expect(selection.selectedServers).toContain('server1' as any);
      expect(selection.selectedServers).toContain('server2' as any);
      expect(selection.serversNeedingConfig).toEqual(['server1']);
    });
  });

  describe('buildDryRunOutput', () => {
    it('should build dry run output', () => {
      const plan = {
        options: {
          target: 'claude-code',
          verbose: false,
          dryRun: true,
          clear: false,
          mcp: true,
        },
        mcpServers: {
          selectedServers: ['server1' as any],
          serversNeedingConfig: [],
        },
        steps: [],
      };

      const output = buildDryRunOutput(plan, {
        server1: { name: 'Test Server' },
      });

      expect(output.title).toBe('Dry Run Mode');
      expect(output.sections).toHaveLength(3);
      expect(output.sections[0].title).toBe('MCP Tools');
      expect(output.sections[0].items).toContain('Test Server');
    });
  });
});
