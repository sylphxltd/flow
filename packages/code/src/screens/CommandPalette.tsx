/**
 * Command Palette Screen
 * VSCode-style command palette with search and autocomplete
 */

import { useAppStore } from '@sylphx/code-client';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { useState } from 'react';

interface Command {
  label: string;
  value: string;
  description: string;
}

const COMMANDS: Command[] = [
  {
    label: '⚙️  Provider Management',
    value: 'provider-management',
    description: 'Configure AI providers and API keys',
  },
  {
    label: '🤖 Model Selection',
    value: 'model-selection',
    description: 'Switch AI model',
  },
  {
    label: '📋 Toggle Debug Logs',
    value: 'toggle-logs',
    description: 'Show/hide debug log panel',
  },
  {
    label: '💬 Back to Chat',
    value: 'chat',
    description: 'Return to chat screen',
  },
  {
    label: '🚪 Quit',
    value: 'quit',
    description: 'Exit application',
  },
];

interface CommandPaletteProps {
  onCommand: (command: string) => void;
}

export default function CommandPalette({ onCommand }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigateTo = useAppStore((state) => state.navigateTo);

  // Filter commands by search query
  const filteredCommands = COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (item: Command) => {
    if (item.value === 'quit') {
      process.exit(0);
    } else if (item.value === 'toggle-logs') {
      onCommand('toggle-logs');
      navigateTo('chat');
    } else {
      navigateTo(item.value as any);
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <Box flexShrink={0} paddingBottom={1}>
        <Text color="#00D9FF">▌ COMMAND PALETTE</Text>
      </Box>

      {/* Search Input */}
      <Box flexShrink={0} paddingY={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text dimColor>Type to search commands...</Text>
        </Box>
        <TextInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search..."
          showCursor
        />
      </Box>

      {/* Command List */}
      <Box flexGrow={1} paddingY={1} flexDirection="column">
        {filteredCommands.length === 0 ? (
          <Box>
            <Text color="#FFD700">▌</Text>
            <Text dimColor> No commands found</Text>
          </Box>
        ) : (
          <>
            <Box marginBottom={1}>
              <Text dimColor>
                {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
              </Text>
            </Box>
            <SelectInput
              items={filteredCommands.map((cmd) => ({
                label: `${cmd.label} · ${cmd.description}`,
                value: cmd.value,
              }))}
              onSelect={(item) => {
                const command = filteredCommands.find((c) => c.value === item.value);
                if (command) handleSelect(command);
              }}
            />
          </>
        )}
      </Box>

      {/* Footer */}
      <Box flexShrink={0} paddingTop={1}>
        <Text dimColor>↑↓ Navigate · Type to Search · Enter Select · Esc Cancel</Text>
      </Box>
    </Box>
  );
}
