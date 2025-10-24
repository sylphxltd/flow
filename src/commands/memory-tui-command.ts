#!/usr/bin/env node
import type { CommandConfig } from '../types.js';
import { handleMemoryTui } from '../utils/memory-tui.js';

export const handleMemoryTuiCommand = async () => {
  await handleMemoryTui();
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
  handler: handleMemoryTuiCommand,
};
