#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { FullscreenMemoryTUI } from '../components/FullscreenMemoryTUI.js';
import type { CommandConfig } from '../types.js';

export const handleMemoryTui = async () => {
  // Clear terminal and set up fullscreen
  process.stdout.write('\x1b[2J\x1b[H'); // Clear screen and move cursor to top

  const { waitUntilExit } = render(React.createElement(FullscreenMemoryTUI), {
    // Configure Ink for fullscreen experience
    exitOnCtrlC: false, // Handle Ctrl+C manually in useInput
    patchConsole: false, // Prevent console output interference
    debug: false, // Set to true for development debugging
    maxFps: 60, // Higher FPS for smoother experience
  });

  try {
    await waitUntilExit();
  } finally {
    // Restore terminal on exit
    process.stdout.write('\x1b[2J\x1b[H'); // Clear screen on exit
  }
};

import { targetManager } from '../core/target-manager.js';

export const memoryTuiCommand: CommandConfig = {
  name: 'memory-tui',
  description: 'Launch interactive memory management TUI',
  options: [
    {
      flags: '--target <type>',
      description: `Target platform (${targetManager.getImplementedTargets().join(', ')}, default: auto-detect)`,
    },
  ],
  handler: handleMemoryTui,
};
