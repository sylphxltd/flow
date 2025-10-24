import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { type MCPServerID, MCP_SERVER_REGISTRY } from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import { MCPService } from '../services/mcp-service.js';
import type { CommandConfig, CommandHandler, CommandOptions, CLICommandConfig, isCLICommandConfig } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { listMCPServersForTarget, targetSupportsMCPServers } from '../utils/target-config.js';

// Helper function to get nested property
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// MCP start handler - simplified and targeted
const mcpStartHandler: CommandHandler = async (options: CommandOptions) => {
  const config = {
    disableMemory: options.disableMemory === true,
    disableTime: options.disableTime === true,
    disableProjectStartup: options.disableProjectStartup === true,
    disableKnowledge: options.disableKnowledge === true,
    disableCodebaseSearch: options.disableCodebaseSearch === true,
  };

  
  
  const targetId = await targetManager.resolveTarget({ target: options.target, allowSelection: true });
  const target = targetManager.getTarget(targetId);

  if (!target) {
    throw new CLIError(`Target not found: ${targetId}`, 'TARGET_NOT_FOUND');
  }

  try {
    const configData = await target.readConfig(process.cwd());
    const mcpConfigPath = target.config.mcpConfigPath || 'mcp';
    const mcpSection = getNestedProperty(configData, mcpConfigPath) || {};

    // Update MCP server configurations with disable flags
    const disableFlags = ['--disable-memory', '--disable-time', '--disable-project-startup', '--disable-knowledge', '--disable-codebase-search'];
    const requestedFlags: string[] = [];

    // Build requested flags from config
    if (config.disableMemory) requestedFlags.push('--disable-memory');
    if (config.disableTime) requestedFlags.push('--disable-time');
    if (config.disableProjectStartup) requestedFlags.push('--disable-project-startup');
    if (config.disableKnowledge) requestedFlags.push('--disable-knowledge');
    if (config.disableCodebaseSearch) requestedFlags.push('--disable-codebase-search');

    // Apply flags to all configured servers
    for (const [serverName, serverConfig] of Object.entries(mcpSection)) {
      if (!serverConfig || typeof serverConfig !== 'object') continue;

      // Simply add flags to the command, regardless of format
      if (serverConfig.type === 'stdio') {
        // Claude Code format: has args array
        if (!serverConfig.args) {
          serverConfig.args = [];
        }
        serverConfig.args.push(...requestedFlags);

      } else if (serverConfig.type === 'local' && Array.isArray(serverConfig.command)) {
        // OpenCode format: has command array
        serverConfig.command.push(...requestedFlags);

      } else if (serverConfig.type === 'http' || serverConfig.type === 'remote') {
        // HTTP/remote servers don't use command args - ignore
        continue;
      }
    }

    await target.writeConfig(process.cwd(), configData);

    console.log(chalk.green('✓ Sylphx Flow MCP server configuration updated'));
  } catch (error) {
    throw new CLIError(
      `Failed to update MCP configuration: ${error instanceof Error ? error.message : String(error)}`,
      'MCP_CONFIG_ERROR'
    );
  }
};

// MCP config handler
const mcpConfigHandler: CommandHandler = async (options) => {
  const server = options.server as string;
  const targetId = await targetManager.resolveTarget({ target: options.target, allowSelection: true });

  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
  }

  console.log('');
  console.log(chalk.cyan.bold('▸ Configure MCP Server'));
  console.log(chalk.gray(`  Target: ${targetId}`));

  const mcpService = new MCPService(targetId);

  // If no server specified, show selection
  let selectedServerId: MCPServerID;

  if (server) {
    if (!mcpService.getAllServerIds().includes(server as MCPServerID)) {
      throw new CLIError(
        `Invalid MCP server: ${server}. Available: ${mcpService.getAllServerIds().join(', ')}`,
        'INVALID_MCP_SERVER'
      );
    }
    selectedServerId = server as MCPServerID;
  } else {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'server',
        message: 'Select server to configure:',
        choices: mcpService.getAllServerIds().map((id) => {
          const srv = MCP_SERVER_REGISTRY[id];
          return {
            name: `${srv.name} - ${srv.description}`,
            value: id,
          };
        }),
      },
    ]);
    selectedServerId = answer.server;
  }

  const serverDef = MCP_SERVER_REGISTRY[selectedServerId];

  console.log(chalk.cyan(`\n▸ ${serverDef.name}`));
  console.log(chalk.gray(`  ${serverDef.description}`));

  if (!serverDef.envVars) {
    console.log(chalk.gray('\n  No configuration needed'));
    return;
  }

  // Configure server
  await mcpService.configureServer(selectedServerId);

  // Save configuration
  const spinner = ora('Saving configuration...').start();

  try {
    await mcpService.installServers([selectedServerId]);

    spinner.succeed(chalk.green('✓ Configuration saved'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to save configuration'));
    throw error;
  }
};

// MCP list handler
const mcpListHandler: CommandHandler = async (options: CommandOptions) => {
  const targetId = await targetManager.resolveTarget({ target: options.target, allowSelection: true });

  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
  }

  await listMCPServersForTarget(process.cwd(), targetId);
};

