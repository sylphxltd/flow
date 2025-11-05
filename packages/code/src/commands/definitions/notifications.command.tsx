/**
 * Notifications Command
 * Manage notification settings using component-based UI
 */

import { NotificationsManagement } from '../../screens/chat/components/NotificationsManagement.js';
import { getActionCompletions, getTypeCompletions } from '../../completions/notifications.js';
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
        return getActionCompletions();
      },
    },
    {
      name: 'type',
      description: 'Notification type to configure (os, terminal, sound, all)',
      required: false,
      loadOptions: async () => {
        return getTypeCompletions();
      },
    },
  ],

  execute: async (context) => {
    const { updateNotificationSettings, notificationSettings } = context;

    // Helper to format settings display
    const formatSettings = () => {
      return `🔔 Notification Settings:
  OS Notifications: ${notificationSettings.osNotifications ? '✅ Enabled' : '❌ Disabled'}
  Terminal Notifications: ${notificationSettings.terminalNotifications ? '✅ Enabled' : '❌ Disabled'}
  Sound Effects: ${notificationSettings.sound ? '✅ Enabled' : '❌ Disabled'}

Use /notifications to change settings.`;
    };

    // If args provided, handle directly
    if (context.args.length > 0) {
      const action = context.args[0].toLowerCase() as 'show' | 'enable' | 'disable';

      // Validate action
      if (action !== 'show' && action !== 'enable' && action !== 'disable') {
        return `❌ Unknown action: ${action}\nValid actions: show, enable, disable`;
      }

      // Show settings
      if (action === 'show') {
        return formatSettings();
      }

      // Enable/disable with type
      if (context.args.length > 1) {
        const type = context.args[1].toLowerCase() as 'os' | 'terminal' | 'sound' | 'all';
        const isEnabled = action === 'enable';

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

      // Enable/disable without type - show UI to select type
      context.setInputComponent(
        <NotificationsManagement
          initialAction={action}
          currentSettings={notificationSettings}
          onComplete={() => {
            context.setInputComponent(null);
            context.addLog('[notifications] Notification management closed');
          }}
          onUpdateSettings={(settings) => {
            updateNotificationSettings(settings);
            const typeName = settings.osNotifications !== undefined ? 'os' :
                             settings.terminalNotifications !== undefined ? 'terminal' :
                             settings.sound !== undefined ? 'sound' : 'all';
            const isEnabled = Object.values(settings)[0];
            context.addLog(`[notifications] ${isEnabled ? 'Enabled' : 'Disabled'} ${typeName} notifications`);
          }}
        />,
        'Notification Settings'
      );

      context.addLog('[notifications] Notification management opened');
      return;
    }

    // No args - show UI to select action
    context.setInputComponent(
      <NotificationsManagement
        currentSettings={notificationSettings}
        onComplete={() => {
          context.setInputComponent(null);
          context.addLog('[notifications] Notification management closed');
        }}
        onUpdateSettings={(settings) => {
          updateNotificationSettings(settings);
          const typeName = settings.osNotifications !== undefined ? 'os' :
                           settings.terminalNotifications !== undefined ? 'terminal' :
                           settings.sound !== undefined ? 'sound' : 'all';
          const isEnabled = Object.values(settings)[0];
          context.addLog(`[notifications] ${isEnabled ? 'Enabled' : 'Disabled'} ${typeName} notifications`);
        }}
      />,
      'Notification Settings'
    );

    context.addLog('[notifications] Notification management opened');
  },
};

export default notificationsCommand;
