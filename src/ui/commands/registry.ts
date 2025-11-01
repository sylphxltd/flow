/**
 * Command Registry
 * All available commands with their definitions and implementations
 */

import type { Command, CommandContext } from './types.js';

// Internal cache for options (like models)
const optionsCache = new Map<string, Array<{ id: string; name: string }>>();

/**
 * Provider command - Configure AI provider
 */
const providerCommand: Command = {
  id: 'provider',
  label: '/provider',
  description: 'Switch or configure AI provider',
  args: [
    {
      name: 'provider-name',
      description: 'Provider to switch to (anthropic, openai, google, openrouter)',
      required: false,
    },
    {
      name: 'action',
      description: 'Action: "set" to configure provider settings',
      required: false,
    },
    {
      name: 'key',
      description: 'Setting key (e.g., apiKey, baseUrl)',
      required: false,
    },
    {
      name: 'value',
      description: 'Setting value',
      required: false,
    },
  ],
  execute: async (context) => {
    const { AI_PROVIDERS } = await import('../../config/ai-config.js');
    const aiConfig = context.getConfig();

    // Case 1: /provider - show selection to switch provider
    if (context.args.length === 0) {
      const providerOptions = Object.values(AI_PROVIDERS).map((p) => {
        const isConfigured = aiConfig?.providers?.[p.id as keyof typeof aiConfig.providers]?.apiKey;
        return {
          label: `${p.name} ${isConfigured ? '✓' : ''}`,
          value: p.id,
        };
      });

      context.sendMessage('Which provider do you want to use?');
      const answers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'provider',
            question: 'Select provider:',
            options: providerOptions,
          },
        ],
      });

      const providerId = typeof answers === 'object' && !Array.isArray(answers) ? answers['provider'] : '';
      if (!providerId) {
        return 'Provider selection cancelled.';
      }

      // Check if provider is configured
      const providerConfig = aiConfig?.providers?.[providerId as keyof typeof aiConfig.providers];
      if (!providerConfig?.apiKey) {
        return `${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} is not configured. Use: /provider ${providerId} set apiKey <your-key>`;
      }

      // Switch to this provider
      const newConfig = {
        ...aiConfig!,
        defaultProvider: providerId,
      };

      context.setAIConfig(newConfig);
      await context.saveConfig(newConfig);

      // Create new session with this provider
      const defaultModel = providerConfig.defaultModel || AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].models[0];
      context.createSession(providerId, defaultModel);

      return `Switched to ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
    }

    // Case 2: /provider [name] - switch to specific provider
    if (context.args.length === 1) {
      const providerId = context.args[0];

      // Validate provider
      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      // Check if provider is configured
      const providerConfig = aiConfig?.providers?.[providerId as keyof typeof aiConfig.providers];
      if (!providerConfig?.apiKey) {
        return `${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} is not configured. Use: /provider ${providerId} set apiKey <your-key>`;
      }

      // Switch to this provider
      const newConfig = {
        ...aiConfig!,
        defaultProvider: providerId,
      };

      context.setAIConfig(newConfig);
      await context.saveConfig(newConfig);

      // Create new session with this provider
      const defaultModel = providerConfig.defaultModel || AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].models[0];
      context.createSession(providerId, defaultModel);

      return `Switched to ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
    }

    // Case 3: /provider [name] set - interactive configuration
    if (context.args.length === 2 && context.args[1] === 'set') {
      const providerId = context.args[0];

      // Validate provider
      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      // Build available keys for this provider
      const availableKeys = ['apiKey', 'defaultModel'];
      if (providerId === 'openai') {
        availableKeys.push('baseUrl');
      }

      // Ask user to select key
      context.sendMessage(`Configure ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} - Select setting:`);
      const keyAnswers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'key',
            question: 'Which setting do you want to configure?',
            options: availableKeys.map(k => ({ label: k, value: k })),
          },
        ],
      });

      const key = typeof keyAnswers === 'object' && !Array.isArray(keyAnswers) ? keyAnswers['key'] : '';
      if (!key) {
        return 'Configuration cancelled.';
      }

      // Ask for value
      context.sendMessage(`Enter value for ${key}:`);
      const valueAnswers = await context.waitForInput({
        type: 'text',
        prompt: `${key}:`,
      });

      const value = typeof valueAnswers === 'string' ? valueAnswers : '';
      if (!value) {
        return 'Value is required.';
      }

      // Update config
      const newConfig = {
        ...aiConfig!,
        providers: {
          ...aiConfig!.providers,
          [providerId]: {
            ...aiConfig!.providers?.[providerId as keyof typeof aiConfig.providers],
            [key]: value,
          },
        },
      };

      // If no default provider set yet, make this one the default
      if (!aiConfig?.defaultProvider) {
        newConfig.defaultProvider = providerId;
      }

      context.setAIConfig(newConfig);
      await context.saveConfig(newConfig);

      return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${key === 'apiKey' ? '***' : value}`;
    }

    // Case 4: /provider [name] set [key] [value] - direct configuration
    if (context.args.length >= 4 && context.args[1] === 'set') {
      const providerId = context.args[0];
      const key = context.args[2];
      const value = context.args.slice(3).join(' '); // Support values with spaces

      // Validate provider
      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      // Validate key
      const validKeys = ['apiKey', 'defaultModel', ...(providerId === 'openai' ? ['baseUrl'] : [])];
      if (!validKeys.includes(key)) {
        return `Invalid key: ${key}. Valid keys for ${providerId}: ${validKeys.join(', ')}`;
      }

      // Update config
      const newConfig = {
        ...aiConfig!,
        providers: {
          ...aiConfig!.providers,
          [providerId]: {
            ...aiConfig!.providers?.[providerId as keyof typeof aiConfig.providers],
            [key]: value,
          },
        },
      };

      // If no default provider set yet, make this one the default
      if (!aiConfig?.defaultProvider) {
        newConfig.defaultProvider = providerId;
      }

      context.setAIConfig(newConfig);
      await context.saveConfig(newConfig);

      return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${key === 'apiKey' ? '***' : value}`;
    }

    return 'Usage:\n  /provider - Select provider\n  /provider [name] - Switch to provider\n  /provider [name] set - Configure provider (interactive)\n  /provider [name] set [key] [value] - Configure provider (direct)';
  },
};

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
        const allModels: Array<{ label: string; value: string }> = [];
        const errors: string[] = [];

        for (const [providerId, config] of Object.entries(aiConfig.providers)) {
          if (config.apiKey) {
            try {
              const { fetchModels } = await import('../../utils/ai-model-fetcher.js');
              const models = await fetchModels(providerId as any, config.apiKey);
              allModels.push(...models.map(m => ({ label: m.name, value: m.id })));
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
        const answers = await context.waitForInput({
          type: 'selection',
          questions: [
            {
              id: 'model',
              question: 'Which model do you want to use?',
              options: allModels,
            },
          ],
        });

        // Extract answer from Record
        modelId = typeof answers === 'object' && !Array.isArray(answers) ? answers['model'] : '';
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
 * Survey command - Test multi-selection feature
 */
const surveyCommand: Command = {
  id: 'survey',
  label: '/survey',
  description: 'Test multi-question selection (demo)',
  execute: async (context) => {
    context.sendMessage('Let me ask you a few questions...');

    const answers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'language',
          question: 'What is your favorite programming language?',
          options: [
            { label: 'TypeScript' },
            { label: 'JavaScript' },
            { label: 'Python' },
            { label: 'Rust' },
            { label: 'Go' },
          ],
        },
        {
          id: 'framework',
          question: 'Which framework do you prefer?',
          options: [
            { label: 'React' },
            { label: 'Vue' },
            { label: 'Angular' },
            { label: 'Svelte' },
            { label: 'Solid' },
          ],
        },
        {
          id: 'editor',
          question: 'What is your favorite code editor?',
          options: [
            { label: 'Visual Studio Code' },
            { label: 'Vim/Neovim' },
            { label: 'Emacs' },
            { label: 'Sublime Text' },
            { label: 'Atom' },
          ],
        },
      ],
    });

    if (typeof answers === 'object' && !Array.isArray(answers)) {
      const summary = Object.entries(answers)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return `Survey completed! Your answers: ${summary}`;
    }

    return 'Survey cancelled.';
  },
};

/**
 * All registered commands
 */
export const commands: Command[] = [
  providerCommand,
  modelCommand,
  logsCommand,
  clearCommand,
  helpCommand,
  surveyCommand,
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
