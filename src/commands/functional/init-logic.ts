/**
 * Business logic for init command
 * Pure functions and domain logic separated from UI/side effects
 *
 * DESIGN RATIONALE:
 * - Business logic as pure functions
 * - UI/side effects in command handler
 * - Testable without mocking I/O
 * - Composable validation and transformation
 */

import type { MCPServerID } from '../../config/servers.js';
import type { ConfigError } from '../../core/functional/error-types.js';
import { configError } from '../../core/functional/error-types.js';
import type { Result } from '../../core/functional/result.js';
import { failure, success } from '../../core/functional/result.js';

/**
 * Domain types
 */

export interface InitOptions {
  target?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  mcp?: boolean;
}

export interface ValidatedInitOptions {
  target: string;
  verbose: boolean;
  dryRun: boolean;
  clear: boolean;
  mcp: boolean;
}

export interface MCPServerSelection {
  selectedServers: MCPServerID[];
  serversNeedingConfig: MCPServerID[];
}

export interface InitPlan {
  options: ValidatedInitOptions;
  mcpServers?: MCPServerSelection;
  steps: InitStep[];
}

export type InitStep =
  | { type: 'validate-target'; target: string }
  | { type: 'select-mcp-servers' }
  | { type: 'configure-mcp-servers'; servers: MCPServerID[] }
  | { type: 'install-mcp-servers'; servers: MCPServerID[] }
  | { type: 'install-agents' }
  | { type: 'install-rules' }
  | { type: 'save-settings'; target: string }
  | { type: 'setup-target'; target: string };

/**
 * Validation
 */

/**
 * Validate init options
 */
export const validateInitOptions = (
  options: InitOptions
): Result<ValidatedInitOptions, ConfigError> => {
  if (!options.target) {
    return failure(configError('Target is required for initialization'));
  }

  return success({
    target: options.target,
    verbose: options.verbose ?? false,
    dryRun: options.dryRun ?? false,
    clear: options.clear ?? false,
    mcp: options.mcp ?? true,
  });
};

/**
 * Validate target is supported
 */
export const validateTarget = (
  target: string,
  implementedTargets: string[]
): Result<string, ConfigError> => {
  if (!implementedTargets.includes(target)) {
    return failure(
      configError(
        `Unsupported target: ${target}. Supported targets: ${implementedTargets.join(', ')}`,
        { context: { target, implementedTargets } }
      )
    );
  }

  return success(target);
};

/**
 * Plan generation (pure)
 */

/**
 * Build initialization plan
 */
export const buildInitPlan = (
  options: ValidatedInitOptions,
  targetSupportsMCP: boolean,
  implementedTargets: string[]
): Result<InitPlan, ConfigError> => {
  // Validate target
  const targetResult = validateTarget(options.target, implementedTargets);
  if (targetResult._tag === 'Failure') {
    return targetResult;
  }

  const steps: InitStep[] = [];

  // Add validation step
  steps.push({ type: 'validate-target', target: options.target });

  // Add MCP steps if enabled and supported
  if (options.mcp && targetSupportsMCP) {
    steps.push({ type: 'select-mcp-servers' });
    // Note: configure and install steps added dynamically based on selection
  }

  // Add core installation steps
  steps.push({ type: 'install-agents' });
  steps.push({ type: 'install-rules' });

  // Add settings and setup steps
  steps.push({ type: 'save-settings', target: options.target });
  steps.push({ type: 'setup-target', target: options.target });

  return success({
    options,
    steps,
  });
};

/**
 * MCP Server Selection Logic (pure)
 */

/**
 * Filter servers that need configuration
 */
export const getServersNeedingConfig = (
  selectedServers: MCPServerID[],
  serverRegistry: Record<MCPServerID, { envVars?: Record<string, unknown> }>
): MCPServerID[] => {
  return selectedServers.filter((id) => {
    const server = serverRegistry[id];
    return server.envVars && Object.keys(server.envVars).length > 0;
  });
};

/**
 * Ensure required servers are included
 */
export const includeRequiredServers = (
  selectedServers: MCPServerID[],
  allServers: MCPServerID[],
  serverRegistry: Record<MCPServerID, { required?: boolean }>
): MCPServerID[] => {
  const requiredServers = allServers.filter((id) => serverRegistry[id].required);
  return [...new Set([...requiredServers, ...selectedServers])];
};

/**
 * Build MCP server selection
 */
export const buildMCPServerSelection = (
  selectedServers: MCPServerID[],
  allServers: MCPServerID[],
  serverRegistry: Record<MCPServerID, { required?: boolean; envVars?: Record<string, unknown> }>
): MCPServerSelection => {
  const serversWithRequired = includeRequiredServers(selectedServers, allServers, serverRegistry);
  const serversNeedingConfig = getServersNeedingConfig(serversWithRequired, serverRegistry);

  return {
    selectedServers: serversWithRequired,
    serversNeedingConfig,
  };
};

/**
 * Update plan with MCP server selection
 */
export const updatePlanWithMCPServers = (
  plan: InitPlan,
  selection: MCPServerSelection
): InitPlan => {
  const steps = [...plan.steps];

  // Find the select-mcp-servers step and add configure/install steps after it
  const selectIndex = steps.findIndex((s) => s.type === 'select-mcp-servers');

  if (selectIndex !== -1) {
    // Insert configure step if needed
    if (selection.serversNeedingConfig.length > 0) {
      steps.splice(selectIndex + 1, 0, {
        type: 'configure-mcp-servers',
        servers: selection.serversNeedingConfig,
      });
    }

    // Insert install step
    steps.splice(selectIndex + (selection.serversNeedingConfig.length > 0 ? 2 : 1), 0, {
      type: 'install-mcp-servers',
      servers: selection.selectedServers,
    });
  }

  return {
    ...plan,
    mcpServers: selection,
    steps,
  };
};

/**
 * Dry run output generation (pure)
 */

export interface DryRunOutput {
  title: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
}

export const buildDryRunOutput = (
  plan: InitPlan,
  mcpServerRegistry?: Record<MCPServerID, { name: string }>
): DryRunOutput => {
  const sections: Array<{ title: string; items: string[] }> = [];

  // MCP Tools section
  if (plan.mcpServers && mcpServerRegistry) {
    sections.push({
      title: 'MCP Tools',
      items: plan.mcpServers.selectedServers.map((id) => mcpServerRegistry[id]?.name || id),
    });
  }

  // Agents section
  sections.push({
    title: 'Agents',
    items: ['Development agents'],
  });

  // Rules section
  sections.push({
    title: 'Rules',
    items: ['Custom rules'],
  });

  return {
    title: 'Dry Run Mode',
    sections,
  };
};
