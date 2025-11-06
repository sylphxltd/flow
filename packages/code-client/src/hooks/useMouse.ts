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
  const { stdin, setRawMode, isRawModeSupported } = useStdin();
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [lastClick, setLastClick] = useState<MouseEvent | null>(null);

  useEffect(() => {
    if (!enabled || !stdin) {
      return;
    }

    // Enable raw mode if supported
    if (isRawModeSupported && setRawMode) {
      setRawMode(true);
    }

    // Enable mouse tracking
    // \x1b[?1000h - Enable mouse button tracking
    // \x1b[?1003h - Enable mouse motion tracking (all events)
    // \x1b[?1006h - Enable SGR mouse mode (better coordinate handling)
    // \x1b[?1015h - Enable urxvt mouse mode (for some terminals)
    process.stdout.write('\x1b[?1000h');
    process.stdout.write('\x1b[?1003h');
    process.stdout.write('\x1b[?1006h');
    process.stdout.write('\x1b[?1015h');

    const handleData = (data: Buffer) => {
      const str = data.toString();

      // Debug: log raw mouse data
      if (process.env.DEBUG_MOUSE) {
        console.error('Mouse data:', str.split('').map(c => c.charCodeAt(0).toString(16)).join(' '));
      }

      // Parse SGR mouse events: \x1b[<b;x;y M/m
      const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
      if (sgrMatch && sgrMatch[1] && sgrMatch[2] && sgrMatch[3] && sgrMatch[4]) {
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
          // Just update position, not lastClick
        }
        return;
      }

      // Try parsing X10 format: \x1b[Mbxy
      const x10Match = str.match(/\x1b\[M(.)(.)(.)/);
      if (x10Match && x10Match[1] && x10Match[2] && x10Match[3]) {
        const button = x10Match[1].charCodeAt(0) - 32;
        const x = x10Match[2].charCodeAt(0) - 33;
        const y = x10Match[3].charCodeAt(0) - 33;

        setMousePosition({ x, y });

        if (button < 3) {
          setLastClick({
            position: { x, y },
            type: 'click',
            button: button === 0 ? 'left' : button === 1 ? 'middle' : 'right',
          });
        }
      }
    };

    stdin.on('data', handleData);

    return () => {
      stdin.off('data', handleData);

      // Disable mouse tracking
      process.stdout.write('\x1b[?1000l');
      process.stdout.write('\x1b[?1003l');
      process.stdout.write('\x1b[?1006l');
      process.stdout.write('\x1b[?1015l');

      // Restore raw mode
      if (isRawModeSupported && setRawMode) {
        setRawMode(false);
      }
    };
  }, [enabled, stdin, setRawMode, isRawModeSupported]);

  return {
    position: mousePosition,
    lastClick,
    clearClick: () => setLastClick(null),
  };
}
