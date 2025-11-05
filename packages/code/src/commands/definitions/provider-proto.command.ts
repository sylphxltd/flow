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
    // Directly trigger settings mode - command has full control
    context.setSettingsMode({
      type: 'provider-selection',
      action: 'use',
      step: 'select-provider',
    });

    context.addLog('[provider2] Settings mode activated');
  },
};

export default providerProtoCommand;
