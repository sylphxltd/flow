/**
 * useSelection Hook
 * Headless selection logic - handles filtering, keyboard navigation, multi-select
 *
 * Separates logic from presentation for maximum reusability
 */

import { useState, useEffect, useMemo } from 'react';
import { useInput } from 'ink';

export interface SelectionOption {
  label: string;
  value?: string;
  description?: string;
  disabled?: boolean;
  badge?: {
    text: string;
    color: string;
  };
}

export interface UseSelectionOptions {
  options: SelectionOption[];
  multiSelect?: boolean;
  filter?: boolean;
  preSelected?: string[]; // Pre-selected values for multi-select
  onSelect?: (value: string | string[]) => void;
  onCancel?: () => void;
}

export interface UseSelectionReturn {
  // Filtered options based on filter query
  filteredOptions: SelectionOption[];

  // Currently selected index
  selectedIndex: number;

  // Multi-select: set of selected values
  selectedValues: Set<string>;

  // Filter state
  filterQuery: string;
  setFilterQuery: (query: string) => void;
  isFilterMode: boolean;
  setIsFilterMode: (mode: boolean) => void;

  // Actions
  toggleSelection: (option: SelectionOption) => void;
  confirmSelection: () => void;
  cancel: () => void;

  // Navigation
  moveUp: () => void;
  moveDown: () => void;
}

/**
 * useSelection - Core selection logic
 *
 * ASSUMPTION: Uses '/' to enter filter mode (standard pattern)
 * ASSUMPTION: ESC to cancel or exit filter mode
 */
export function useSelection({
  options,
  multiSelect = false,
  filter = true,
  preSelected = [],
  onSelect,
  onCancel,
}: UseSelectionOptions): UseSelectionReturn {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set(preSelected));
  const [filterQuery, setFilterQuery] = useState('');
  const [isFilterMode, setIsFilterMode] = useState(false);

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    if (!filterQuery) return options;

    const query = filterQuery.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(query) ||
      opt.value?.toLowerCase().includes(query) ||
      opt.description?.toLowerCase().includes(query)
    );
  }, [options, filterQuery]);

  // Reset selected index when filter changes
  useEffect(() => {
    if (filterQuery) {
      setSelectedIndex(0);
    }
  }, [filterQuery]);

  // Actions
  const toggleSelection = (option: SelectionOption) => {
    const value = option.value || option.label;
    const newValues = new Set(selectedValues);

    if (newValues.has(value)) {
      newValues.delete(value);
    } else {
      newValues.add(value);
    }

    setSelectedValues(newValues);
  };

  const confirmSelection = () => {
    if (multiSelect) {
      onSelect?.(Array.from(selectedValues));
    } else {
      const option = filteredOptions[selectedIndex];
      if (option) {
        onSelect?.(option.value || option.label);
      }
    }
  };

  const cancel = () => {
    onCancel?.();
  };

  const moveUp = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
  };

  const moveDown = () => {
    setSelectedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
  };

  // Keyboard handling
  useInput(
    (char, key) => {
      if (key.escape) {
        if (isFilterMode) {
          setIsFilterMode(false);
          setFilterQuery('');
        } else {
          cancel();
        }
        return;
      }

      // Don't handle keys in filter mode (let TextInput handle it)
      if (isFilterMode) return;

      // Enter filter mode
      if (filter && char === '/') {
        setIsFilterMode(true);
        return;
      }

      // Navigation
      if (key.upArrow) {
        moveUp();
        return;
      }

      if (key.downArrow) {
        moveDown();
        return;
      }

      // Selection
      if (key.return) {
        if (multiSelect) {
          confirmSelection();
        } else {
          confirmSelection();
        }
        return;
      }

      // Multi-select toggle
      if (multiSelect && char === ' ') {
        const option = filteredOptions[selectedIndex];
        if (option) {
          toggleSelection(option);
        }
        return;
      }
    },
    { isActive: !isFilterMode }
  );

  return {
    filteredOptions,
    selectedIndex,
    selectedValues,
    filterQuery,
    setFilterQuery,
    isFilterMode,
    setIsFilterMode,
    toggleSelection,
    confirmSelection,
    cancel,
    moveUp,
    moveDown,
  };
}
