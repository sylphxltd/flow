/**
 * Command State Hook
 * Manages command menu, pending commands, and selection state
 */

import { useState, useRef } from 'react';
import type { Command } from '../../../commands/types.js';

export interface CommandState {
  ctrlPressed: boolean;
  setCtrlPressed: (pressed: boolean) => void;
  showCommandMenu: boolean;
  setShowCommandMenu: (show: boolean) => void;
  selectedCommandIndex: number;
  setSelectedCommandIndex: (index: number) => void;
  pendingCommand: { command: Command; currentInput: string } | null;
  setPendingCommand: (command: { command: Command; currentInput: string } | null) => void;
  skipNextSubmit: React.MutableRefObject<boolean>;
  lastEscapeTime: React.MutableRefObject<number>;
  showEscHint: boolean;
  setShowEscHint: (show: boolean) => void;
  selectedFileIndex: number;
  setSelectedFileIndex: (index: number) => void;
  cachedOptions: Map<string, Array<{ id: string; name: string }>>;
  setCachedOptions: (options: Map<string, Array<{ id: string; name: string }>>) => void;
  currentlyLoading: string | null;
  setCurrentlyLoading: (loading: string | null) => void;
  loadError: string | null;
  setLoadError: (error: string | null) => void;
  commandSessionRef: React.MutableRefObject<string | null>;
}

export function useCommandState(): CommandState {
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [pendingCommand, setPendingCommand] = useState<{ command: Command; currentInput: string } | null>(null);
  const skipNextSubmit = useRef(false);
  const lastEscapeTime = useRef<number>(0);
  const [showEscHint, setShowEscHint] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [cachedOptions, setCachedOptions] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map());
  const [currentlyLoading, setCurrentlyLoading] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const commandSessionRef = useRef<string | null>(null);

  return {
    ctrlPressed,
    setCtrlPressed,
    showCommandMenu,
    setShowCommandMenu,
    selectedCommandIndex,
    setSelectedCommandIndex,
    pendingCommand,
    setPendingCommand,
    skipNextSubmit,
    lastEscapeTime,
    showEscHint,
    setShowEscHint,
    selectedFileIndex,
    setSelectedFileIndex,
    cachedOptions,
    setCachedOptions,
    currentlyLoading,
    setCurrentlyLoading,
    loadError,
    setLoadError,
    commandSessionRef,
  };
}
