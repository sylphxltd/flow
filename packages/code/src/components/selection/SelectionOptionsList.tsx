/**
 * SelectionOptionsList Component
 * Primitive component for displaying selection options with scroll viewport
 */

import { Box, Text } from 'ink';
import type { SelectionOption } from '../../hooks/useSelection.js';
import { calculateScrollViewport } from '../../utils/scroll-viewport.js';

interface SelectionOptionsListProps {
  options: SelectionOption[];
  selectedIndex: number;
  selectedValues?: Set<string>;
  multiSelect?: boolean;
  emptyMessage?: string;
  maxVisible?: number;
}

export function SelectionOptionsList({
  options,
  selectedIndex,
  selectedValues = new Set(),
  multiSelect = false,
  emptyMessage = 'No options available',
  maxVisible = 5
}: SelectionOptionsListProps) {
  if (options.length === 0) {
    return (
      <Box>
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  // Calculate scroll viewport
  const viewport = calculateScrollViewport(options, selectedIndex, maxVisible);

  return (
    <Box flexDirection="column">
      {/* Items above indicator */}
      {viewport.hasItemsAbove && (
        <Box marginBottom={1}>
          <Text dimColor>↑ {viewport.itemsAboveCount} more above</Text>
        </Box>
      )}

      {/* Visible items */}
      {viewport.visibleItems.map((option, idx) => {
        const absoluteIdx = viewport.scrollOffset + idx;
        const isSelected = absoluteIdx === selectedIndex;
        const isChecked = selectedValues.has(option.value || option.label);

        // Symbol: multiselect uses [X]/[ ], single select uses >
        const symbol = multiSelect
          ? isChecked ? '[✓]' : '[ ]'
          : isSelected ? '▶' : ' ';

        return (
          <Box key={`${option.value || option.label}-${absoluteIdx}`} flexDirection="column" marginBottom={idx < viewport.visibleItems.length - 1 ? 1 : 0}>
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

      {/* Items below indicator */}
      {viewport.hasItemsBelow && (
        <Box marginTop={1}>
          <Text dimColor>↓ {viewport.itemsBelowCount} more below</Text>
        </Box>
      )}
    </Box>
  );
}
