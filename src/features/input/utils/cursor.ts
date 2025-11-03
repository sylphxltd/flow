/**
 * Cursor Movement - Pure Functions
 * All cursor manipulation logic extracted for testability and reusability
 */

/**
 * Clamp cursor to valid range [0, length]
 * @pure No side effects
 */
export function clampCursor(cursor: number, length: number): number {
  return Math.max(0, Math.min(cursor, length));
}

/**
 * Find word boundary (left)
 * Moves cursor to the start of the current or previous word
 * @pure No side effects
 */
export function findWordStart(text: string, cursor: number): number {
  if (cursor === 0) return 0;

  // Skip trailing whitespace
  let pos = cursor - 1;
  while (pos > 0 && /\s/.test(text[pos])) {
    pos--;
  }

  // Skip word characters
  while (pos > 0 && /\S/.test(text[pos])) {
    pos--;
  }

  // If we stopped at whitespace, move forward one
  if (pos > 0 && /\s/.test(text[pos])) {
    pos++;
  }

  return pos === cursor - 1 ? 0 : pos;
}

/**
 * Find word boundary (right)
 * Moves cursor to the end of the current or next word
 * @pure No side effects
 */
export function findWordEnd(text: string, cursor: number): number {
  if (cursor >= text.length) return text.length;

  let pos = cursor;

  // Skip leading whitespace
  while (pos < text.length && /\s/.test(text[pos])) {
    pos++;
  }

  // Skip word characters
  while (pos < text.length && /\S/.test(text[pos])) {
    pos++;
  }

  return pos;
}

/**
 * Move cursor left by one character
 * @pure No side effects
 */
export function moveCursorLeft(cursor: number, length: number): number {
  return clampCursor(cursor - 1, length);
}

/**
 * Move cursor right by one character
 * @pure No side effects
 */
export function moveCursorRight(cursor: number, length: number): number {
  return clampCursor(cursor + 1, length);
}

/**
 * Move cursor to start (position 0)
 * @pure No side effects
 */
export function moveCursorToStart(): number {
  return 0;
}

/**
 * Move cursor to end (position = text.length)
 * @pure No side effects
 */
export function moveCursorToEnd(length: number): number {
  return length;
}

/**
 * Get line information for cursor position
 * Returns which logical line and column the cursor is on
 * @pure No side effects
 */
export function getLineInfo(text: string, cursor: number): {
  line: number;
  col: number;
  lines: string[];
} {
  const lines = text.split('\n');
  let charCount = 0;
  let line = 0;
  let col = cursor;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    if (cursor <= charCount + lineLength) {
      line = i;
      col = cursor - charCount;
      break;
    }
    charCount += lineLength + 1; // +1 for \n
  }

  return { line, col, lines };
}

/**
 * Convert line/col to cursor position
 * @pure No side effects
 */
export function lineToCursor(lines: string[], targetLine: number, targetCol: number): number {
  let cursor = 0;
  for (let i = 0; i < targetLine && i < lines.length; i++) {
    cursor += lines[i].length + 1; // +1 for \n
  }
  const lineLength = lines[targetLine]?.length || 0;
  cursor += Math.min(targetCol, lineLength);
  return cursor;
}
