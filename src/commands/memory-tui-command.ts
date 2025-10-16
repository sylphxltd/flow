#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { MemoryTUI } from '../components/MemoryTUI.js';
import type { CommandConfig } from '../types.js';

export const handleMemoryTui = async () => {
  const { waitUntilExit } = render(React.createElement(MemoryTUI));
  await waitUntilExit();
};

export const memoryTuiCommand: CommandConfig = {
  name: 'memory-tui',
  description: 'Launch interactive memory management TUI',
  options: [],
  handler: handleMemoryTui,
};
