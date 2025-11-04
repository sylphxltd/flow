/**
 * Selection State Hook
 * Manages multi-selection, pending input, and filter state for command interactions
 */

import { useRef, useState } from 'react';
import type { WaitForInputOptions } from '../../../commands/types.js';

export interface SelectionState {
  pendingInput: WaitForInputOptions | null;
  setPendingInput: (input: WaitForInputOptions | null) => void;
  inputResolver: React.MutableRefObject<
    ((value: string | Record<string, string | string[]>) => void) | null
  >;
  selectionFilter: string;
  setSelectionFilter: (filter: string) => void;
  isFilterMode: boolean;
  setIsFilterMode: (mode: boolean) => void;
  multiSelectionPage: number;
  setMultiSelectionPage: (page: number) => void;
  multiSelectionAnswers: Record<string, string | string[]>;
  setMultiSelectionAnswers: (answers: Record<string, string | string[]>) => void;
  multiSelectChoices: Set<string>;
  setMultiSelectChoices: (choices: Set<string>) => void;
  freeTextInput: string;
  setFreeTextInput: (input: string) => void;
  isFreeTextMode: boolean;
  setIsFreeTextMode: (mode: boolean) => void;
  askQueueLength: number;
  setAskQueueLength: (length: number) => void;
}

export function useSelectionState(): SelectionState {
  const [pendingInput, setPendingInput] = useState<WaitForInputOptions | null>(null);
  const inputResolver = useRef<
    ((value: string | Record<string, string | string[]>) => void) | null
  >(null);
  const [selectionFilter, setSelectionFilter] = useState('');
  const [isFilterMode, setIsFilterMode] = useState(false);
  const [multiSelectionPage, setMultiSelectionPage] = useState(0);
  const [multiSelectionAnswers, setMultiSelectionAnswers] = useState<
    Record<string, string | string[]>
  >({});
  const [multiSelectChoices, setMultiSelectChoices] = useState<Set<string>>(new Set());
  const [freeTextInput, setFreeTextInput] = useState('');
  const [isFreeTextMode, setIsFreeTextMode] = useState(false);
  const [askQueueLength, setAskQueueLength] = useState(0);

  return {
    pendingInput,
    setPendingInput,
    inputResolver,
    selectionFilter,
    setSelectionFilter,
    isFilterMode,
    setIsFilterMode,
    multiSelectionPage,
    setMultiSelectionPage,
    multiSelectionAnswers,
    setMultiSelectionAnswers,
    multiSelectChoices,
    setMultiSelectChoices,
    freeTextInput,
    setFreeTextInput,
    isFreeTextMode,
    setIsFreeTextMode,
    askQueueLength,
    setAskQueueLength,
  };
}
