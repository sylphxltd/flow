/**
 * Model Command
 * Switch AI model
 */

import type { Command } from '../types.js';

export const modelCommand: Command = {
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

          // Get current session's provider
          const currentSession = context?.getCurrentSession();
          const currentProviderId = currentSession?.provider || aiConfig.defaultProvider;

          if (!currentProviderId) {
            return [];
          }

          // Fetch models from current provider only
          const config = aiConfig.providers[currentProviderId];
          if (!config) {
            return [];
          }

          try {
            const { fetchModels } = await import('@sylphx/code-core');
            const models = await fetchModels(currentProviderId as any, config);
            return models.map(m => ({
              id: m.id,
              label: m.name,
              value: m.id,
            }));
          } catch (error) {
            if (context) {
              context.addLog(`Failed to fetch models for ${currentProviderId}: ${error instanceof Error ? error.message : String(error)}`);
            }
            return [];
          }
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
        // Load models from current provider only
        const aiConfig = context.getConfig();
        if (!aiConfig?.providers) {
          return 'No providers configured. Please configure a provider first.';
        }

        // Get current session's provider
        const currentSession = context.getCurrentSession();
        const currentProviderId = currentSession?.provider || aiConfig.defaultProvider;

        if (!currentProviderId) {
          return 'No provider selected. Use /provider to select a provider first.';
        }

        const config = aiConfig.providers[currentProviderId];
        if (!config) {
          return `Provider ${currentProviderId} is not configured.`;
        }

        // Fetch models from current provider
        let allModels: Array<{ label: string; value: string }> = [];
        try {
          const { fetchModels } = await import('@sylphx/code-core');
          const models = await fetchModels(currentProviderId as any, config);
          allModels = models.map(m => ({ label: m.name, value: m.id }));
          context.addLog(`Loaded ${models.length} models from ${currentProviderId}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          context.addLog(`Failed to fetch models for ${currentProviderId}: ${errorMsg}`);
          return `Failed to load models from ${currentProviderId}: ${errorMsg}`;
        }

        if (allModels.length === 0) {
          return `No models available for ${currentProviderId}`;
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

    // Update model and save to provider config
    const newConfig = {
      ...aiConfig!,
      defaultModel: modelId,
      providers: {
        ...aiConfig!.providers,
        [provider]: {
          ...aiConfig!.providers?.[provider],
          'default-model': modelId,
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

export default modelCommand;
