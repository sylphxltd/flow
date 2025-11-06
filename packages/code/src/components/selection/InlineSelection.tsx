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
      if (multiSelect) {
        return 'Type to filter  |  ↑↓: Navigate  |  Space: Toggle  |  Enter: Confirm  |  Esc: Clear';
      }
      return 'Type to filter  |  ↑↓: Navigate  |  Enter: Select  |  Esc: Clear';
    }
    if (multiSelect) {
      const filterHint = filter ? '  |  /: Filter' : '';
      return `↑↓: Navigate  |  Space: Toggle  |  Enter: Confirm${filterHint}  |  Esc: Cancel`;
    }
    const filterHint = filter ? '  |  /: Filter' : '';
    return `↑↓: Navigate  |  Enter: Select${filterHint}  |  Esc: Cancel`;
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
