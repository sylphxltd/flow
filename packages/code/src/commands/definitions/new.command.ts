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
    // Get store and selected provider/model
    const { useAppStore } = await import('@sylphx/code-client');
    const store = useAppStore.getState();
    const { selectedProvider, selectedModel } = store;

    if (!selectedProvider || !selectedModel) {
      return 'No AI provider configured. Use /provider to configure a provider first.';
    }

    // Create new session with current provider and model
    const newSessionId = await store.createSession(selectedProvider, selectedModel);
    await store.setCurrentSession(newSessionId);

    return `Created new chat session with ${selectedProvider} (${selectedModel})`;
  },
};

export default newCommand;
