/**
 * Cursor Utilities
 * Helper functions for cursor positioning and navigation in multiline text
 */

export interface LinePosition {
  line: number;
  column: number;
}

/**
 * Convert absolute cursor position to line and column
 */
export function getCursorLinePosition(text: string, cursor: number): LinePosition {
  const lines = text.split('\n');
  let charCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (charCount + lines[i].length >= cursor) {
      return {
        line: i,
        column: cursor - charCount,
      };
    }
    charCount += lines[i].length + 1; // +1 for \n
  }

  // Cursor at end
  return {
    line: lines.length - 1,
    column: lines[lines.length - 1]?.length || 0,
  };
}

/**
 * Convert line and column to absolute cursor position
 */
export function getAbsoluteCursorPosition(text: string, line: number, column: number): number {
  const lines = text.split('\n');
  let position = 0;

  for (let i = 0; i < line && i < lines.length; i++) {
    position += lines[i].length + 1; // +1 for \n
  }

  // Add column (clamped to line length)
  const targetLine = lines[line] || '';
  position += Math.min(column, targetLine.length);

  return position;
}

/**
 * Move cursor up one line, preserving column if possible
 */
export function moveCursorUp(text: string, cursor: number): number {
  const { line, column } = getCursorLinePosition(text, cursor);

  if (line === 0) {
    return cursor; // Already at top
  }

  return getAbsoluteCursorPosition(text, line - 1, column);
}

/**
 * Move cursor down one line, preserving column if possible
 */
export function moveCursorDown(text: string, cursor: number): number {
  const lines = text.split('\n');
  const { line, column } = getCursorLinePosition(text, cursor);

  if (line >= lines.length - 1) {
    return cursor; // Already at bottom
  }

  return getAbsoluteCursorPosition(text, line + 1, column);
}

/**
 * Safe cursor setter - clamps to valid range [0, text.length]
 */
export function clampCursor(cursor: number, textLength: number): number {
  return Math.max(0, Math.min(cursor, textLength));
}
