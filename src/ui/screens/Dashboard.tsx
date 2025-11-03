/**
 * Dashboard Screen
 * Minimalist borderless design - modern, advanced, clean
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../stores/app-store.js';

type DashboardSection =
  | 'agents'
  | 'rules'
  | 'sessions'
  | 'providers'
  | 'settings'
  | 'notifications';

interface MenuItem {
  id: DashboardSection;
  label: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'agents',
    label: 'Agents',
    description: 'AI agent configurations',
  },
  {
    id: 'rules',
    label: 'Rules',
    description: 'Custom rules and behaviors',
  },
  {
    id: 'sessions',
    label: 'Sessions',
    description: 'Chat history and sessions',
  },
  {
    id: 'providers',
    label: 'Providers',
    description: 'AI provider configurations',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Application preferences',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Notification preferences',
  },
];

export default function Dashboard() {
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('agents');

  const currentAgentId = useAppStore((state) => state.currentAgentId);
  const enabledRuleIds = useAppStore((state) => state.enabledRuleIds);
  const sessions = useAppStore((state) => state.sessions);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const notificationSettings = useAppStore((state) => state.notificationSettings);
  const navigateTo = useAppStore((state) => state.navigateTo);

  useInput((input, key) => {
    if (key.escape) {
      navigateTo('chat');
      return;
    }

    if (key.upArrow) {
      const currentIndex = MENU_ITEMS.findIndex((item) => item.id === selectedSection);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : MENU_ITEMS.length - 1;
      setSelectedSection(MENU_ITEMS[prevIndex].id);
      return;
    }

    if (key.downArrow) {
      const currentIndex = MENU_ITEMS.findIndex((item) => item.id === selectedSection);
      const nextIndex = currentIndex < MENU_ITEMS.length - 1 ? currentIndex + 1 : 0;
      setSelectedSection(MENU_ITEMS[nextIndex].id);
      return;
    }

    const numKey = parseInt(input);
    if (!isNaN(numKey) && numKey >= 1 && numKey <= MENU_ITEMS.length) {
      setSelectedSection(MENU_ITEMS[numKey - 1].id);
      return;
    }
  });

  const getStats = (section: DashboardSection): string => {
    switch (section) {
      case 'agents':
        return currentAgentId;
      case 'rules':
        return `${enabledRuleIds.length}`;
      case 'sessions':
        return `${sessions.length}`;
      case 'providers':
        return `${Object.keys(aiConfig?.providers || {}).length}`;
      case 'settings':
        return '';
      case 'notifications':
        const enabled = [
          notificationSettings.osNotifications,
          notificationSettings.terminalNotifications,
          notificationSettings.sound,
        ].filter(Boolean).length;
        return `${enabled}/3`;
      default:
        return '';
    }
  };

  const renderContent = () => {
    switch (selectedSection) {
      case 'agents':
        return (
          <Box flexDirection="column" paddingX={4} paddingTop={1}>
            <Box marginBottom={2}>
              <Text color="#00D9FF">CURRENT AGENT</Text>
            </Box>
            <Box marginBottom={3}>
              <Text bold color="#00FF88">{currentAgentId}</Text>
            </Box>
            <Box>
              <Text dimColor>
                Agents control how the AI responds to your requests.
                Switch between different agent modes for different tasks.
              </Text>
            </Box>
          </Box>
        );

      case 'rules':
        return (
          <Box flexDirection="column" paddingX={4} paddingTop={1}>
            <Box marginBottom={2}>
              <Text color="#00D9FF">ENABLED RULES</Text>
              <Box flexGrow={1} />
              <Text dimColor>{enabledRuleIds.length} active</Text>
            </Box>
            {enabledRuleIds.length === 0 ? (
              <Box>
                <Text dimColor>No rules enabled</Text>
              </Box>
            ) : (
              <Box flexDirection="column">
                {enabledRuleIds.map((ruleId, idx) => (
                  <Box key={ruleId} marginBottom={1}>
                    <Text dimColor>{idx + 1}  </Text>
                    <Text color="#00FF88">{ruleId}</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        );

      case 'sessions':
        return (
          <Box flexDirection="column" paddingX={4} paddingTop={1}>
            <Box marginBottom={2}>
              <Text color="#00D9FF">RECENT SESSIONS</Text>
              <Box flexGrow={1} />
              <Text dimColor>{sessions.length} total</Text>
            </Box>
            <Box flexDirection="column">
              {sessions.slice(0, 10).map((session, idx) => (
                <Box key={session.id} marginBottom={1}>
                  <Text dimColor>{idx + 1}  </Text>
                  <Text color="#00FF88">{session.title || 'New Chat'}</Text>
                  <Text dimColor>  {session.messages.length}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 'providers':
        return (
          <Box flexDirection="column" paddingX={4} paddingTop={1}>
            <Box marginBottom={2}>
              <Text color="#00D9FF">PROVIDERS</Text>
              <Box flexGrow={1} />
              <Text dimColor>{Object.keys(aiConfig?.providers || {}).length} configured</Text>
            </Box>
            <Box flexDirection="column">
              {aiConfig?.providers && Object.entries(aiConfig.providers).map(([providerId, config], idx) => (
                <Box key={providerId} marginBottom={1} flexDirection="column">
                  <Box>
                    <Text dimColor>{idx + 1}  </Text>
                    <Text bold color="#00FF88">{providerId}</Text>
                  </Box>
                  {config.defaultModel && (
                    <Box marginLeft={4}>
                      <Text dimColor>{config.defaultModel}</Text>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 'settings':
        return (
          <Box flexDirection="column" paddingX={4} paddingTop={1}>
            <Box marginBottom={2}>
              <Text color="#00D9FF">SETTINGS</Text>
            </Box>
            <Box>
              <Text dimColor>Configure application preferences and behavior</Text>
            </Box>
          </Box>
        );

      case 'notifications':
        const enabledCount = [
          notificationSettings.osNotifications,
          notificationSettings.terminalNotifications,
          notificationSettings.sound,
        ].filter(Boolean).length;

        return (
          <Box flexDirection="column" paddingX={4} paddingTop={1}>
            <Box marginBottom={2}>
              <Text color="#00D9FF">NOTIFICATIONS</Text>
              <Box flexGrow={1} />
              <Text dimColor>{enabledCount}/3 enabled</Text>
            </Box>
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text dimColor>1  </Text>
                <Text>OS Notifications</Text>
                <Box flexGrow={1} />
                <Text color={notificationSettings.osNotifications ? '#00FF88' : '#FF3366'}>
                  {notificationSettings.osNotifications ? 'ON' : 'OFF'}
                </Text>
              </Box>
              <Box marginBottom={1}>
                <Text dimColor>2  </Text>
                <Text>Terminal</Text>
                <Box flexGrow={1} />
                <Text color={notificationSettings.terminalNotifications ? '#00FF88' : '#FF3366'}>
                  {notificationSettings.terminalNotifications ? 'ON' : 'OFF'}
                </Text>
              </Box>
              <Box marginBottom={1}>
                <Text dimColor>3  </Text>
                <Text>Sound</Text>
                <Box flexGrow={1} />
                <Text color={notificationSettings.sound ? '#00FF88' : '#FF3366'}>
                  {notificationSettings.sound ? 'ON' : 'OFF'}
                </Text>
              </Box>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" height="100%" width="100%">
      {/* Minimal header */}
      <Box paddingX={4} paddingY={1}>
        <Text bold color="#00D9FF">CONTROL PANEL</Text>
        <Box flexGrow={1} />
        <Text dimColor>ESC to exit</Text>
      </Box>

      {/* Main content */}
      <Box flexGrow={1} flexDirection="row">
        {/* Navigation sidebar */}
        <Box width="30%" flexDirection="column" paddingX={4} paddingY={2}>
          {MENU_ITEMS.map((item, index) => {
            const isSelected = selectedSection === item.id;
            const stat = getStats(item.id);

            return (
              <Box
                key={item.id}
                marginBottom={2}
                flexDirection="column"
              >
                <Box>
                  <Text dimColor>{index + 1}  </Text>
                  <Text bold color={isSelected ? '#00FF88' : 'white'}>
                    {item.label}
                  </Text>
                  {stat && (
                    <>
                      <Box flexGrow={1} />
                      <Text dimColor>{stat}</Text>
                    </>
                  )}
                </Box>
                {isSelected && (
                  <Box marginTop={0} marginLeft={4}>
                    <Text dimColor>{item.description}</Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Content area */}
        <Box flexGrow={1} flexDirection="column">
          {renderContent()}
        </Box>
      </Box>

      {/* Minimal footer */}
      <Box paddingX={4} paddingY={1}>
        <Text dimColor>↑↓</Text>
        <Text dimColor>  Navigate  </Text>
        <Text dimColor>1-6</Text>
        <Text dimColor>  Quick Select</Text>
      </Box>
    </Box>
  );
}
