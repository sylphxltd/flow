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
  exitFilterMode: () => void;

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

  // Exit filter mode handler
  const exitFilterMode = () => {
    setIsFilterMode(false);
  };

  // Keyboard handling
  useInput(
    (char, key) => {
      // ESC always handled
      if (key.escape) {
        if (isFilterMode) {
          setIsFilterMode(false);
          setFilterQuery('');
        } else {
          cancel();
        }
        return;
      }

      // In filter mode: handle navigation and selection
      if (isFilterMode) {
        // Navigation in filter mode
        if (key.upArrow) {
          moveUp();
          return;
        }

        if (key.downArrow) {
          moveDown();
          return;
        }

        // Enter: select current highlighted item
        if (key.return) {
          if (filteredOptions.length > 0) {
            confirmSelection();
          }
          return;
        }

        // Space: toggle in multi-select mode
        if (multiSelect && char === ' ') {
          const option = filteredOptions[selectedIndex];
          if (option) {
            toggleSelection(option);
          }
          return;
        }

        // Other keys: let TextInput handle (typing)
        return;
      }

      // Not in filter mode - normal selection mode

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
    }
  );

  return {
    filteredOptions,
    selectedIndex,
    selectedValues,
    filterQuery,
    setFilterQuery,
    isFilterMode,
    setIsFilterMode,
    exitFilterMode,
    toggleSelection,
    confirmSelection,
    cancel,
    moveUp,
    moveDown,
  };
}
