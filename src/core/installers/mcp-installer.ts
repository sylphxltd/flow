/**
 * Composable MCP installer - shared MCP installation logic
 * Used by targets through composition
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { MCP_SERVER_REGISTRY, type MCPServerID } from '../../config/servers.js';
import { createMCPService } from '../../services/mcp-service.js';
import { targetManager } from '../target-manager.js';

export interface MCPInstallResult {
  selectedServers: MCPServerID[];
  serverConfigsMap: Record<MCPServerID, Record<string, string>>;
}

/**
 * MCP Installer interface
 */
export interface MCPInstaller {
  selectServers(options?: { quiet?: boolean }): Promise<MCPServerID[]>;
  configureServers(
    selectedServers: MCPServerID[],
    options?: { quiet?: boolean }
  ): Promise<Record<MCPServerID, Record<string, string>>>;
  installServers(
    selectedServers: MCPServerID[],
    serverConfigsMap: Record<MCPServerID, Record<string, string>>,
    options?: { quiet?: boolean }
  ): Promise<void>;
  setupMCP(options?: { quiet?: boolean; dryRun?: boolean }): Promise<MCPInstallResult>;
}

/**
 * Create an MCP installer instance
 * Handles server selection, configuration, and installation
 */
export function createMCPInstaller(targetId: string): MCPInstaller {
  const targetOption = targetManager.getTarget(targetId);
  if (targetOption._tag === 'None') {
    throw new Error(`Target not found: ${targetId}`);
  }

  const target = targetOption.value;
  const mcpService = createMCPService({ target });

  /**
   * Prompt user to select MCP servers
   */
  const selectServers = async (options: { quiet?: boolean } = {}): Promise<MCPServerID[]> => {
    const allServers = mcpService.getAllServerIds();
    const installedServers = await mcpService.getInstalledServerIds();

    if (!options.quiet) {
      console.log(chalk.cyan.bold('━━━ Configure MCP Tools ━━━\n'));
    }

    // Show server selection
    const serverSelectionAnswer = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedServers',
        message: 'Select MCP tools to install:',
        choices: allServers.map((id) => {
          const server = MCP_SERVER_REGISTRY[id];
          const isInstalled = installedServers.includes(id);
          return {
            name: `${server.name} - ${server.description}`,
            value: id,
            checked: server.required || isInstalled || server.defaultInInit || false,
            disabled: server.required ? '(required)' : false,
          };
        }),
      },
    ]);

    let selectedServers = serverSelectionAnswer.selectedServers as MCPServerID[];

    // Ensure all required servers are included
    const requiredServers = allServers.filter((id) => MCP_SERVER_REGISTRY[id].required);
    selectedServers = [...new Set([...requiredServers, ...selectedServers])];

    return selectedServers;
  };

  /**
   * Configure selected servers
   */
  const configureServers = async (
    selectedServers: MCPServerID[],
    options: { quiet?: boolean } = {}
  ): Promise<Record<MCPServerID, Record<string, string>>> => {
    const serversNeedingConfig = selectedServers.filter((id) => {
      const server = MCP_SERVER_REGISTRY[id];
      return server.envVars && Object.keys(server.envVars).length > 0;
    });

    const serverConfigsMap: Record<MCPServerID, Record<string, string>> = {};

    if (serversNeedingConfig.length > 0) {
      if (!options.quiet) {
        console.log(chalk.cyan.bold('\n━━━ Server Configuration ━━━\n'));
      }

      const collectedEnv: Record<string, string> = {};
      for (const serverId of serversNeedingConfig) {
        const configValues = await mcpService.configureServer(serverId, collectedEnv);
        serverConfigsMap[serverId] = configValues;
      }
    }

    return serverConfigsMap;
  };

  /**
   * Install servers with configuration
   */
  const installServers = async (
    selectedServers: MCPServerID[],
    serverConfigsMap: Record<MCPServerID, Record<string, string>>,
    options: { quiet?: boolean } = {}
  ): Promise<void> => {
    if (selectedServers.length === 0) {
      return;
    }

    // Only show spinner if not in quiet mode
    const spinner = options.quiet
      ? null
      : ora({
          text: `Installing ${selectedServers.length} MCP server${selectedServers.length > 1 ? 's' : ''}`,
          color: 'cyan',
        }).start();

    try {
      await mcpService.installServers(selectedServers, serverConfigsMap);
      if (spinner) {
        spinner.succeed(
          chalk.green(
            `Installed ${chalk.cyan(selectedServers.length)} MCP server${selectedServers.length > 1 ? 's' : ''}`
          )
        );
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(chalk.red('Failed to install MCP servers'));
      }
      throw error;
    }
  };

  /**
   * Full MCP setup workflow: select, configure, and install
   */
  const setupMCP = async (
    options: { quiet?: boolean; dryRun?: boolean } = {}
  ): Promise<MCPInstallResult> => {
    // Select servers
    const selectedServers = await selectServers(options);

    if (selectedServers.length === 0) {
      return { selectedServers: [], serverConfigsMap: {} };
    }

    // Configure servers
    const serverConfigsMap = await configureServers(selectedServers, options);

    // Install servers
    if (!options.dryRun) {
      await installServers(selectedServers, serverConfigsMap, options);
    }

    return { selectedServers, serverConfigsMap };
  };

  return {
    selectServers,
    configureServers,
    installServers,
    setupMCP,
  };
}

/**
 * @deprecated Use createMCPInstaller() for new code
 */
export class MCPInstaller {
  private installer: ReturnType<typeof createMCPInstaller>;

  constructor(targetId: string) {
    this.installer = createMCPInstaller(targetId);
  }

  async selectServers(options: { quiet?: boolean } = {}): Promise<MCPServerID[]> {
    return this.installer.selectServers(options);
  }

  async configureServers(
    selectedServers: MCPServerID[],
    options: { quiet?: boolean } = {}
  ): Promise<Record<MCPServerID, Record<string, string>>> {
    return this.installer.configureServers(selectedServers, options);
  }

  async installServers(
    selectedServers: MCPServerID[],
    serverConfigsMap: Record<MCPServerID, Record<string, string>>,
    options: { quiet?: boolean } = {}
  ): Promise<void> {
    return this.installer.installServers(selectedServers, serverConfigsMap, options);
  }

  async setupMCP(options: { quiet?: boolean; dryRun?: boolean } = {}): Promise<MCPInstallResult> {
    return this.installer.setupMCP(options);
  }
}
