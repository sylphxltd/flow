/**
 * Text Operations Utilities
 * Pure functions for text manipulation in controlled input
 */

/**
 * Normalize line endings to \n (Unix style)
 */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Insert text at cursor position
 */
export function insertText(
  value: string,
  cursor: number,
  text: string
): { text: string; cursor: number } {
  const before = value.substring(0, cursor);
  const after = value.substring(cursor);
  return {
    text: before + text + after,
    cursor: cursor + text.length,
  };
}

/**
 * Delete character to the left of cursor (backspace)
 */
export function deleteCharLeft(
  value: string,
  cursor: number
): { text: string; cursor: number } {
  if (cursor === 0) return { text: value, cursor };

  const before = value.substring(0, cursor - 1);
  const after = value.substring(cursor);
  return {
    text: before + after,
    cursor: cursor - 1,
  };
}

/**
 * Delete character to the right of cursor (delete)
 */
export function deleteCharRight(
  value: string,
  cursor: number
): { text: string; cursor: number } {
  if (cursor >= value.length) return { text: value, cursor };

  const before = value.substring(0, cursor);
  const after = value.substring(cursor + 1);
  return {
    text: before + after,
    cursor,
  };
}

/**
 * Delete word to the left of cursor
 */
export function deleteWordLeft(
  value: string,
  cursor: number,
  wordStart: number
): { text: string; cursor: number; deleted: string } {
  const before = value.substring(0, wordStart);
  const deleted = value.substring(wordStart, cursor);
  const after = value.substring(cursor);
  return {
    text: before + after,
    cursor: wordStart,
    deleted,
  };
}

/**
 * Delete word to the right of cursor
 */
export function deleteWordRight(
  value: string,
  cursor: number,
  wordEnd: number
): { text: string; cursor: number; deleted: string } {
  const before = value.substring(0, cursor);
  const deleted = value.substring(cursor, wordEnd);
  const after = value.substring(wordEnd);
  return {
    text: before + after,
    cursor,
    deleted,
  };
}

/**
 * Delete from cursor to start of line
 */
export function deleteToStart(
  value: string,
  cursor: number
): { text: string; cursor: number; deleted: string } {
  const after = value.substring(cursor);
  const deleted = value.substring(0, cursor);
  return {
    text: after,
    cursor: 0,
    deleted,
  };
}

/**
 * Delete from cursor to end of line
 */
export function deleteToEnd(
  value: string,
  cursor: number
): { text: string; cursor: number; deleted: string } {
  const before = value.substring(0, cursor);
  const deleted = value.substring(cursor);
  return {
    text: before,
    cursor,
    deleted,
  };
}

/**
 * Transpose (swap) the two characters around cursor
 */
export function transposeChars(
  value: string,
  cursor: number
): { text: string; cursor: number } {
  // At start - do nothing
  if (cursor === 0) return { text: value, cursor };

  // At end - swap last two chars
  if (cursor >= value.length) {
    if (value.length < 2) return { text: value, cursor };
    const before = value.substring(0, value.length - 2);
    const char1 = value[value.length - 2];
    const char2 = value[value.length - 1];
    return {
      text: before + char2 + char1,
      cursor,
    };
  }

  // Middle - swap char before and at cursor
  const before = value.substring(0, cursor - 1);
  const char1 = value[cursor - 1];
  const char2 = value[cursor];
  const after = value.substring(cursor + 1);
  return {
    text: before + char2 + char1 + after,
    cursor: cursor + 1,
  };
}

/**
 * Yank (paste) text from kill buffer at cursor
 */
export function yankText(
  value: string,
  cursor: number,
  yankBuffer: string
): { text: string; cursor: number } {
  if (!yankBuffer) return { text: value, cursor };
  return insertText(value, cursor, yankBuffer);
}
