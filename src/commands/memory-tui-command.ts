#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { MemoryTUI } from '../components/MemoryTUI.js';
import type { CommandConfig } from '../types.js';

export const handleMemoryTui = async () => {
  const { waitUntilExit } = render(React.createElement(MemoryTUI), {
    // Configure Ink for better input handling and performance
    exitOnCtrlC: false, // Handle Ctrl+C manually in useInput
    patchConsole: false, // Prevent console output interference
    debug: false, // Set to true for development debugging
    maxFps: 30, // Limit frame rate for better performance
  });
  await waitUntilExit();
};

export const memoryTuiCommand: CommandConfig = {
  name: 'memory-tui',
  description: 'Launch interactive memory management TUI',
  options: [],
  handler: handleMemoryTui,
};
