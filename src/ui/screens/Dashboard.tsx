/**
 * Dashboard Screen - Full-screen interactive control panel
 * Features: Keyboard navigation, full management capabilities
 */

import React, { useState, useRef } from 'react';
import { Box, Text, useInput, DOMElement } from 'ink';
import { MouseProvider, useOnMouseClick, useOnMouseHover } from '@zenobius/ink-mouse';
import { FullScreen } from '../components/FullScreen.js';
import { useAppStore } from '../stores/app-store.js';
import { getAllAgents, switchAgent } from '../../core/agent-manager.js';
import { getAllRules, toggleRule } from '../../core/rule-manager.js';

type DashboardSection =
  | 'agents'
  | 'rules'
  | 'sessions'
  | 'providers'
  | 'notifications'
  | 'keybindings';

type InteractionMode = 'browse' | 'edit';

interface ClickableItemProps {
  children: React.ReactNode;
  onClick: () => void;
  isHovered?: boolean;
  onHoverChange?: (hovering: boolean) => void;
}

function ClickableItem({ children, onClick, isHovered: externalHover, onHoverChange }: ClickableItemProps) {
  const ref = useRef<DOMElement | null>(null);
  const [internalHover, setInternalHover] = useState(false);

  useOnMouseHover(ref, (hovering) => {
    setInternalHover(hovering);
    onHoverChange?.(hovering);
  });

  useOnMouseClick(ref, (event) => {
    if (event) onClick();
  });

  const isHovered = externalHover !== undefined ? externalHover : internalHover;

  return (
    <Box ref={ref}>
      {children}
    </Box>
  );
}

