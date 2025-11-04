/**
 * Notifications Command
 * Manage notification settings
 */

import type { Command, CommandContext } from '../types.js';

export default {
  id: 'notifications',
  label: '/notifications',
  description: 'Manage notification settings for AI responses',
  args: [
    {
      name: 'action',
      description: 'Action to perform (show, enable, disable)',
      required: true,
      suggestions: ['show', 'enable', 'disable'],
    },
    {
      name: 'type',
      description: 'Notification type to configure (os, terminal, sound, all)',
      required: false,
      suggestions: ['os', 'terminal', 'sound', 'all'],
    },
  ],

  async execute(args: string[], context: CommandContext): Promise<void> {
    const { updateNotificationSettings, notificationSettings } = context;

    if (args.length === 0) {
      context.updateOutput('\n❌ Please specify an action: show, enable, or disable\n');
      return;
    }

    const action = args[0].toLowerCase();

    switch (action) {
      case 'show':
        context.updateOutput('\n🔔 Notification Settings:\n');
        context.updateOutput(
          `  OS Notifications: ${notificationSettings.osNotifications ? '✅ Enabled' : '❌ Disabled'}\n`
        );
        context.updateOutput(
          `  Terminal Notifications: ${notificationSettings.terminalNotifications ? '✅ Enabled' : '❌ Disabled'}\n`
        );
        context.updateOutput(
          `  Sound Effects: ${notificationSettings.sound ? '✅ Enabled' : '❌ Disabled'}\n`
        );
        context.updateOutput('\nUse /notifications enable/disable [type] to change settings.\n');
        break;

      case 'enable':
      case 'disable': {
        const isEnabled = action === 'enable';

        if (args.length === 1 || args[1] === 'all') {
          // Enable/disable all notifications
          updateNotificationSettings({
            osNotifications: isEnabled,
            terminalNotifications: isEnabled,
            sound: isEnabled,
          });
          context.updateOutput(
            `\n${isEnabled ? '✅' : '❌'} All notifications ${isEnabled ? 'enabled' : 'disabled'}\n`
          );
        } else {
          const type = args[1].toLowerCase();
          const updates: any = {};

          switch (type) {
            case 'os':
              updates.osNotifications = isEnabled;
              break;
            case 'terminal':
              updates.terminalNotifications = isEnabled;
              break;
            case 'sound':
              updates.sound = isEnabled;
              break;
            default:
              context.updateOutput(`\n❌ Unknown notification type: ${type}\n`);
              context.updateOutput('Valid types: os, terminal, sound, all\n');
              return;
          }

          updateNotificationSettings(updates);
          context.updateOutput(
            `\n${isEnabled ? '✅' : '❌'} ${type} notifications ${isEnabled ? 'enabled' : 'disabled'}\n`
          );
        }
        break;
      }

      default:
        context.updateOutput(`\n❌ Unknown action: ${action}\n`);
        context.updateOutput('Valid actions: show, enable, disable\n');
    }
  },
} as Command;
