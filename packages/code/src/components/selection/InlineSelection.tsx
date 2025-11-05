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
      return 'Type to filter  |  Enter: Confirm  |  Esc: Clear filter';
    }
    if (multiSelect) {
      return '↑↓: Navigate  |  Space: Toggle  |  Enter: Confirm  |  /: Filter  |  Esc: Cancel';
    }
    return '↑↓: Navigate  |  Enter: Select  |  /: Filter  |  Esc: Cancel';
  };

  return (
    <InputContentLayout subtitle={subtitle} helpText={getHelpText()}>
      {/* Filter Input (when in filter mode) */}
      {selection.isFilterMode && (
        <SelectionFilterInput
          value={selection.filterQuery}
          onChange={selection.setFilterQuery}
          placeholder={filterPlaceholder}
        />
      )}

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
