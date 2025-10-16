#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { SimpleMemoryTUI } from '../components/SimpleMemoryTUI.js';
import type { CommandConfig } from '../types.js';

export const memoryTuiCommand: CommandConfig = {
  name: 'memory-tui',
  description: 'Launch interactive memory management TUI',
  options: [],
};

export const handleMemoryTui = async () => {
  const { waitUntilExit } = render(React.createElement(SimpleMemoryTUI));
  await waitUntilExit();
};