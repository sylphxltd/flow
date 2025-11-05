/**
 * Notifications Command
 * Manage notification settings
 */

import type { Command } from '../types.js';

export const notificationsCommand: Command = {
  id: 'notifications',
  label: '/notifications',
  description: 'Manage notification settings for AI responses',
  args: [
    {
      name: 'action',
      description: 'Action to perform (show, enable, disable)',
      required: false,
      loadOptions: async () => {
        return [
          { id: 'show', label: 'show', value: 'show' },
          { id: 'enable', label: 'enable', value: 'enable' },
          { id: 'disable', label: 'disable', value: 'disable' },
        ];
      },
    },
    {
      name: 'type',
      description: 'Notification type to configure (os, terminal, sound, all)',
      required: false,
      loadOptions: async () => {
        return [
          { id: 'os', label: 'os', value: 'os' },
          { id: 'terminal', label: 'terminal', value: 'terminal' },
          { id: 'sound', label: 'sound', value: 'sound' },
          { id: 'all', label: 'all', value: 'all' },
        ];
      },
    },
  ],

  execute: async (context) => {
    const { updateNotificationSettings, notificationSettings } = context;

    // If no args, ask what action to perform
    if (context.args.length === 0) {
      await context.sendMessage('What do you want to do?');
      const actionAnswers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'action',
            question: 'Select action:',
            options: [
              { label: 'Show settings', value: 'show' },
              { label: 'Enable notifications', value: 'enable' },
              { label: 'Disable notifications', value: 'disable' },
            ],
          },
        ],
      });

      const action =
        typeof actionAnswers === 'object' && !Array.isArray(actionAnswers)
          ? actionAnswers['action']
          : '';

      if (!action) {
        return 'Action cancelled.';
      }

      // If enable/disable, ask which type
      if (action === 'enable' || action === 'disable') {
        await context.sendMessage('Which notification type?');
        const typeAnswers = await context.waitForInput({
          type: 'selection',
          questions: [
            {
              id: 'type',
              question: 'Select notification type:',
              options: [
                { label: 'OS Notifications', value: 'os' },
                { label: 'Terminal Notifications', value: 'terminal' },
                { label: 'Sound Effects', value: 'sound' },
                { label: 'All', value: 'all' },
              ],
            },
          ],
        });

        const type =
          typeof typeAnswers === 'object' && !Array.isArray(typeAnswers)
            ? typeAnswers['type']
            : '';

        if (!type) {
          return 'Type selection cancelled.';
        }

        const isEnabled = action === 'enable';

        if (type === 'all') {
          updateNotificationSettings({
            osNotifications: isEnabled,
            terminalNotifications: isEnabled,
            sound: isEnabled,
          });
          return `${isEnabled ? '✅' : '❌'} All notifications ${isEnabled ? 'enabled' : 'disabled'}`;
        } else {
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
          }
          updateNotificationSettings(updates);
          return `${isEnabled ? '✅' : '❌'} ${type} notifications ${isEnabled ? 'enabled' : 'disabled'}`;
        }
      }

      // Show settings
      return `🔔 Notification Settings:
  OS Notifications: ${notificationSettings.osNotifications ? '✅ Enabled' : '❌ Disabled'}
  Terminal Notifications: ${notificationSettings.terminalNotifications ? '✅ Enabled' : '❌ Disabled'}
  Sound Effects: ${notificationSettings.sound ? '✅ Enabled' : '❌ Disabled'}

Use /notifications to change settings.`;
    }

    const action = context.args[0].toLowerCase();

    switch (action) {
      case 'show':
        return `🔔 Notification Settings:
  OS Notifications: ${notificationSettings.osNotifications ? '✅ Enabled' : '❌ Disabled'}
  Terminal Notifications: ${notificationSettings.terminalNotifications ? '✅ Enabled' : '❌ Disabled'}
  Sound Effects: ${notificationSettings.sound ? '✅ Enabled' : '❌ Disabled'}

Use /notifications to change settings.`;

      case 'enable':
      case 'disable': {
        const isEnabled = action === 'enable';

        if (context.args.length === 1) {
          // No type specified, ask
          await context.sendMessage('Which notification type?');
          const typeAnswers = await context.waitForInput({
            type: 'selection',
            questions: [
              {
                id: 'type',
                question: 'Select notification type:',
                options: [
                  { label: 'OS Notifications', value: 'os' },
                  { label: 'Terminal Notifications', value: 'terminal' },
                  { label: 'Sound Effects', value: 'sound' },
                  { label: 'All', value: 'all' },
                ],
              },
            ],
          });

          const type =
            typeof typeAnswers === 'object' && !Array.isArray(typeAnswers)
              ? typeAnswers['type']
              : '';

          if (!type) {
            return 'Type selection cancelled.';
          }

          if (type === 'all') {
            updateNotificationSettings({
              osNotifications: isEnabled,
              terminalNotifications: isEnabled,
              sound: isEnabled,
            });
            return `${isEnabled ? '✅' : '❌'} All notifications ${isEnabled ? 'enabled' : 'disabled'}`;
          } else {
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
            }
            updateNotificationSettings(updates);
            return `${isEnabled ? '✅' : '❌'} ${type} notifications ${isEnabled ? 'enabled' : 'disabled'}`;
          }
        }

        const type = context.args[1].toLowerCase();

        if (type === 'all') {
          updateNotificationSettings({
            osNotifications: isEnabled,
            terminalNotifications: isEnabled,
            sound: isEnabled,
          });
          return `${isEnabled ? '✅' : '❌'} All notifications ${isEnabled ? 'enabled' : 'disabled'}`;
        }

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
            return `❌ Unknown notification type: ${type}\nValid types: os, terminal, sound, all`;
        }

        updateNotificationSettings(updates);
        return `${isEnabled ? '✅' : '❌'} ${type} notifications ${isEnabled ? 'enabled' : 'disabled'}`;
      }

      default:
        return `❌ Unknown action: ${action}\nValid actions: show, enable, disable`;
    }
  },
};

export default notificationsCommand;
