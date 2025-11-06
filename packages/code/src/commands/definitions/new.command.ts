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
    // Get selected provider/model from store directly
    const { useAppStore } = await import('@sylphx/code-client');
    const { selectedProvider, selectedModel } = useAppStore.getState();

    if (!selectedProvider || !selectedModel) {
      return 'No AI provider configured. Use /provider to configure a provider first.';
    }

    // Create new session with current provider and model
    const newSessionId = await context.createSession(selectedProvider, selectedModel);
    await context.setCurrentSession(newSessionId);

    return `Created new chat session with ${selectedProvider} (${selectedModel})`;
  },
};

export default newCommand;
