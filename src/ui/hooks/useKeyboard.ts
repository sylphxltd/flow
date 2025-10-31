/**
 * Keyboard Hook
 * Handle keyboard events (Esc to go back)
 */

import { useInput } from 'ink';
import { useAppStore } from '../stores/app-store.js';

export function useKeyboard() {
  const navigateTo = useAppStore((state) => state.navigateTo);
  const currentScreen = useAppStore((state) => state.currentScreen);

  useInput((input, key) => {
    // Handle Escape key
    if (key.escape) {
      // Go back to main menu from any screen
      if (currentScreen !== 'main-menu') {
        navigateTo('main-menu');
      }
    }

    // Handle Ctrl+C
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  });
}
