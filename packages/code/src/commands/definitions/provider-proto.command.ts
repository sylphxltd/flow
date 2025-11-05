/**
 * Provider Command Prototype
 * Uses new settings mode pattern (no sendMessage/waitForInput)
 *
 * This is a prototype to test the new architecture where settings commands
 * directly trigger interactive UI in the input section instead of creating
 * messages/sessions.
 */

import type { Command } from '../types.js';

export const providerProtoCommand: Command = {
  id: 'provider2',
  label: '/provider2',
  description: '[PROTO] Manage AI providers with new UI',
  args: [],

  execute: async (context) => {
    // Return special marker to trigger settings mode
    // The command handler in Chat.tsx will detect this and call setSettingsMode
    return '__SETTINGS_MODE__:provider-selection:use';
  },
};

export default providerProtoCommand;
