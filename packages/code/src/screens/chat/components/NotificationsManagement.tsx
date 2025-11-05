/**
 * Notifications Management Component
 * Uses InlineSelection composition pattern for consistent UI
 */

import { useState } from 'react';
import { InlineSelection } from '../../../components/selection/index.js';
import type { SelectionOption } from '../../../hooks/useSelection.js';

interface NotificationSettings {
  osNotifications: boolean;
  terminalNotifications: boolean;
  sound: boolean;
}

interface NotificationsManagementProps {
  initialAction?: 'show' | 'enable' | 'disable';
  initialType?: 'os' | 'terminal' | 'sound' | 'all';
  currentSettings: NotificationSettings;
  onComplete: () => void;
  onUpdateSettings: (settings: Partial<NotificationSettings>) => void;
}

type Step = 'select-action' | 'select-type';

export function NotificationsManagement({
  initialAction,
  initialType,
  currentSettings,
  onComplete,
  onUpdateSettings,
}: NotificationsManagementProps) {
  const [step, setStep] = useState<Step>(initialAction && initialAction !== 'show' ? 'select-type' : 'select-action');
  const [action, setAction] = useState<'show' | 'enable' | 'disable'>(initialAction || 'show');

  // Action options for step 1
  const actionOptions: SelectionOption[] = [
    {
      label: 'Show settings',
      value: 'show',
      description: 'Display current notification settings',
    },
    {
      label: 'Enable notifications',
      value: 'enable',
      description: 'Turn on notification types',
    },
    {
      label: 'Disable notifications',
      value: 'disable',
      description: 'Turn off notification types',
    },
  ];

  // Type options for step 2
  const typeOptions: SelectionOption[] = [
    {
      label: 'OS Notifications',
      value: 'os',
      description: 'System notifications',
      ...(currentSettings.osNotifications && {
        badge: { text: '✓', color: 'green' },
      }),
    },
    {
      label: 'Terminal Notifications',
      value: 'terminal',
      description: 'Terminal bell notifications',
      ...(currentSettings.terminalNotifications && {
        badge: { text: '✓', color: 'green' },
      }),
    },
    {
      label: 'Sound Effects',
      value: 'sound',
      description: 'Audio feedback',
      ...(currentSettings.sound && {
        badge: { text: '✓', color: 'green' },
      }),
    },
    {
      label: 'All',
      value: 'all',
      description: 'All notification types',
    },
  ];

  // Step 1: Select action
  if (step === 'select-action') {
    return (
      <InlineSelection
        options={actionOptions}
        subtitle="Manage notification settings for AI responses"
        filter={false}
        onSelect={(value) => {
          const selectedAction = value as 'show' | 'enable' | 'disable';
          setAction(selectedAction);

          if (selectedAction === 'show') {
            // Show settings directly
            onComplete();
          } else {
            // Go to type selection
            setStep('select-type');
          }
        }}
        onCancel={onComplete}
      />
    );
  }

  // Step 2: Select type (only for enable/disable)
  if (step === 'select-type') {
    return (
      <InlineSelection
        options={typeOptions}
        subtitle={action === 'enable' ? 'Enable which notification type?' : 'Disable which notification type?'}
        filter={false}
        onSelect={(value) => {
          const type = value as 'os' | 'terminal' | 'sound' | 'all';
          const isEnabled = action === 'enable';

          if (type === 'all') {
            onUpdateSettings({
              osNotifications: isEnabled,
              terminalNotifications: isEnabled,
              sound: isEnabled,
            });
          } else {
            const updates: Partial<NotificationSettings> = {};
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
            onUpdateSettings(updates);
          }

          onComplete();
        }}
        onCancel={onComplete}
      />
    );
  }

  return null;
}
