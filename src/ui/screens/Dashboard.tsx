/**
 * Dashboard Screen
 * Modern full-screen control panel with mouse and keyboard support
 * Central hub for all application features
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
  icon: string;
  description: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'agents',
    label: 'Agents',
    icon: '◆',
    description: 'Manage AI agents and their configurations',
  },
  {
    id: 'rules',
    label: 'Rules',
    icon: '▣',
    description: 'Configure custom rules and behaviors',
  },
  {
    id: 'sessions',
    label: 'Sessions',
    icon: '≡',
    description: 'View and manage chat sessions',
  },
  {
    id: 'providers',
    label: 'Providers',
    icon: '⚙',
    description: 'Configure AI providers and API keys',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⊙',
    description: 'Application settings and preferences',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: '♪',
    description: 'Notification settings and sound preferences',
  },
];

export default function Dashboard() {
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('agents');
  const [hoveredItem, setHoveredItem] = useState<DashboardSection | null>(null);

  const currentAgentId = useAppStore((state) => state.currentAgentId);
  const enabledRuleIds = useAppStore((state) => state.enabledRuleIds);
  const sessions = useAppStore((state) => state.sessions);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const notificationSettings = useAppStore((state) => state.notificationSettings);
  const navigateTo = useAppStore((state) => state.navigateTo);

  // Keyboard navigation
  useInput((input, key) => {
    // ESC to go back to chat
    if (key.escape) {
      navigateTo('chat');
      return;
    }

    // Up/Down arrow navigation
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

    // Number keys for quick navigation
    const numKey = parseInt(input);
    if (!isNaN(numKey) && numKey >= 1 && numKey <= MENU_ITEMS.length) {
      setSelectedSection(MENU_ITEMS[numKey - 1].id);
      return;
    }
  });

  // Get stats for each section
  const getStats = (section: DashboardSection): string => {
    switch (section) {
      case 'agents':
        return `Active: ${currentAgentId}`;
      case 'rules':
        return `${enabledRuleIds.length} enabled`;
      case 'sessions':
        return `${sessions.length} sessions`;
      case 'providers':
        const providerCount = Object.keys(aiConfig?.providers || {}).length;
        return `${providerCount} configured`;
      case 'settings':
        return 'Configure app';
      case 'notifications':
        const enabled = [
          notificationSettings.osNotifications,
          notificationSettings.terminalNotifications,
          notificationSettings.sound,
        ].filter(Boolean).length;
        return `${enabled}/3 enabled`;
      default:
        return '';
    }
  };

  const renderContent = () => {
    switch (selectedSection) {
      case 'agents':
        return (
          <Box flexDirection="column" paddingX={2}>
            <Box marginBottom={1}>
              <Text bold color="#00D9FF">Current Agent</Text>
            </Box>
            <Box marginBottom={2}>
              <Text dimColor>→ </Text>
              <Text color="#00FF88">{currentAgentId}</Text>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>
                Agents control how the AI responds to your requests.
                Switch between different agent modes for different tasks.
              </Text>
            </Box>
          </Box>
        );

      case 'rules':
        return (
          <Box flexDirection="column" paddingX={2}>
            <Box marginBottom={1}>
              <Text bold color="#00D9FF">Enabled Rules</Text>
            </Box>
            {enabledRuleIds.length === 0 ? (
              <Box marginBottom={1}>
                <Text dimColor>No rules enabled</Text>
              </Box>
            ) : (
              enabledRuleIds.map((ruleId) => (
                <Box key={ruleId} marginBottom={1}>
                  <Text dimColor>→ </Text>
                  <Text>{ruleId}</Text>
                </Box>
              ))
            )}
          </Box>
        );

      case 'sessions':
        return (
          <Box flexDirection="column" paddingX={2}>
            <Box marginBottom={1}>
              <Text bold color="#00D9FF">Recent Sessions</Text>
            </Box>
            {sessions.slice(0, 10).map((session) => (
              <Box key={session.id} marginBottom={1}>
                <Text dimColor>→ </Text>
                <Text>{session.title || 'New Chat'}</Text>
                <Text dimColor> · </Text>
                <Text dimColor>{session.messages.length} messages</Text>
              </Box>
            ))}
          </Box>
        );

      case 'providers':
        return (
          <Box flexDirection="column" paddingX={2}>
            <Box marginBottom={1}>
              <Text bold color="#00D9FF">Configured Providers</Text>
            </Box>
            {aiConfig?.providers && Object.entries(aiConfig.providers).map(([providerId, config]) => (
              <Box key={providerId} marginBottom={1}>
                <Text dimColor>→ </Text>
                <Text>{providerId}</Text>
                {config.defaultModel && (
                  <>
                    <Text dimColor> · </Text>
                    <Text dimColor>{config.defaultModel}</Text>
                  </>
                )}
              </Box>
            ))}
          </Box>
        );

      case 'settings':
        return (
          <Box flexDirection="column" paddingX={2}>
            <Box marginBottom={1}>
              <Text bold color="#00D9FF">Application Settings</Text>
            </Box>
            <Box marginBottom={1}>
              <Text dimColor>Configure application preferences and behavior</Text>
            </Box>
          </Box>
        );

      case 'notifications':
        return (
          <Box flexDirection="column" paddingX={2}>
            <Box marginBottom={1}>
              <Text bold color="#00D9FF">Notification Settings</Text>
            </Box>
            <Box marginBottom={1} flexDirection="column">
              <Box>
                <Text dimColor>→ OS Notifications: </Text>
                <Text color={notificationSettings.osNotifications ? 'green' : 'red'}>
                  {notificationSettings.osNotifications ? 'Enabled' : 'Disabled'}
                </Text>
              </Box>
              <Box>
                <Text dimColor>→ Terminal Notifications: </Text>
                <Text color={notificationSettings.terminalNotifications ? 'green' : 'red'}>
                  {notificationSettings.terminalNotifications ? 'Enabled' : 'Disabled'}
                </Text>
              </Box>
              <Box>
                <Text dimColor>→ Sound: </Text>
                <Text color={notificationSettings.sound ? 'green' : 'red'}>
                  {notificationSettings.sound ? 'Enabled' : 'Disabled'}
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
      {/* Header */}
      <Box paddingX={2} paddingY={1} borderStyle="single" borderColor="gray">
        <Text bold color="#00D9FF">CONTROL PANEL</Text>
        <Text dimColor> · </Text>
        <Text dimColor>Central hub for all features</Text>
        <Box flexGrow={1} />
        <Text dimColor>Press ESC to return</Text>
      </Box>

      {/* Main Content Area */}
      <Box flexGrow={1} flexDirection="row">
        {/* Left Sidebar - Menu */}
        <Box
          width="30%"
          borderStyle="single"
          borderColor="gray"
          flexDirection="column"
          paddingX={1}
          paddingY={1}
        >
          <Box marginBottom={1}>
            <Text bold dimColor>NAVIGATION</Text>
          </Box>

          {MENU_ITEMS.map((item, index) => {
            const isSelected = selectedSection === item.id;
            const isHovered = hoveredItem === item.id;

            return (
              <Box
                key={item.id}
                marginBottom={1}
                paddingX={1}
                paddingY={0}
                borderStyle={isSelected ? 'single' : undefined}
                borderColor={isSelected ? '#00D9FF' : undefined}
              >
                <Box flexDirection="column" width="100%">
                  <Box>
                    <Text dimColor>{index + 1}. </Text>
                    <Text color={isSelected ? '#00D9FF' : isHovered ? '#00FF88' : 'white'}>
                      {item.icon} {item.label}
                    </Text>
                    <Box flexGrow={1} />
                    <Text dimColor>{getStats(item.id)}</Text>
                  </Box>
                  {isSelected && (
                    <Box marginTop={0}>
                      <Text dimColor>{item.description}</Text>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Right Content Area */}
        <Box
          flexGrow={1}
          borderStyle="single"
          borderColor="gray"
          flexDirection="column"
          paddingY={1}
        >
          {renderContent()}
        </Box>
      </Box>

      {/* Footer with keyboard shortcuts */}
      <Box paddingX={2} paddingY={1} borderStyle="single" borderColor="gray">
        <Text dimColor>↑↓ Navigate</Text>
        <Text dimColor> · </Text>
        <Text dimColor>1-6 Quick select</Text>
        <Text dimColor> · </Text>
        <Text dimColor>ESC Exit</Text>
        <Box flexGrow={1} />
        <Text dimColor>Mouse ready (coming soon)</Text>
      </Box>
    </Box>
  );
}
