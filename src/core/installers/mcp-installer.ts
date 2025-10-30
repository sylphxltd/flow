/**
 * Composable MCP installer - shared MCP installation logic
 * Used by targets through composition
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { type MCPServerID, MCP_SERVER_REGISTRY } from '../../config/servers.js';
import { MCPService } from '../../services/mcp-service.js';

export interface MCPInstallResult {
  selectedServers: MCPServerID[];
  serverConfigsMap: Record<MCPServerID, Record<string, string>>;
}

/**
 * Composable MCP installer
 * Handles server selection, configuration, and installation
 */
export class MCPInstaller {
  private mcpService: MCPService;

  constructor(targetId: string) {
    this.mcpService = new MCPService(targetId);
  }

  /**
   * Prompt user to select MCP servers
   */
  async selectServers(options: { quiet?: boolean } = {}): Promise<MCPServerID[]> {
    const allServers = this.mcpService.getAllServerIds();
    const installedServers = await this.mcpService.getInstalledServerIds();

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
  }

  /**
   * Configure selected servers
   */
  async configureServers(
    selectedServers: MCPServerID[],
    options: { quiet?: boolean } = {}
  ): Promise<Record<MCPServerID, Record<string, string>>> {
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
        const configValues = await this.mcpService.configureServer(serverId, collectedEnv);
        serverConfigsMap[serverId] = configValues;
      }
    }

    return serverConfigsMap;
  }

  /**
   * Install servers with configuration
   */
  async installServers(
    selectedServers: MCPServerID[],
    serverConfigsMap: Record<MCPServerID, Record<string, string>>,
    options: { quiet?: boolean } = {}
  ): Promise<void> {
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
      await this.mcpService.installServers(selectedServers, serverConfigsMap);
      if (spinner) {
        spinner.succeed(
          chalk.green(
            `Installed ${chalk.cyan(selectedServers.length)} MCP server${selectedServers.length > 1 ? 's' : ''}`,
          ),
        );
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(chalk.red('Failed to install MCP servers'));
      }
      throw error;
    }
  }

  /**
   * Full MCP setup workflow: select, configure, and install
   */
  async setupMCP(options: { quiet?: boolean; dryRun?: boolean } = {}): Promise<MCPInstallResult> {
    // Select servers
    const selectedServers = await this.selectServers(options);

    if (selectedServers.length === 0) {
      return { selectedServers: [], serverConfigsMap: {} };
    }

    // Configure servers
    const serverConfigsMap = await this.configureServers(selectedServers, options);

    // Install servers
    if (!options.dryRun) {
      await this.installServers(selectedServers, serverConfigsMap, options);
    }

    return { selectedServers, serverConfigsMap };
  }
}
