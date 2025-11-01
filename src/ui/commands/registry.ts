/**
 * Command Registry
 * All available commands with their definitions and implementations
 */

import type { Command, CommandContext } from './types.js';

// Internal cache for options (like models)
const optionsCache = new Map<string, Array<{ id: string; name: string }>>();

/**
 * Model command - Switch AI model
 */
const modelCommand: Command = {
  id: 'model',
  label: '/model',
  description: 'Switch AI model',
  args: [
    {
      name: 'model-name',
      description: 'Model to switch to',
      required: true,
      loadOptions: async () => {
        // This will be replaced by Chat.tsx with actual implementation
        // that has access to aiConfig
        throw new Error('loadOptions not implemented');
      },
    },
  ],
  execute: async (context) => {
    let modelId: string;

    // If no args provided, ask user to select
    if (context.args.length === 0) {
      try {
        // Load models using the arg's loadOptions
        const aiConfig = context.getConfig();
        if (!aiConfig?.providers) {
          return 'No providers configured. Please configure a provider first.';
        }

        // Fetch models from all configured providers
        const allModels: Array<{ id: string; name: string }> = [];
        const errors: string[] = [];

        for (const [providerId, config] of Object.entries(aiConfig.providers)) {
          if (config.apiKey) {
            try {
              const { fetchModels } = await import('../../utils/ai-model-fetcher.js');
              const models = await fetchModels(providerId as any, config.apiKey);
              allModels.push(...models.map(m => ({ id: m.id, name: m.name })));
              context.addLog(`Loaded ${models.length} models from ${providerId}`);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              errors.push(`${providerId}: ${errorMsg}`);
              context.addLog(`Failed to fetch models for ${providerId}: ${errorMsg}`);
            }
          }
        }

        if (allModels.length === 0) {
          const errorMsg = errors.length > 0 ? errors.join('; ') : 'No models available';
          return `Failed to load models: ${errorMsg}`;
        }

        // Ask user to select
        context.sendMessage('Which model do you want to use?');
        modelId = await context.waitForInput({
          type: 'selection',
          options: allModels,
        });
      } catch (error) {
        return `Failed to load models: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      modelId = context.args[0];
    }

    const currentSession = context.getCurrentSession();
    const aiConfig = context.getConfig();
    const provider = currentSession?.provider || aiConfig?.defaultProvider;

    if (!provider) {
      return 'No provider configured. Please configure a provider first.';
    }

    // Update model
    context.updateProvider(provider, { defaultModel: modelId });
    const newConfig = {
      ...aiConfig!,
      defaultModel: modelId,
      providers: {
        ...aiConfig!.providers,
        [provider]: {
          ...aiConfig!.providers?.[provider],
          defaultModel: modelId,
        },
      },
    };
    context.setAIConfig(newConfig);

    // Save config to file
    await context.saveConfig(newConfig);

    // Update current session's model (preserve history)
    const currentSessionId = context.getCurrentSessionId();
    if (currentSessionId) {
      context.updateSessionModel(currentSessionId, modelId);
    } else {
      // Fallback: create new session if no active session
      context.createSession(provider, modelId);
    }

    return `Switched to model: ${modelId}`;
  },
};

/**
 * Logs command - View debug logs
 */
const logsCommand: Command = {
  id: 'logs',
  label: '/logs',
  description: 'View debug logs',
  execute: async (context) => {
    context.navigateTo('logs');
    return 'Opening debug logs...';
  },
};

/**
 * Clear command - Clear chat history
 */
const clearCommand: Command = {
  id: 'clear',
  label: '/clear',
  description: 'Clear chat history',
  execute: async (context) => {
    const currentSessionId = context.getCurrentSessionId();
    if (currentSessionId) {
      const sessions = context.getSessions();
      const session = sessions.find((s) => s.id === currentSessionId);
      if (session) {
        session.messages = [];
      }
    }
    return 'Chat history cleared';
  },
};

/**
 * Help command - Show available commands
 */
const helpCommand: Command = {
  id: 'help',
  label: '/help',
  description: 'Show available commands',
  execute: async (context) => {
    const commandList = commands
      .map((cmd) => {
        const argsText = cmd.args
          ? ` ${cmd.args.map((a) => `[${a.name}]`).join(' ')}`
          : '';
        return `${cmd.label}${argsText} - ${cmd.description}`;
      })
      .join('\n');
    return `Available commands:\n${commandList}`;
  },
};

/**
 * All registered commands
 */
export const commands: Command[] = [
  modelCommand,
  logsCommand,
  clearCommand,
  helpCommand,
];

/**
 * Get command by ID
 */
export function getCommand(id: string): Command | undefined {
  return commands.find(cmd => cmd.id === id);
}

/**
 * Get command by label (e.g., '/model')
 */
export function getCommandByLabel(label: string): Command | undefined {
  return commands.find(cmd => cmd.label === label);
}
