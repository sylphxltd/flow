/**
 * Cursor Operations Utilities
 * Pure functions for cursor movement
 */

/**
 * Move cursor left by one character
 */
export function moveCursorLeft(cursor: number, maxLength: number): number {
  return Math.max(0, cursor - 1);
}

/**
 * Move cursor right by one character
 */
export function moveCursorRight(cursor: number, maxLength: number): number {
  return Math.min(maxLength, cursor + 1);
}

/**
 * Move cursor to start
 */
export function moveCursorToStart(): number {
  return 0;
}

/**
 * Move cursor to end
 */
export function moveCursorToEnd(maxLength: number): number {
  return maxLength;
}

/**
 * Find start of word (moving backwards from cursor)
 */
export function findWordStart(value: string, cursor: number): number {
  if (cursor === 0) return 0;

  let pos = cursor;

  // Skip any whitespace immediately before cursor
  while (pos > 0 && /\s/.test(value[pos - 1])) {
    pos--;
  }

  // Move backwards to start of word
  while (pos > 0 && !/\s/.test(value[pos - 1])) {
    pos--;
  }

  return pos;
}

/**
 * Find end of word (moving forwards from cursor)
 */
export function findWordEnd(value: string, cursor: number): number {
  if (cursor >= value.length) return value.length;

  let pos = cursor;

  // Skip any whitespace at cursor
  while (pos < value.length && /\s/.test(value[pos])) {
    pos++;
  }

  // Move forwards to end of word
  while (pos < value.length && !/\s/.test(value[pos])) {
    pos++;
  }

  return pos;
}
