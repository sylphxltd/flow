/**
 * Keyboard Hook
 * Handle global keyboard shortcuts
 */

import { useInput } from 'ink';
import { useAppStore } from '../stores/app-store.js';

export function useKeyboard() {
  const navigateTo = useAppStore((state) => state.navigateTo);
  const currentScreen = useAppStore((state) => state.currentScreen);

  useInput((input, key) => {
    // Handle Escape key - go back to chat
    if (key.escape) {
      if (currentScreen !== 'chat') {
        navigateTo('chat');
      }
    }

    // Handle Ctrl+Q - Quit
    if (key.ctrl && input === 'q') {
      process.exit(0);
    }

    // Handle Ctrl+C - Quit
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  });
}
