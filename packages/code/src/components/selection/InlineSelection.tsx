/**
 * InlineSelection Component
 * Composable inline selection container
 * Uses composition pattern with primitives
 */

import { useSelection, type SelectionOption } from '../../hooks/useSelection.js';
import { InputContentLayout } from '../../screens/chat/components/InputContentLayout.js';
import { SelectionFilterInput } from './SelectionFilterInput.js';
import { SelectionOptionsList } from './SelectionOptionsList.js';

interface InlineSelectionProps {
  options: SelectionOption[];
  subtitle?: string;
  multiSelect?: boolean;
  filter?: boolean;
  preSelected?: string[];
  emptyMessage?: string;
  filterPlaceholder?: string;
  onSelect: (value: string | string[]) => void;
  onCancel: () => void;
}

/**
 * InlineSelection - Composable inline selection UI
 *
 * Uses composition of primitives:
 * - SelectionFilterInput (when filter enabled)
 * - SelectionOptionsList (always)
 *
 * Layout via InputContentLayout for consistency
 */
export function InlineSelection({
  options,
  subtitle,
  multiSelect = false,
  filter = true,
  preSelected = [],
  emptyMessage,
  filterPlaceholder,
  onSelect,
  onCancel,
}: InlineSelectionProps) {
  const selection = useSelection({
    options,
    multiSelect,
    filter,
    preSelected,
    onSelect,
    onCancel,
  });

  // Help text based on mode
  const getHelpText = (): string => {
    if (selection.isFilterMode) {
      return 'Type to filter  |  Enter: Apply filter  |  Esc: Cancel';
    }

    // Show different hints based on whether filter is active
    const hasFilter = selection.filterQuery.length > 0;

    if (multiSelect) {
      const filterHint = filter ? (hasFilter ? '  |  /: Edit filter' : '  |  /: Filter') : '';
      const clearHint = hasFilter ? '  |  Esc: Clear filter' : '  |  Esc: Cancel';
      return `↑↓: Navigate  |  Space: Toggle  |  Enter: Confirm${filterHint}${clearHint}`;
    }

    const filterHint = filter ? (hasFilter ? '  |  /: Edit filter' : '  |  /: Filter') : '';
    const clearHint = hasFilter ? '  |  Esc: Clear filter' : '  |  Esc: Cancel';
    return `↑↓: Navigate  |  Enter: Select${filterHint}${clearHint}`;
  };

  return (
    <InputContentLayout subtitle={subtitle} helpText={getHelpText()}>
      {/* Filter Display */}
      {selection.isFilterMode ? (
        // Active filter input (editable)
        <SelectionFilterInput
          value={selection.filterQuery}
          onChange={selection.setFilterQuery}
          placeholder={filterPlaceholder}
        />
      ) : selection.filterQuery ? (
        // Filter applied (read-only display)
        <Box marginBottom={1}>
          <Text dimColor>Filter: </Text>
          <Text color="cyan">{selection.filterQuery}</Text>
          <Text dimColor> (press / to edit, Esc to clear)</Text>
        </Box>
      ) : null}

      {/* Options List */}
      <SelectionOptionsList
        options={selection.filteredOptions}
        selectedIndex={selection.selectedIndex}
        selectedValues={selection.selectedValues}
        multiSelect={multiSelect}
        emptyMessage={emptyMessage}
      />
    </InputContentLayout>
  );
}