// MCP add handler
const mcpAddHandler: CommandHandler = async (options: CommandOptions) => {
  const servers = options.servers as string[];
  const targetId = await targetManager.resolveTarget({ target: options.target, allowSelection: true });

  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
  }

  if (!servers || servers.length === 0) {
    throw new CLIError(
      'No servers specified. Use --servers <server1,server2,...>',
      'NO_SERVERS_SPECIFIED'
    );
  }

  // Parse comma-separated servers
  const serverList = Array.isArray(servers) ? servers : [servers];

  const mcpService = new MCPService(targetId);
  const allServerIds = mcpService.getAllServerIds();

  // Validate server names
  const invalidServers = serverList.filter((s) => !allServerIds.includes(s as MCPServerID));
  if (invalidServers.length > 0) {
    throw new CLIError(
      `Invalid MCP servers: ${invalidServers.join(', ')}. Available: ${allServerIds.join(', ')}`,
      'INVALID_MCP_SERVERS'
    );
  }

  const serverIds = serverList as MCPServerID[];
  await mcpService.installServers(serverIds);
};

// MCP remove handler
const mcpRemoveHandler: CommandHandler = async (options: CommandOptions) => {
  const servers = options.servers as string[];
  const targetId = await targetManager.resolveTarget({ target: options.target, allowSelection: true });

  if (!targetSupportsMCPServers(targetId)) {
    throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
  }

  if (!servers || servers.length === 0) {
    throw new CLIError(
      'No servers specified. Use --servers <server1,server2,...>',
      'NO_SERVERS_SPECIFIED'
    );
  }

  const mcpService = new MCPService(targetId);
  const installedServerIds = mcpService.getInstalledServerIds();

  // Validate server names
  const invalidServers = servers.filter((s) => !installedServerIds.includes(s as MCPServerID));
  if (invalidServers.length > 0) {
    throw new CLIError(
      `MCP servers not installed: ${invalidServers.join(', ')}. Installed: ${installedServerIds.join(', ')}`,
      'SERVERS_NOT_INSTALLED'
    );
  }

  // TODO: Implement remove functionality in MCPService
  console.log(chalk.yellow('Remove functionality not yet implemented'));
};

export const mcpCommand: CommandConfig = {
  name: 'mcp',
  description: 'Manage MCP (Model Context Protocol) servers',
  options: [
    {
      flags: '--target <type>',
      description: `Force specific target (${targetManager.getImplementedTargetIDs().join(', ')}, default: opencode)`,
    },
  ],
  subcommands: [
    {
      name: 'start',
      description: 'Start Sylphx Flow MCP server with specific configuration',
      options: [
        { flags: '--disable-memory', description: 'Disable memory functionality' },
        { flags: '--disable-time', description: 'Disable time functionality' },
        {
          flags: '--disable-project-startup',
          description: 'Disable project startup functionality',
        },
        { flags: '--disable-knowledge', description: 'Disable knowledge functionality' },
        {
          flags: '--disable-codebase-search',
          description: 'Disable codebase search functionality',
        },
      ],
      handler: mcpStartHandler,
    },
    {
      name: 'config',
      description: 'Configure MCP server settings',
      options: [
        {
          flags: '--server <name>',
          description: 'Configure specific server (shows selection if not provided)',
        },
      ],
      handler: mcpConfigHandler,
    },
    {
      name: 'list',
      description: 'List installed MCP servers',
      options: [],
      handler: mcpListHandler,
    },
    {
      name: 'add',
      description: 'Add MCP servers',
      options: [
        {
          flags: '--servers <servers>',
          description: 'Comma-separated list of server names to add',
        },
      ],
      handler: mcpAddHandler,
    },
    {
      name: 'remove',
      description: 'Remove MCP servers',
      options: [
        {
          flags: '--servers <servers>',
          description: 'Comma-separated list of server names to remove',
        },
      ],
      handler: mcpRemoveHandler,
    },
  ],
};
