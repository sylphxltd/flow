/**
 * Provider Command
 * Configure and switch AI providers using interactive settings mode
 */

import type { Command } from '../types.js';

export const providerCommand: Command = {
  id: 'provider',
  label: '/provider',
  description: 'Manage AI providers',
  args: [],

  execute: async (context) => {
    const action = context.args[0];

    // Case 1: /provider - show action selection (use / configure)
    if (!action) {
      context.setSettingsMode({
        type: 'provider-selection',
        action: 'use', // Default to 'use', but will show both options
        step: 'select-action',
      });
      context.addLog('[provider] Settings mode: select action');
      return;
    }

    // Case 2: /provider use - show provider selection for use
    if (action === 'use') {
      context.setSettingsMode({
        type: 'provider-selection',
        action: 'use',
        step: 'select-provider',
      });
      context.addLog('[provider] Settings mode: select provider to use');
      return;
    }

    // Case 3: /provider configure - show provider selection for configuration
    if (action === 'configure') {
      context.setSettingsMode({
        type: 'provider-selection',
        action: 'configure',
        step: 'select-provider',
      });
      context.addLog('[provider] Settings mode: select provider to configure');
      return;
    }

    // Invalid action
    context.sendMessage(
      `Unknown action: ${action}\n\n` +
        'Usage:\n' +
        '  /provider - Select action (use/configure)\n' +
        '  /provider use - Select provider to use\n' +
        '  /provider configure - Configure a provider'
    );
  },
};

export default providerCommand;
