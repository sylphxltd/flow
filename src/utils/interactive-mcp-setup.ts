import chalk from 'chalk';
import inquirer from 'inquirer';
import type { MCPServerID } from '../config/servers.js';
import { MCP_SERVER_REGISTRY } from '../config/servers.js';

interface MCPConfigResult {
  selectedServers: MCPServerID[];
  configs: Record<MCPServerID, Record<string, string>>;
}

export async function interactiveMCPSetup(
  availableServers: MCPServerID[]
): Promise<MCPConfigResult> {
  const requiredServers = availableServers.filter((id) => MCP_SERVER_REGISTRY[id].required);
  const optionalServers = availableServers.filter((id) => !MCP_SERVER_REGISTRY[id].required);

  console.log(chalk.cyan.bold('📦 Select MCP Tools'));
  console.log('');

  // Show required servers
  if (requiredServers.length > 0) {
    console.log(chalk.gray('Required tools (will be installed automatically):'));
    requiredServers.forEach((id) => {
      const server = MCP_SERVER_REGISTRY[id];
      console.log(chalk.gray(`  ✓ ${server.name} - ${server.description}`));
    });
    console.log('');
  }

  // Select optional servers
  let selectedOptional: MCPServerID[] = [];
  if (optionalServers.length > 0) {
    const { selected } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Select optional tools to install:',
        choices: optionalServers.map((id) => {
          const server = MCP_SERVER_REGISTRY[id];
          return {
            name: `${server.name} - ${server.description}`,
            value: id,
            checked: server.defaultInInit === true,
          };
        }),
      },
    ]);
    selectedOptional = selected;
  }

  const selectedServers = [...requiredServers, ...selectedOptional] as MCPServerID[];

  if (selectedServers.length === 0) {
    console.log(chalk.yellow('No tools selected'));
    return { selectedServers: [], configs: {} };
  }

  console.log('');
  console.log(chalk.cyan.bold('⚙️  Configure Selected Tools'));
  console.log('');

  // Configure each selected server
  const configs: Record<MCPServerID, Record<string, string>> = {};

  for (const serverId of selectedServers) {
    const server = MCP_SERVER_REGISTRY[serverId];
    const serverConfig: Record<string, string> = {};

    // Skip if no environment variables needed
    if (!server.envVars || Object.keys(server.envVars).length === 0) {
      console.log(chalk.gray(`  ✓ ${server.name} (no configuration needed)`));
      configs[serverId] = serverConfig;
      continue;
    }

    console.log(chalk.cyan(`\n▸ ${server.name}`));
    console.log(chalk.gray(server.description));
    console.log('');

    // Collect environment variables one by one
    for (const [key, config] of Object.entries(server.envVars)) {
      let answer;

      // Handle dropdown options
      if (key === 'EMBEDDING_MODEL') {
        answer = await inquirer.prompt([
          {
            type: 'list',
            name: key,
            message: `${key}${config.required ? ' (required)' : ''}:`,
            choices: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
            default: config.default || 'text-embedding-3-small',
          },
        ]);
      } else if (key === 'GEMINI_MODEL') {
        answer = await inquirer.prompt([
          {
            type: 'list',
            name: key,
            message: `${key}${config.required ? ' (required)' : ''}:`,
            choices: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
            default: config.default || 'gemini-2.5-flash',
          },
        ]);
      } else {
        // Regular input
        answer = await inquirer.prompt([
          {
            type: config.secret ? 'password' : 'input',
            name: key,
            message: `${key}${config.required ? ' (required)' : ''}:`,
            default: config.default,
            validate: (value: string) => {
              if (config.required && (!value || value.trim() === '')) {
                return `${key} is required`;
              }
              return true;
            },
          },
        ]);
      }

      Object.assign(serverConfig, answer);
    }

    configs[serverId] = serverConfig;
    console.log(chalk.green(`  ✓ Configured ${server.name}`));
  }

  console.log('');
  return { selectedServers, configs };
}
