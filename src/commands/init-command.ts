import {
  getDefaultServers,
  getServersRequiringAPIKeys,
  getServersWithOptionalAPIKeys,
} from '../config/servers.js';
import { installAgents, installRules } from '../core/init.js';
import { targetManager } from '../core/target-manager.js';
import type { CommandConfig, CommandOptions } from '../types.js';
import { OpenAIEmbeddingProvider } from '../utils/embeddings.js';
import { CLIError } from '../utils/error-handler.js';
import { secretUtils } from '../utils/secret-utils.js';
import {
  addMCPServersToTarget,
  configureMCPServerForTarget,
  getTargetHelpText,
  targetSupportsMCPServers,
  validateTarget,
} from '../utils/target-config.js';

async function validateInitOptions(options: CommandOptions): Promise<void> {
  // Resolve target (use specified, detect, or default)
  const targetId = await targetManager.resolveTarget({ target: options.target });
  options.target = targetId;

  // Validate target is implemented
  try {
    validateTarget(targetId);
  } catch (error) {
    if (error instanceof Error) {
      throw new CLIError(error.message, 'UNSUPPORTED_TARGET');
    }
    throw error;
  }

  // Remove unsupported options for init
  if (options.merge) {
    throw new CLIError('The --merge option is not supported with init command.', 'INVALID_OPTION');
  }
}