export default function Dashboard() {
  const [selectedSection, setSelectedSection] = useState<DashboardSection>('agents');
  const [mode, setMode] = useState<InteractionMode>('browse');
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredSection, setHoveredSection] = useState<DashboardSection | null>(null);

  const currentAgentId = useAppStore((state) => state.currentAgentId);
  const enabledRuleIds = useAppStore((state) => state.enabledRuleIds);
  const sessions = useAppStore((state) => state.sessions);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const notificationSettings = useAppStore((state) => state.notificationSettings);
  const updateNotificationSettings = useAppStore((state) => state.updateNotificationSettings);
  const navigateTo = useAppStore((state) => state.navigateTo);

  const agents = getAllAgents();
  const rules = getAllRules();

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
      const sections: DashboardSection[] = ['agents', 'rules', 'sessions', 'providers', 'notifications', 'keybindings'];
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
        const sections: DashboardSection[] = ['agents', 'rules', 'sessions', 'providers', 'notifications', 'keybindings'];
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
        return 2;
      default:
        return 0;
    }
  };

  const handleAction = () => {
    switch (selectedSection) {
      case 'agents':
        if (agents[selectedItemIndex]) {
          switchAgent(agents[selectedItemIndex].id);
          setMode('browse');
        }
        break;

      case 'rules':
        if (rules[selectedItemIndex]) {
          toggleRule(rules[selectedItemIndex].id);
        }
        break;

      case 'notifications':
        const settings = ['osNotifications', 'terminalNotifications', 'sound'] as const;
        const setting = settings[selectedItemIndex];
        if (setting) {
          // Read current state at action time, not closure time
          const currentSettings = useAppStore.getState().notificationSettings;
          updateNotificationSettings({ [setting]: !currentSettings[setting] });
        }
        break;
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
            const isActive = agent.id === currentAgentId;
            const isSelected = mode === 'edit' && selectedItemIndex === idx;
            const isHovered = hoveredIndex === idx;

            return (
              <ClickableItem
                key={agent.id}
                onClick={() => {
                  switchAgent(agent.id);
                  setMode('browse');
                }}
                onHoverChange={(hovering) => {
                  setHoveredIndex(hovering ? idx : null);
                }}
              >
                <Box marginBottom={1} paddingY={0}>
                  <Text dimColor>{idx + 1}  </Text>
                  <Text
                    bold={isActive || isSelected}
                    color={
                      isActive
                        ? '#00FF88'
                        : isSelected
                        ? '#00D9FF'
                        : isHovered
                        ? '#FFD700'
                        : 'white'
                    }
                  >
                    {agent.metadata.name}
                  </Text>
                  {isActive && (
                    <>
                      <Text dimColor>  </Text>
                      <Text color="#00FF88">●</Text>
                    </>
                  )}
                  {isSelected && mode === 'edit' && (
                    <>
                      <Text dimColor>  </Text>
                      <Text color="#00D9FF">◄</Text>
                    </>
                  )}
                </Box>
              </ClickableItem>
            );
          })}
        </Box>

        {mode === 'edit' && (
          <Box marginTop={2}>
            <Text dimColor italic>↑↓ Navigate  ENTER/SPACE Switch  ESC Cancel</Text>
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
          <Text dimColor>{enabledRuleIds.length}/{rules.length} enabled</Text>
        </Box>

        <Box flexDirection="column">
          {rules.map((rule, idx) => {
            const isEnabled = enabledRuleIds.includes(rule.id);
            const isSelected = mode === 'edit' && selectedItemIndex === idx;
            const isHovered = hoveredIndex === idx;

            return (
              <ClickableItem
                key={rule.id}
                onClick={() => toggleRule(rule.id)}
                onHoverChange={(hovering) => {
                  setHoveredIndex(hovering ? idx : null);
                }}
              >
                <Box marginBottom={1} paddingY={0}>
                  <Text dimColor>{idx + 1}  </Text>
                  <Text
                    bold={isSelected}
                    color={
                      isSelected
                        ? '#00D9FF'
                        : isHovered
                        ? '#FFD700'
                        : isEnabled
                        ? '#00FF88'
                        : 'gray'
                    }
                  >
                    {rule.id}
                  </Text>
                  <Box flexGrow={1} />
                  <Text color={isEnabled ? '#00FF88' : '#FF3366'}>
                    {isEnabled ? 'ON' : 'OFF'}
                  </Text>
                  {isSelected && mode === 'edit' && (
                    <>
                      <Text dimColor>  </Text>
                      <Text color="#00D9FF">◄</Text>
                    </>
                  )}
                </Box>
              </ClickableItem>
            );
          })}
        </Box>

        {mode === 'edit' && (
          <Box marginTop={2}>
            <Text dimColor italic>↑↓ Navigate  SPACE Toggle  ESC Cancel</Text>
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
                <Text dimColor>{idx + 1}  </Text>
                <Text color="#00FF88">
                  {session.title || 'New Chat'}
                </Text>
                <Text dimColor>  {session.messages.length} msg</Text>
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
                  <Text dimColor>{idx + 1}  </Text>
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
      { key: 'osNotifications', label: 'OS Notifications', value: notificationSettings.osNotifications },
      { key: 'terminalNotifications', label: 'Terminal', value: notificationSettings.terminalNotifications },
      { key: 'sound', label: 'Sound', value: notificationSettings.sound },
    ];

    return (
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Box marginBottom={2}>
          <Text color="#00D9FF">NOTIFICATIONS</Text>
          <Box flexGrow={1} />
          <Text dimColor>{settings.filter(s => s.value).length}/3 enabled</Text>
        </Box>

        <Box flexDirection="column">
          {settings.map((setting, idx) => {
            const isSelected = mode === 'edit' && selectedItemIndex === idx;

            return (
              <Box key={setting.key} marginBottom={1}>
                <Text dimColor>{idx + 1}  </Text>
                <Text
                  bold={isSelected}
                  color={isSelected ? '#00D9FF' : 'white'}
                >
                  {setting.label}
                </Text>
                <Box flexGrow={1} />
                <Text color={setting.value ? '#00FF88' : '#FF3366'}>
                  {setting.value ? 'ON' : 'OFF'}
                </Text>
                {isSelected && mode === 'edit' && (
                  <>
                    <Text dimColor>  </Text>
                    <Text color="#00D9FF">◄</Text>
                  </>
                )}
              </Box>
            );
          })}
        </Box>

        {mode === 'edit' && (
          <Box marginTop={2}>
            <Text dimColor italic>↑↓ Navigate  SPACE Toggle  ESC Cancel</Text>
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
                <Text dimColor>  →  </Text>
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
      <Box paddingX={2} paddingY={0}>
        <Text bold color="#00D9FF">SYLPHX FLOW</Text>
        <Text dimColor>  Control Panel</Text>
        <Box flexGrow={1} />
        {mode === 'edit' && (
          <Text color="#FFD700">EDIT MODE</Text>
        )}
      </Box>

      {/* Main content */}
      <Box flexGrow={1} flexDirection="row">
        {/* Navigation sidebar */}
        <Box width="25%" flexDirection="column" paddingX={2} paddingY={1}>
          {sections.map((section) => {
            const isSelected = selectedSection === section.id;
            const isHovered = hoveredSection === section.id;

            return (
              <ClickableItem
                key={section.id}
                onClick={() => {
                  setSelectedSection(section.id);
                  setSelectedItemIndex(0);
                }}
                onHoverChange={(hovering) => {
                  setHoveredSection(hovering ? section.id : null);
                }}
              >
                <Box marginBottom={2}>
                  <Text dimColor>{section.num}  </Text>
                  <Text
                    bold={isSelected}
                    color={
                      isSelected
                        ? '#00FF88'
                        : isHovered
                        ? '#FFD700'
                        : 'white'
                    }
                  >
                    {section.label}
                  </Text>
                  {isSelected && (
                    <>
                      <Text dimColor>  </Text>
                      <Text color="#00FF88">●</Text>
                    </>
                  )}
                </Box>
              </ClickableItem>
            );
          })}
        </Box>

        {/* Content area */}
        <Box flexGrow={1} flexDirection="column">
          {renderContent()}
        </Box>
      </Box>

      {/* Footer */}
      <Box paddingX={2} paddingY={0}>
        <Text dimColor>TAB</Text>
        <Text dimColor>  Next  </Text>
        <Text dimColor>ESC</Text>
        <Text dimColor>  Exit</Text>
        <Box flexGrow={1} />
        <Text dimColor italic>Full-screen Interactive Panel</Text>
      </Box>
    </FullScreen>
  );
}
