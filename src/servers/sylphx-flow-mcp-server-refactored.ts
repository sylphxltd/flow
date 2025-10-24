/**
 * Refactored Sylphx Flow MCP Server
 *
 * Uses the new plugin architecture and dependency injection system
 * for better modularity and maintainability
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initializePlugins, getPluginBootstrap, type PluginBootstrap } from '../plugins/plugin-bootstrap.js';
import type { ILogger } from '../core/interfaces.js';
import { container } from '../core/di-container.js';

// Server configuration
interface ServerConfig {
  name?: string;
  version?: string;
  description?: string;
  disablePlugins?: string[];
  enablePlugins?: string[];
  pluginDir?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

const DEFAULT_CONFIG: ServerConfig = {
  name: 'sylphx-flow',
  version: '1.0.0',
  description: 'Sylphx Flow MCP server with plugin architecture for AI agents coordination',
};

// Parse command line arguments
function parseArgs(): ServerConfig {
  const args = process.argv.slice(2);
  const config: ServerConfig = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--name':
        config.name = args[++i];
        break;
      case '--version':
        config.version = args[++i];
        break;
      case '--plugin-dir':
        config.pluginDir = args[++i];
        break;
      case '--disable-plugin':
        if (!config.disablePlugins) config.disablePlugins = [];
        config.disablePlugins.push(args[++i]);
        break;
      case '--enable-plugin':
        if (!config.enablePlugins) config.enablePlugins = [];
        config.enablePlugins.push(args[++i]);
        break;
      case '--log-level':
        config.logLevel = args[++i] as any;
        break;
      case '--help':
      case '-h':
        console.log(`
Sylphx Flow MCP Server (Refactored)

Usage: sylphx-flow-mcp-server [options]

Options:
  --name <name>           Server name
  --version <version>     Server version
  --plugin-dir <path>     Plugin directory path
  --disable-plugin <name> Disable specific plugin
  --enable-plugin <name>  Enable specific plugin
  --log-level <level>     Log level (debug, info, warn, error)
  --help, -h              Show this help

Examples:
  sylphx-flow-mcp-server
  sylphx-flow-mcp-server --log-level debug
  sylphx-flow-mcp-server --disable-plugin memory-mcp-plugin
  sylphx-flow-mcp-server --plugin-dir ./custom-plugins
        `);
        process.exit(0);
        break;
    }
  }

  return config;
}

/**
 * Main server function with plugin architecture
 */
