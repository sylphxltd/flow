/**
 * Mouse tracking hook for Ink
 * Enables mouse support in terminal with click and hover events
 */

import { useEffect, useState } from 'react';
import { useStdin } from 'ink';

export interface MousePosition {
  x: number;
  y: number;
}

export interface MouseEvent {
  position: MousePosition;
  type: 'click' | 'move';
  button?: 'left' | 'right' | 'middle';
}

export function useMouse(enabled = true) {
  const { stdin, setRawMode } = useStdin();
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [lastClick, setLastClick] = useState<MouseEvent | null>(null);

  useEffect(() => {
    if (!enabled || !stdin || !setRawMode) {
      return;
    }

    // Enable mouse tracking
    // \x1b[?1000h - Enable mouse button tracking
    // \x1b[?1003h - Enable mouse motion tracking
    // \x1b[?1006h - Enable SGR mouse mode (better coordinate handling)
    process.stdout.write('\x1b[?1000h\x1b[?1003h\x1b[?1006h');

    const handleData = (data: Buffer) => {
      const str = data.toString();

      // Parse SGR mouse events: \x1b[<b;x;y M/m
      const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
      if (sgrMatch) {
        const button = parseInt(sgrMatch[1]);
        const x = parseInt(sgrMatch[2]) - 1; // Convert to 0-based
        const y = parseInt(sgrMatch[3]) - 1;
        const pressed = sgrMatch[4] === 'M';

        const position = { x, y };
        setMousePosition(position);

        // Detect click (button press)
        if (pressed && button < 3) {
          const buttonType = button === 0 ? 'left' : button === 1 ? 'middle' : 'right';
          const clickEvent: MouseEvent = {
            position,
            type: 'click',
            button: buttonType,
          };
          setLastClick(clickEvent);
        } else if (button === 32 || button === 35) {
          // Mouse move (with or without button held)
          const moveEvent: MouseEvent = {
            position,
            type: 'move',
          };
          // Don't update lastClick for moves, just position
        }
      }
    };

    stdin.on('data', handleData);

    return () => {
      stdin.off('data', handleData);
      // Disable mouse tracking
      process.stdout.write('\x1b[?1000l\x1b[?1003l\x1b[?1006l');
    };
  }, [enabled, stdin, setRawMode]);

  return {
    position: mousePosition,
    lastClick,
    clearClick: () => setLastClick(null),
  };
}
