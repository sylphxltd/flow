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
  description: 'Manage AI providers',
  args: [
    {
      name: 'action',
      description: 'Action: "use" or "set"',
      required: false,
      loadOptions: async (previousArgs) => {
        return [
          { id: 'use', label: 'use', value: 'use' },
          { id: 'set', label: 'set', value: 'set' },
        ];
      },
    },
    {
      name: 'provider-name',
      description: 'Provider name (anthropic, openai, google, openrouter)',
      required: false,
      loadOptions: async (previousArgs) => {
        const { AI_PROVIDERS } = await import('../../config/ai-config.js');
        return Object.values(AI_PROVIDERS).map((p) => ({
          id: p.id,
          label: p.name,
          value: p.id,
        }));
      },
    },
    {
      name: 'key',
      description: 'Setting key (for set action)',
      required: false,
      loadOptions: async (previousArgs) => {
        // previousArgs: [action, provider-name]
        // Only show keys available for the selected provider
        const providerId = previousArgs[1]; // e.g., "anthropic", "openai", "openrouter"

        // Common keys for all providers
        const commonKeys = [
          { id: 'apiKey', label: 'apiKey', value: 'apiKey' },
          { id: 'defaultModel', label: 'defaultModel', value: 'defaultModel' },
        ];

        // OpenAI has additional baseUrl option
        if (providerId === 'openai') {
          return [
            ...commonKeys,
            { id: 'baseUrl', label: 'baseUrl', value: 'baseUrl' },
          ];
        }

        // Other providers only have common keys
        return commonKeys;
      },
    },
    {
      name: 'value',
      description: 'Setting value (for set action)',
      required: false,
    },
  ],
  execute: async (context) => {
    const { AI_PROVIDERS } = await import('../../config/ai-config.js');
    const aiConfig = context.getConfig();

    // Case 1: /provider - ask use or set
    if (context.args.length === 0) {
      context.sendMessage('What do you want to do?');
      const actionAnswers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'action',
            question: 'Select action:',
            options: [
              { label: 'Use a provider', value: 'use' },
              { label: 'Configure a provider', value: 'set' },
            ],
          },
        ],
      });

      const action = typeof actionAnswers === 'object' && !Array.isArray(actionAnswers) ? actionAnswers['action'] : '';
      if (!action) {
        return 'Action cancelled.';
      }

      // Ask which provider
      const providerOptions = Object.values(AI_PROVIDERS).map((p) => {
        const isConfigured = aiConfig?.providers?.[p.id as keyof typeof aiConfig.providers]?.apiKey;
        return {
          label: `${p.name} ${isConfigured ? '✓' : ''}`,
          value: p.id,
        };
      });

      context.sendMessage(action === 'use' ? 'Which provider do you want to use?' : 'Which provider do you want to configure?');
      const providerAnswers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'provider',
            question: action === 'use' ? 'Select provider to use:' : 'Select provider to configure:',
            options: providerOptions,
          },
        ],
      });

      const providerId = typeof providerAnswers === 'object' && !Array.isArray(providerAnswers) ? providerAnswers['provider'] : '';
      if (!providerId) {
        return 'Provider selection cancelled.';
      }

      if (action === 'use') {
        // Use provider
        const providerConfig = aiConfig?.providers?.[providerId as keyof typeof aiConfig.providers];
        if (!providerConfig?.apiKey) {
          return `${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} is not configured. Use: /provider set ${providerId} apiKey <your-key>`;
        }

        const newConfig = {
          ...aiConfig!,
          defaultProvider: providerId,
        };

        context.setAIConfig(newConfig);
        await context.saveConfig(newConfig);

        // Update current session's provider (preserve history)
        let defaultModel = providerConfig.defaultModel;
        if (!defaultModel) {
          // Fetch first model from provider
          const { fetchModels } = await import('../../utils/ai-model-fetcher.js');
          const models = await fetchModels(providerId as any, providerConfig);
          defaultModel = models[0]?.id || 'default';
        }
        const currentSessionId = context.getCurrentSessionId();
        if (currentSessionId) {
          context.updateSessionProvider(currentSessionId, providerId, defaultModel);
        } else {
          // Fallback: create new session if no active session
          context.createSession(providerId, defaultModel);
        }

        return `Switched to ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
      } else {
        // Set provider - ask for key
        const availableKeys = ['apiKey', 'defaultModel'];
        if (providerId === 'openai') {
          availableKeys.push('baseUrl');
        }

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

        if (!aiConfig?.defaultProvider) {
          newConfig.defaultProvider = providerId;
        }

        context.setAIConfig(newConfig);
        await context.saveConfig(newConfig);

        return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${key === 'apiKey' ? '***' : value}`;
      }
    }

    // Case 2: /provider use - ask which provider to use
    if (context.args.length === 1 && context.args[0] === 'use') {
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

      const providerConfig = aiConfig?.providers?.[providerId as keyof typeof aiConfig.providers];
      if (!providerConfig?.apiKey) {
        return `${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} is not configured. Use: /provider set ${providerId} apiKey <your-key>`;
      }

      const newConfig = {
        ...aiConfig!,
        defaultProvider: providerId,
      };

      context.setAIConfig(newConfig);
      await context.saveConfig(newConfig);

      // Update current session's provider (preserve history)
      let defaultModel = providerConfig.defaultModel;
      if (!defaultModel) {
        // Fetch first model from provider
        const { fetchModels } = await import('../../utils/ai-model-fetcher.js');
        const models = await fetchModels(providerId as any, providerConfig);
        defaultModel = models[0]?.id || 'default';
      }
      const currentSessionId = context.getCurrentSessionId();
      if (currentSessionId) {
        context.updateSessionProvider(currentSessionId, providerId, defaultModel);
      } else {
        // Fallback: create new session if no active session
        context.createSession(providerId, defaultModel);
      }

      return `Switched to ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
    }

    // Case 3: /provider use [name] - switch to specific provider
    if (context.args.length === 2 && context.args[0] === 'use') {
      const providerId = context.args[1];

      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      const providerConfig = aiConfig?.providers?.[providerId as keyof typeof aiConfig.providers];
      if (!providerConfig?.apiKey) {
        return `${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} is not configured. Use: /provider set ${providerId} apiKey <your-key>`;
      }

      const newConfig = {
        ...aiConfig!,
        defaultProvider: providerId,
      };

      context.setAIConfig(newConfig);
      await context.saveConfig(newConfig);

      // Update current session's provider (preserve history)
      let defaultModel = providerConfig.defaultModel;
      if (!defaultModel) {
        // Fetch first model from provider
        const { fetchModels } = await import('../../utils/ai-model-fetcher.js');
        const models = await fetchModels(providerId as any, providerConfig);
        defaultModel = models[0]?.id || 'default';
      }
      const currentSessionId = context.getCurrentSessionId();
      if (currentSessionId) {
        context.updateSessionProvider(currentSessionId, providerId, defaultModel);
      } else {
        // Fallback: create new session if no active session
        context.createSession(providerId, defaultModel);
      }

      return `Switched to ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name}`;
    }

    // Case 4: /provider set - ask which provider to configure
    if (context.args.length === 1 && context.args[0] === 'set') {
      const providerOptions = Object.values(AI_PROVIDERS).map((p) => ({
        label: p.name,
        value: p.id,
      }));

      context.sendMessage('Which provider do you want to configure?');
      const providerAnswers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'provider',
            question: 'Select provider:',
            options: providerOptions,
          },
        ],
      });

      const providerId = typeof providerAnswers === 'object' && !Array.isArray(providerAnswers) ? providerAnswers['provider'] : '';
      if (!providerId) {
        return 'Provider selection cancelled.';
      }

      // Ask for key
      const availableKeys = ['apiKey', 'defaultModel'];
      if (providerId === 'openai') {
        availableKeys.push('baseUrl');
      }

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
        placeholder: `Enter ${key}...`,
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

      if (!aiConfig?.defaultProvider) {
        newConfig.defaultProvider = providerId;
      }

      context.setAIConfig(newConfig);
      await context.saveConfig(newConfig);

      return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${key === 'apiKey' ? '***' : value}`;
    }

    // Case 5: /provider set [name] - ask which key to set
    if (context.args.length === 2 && context.args[0] === 'set') {
      const providerId = context.args[1];

      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      // Ask for key
      const availableKeys = ['apiKey', 'defaultModel'];
      if (providerId === 'openai') {
        availableKeys.push('baseUrl');
      }

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
        placeholder: `Enter ${key}...`,
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

      if (!aiConfig?.defaultProvider) {
        newConfig.defaultProvider = providerId;
      }

      context.setAIConfig(newConfig);
      await context.saveConfig(newConfig);

      return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${key === 'apiKey' ? '***' : value}`;
    }

    // Case 6: /provider set [name] [key] [value] - direct configuration
    if (context.args.length >= 4 && context.args[0] === 'set') {
      const providerId = context.args[1];
      const key = context.args[2];
      const value = context.args.slice(3).join(' ');

      if (!(providerId in AI_PROVIDERS)) {
        return `Invalid provider: ${providerId}. Available: ${Object.keys(AI_PROVIDERS).join(', ')}`;
      }

      const validKeys = ['apiKey', 'defaultModel', ...(providerId === 'openai' ? ['baseUrl'] : [])];
      if (!validKeys.includes(key)) {
        return `Invalid key: ${key}. Valid keys for ${providerId}: ${validKeys.join(', ')}`;
      }

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

      if (!aiConfig?.defaultProvider) {
        newConfig.defaultProvider = providerId;
      }

      context.setAIConfig(newConfig);
      await context.saveConfig(newConfig);

      return `Set ${AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS].name} ${key} to: ${key === 'apiKey' ? '***' : value}`;
    }

    return 'Usage:\n  /provider - Select action and provider\n  /provider use - Select provider to use\n  /provider use [name] - Switch to provider\n  /provider set - Configure a provider\n  /provider set [name] - Configure specific provider\n  /provider set [name] [key] [value] - Set provider config directly';
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
      required: false,
      loadOptions: async (previousArgs, context) => {
        try {
          // Get AI config from context
          const aiConfig = context?.getConfig();
          if (!aiConfig?.providers) {
            return [];
          }

          // Fetch models from all configured providers
          const allModels: Array<{ id: string; label: string; value: string }> = [];

          for (const [providerId, config] of Object.entries(aiConfig.providers)) {
            try {
              const { fetchModels } = await import('../../utils/ai-model-fetcher.js');
              const models = await fetchModels(providerId as any, config);
              allModels.push(...models.map(m => ({
                id: m.id,
                label: `${m.name} (${providerId})`,
                value: m.id,
              })));
            } catch (error) {
              // Silently skip providers that fail
              if (context) {
                context.addLog(`Failed to fetch models for ${providerId}: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          }

          return allModels;
        } catch (error) {
          if (context) {
            context.addLog(`Error loading models: ${error instanceof Error ? error.message : String(error)}`);
          }
          return [];
        }
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
          try {
            const { fetchModels } = await import('../../utils/ai-model-fetcher.js');
            const models = await fetchModels(providerId as any, config);
            allModels.push(...models.map(m => ({ label: m.name, value: m.id })));
            context.addLog(`Loaded ${models.length} models from ${providerId}`);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push(`${providerId}: ${errorMsg}`);
            context.addLog(`Failed to fetch models for ${providerId}: ${errorMsg}`);
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