export async function startSylphxFlowMCPServer(config: ServerConfig = {}): Promise<McpServer> {
  // Merge with default config
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Initialize plugin system
  console.log('🚀 Starting Sylphx Flow MCP Server (Refactored)...');
  console.log(`📋 Server: ${finalConfig.name} v${finalConfig.version}`);

  let pluginBootstrap: PluginBootstrap;

  try {
    // Initialize plugins with configuration
    pluginBootstrap = await initializePlugins({
      pluginDir: finalConfig.pluginDir,
      disabledPlugins: finalConfig.disablePlugins,
      plugins: finalConfig.enablePlugins,
      autoStart: true,
      enableHotReload: false, // Disable for production
      logLevel: finalConfig.logLevel,
    });

    // Get logger from DI container
    const logger = await container.resolve<ILogger>('logger');
    logger.info('Plugin system initialized successfully');

    // Get plugin statistics
    const status = await pluginBootstrap.getStatus();
    logger.info('System status:', status);

  } catch (error) {
    console.error('✗ Failed to initialize plugin system:', error);
    throw error;
  }

  // Create MCP server
  const server = new McpServer({
    name: finalConfig.name!,
    version: finalConfig.version!,
    description: finalConfig.description,
  });

  try {
    // Register tools from all MCP plugins
    const pluginManager = pluginBootstrap.getPluginManager()!;
    const mcpPlugins = pluginManager.getPluginsByCategory('mcp');
    const logger = await container.resolve<ILogger>('logger');

    console.log(`🔧 Found ${mcpPlugins.length} MCP plugins`);

    let totalTools = 0;
    for (const plugin of mcpPlugins) {
      if (plugin.metadata.enabled) {
        try {
          // Register plugin tools with server
          const mcpPlugin = plugin as any; // Cast to any for tool registration
          if (typeof mcpPlugin.registerTools === 'function') {
            await mcpPlugin.registerTools(server);

            const toolNames = mcpPlugin.getToolNames ? mcpPlugin.getToolNames() : [];
            totalTools += toolNames.length;

            logger.info(`✓ Registered ${toolNames.length} tools from plugin: ${plugin.metadata.name}`);
            console.log(`  ✓ ${plugin.metadata.name}: ${toolNames.length} tools`);
          }
        } catch (error) {
          logger.error(`Failed to register tools from plugin: ${plugin.metadata.name}`, error);
          console.error(`  ✗ ${plugin.metadata.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    console.log(`🔧 Total registered tools: ${totalTools}`);

    // Register system tools
    await registerSystemTools(server, logger);

    // Connect to transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.success('✓ MCP Server connected and ready');
    console.log('✓ MCP Server connected and ready');
    console.log('💡 Press Ctrl+C to stop the server');

    return server;

  } catch (error) {
    const logger = await container.resolve<ILogger>('logger');
    logger.error('Failed to start MCP server', error);

    // Cleanup on error
    await cleanup();
    throw error;
  }
}

/**
 * Register system tools that are always available
 */
async function registerSystemTools(server: McpServer, logger: ILogger): Promise<void> {
  // Plugin management tools
  server.tool(
    'plugin_list',
    'List all loaded plugins',
    {},
    async () => {
      try {
        const bootstrap = getPluginBootstrap();
        if (!bootstrap) {
          throw new Error('Plugin system not available');
        }

        const status = await bootstrap.getStatus();
        const pluginManager = bootstrap.getPluginManager()!;
        const plugins = pluginManager.getAllPlugins();

        const pluginList = plugins
          .sort((a, b) => a.metadata.priority - b.metadata.priority)
          .map(plugin => {
            const status = plugin.metadata.enabled ? '✓' : '✗';
            return `${status} **${plugin.metadata.name}** v${plugin.metadata.version} (${plugin.metadata.category})`;
          })
          .join('\n');

        const summary = [
          `📊 **Plugin Status**`,
          `Total: ${status.plugins.total} | Enabled: ${status.plugins.enabled} | Disabled: ${status.plugins.disabled}`,
          '',
          '**Plugins:**',
          pluginList,
        ].join('\n');

        return {
          content: [{ type: 'text', text: summary }],
        };
      } catch (error) {
        logger.error('Failed to list plugins', error);
        return {
          content: [
            {
              type: 'text',
              text: `✗ Failed to list plugins: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'plugin_enable',
    'Enable a plugin',
    { plugin_name: { type: 'string', description: 'Name of the plugin to enable' } },
    async ({ plugin_name }) => {
      try {
        const bootstrap = getPluginBootstrap();
        if (!bootstrap) {
          throw new Error('Plugin system not available');
        }

        const pluginManager = bootstrap.getPluginManager()!;
        await pluginManager.enablePlugin(plugin_name);

        logger.info(`Plugin enabled: ${plugin_name}`);

        return {
          content: [
            {
              type: 'text',
              text: `✓ Plugin enabled: ${plugin_name}`,
            },
          ],
        };
      } catch (error) {
        logger.error(`Failed to enable plugin: ${plugin_name}`, error);
        return {
          content: [
            {
              type: 'text',
              text: `✗ Failed to enable plugin: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'plugin_disable',
    'Disable a plugin',
    { plugin_name: { type: 'string', description: 'Name of the plugin to disable' } },
    async ({ plugin_name }) => {
      try {
        const bootstrap = getPluginBootstrap();
        if (!bootstrap) {
          throw new Error('Plugin system not available');
        }

        const pluginManager = bootstrap.getPluginManager()!;
        await pluginManager.disablePlugin(plugin_name);

        logger.info(`Plugin disabled: ${plugin_name}`);

        return {
          content: [
            {
              type: 'text',
              text: `✓ Plugin disabled: ${plugin_name}`,
            },
          ],
        };
      } catch (error) {
        logger.error(`Failed to disable plugin: ${plugin_name}`, error);
        return {
          content: [
            {
              type: 'text',
              text: `✗ Failed to disable plugin: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // System status tool
  server.tool(
    'system_status',
    'Get system status and health',
    {},
    async () => {
      try {
        const bootstrap = getPluginBootstrap();
        if (!bootstrap) {
          throw new Error('Plugin system not available');
        }

        const status = await bootstrap.getStatus();
        const health = await bootstrap.getPluginManager()!.healthCheck();

        const healthSummary = Object.entries(health)
          .map(([name, result]) => {
            const status = result.healthy ? '✓' : '✗';
            const error = result.error ? ` (${result.error})` : '';
            return `${status} ${name}${error}`;
          })
          .join('\n');

        const statusText = [
          '🏥 **System Health**',
          `Running: ${status.running ? '✓' : '✗'}`,
          `Services: ${status.services}`,
          '',
          '**Plugin Health:**',
          healthSummary,
        ].join('\n');

        return {
          content: [{ type: 'text', text: statusText }],
        };
      } catch (error) {
        logger.error('Failed to get system status', error);
        return {
          content: [
            {
              type: 'text',
              text: `✗ Failed to get system status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  logger.info('System tools registered');
}

/**
 * Cleanup resources
 */
async function cleanup(): Promise<void> {
  try {
    const bootstrap = getPluginBootstrap();
    if (bootstrap) {
      await bootstrap.stop();
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down MCP server...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down MCP server...');
  await cleanup();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', async (error) => {
  console.error('✗ Uncaught error:', error);
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('✗ Unhandled rejection:', reason);
  await cleanup();
  process.exit(1);
});

// Main execution
if (require.main === module) {
  const config = parseArgs();
  startSylphxFlowMCPServer(config).catch((error) => {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  });
}