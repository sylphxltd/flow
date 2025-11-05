/**
 * Dashboard Screen - Full-screen interactive control panel
 * Features: Keyboard navigation, full management capabilities
 */

import type { Session } from '@sylphx/code-client';
import { getTRPCClient, useAppStore } from '@sylphx/code-client';
import { getAllAgents, getAllRules, toggleRule } from '../embedded-context.js';
import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';
import { FullScreen } from '../components/FullScreen.js';

type DashboardSection =
  | 'agents'
  | 'rules'
  | 'sessions'
  | 'providers'
  | 'notifications'
  | 'keybindings';

type InteractionMode = 'browse' | 'edit';

export default function Dashboard() {
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('agents');
  const [mode, setMode] = useState<InteractionMode>('browse');
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);

  const selectedAgentId = useAppStore((state) => state.selectedAgentId);
  const setSelectedAgent = useAppStore((state) => state.setSelectedAgent);
  const enabledRuleIds = useAppStore((state) => state.enabledRuleIds);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const notificationSettings = useAppStore((state) => state.notificationSettings);
  const updateNotificationSettings = useAppStore((state) => state.updateNotificationSettings);
  const navigateTo = useAppStore((state) => state.navigateTo);

  const agents = getAllAgents();
  const rules = getAllRules();

  // Load sessions when entering sessions section (tRPC on-demand loading)
  useEffect(() => {
    if (selectedSection === 'sessions') {
      const loadSessions = async () => {
        try {
          const client = await getTRPCClient();
          const recentSessions = await client.session.getRecent({ limit: 50 });
          setSessions(recentSessions);
        } catch (error) {
          console.error('Failed to load sessions:', error);
          setSessions([]);
        }
      };
      loadSessions();
    }
  }, [selectedSection]);

  useInput((input, key) => {
    // Global shortcuts
    if (key.escape) {
      if (mode === 'edit') {
        setMode('browse');
        return;
      }
      navigateTo('chat');
      return;
    }

    // Tab to switch sections
    if (key.tab) {
      const sections: DashboardSection[] = [
        'agents',
        'rules',
        'sessions',
        'providers',
        'notifications',
        'keybindings',
      ];
      const currentIndex = sections.indexOf(selectedSection);
      const nextIndex = (currentIndex + 1) % sections.length;
      setSelectedSection(sections[nextIndex]);
      setSelectedItemIndex(0);
      return;
    }

    // Enter to toggle edit mode
    if (key.return) {
      if (mode === 'browse') {
        setMode('edit');
      } else {
        handleAction();
      }
      return;
    }

    // Browse mode: navigate sections with number keys
    if (mode === 'browse') {
      const num = parseInt(input);
      if (num >= 1 && num <= 6) {
        const sections: DashboardSection[] = [
          'agents',
          'rules',
          'sessions',
          'providers',
          'notifications',
          'keybindings',
        ];
        setSelectedSection(sections[num - 1]);
        setSelectedItemIndex(0);
        return;
      }
    }

    // Edit mode: navigate items
    if (mode === 'edit') {
      if (key.upArrow) {
        setSelectedItemIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow) {
        const maxIndex = getMaxItemIndex();
        setSelectedItemIndex((prev) => Math.min(maxIndex, prev + 1));
        return;
      }

      if (input === ' ') {
        handleAction();
        return;
      }
    }
  });

  const getMaxItemIndex = (): number => {
    switch (selectedSection) {
      case 'agents':
        return agents.length - 1;
      case 'rules':
        return rules.length - 1;
      case 'notifications':
        return 3;
      default:
        return 0;
    }
  };

  const handleAction = () => {
    switch (selectedSection) {
      case 'agents':
        if (agents[selectedItemIndex]) {
          setSelectedAgent(agents[selectedItemIndex].id);
          setMode('browse');
        }
        break;

      case 'rules':
        if (rules[selectedItemIndex]) {
          toggleRule(rules[selectedItemIndex].id);
        }
        break;

      case 'notifications': {
        const settings = [
          'osNotifications',
          'terminalNotifications',
          'sound',
          'autoGenerateTitle',
        ] as const;
        const setting = settings[selectedItemIndex];
        if (setting) {
          // Read current state at action time, not closure time
          const currentSettings = useAppStore.getState().notificationSettings;
          updateNotificationSettings({ [setting]: !currentSettings[setting] });
        }
        break;
      }
    }
  };

  const renderAgents = () => {
    return (
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Box marginBottom={2}>
          <Text color="#00D9FF">AGENTS</Text>
          <Box flexGrow={1} />
          <Text dimColor>{agents.length} available</Text>
        </Box>

        <Box flexDirection="column">
          {agents.map((agent, idx) => {
            const isSelected = agent.id === selectedAgentId;
            const isHighlighted = mode === 'edit' && selectedItemIndex === idx;

            return (
              <Box key={agent.id} marginBottom={1} paddingY={0}>
                <Text dimColor>{idx + 1} </Text>
                <Text
                  bold={isSelected || isHighlighted}
                  color={isSelected ? '#00FF88' : isHighlighted ? '#00D9FF' : 'white'}
                >
                  {agent.metadata.name}
                </Text>
                {isSelected && (
                  <>
                    <Text dimColor> </Text>
                    <Text color="#00FF88">●</Text>
                  </>
                )}
                {isHighlighted && mode === 'edit' && (
                  <>
                    <Text dimColor> </Text>
                    <Text color="#00D9FF">◄</Text>
                  </>
                )}
              </Box>
            );
          })}
        </Box>

        {mode === 'edit' && (
          <Box marginTop={2}>
            <Text dimColor italic>
              ↑↓ Navigate ENTER/SPACE Switch ESC Cancel
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderRules = () => {
    return (
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Box marginBottom={2}>
          <Text color="#00D9FF">RULES</Text>
          <Box flexGrow={1} />
          <Text dimColor>
            {enabledRuleIds.length}/{rules.length} enabled
          </Text>
        </Box>

        <Box flexDirection="column">
          {rules.map((rule, idx) => {
            const isEnabled = enabledRuleIds.includes(rule.id);
            const isSelected = mode === 'edit' && selectedItemIndex === idx;

            return (
              <Box key={rule.id} marginBottom={1} paddingY={0}>
                <Text dimColor>{idx + 1} </Text>
                <Text
                  bold={isSelected}
                  color={isSelected ? '#00D9FF' : isEnabled ? '#00FF88' : 'gray'}
                >
                  {rule.id}
                </Text>
                <Box flexGrow={1} />
                <Text color={isEnabled ? '#00FF88' : '#FF3366'}>{isEnabled ? 'ON' : 'OFF'}</Text>
                {isSelected && mode === 'edit' && (
                  <>
                    <Text dimColor> </Text>
                    <Text color="#00D9FF">◄</Text>
                  </>
                )}
              </Box>
            );
          })}
        </Box>

        {mode === 'edit' && (
          <Box marginTop={2}>
            <Text dimColor italic>
              ↑↓ Navigate SPACE Toggle ESC Cancel
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderSessions = () => {
    return (
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Box marginBottom={2}>
          <Text color="#00D9FF">SESSIONS</Text>
          <Box flexGrow={1} />
          <Text dimColor>{sessions.length} total</Text>
        </Box>

        <Box flexDirection="column">
          {sessions.slice(0, 15).map((session, idx) => {
            return (
              <Box key={session.id} marginBottom={1}>
                <Text dimColor>{idx + 1} </Text>
                <Text color="#00FF88">{session.title || 'New Chat'}</Text>
                <Text dimColor> {session.messages.length} msg</Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderProviders = () => {
    const providers = Object.entries(aiConfig?.providers || {});

    return (
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Box marginBottom={2}>
          <Text color="#00D9FF">PROVIDERS</Text>
          <Box flexGrow={1} />
          <Text dimColor>{providers.length} configured</Text>
        </Box>

        <Box flexDirection="column">
          {providers.map(([providerId, config], idx) => {
            return (
              <Box key={providerId} marginBottom={1} flexDirection="column">
                <Box>
                  <Text dimColor>{idx + 1} </Text>
                  <Text bold color="#00FF88">
                    {providerId}
                  </Text>
                </Box>
                {config.defaultModel && (
                  <Box marginLeft={4}>
                    <Text dimColor>{config.defaultModel}</Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderNotifications = () => {
    const settings = [
      {
        key: 'osNotifications',
        label: 'OS Notifications',
        value: notificationSettings.osNotifications,
      },
      {
        key: 'terminalNotifications',
        label: 'Terminal',
        value: notificationSettings.terminalNotifications,
      },
      { key: 'sound', label: 'Sound', value: notificationSettings.sound },
      {
        key: 'autoGenerateTitle',
        label: 'Auto-Generate Title (LLM)',
        value: notificationSettings.autoGenerateTitle,
      },
    ];

    return (
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Box marginBottom={2}>
          <Text color="#00D9FF">NOTIFICATIONS</Text>
          <Box flexGrow={1} />
          <Text dimColor>{settings.filter((s) => s.value).length}/4 enabled</Text>
        </Box>

        <Box flexDirection="column">
          {settings.map((setting, idx) => {
            const isSelected = mode === 'edit' && selectedItemIndex === idx;

            return (
              <Box key={setting.key} marginBottom={1}>
                <Text dimColor>{idx + 1} </Text>
                <Text bold={isSelected} color={isSelected ? '#00D9FF' : 'white'}>
                  {setting.label}
                </Text>
                <Box flexGrow={1} />
                <Text color={setting.value ? '#00FF88' : '#FF3366'}>
                  {setting.value ? 'ON' : 'OFF'}
                </Text>
                {isSelected && mode === 'edit' && (
                  <>
                    <Text dimColor> </Text>
                    <Text color="#00D9FF">◄</Text>
                  </>
                )}
              </Box>
            );
          })}
        </Box>

        {mode === 'edit' && (
          <Box marginTop={2}>
            <Text dimColor italic>
              ↑↓ Navigate SPACE Toggle ESC Cancel
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderKeybindings = () => {
    const keybindings = [
      { keys: 'ESC', action: 'Exit dashboard / Cancel edit' },
      { keys: 'TAB', action: 'Switch section' },
      { keys: '1-6', action: 'Quick select section' },
      { keys: 'ENTER', action: 'Edit mode / Confirm' },
      { keys: '↑↓', action: 'Navigate items (edit mode)' },
      { keys: 'SPACE', action: 'Toggle/Select (edit mode)' },
    ];

    return (
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Box marginBottom={2}>
          <Text color="#00D9FF">KEYBOARD SHORTCUTS</Text>
        </Box>

        <Box flexDirection="column">
          {keybindings.map((kb, idx) => {
            return (
              <Box key={idx} marginBottom={1}>
                <Text color="#00FF88">{kb.keys}</Text>
                <Text dimColor> → </Text>
                <Text dimColor>{kb.action}</Text>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderContent = () => {
    switch (selectedSection) {
      case 'agents':
        return renderAgents();
      case 'rules':
        return renderRules();
      case 'sessions':
        return renderSessions();
      case 'providers':
        return renderProviders();
      case 'notifications':
        return renderNotifications();
      case 'keybindings':
        return renderKeybindings();
      default:
        return null;
    }
  };

  const sections: Array<{ id: DashboardSection; label: string; num: number }> = [
    { id: 'agents', label: 'Agents', num: 1 },
    { id: 'rules', label: 'Rules', num: 2 },
    { id: 'sessions', label: 'Sessions', num: 3 },
    { id: 'providers', label: 'Providers', num: 4 },
    { id: 'notifications', label: 'Notifications', num: 5 },
    { id: 'keybindings', label: 'Keybindings', num: 6 },
  ];

  return (
    <FullScreen flexDirection="column">
      {/* Header */}
      <Box flexShrink={0} paddingX={2} paddingY={1}>
        <Text bold color="#00D9FF">
          SYLPHX FLOW
        </Text>
        <Text dimColor> Control Panel</Text>
        <Box flexGrow={1} />
        {mode === 'edit' && <Text color="#FFD700">EDIT MODE</Text>}
      </Box>

      {/* Main content */}
      <Box flexGrow={1} minHeight={0} flexDirection="row">
        {/* Navigation sidebar */}
        <Box width="25%" flexShrink={0} flexDirection="column" paddingX={2} paddingY={1}>
          {sections.map((section) => {
            const isSelected = selectedSection === section.id;

            return (
              <Box key={section.id} marginBottom={1}>
                <Text dimColor>{section.num} </Text>
                <Text bold={isSelected} color={isSelected ? '#00FF88' : 'white'}>
                  {section.label}
                </Text>
                {isSelected && (
                  <>
                    <Text dimColor> </Text>
                    <Text color="#00FF88">●</Text>
                  </>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Content area */}
        <Box flexGrow={1} minHeight={0} flexDirection="column">
          {renderContent()}
        </Box>
      </Box>

      {/* Footer */}
      <Box flexShrink={0} paddingX={2} paddingY={1}>
        <Text dimColor>TAB</Text>
        <Text dimColor> Next </Text>
        <Text dimColor>ENTER</Text>
        <Text dimColor> Edit </Text>
        <Text dimColor>ESC</Text>
        <Text dimColor> Exit</Text>
        <Box flexGrow={1} />
        <Text dimColor italic>
          Press number keys 1-6 for quick navigation
        </Text>
      </Box>
    </FullScreen>
  );
}
