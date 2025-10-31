import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { MCP_SERVER_REGISTRY, type MCPServerID } from '../config/servers.js';
import { targetManager } from '../core/target-manager.js';
import { startSylphxFlowMCPServer } from '../servers/mcp-server.js';
import { createMCPService } from '../services/mcp-service.js';
import { CLIError } from '../utils/error-handler.js';
import { listMCPServersForTarget, targetSupportsMCPServers } from '../utils/target-config.js';

// Create the main MCP command
export const mcpCommand = new Command('mcp')
  .description('Manage MCP (Model Context Protocol) servers')
  .option(
    '--target <type>',
    `Force specific target (${targetManager.getImplementedTargetIDs().join(', ')}, default: auto-detect)`
  );

// MCP start subcommand
mcpCommand
  .command('start')
  .description('Start Sylphx Flow MCP server with specific configuration')
  .option('--disable-memory', 'Disable memory functionality')
  .option('--disable-time', 'Disable time functionality')
  .option('--disable-project-startup', 'Disable project startup functionality')
  .option('--disable-knowledge', 'Disable knowledge functionality')
  .option('--disable-codebase', 'Disable codebase search functionality')
  .action(async (options) => {
    const config = {
      disableMemory: options.disableMemory === true,
      disableTime: options.disableTime === true,
      disableProjectStartup: options.disableProjectStartup === true,
      disableKnowledge: options.disableKnowledge === true,
      disableCodebase: options.disableCodebase === true,
    };

    try {
      console.log(chalk.blue('🚀 Starting Sylphx Flow MCP Server...'));

      // Import and start the MCP server

      // Start the server with the provided configuration
      await startSylphxFlowMCPServer(config);
    } catch (error) {
      throw new CLIError(
        `Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`,
        'MCP_START_ERROR'
      );
    }
  });

// MCP config subcommand
mcpCommand
  .command('config')
  .description('Configure MCP server settings')
  .option('--server <name>', 'Configure specific server (shows selection if not provided)')
  .action(async (options) => {
    const server = options.server as string;
    const targetId = await targetManager.resolveTarget({
      target: options.target,
      allowSelection: true,
    });

    if (!targetSupportsMCPServers(targetId)) {
      throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
    }

    console.log('');
    console.log(chalk.cyan.bold('▸ Configure MCP Server'));
    console.log(chalk.gray(`  Target: ${targetId}`));

    const target = targetManager.getTarget(targetId);
    if (!target) {
      throw new CLIError(`Target not found: ${targetId}`, 'TARGET_NOT_FOUND');
    }
    const mcpService = createMCPService({ target });

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
  });

// MCP list subcommand
mcpCommand
  .command('list')
  .description('List installed MCP servers')
  .action(async (options) => {
    const targetId = await targetManager.resolveTarget({
      target: options.target,
      allowSelection: true,
    });

    if (!targetSupportsMCPServers(targetId)) {
      throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
    }

    await listMCPServersForTarget(process.cwd(), targetId);
  });

// MCP add subcommand
mcpCommand
  .command('add')
  .description('Add MCP servers')
  .argument('<servers...>', 'Server names to add (comma-separated or space-separated)')
  .action(async (servers, options) => {
    const targetId = await targetManager.resolveTarget({
      target: options.target,
      allowSelection: true,
    });

    if (!targetSupportsMCPServers(targetId)) {
      throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
    }

    if (!servers || servers.length === 0) {
      throw new CLIError(
        'No servers specified. Provide server names as arguments',
        'NO_SERVERS_SPECIFIED'
      );
    }

    // Flatten and filter server list (can be comma-separated or space-separated)
    const serverList = servers
      .flatMap((s) => s.split(','))
      .map((s) => s.trim())
      .filter(Boolean);

    const target = targetManager.getTarget(targetId);
    if (!target) {
      throw new CLIError(`Target not found: ${targetId}`, 'TARGET_NOT_FOUND');
    }
    const mcpService = createMCPService({ target });
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
  });

// MCP remove subcommand
mcpCommand
  .command('remove')
  .description('Remove MCP servers')
  .argument('<servers...>', 'Server names to remove (comma-separated or space-separated)')
  .action(async (servers, options) => {
    const targetId = await targetManager.resolveTarget({
      target: options.target,
      allowSelection: true,
    });

    if (!targetSupportsMCPServers(targetId)) {
      throw new CLIError(`Target ${targetId} does not support MCP servers`, 'UNSUPPORTED_TARGET');
    }

    if (!servers || servers.length === 0) {
      throw new CLIError(
        'No servers specified. Provide server names as arguments',
        'NO_SERVERS_SPECIFIED'
      );
    }

    // Flatten and filter server list (can be comma-separated or space-separated)
    const serverList = servers
      .flatMap((s) => s.split(','))
      .map((s) => s.trim())
      .filter(Boolean);

    const target = targetManager.getTarget(targetId);
    if (!target) {
      throw new CLIError(`Target not found: ${targetId}`, 'TARGET_NOT_FOUND');
    }
    const mcpService = createMCPService({ target });
    const installedServerIds = mcpService.getInstalledServerIds();

    // Validate server names
    const invalidServers = serverList.filter((s) => !installedServerIds.includes(s as MCPServerID));
    if (invalidServers.length > 0) {
      throw new CLIError(
        `MCP servers not installed: ${invalidServers.join(', ')}. Installed: ${installedServerIds.join(', ')}`,
        'SERVERS_NOT_INSTALLED'
      );
    }

    // TODO: Implement remove functionality in MCPService
    console.log(chalk.yellow('Remove functionality not yet implemented'));
  });
