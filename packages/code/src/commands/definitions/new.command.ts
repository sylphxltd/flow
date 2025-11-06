/**
 * New Command
 * Create a new chat session
 */

import type { Command } from '../types.js';

export const newCommand: Command = {
  id: 'new',
  label: '/new',
  description: 'Create a new chat session',
  execute: async (context) => {
    // Get selected provider/model from store (reactive state)
    const provider = context.getSelectedProvider();
    const model = context.getSelectedModel();

    if (!provider || !model) {
      return 'No AI provider configured. Use /provider to configure a provider first.';
    }

    // Create new session with current provider and model
    const newSessionId = await context.createSession(provider, model);
    await context.setCurrentSession(newSessionId);

    return `Created new chat session with ${provider} (${model})`;
  },
};

export default newCommand;
