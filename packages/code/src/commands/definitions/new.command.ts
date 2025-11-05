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
    const aiConfig = context.getConfig();

    if (!aiConfig?.defaultProvider || !aiConfig?.defaultModel) {
      return 'No AI provider configured. Use /provider to configure a provider first.';
    }

    // Create new session with current provider and model
    const newSessionId = await context.createSession(aiConfig.defaultProvider, aiConfig.defaultModel);
    await context.setCurrentSession(newSessionId);

    return `Created new chat session with ${aiConfig.defaultProvider} (${aiConfig.defaultModel})`;
  },
};

export default newCommand;
