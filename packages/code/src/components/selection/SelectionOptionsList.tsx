/**
 * SelectionOptionsList Component
 * Primitive component for displaying selection options
 */

import { Box, Text } from 'ink';
import type { SelectionOption } from '../../hooks/useSelection.js';

interface SelectionOptionsListProps {
  options: SelectionOption[];
  selectedIndex: number;
  selectedValues?: Set<string>;
  multiSelect?: boolean;
  emptyMessage?: string;
}

export function SelectionOptionsList({
  options,
  selectedIndex,
  selectedValues = new Set(),
  multiSelect = false,
  emptyMessage = 'No options available'
}: SelectionOptionsListProps) {
  if (options.length === 0) {
    return (
      <Box>
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {options.map((option, idx) => {
        const isSelected = idx === selectedIndex;
        const isChecked = selectedValues.has(option.value || option.label);

        // Symbol: multiselect uses [X]/[ ], single select uses >
        const symbol = multiSelect
          ? isChecked ? '[X]' : '[ ]'
          : isSelected ? '>' : ' ';

        return (
          <Box key={`${option.value || option.label}-${idx}`} flexDirection="column" marginBottom={idx < options.length - 1 ? 1 : 0}>
            <Box>
              <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                {symbol} {option.label}
              </Text>
              {option.badge && (
                <Text color={option.badge.color}> {option.badge.text}</Text>
              )}
            </Box>
            {option.description && (
              <Box marginLeft={2}>
                <Text dimColor>{option.description}</Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
