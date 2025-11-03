/**
 * Text Operations - Pure Functions
 * All text manipulation operations for input handling
 */

/**
 * Insert character(s) at cursor position
 * @pure No side effects
 */
export function insertText(text: string, cursor: number, insert: string): {
  text: string;
  cursor: number;
} {
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  return {
    text: before + insert + after,
    cursor: cursor + insert.length,
  };
}

/**
 * Delete character before cursor (backspace)
 * @pure No side effects
 */
export function deleteCharLeft(text: string, cursor: number): {
  text: string;
  cursor: number;
} {
  if (cursor === 0) return { text, cursor };

  const before = text.slice(0, cursor - 1);
  const after = text.slice(cursor);
  return {
    text: before + after,
    cursor: cursor - 1,
  };
}

/**
 * Delete character at cursor (delete key)
 * @pure No side effects
 */
export function deleteCharRight(text: string, cursor: number): {
  text: string;
  cursor: number;
} {
  if (cursor >= text.length) return { text, cursor };

  const before = text.slice(0, cursor);
  const after = text.slice(cursor + 1);
  return {
    text: before + after,
    cursor,
  };
}

/**
 * Delete from cursor to start of text
 * @pure No side effects
 */
export function deleteToStart(text: string, cursor: number): {
  text: string;
  cursor: number;
  deleted: string;
} {
  const deleted = text.slice(0, cursor);
  const after = text.slice(cursor);
  return {
    text: after,
    cursor: 0,
    deleted,
  };
}

/**
 * Delete from cursor to end of text
 * @pure No side effects
 */
export function deleteToEnd(text: string, cursor: number): {
  text: string;
  cursor: number;
  deleted: string;
} {
  const before = text.slice(0, cursor);
  const deleted = text.slice(cursor);
  return {
    text: before,
    cursor,
    deleted,
  };
}

/**
 * Delete word before cursor
 * @pure No side effects
 */
export function deleteWordLeft(text: string, cursor: number, wordStart: number): {
  text: string;
  cursor: number;
  deleted: string;
} {
  if (cursor === 0) return { text, cursor, deleted: '' };

  const before = text.slice(0, wordStart);
  const deleted = text.slice(wordStart, cursor);
  const after = text.slice(cursor);
  return {
    text: before + after,
    cursor: wordStart,
    deleted,
  };
}

/**
 * Delete word after cursor
 * @pure No side effects
 */
export function deleteWordRight(text: string, cursor: number, wordEnd: number): {
  text: string;
  cursor: number;
  deleted: string;
} {
  if (cursor >= text.length) return { text, cursor, deleted: '' };

  const before = text.slice(0, cursor);
  const deleted = text.slice(cursor, wordEnd);
  const after = text.slice(wordEnd);
  return {
    text: before + after,
    cursor,
    deleted,
  };
}

/**
 * Transpose two characters (swap char before and at cursor)
 * @pure No side effects
 */
export function transposeChars(text: string, cursor: number): {
  text: string;
  cursor: number;
} {
  if (text.length < 2) return { text, cursor };

  let pos = cursor;
  if (pos === text.length) pos = text.length - 1;
  if (pos === 0) return { text, cursor };

  const before = text.slice(0, pos - 1);
  const char1 = text[pos - 1];
  const char2 = text[pos];
  const after = text.slice(pos + 1);

  return {
    text: before + char2 + char1 + after,
    cursor: pos + 1,
  };
}

/**
 * Yank (paste) text at cursor position
 * @pure No side effects
 */
export function yankText(text: string, cursor: number, killBuffer: string): {
  text: string;
  cursor: number;
} {
  if (!killBuffer) return { text, cursor };

  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  return {
    text: before + killBuffer + after,
    cursor: cursor + killBuffer.length,
  };
}

/**
 * Normalize line endings (\r\n and \r → \n)
 * @pure No side effects
 */
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