export const initCommand: CommandConfig = {
  name: 'init',
  description: 'Initialize project with Sylphx Flow development agents and MCP tools',
  options: [
    {
      flags: '--target <type>',
      description: `Force specific target (${targetManager.getImplementedTargetIDs().join(', ')}, default: opencode)`,
    },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without making changes' },
    { flags: '--clear', description: 'Clear obsolete items before processing' },
    { flags: '--no-mcp', description: 'Skip MCP tools installation' },
  ],
  handler: async (options: CommandOptions) => {
    await validateInitOptions(options);
    const targetId = options.target!;

    console.log('🚀 Sylphx Flow Setup');
    console.log('======================');
    console.log(`🎯 Target: ${targetId}`);
    console.log('');

    // Install MCP tools by default (unless --no-mcp is specified)
    if (options.mcp !== false && targetSupportsMCPServers(targetId)) {
      console.log('📦 Installing MCP tools...');
      const defaultServers = getDefaultServers();

      if (options.dryRun) {
        console.log('🔍 Dry run: Would install all MCP servers');
        console.log(`   • ${defaultServers.join(', ')}`);
      } else {
        // First, identify servers that need API keys and configure them
        const serversNeedingKeys = getServersRequiringAPIKeys();
        const serversWithOptionalKeys = getServersWithOptionalAPIKeys();
        const serversWithKeys: string[] = [];
        const serversWithoutKeys: string[] = [];

        // Combine servers that require keys with those that have optional keys
        const allServersNeedingConfiguration = [...serversNeedingKeys, ...serversWithOptionalKeys];

        if (allServersNeedingConfiguration.length > 0) {
          console.log('\n🔑 Some MCP tools require API keys:');

          // Configure API keys first, before installing (handles all 4 cases)
          for (const serverType of allServersNeedingConfiguration) {
            const shouldKeepOrInstall = await configureMCPServerForTarget(
              process.cwd(),
              targetId,
              serverType
            );
            if (shouldKeepOrInstall) {
              serversWithKeys.push(serverType);
            } else {
              serversWithoutKeys.push(serverType);
            }
          }
        }

        // Get servers that don't need API keys
        const serversNotNeedingKeys = defaultServers.filter(
          (server) => !serversNeedingKeys.includes(server)
        );

        // Combine servers that don't need keys with servers that have keys
        const serversToInstall = [...serversNotNeedingKeys, ...serversWithKeys];

        if (serversToInstall.length > 0) {
          await addMCPServersToTarget(process.cwd(), targetId, serversToInstall as any);
          console.log(`✅ MCP tools installed: ${serversToInstall.join(', ')}`);
        }

        if (serversWithoutKeys.length > 0) {
          console.log(
            `⚠️  Removed or skipped MCP tools (no API keys provided): ${serversWithoutKeys.join(', ')}`
          );
          console.log('   You can install them later with: sylphx-flow mcp install <server-name>');
        }
      }
      console.log('');
    } else if (options.mcp !== false && !targetSupportsMCPServers(targetId)) {
      console.log('⚠️  MCP tools are not supported for this target');
      console.log('');
    }

    // Ensure .secrets directory is set up for OpenCode target
    if (targetId === 'opencode') {
      await secretUtils.ensureSecretsDir(process.cwd());
      await secretUtils.addToGitignore(process.cwd());

      // Check if embedding is already configured
      const secrets = await secretUtils.loadSecrets(process.cwd()).catch(() => ({}));
      const hasEmbeddingConfig = (secrets as any).OPENAI_API_KEY || process.env.OPENAI_API_KEY;

      if (!hasEmbeddingConfig && !options.dryRun) {
        console.log('\n🔍 Embedding Configuration');
        console.log('==========================');
        console.log('Sylphx Flow uses embeddings for vector search in knowledge and codebase.');
        console.log('Would you like to configure embedding settings now?');

        const { createInterface } = await import('node:readline');
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question('Configure embeddings? (Y/n): ', (input) => {
            resolve(input.trim().toLowerCase() || 'y');
          });
        });

        if (answer === 'y' || answer === 'yes') {
          console.log('\n🔧 Configuring embedding settings...');

          // Get API key
          const apiKey = await new Promise<string>((resolve) => {
            rl.question('Enter OpenAI API key (required): ', (input) => {
              resolve(input.trim());
            });
          });

          if (apiKey) {
            // Get base URL
            const baseURL = await new Promise<string>((resolve) => {
              rl.question('Enter base URL (default: https://api.openai.com/v1): ', (input) => {
                resolve(input.trim() || 'https://api.openai.com/v1');
              });
            });

            // Test connection and list models
            console.log('\n🔍 Testing connection and listing available models...');
            const provider = new OpenAIEmbeddingProvider({ apiKey, baseURL });

            const isConnected = await provider.testConnection();
            if (isConnected) {
              console.log('✅ Connection successful!');

              try {
                const modelOptions = await provider.getEmbeddingModelOptions();

                if (modelOptions.length > 0) {
                  console.log('\n📋 Available embedding models:');
                  modelOptions.forEach((model, index) => {
                    console.log(`  ${index + 1}. ${model.id} - ${model.description}`);
                  });

                  // Get model selection
                  const modelIndex = await new Promise<string>((resolve) => {
                    rl.question(
                      `\nSelect model (1-${modelOptions.length}, default: 1): `,
                      (input) => {
                        resolve(input.trim() || '1');
                      }
                    );
                  });

                  const selectedIndex = Number.parseInt(modelIndex, 10) - 1;
                  if (selectedIndex >= 0 && selectedIndex < modelOptions.length) {
                    const selectedModel = modelOptions[selectedIndex].id;

                    // Save configuration
                    const embeddingSecrets = {
                      OPENAI_API_KEY: apiKey,
                      OPENAI_BASE_URL: baseURL,
                      EMBEDDING_MODEL: selectedModel,
                    };

                    await secretUtils.saveSecrets(process.cwd(), embeddingSecrets);

                    console.log(`✅ Embedding configuration saved:`);
                    console.log(`   • API Key: ${apiKey.substring(0, 10)}...`);
                    console.log(`   • Base URL: ${baseURL}`);
                    console.log(`   • Model: ${selectedModel}`);
                  }
                }
              } catch (error) {
                console.log('⚠️  Could not list models, but API key is saved');

                // Save basic configuration
                const embeddingSecrets = {
                  OPENAI_API_KEY: apiKey,
                  OPENAI_BASE_URL: baseURL,
                };

                await secretUtils.saveSecrets(process.cwd(), embeddingSecrets);
                console.log(`✅ Basic embedding configuration saved:`);
                console.log(`   • API Key: ${apiKey.substring(0, 10)}...`);
                console.log(`   • Base URL: ${baseURL}`);
              }
            } else {
              console.log('❌ Connection failed. You can configure embeddings later manually.');
            }
          } else {
            console.log('⚠️  No API key provided. You can configure embeddings later manually.');
          }
        } else {
          console.log('ℹ️  Skipping embedding configuration.');
        }

        rl.close();
      }
    }

    // Install agents
    await installAgents(options);

    // Install rules file
    await installRules(options);

    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('📋 Next steps:');

    // Target-specific next steps
    const target = targetManager.getTarget(targetId);
    if (targetId === 'opencode') {
      console.log('   • Open OpenCode and start using your agents!');
      if (options.mcp !== false) {
        console.log('   • MCP tools will be automatically loaded by OpenCode');
      }
    } else {
      console.log(`   • Start using your agents with ${target?.name || targetId}!`);
      console.log(`   • Run 'sylphx-flow init --help' for target-specific information`);
    }
  },
};
