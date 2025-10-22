#!/usr/bin/env node
import { Effect } from 'effect';
import { runMemoryTUI } from '../components/EffectMemoryTUI.js';
import { TerminalServiceLive } from '../services/terminal-service.js';
import type { CommandConfig } from '../types.js';

export const handleMemoryTui = async () => {
  try {
    await Effect.runPromise(runMemoryTUI().pipe(Effect.provide(TerminalServiceLive)));
  } catch (error) {
    console.error('TUI Error:', error);
    process.exit(1);
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
