/**
 * Controlled Text Input - Readline Compatible
 * Implements standard readline keybindings for cross-platform compatibility
 */

import React, { useRef } from 'react';
import { Box, Text, useInput } from 'ink';

export interface ControlledTextInputProps {
  value: string;
  onChange: (value: string) => void;
  cursor: number;
  onCursorChange: (cursor: number) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  showCursor?: boolean;
  focus?: boolean;
  validTags?: Set<string>;
}

// Helper: Find word boundary (left)
function findWordStart(text: string, cursor: number): number {
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

// Helper: Find word boundary (right)
function findWordEnd(text: string, cursor: number): number {
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

// Helper: Clamp cursor
function clampCursor(cursor: number, length: number): number {
  return Math.max(0, Math.min(cursor, length));
}

// Helper: Get line info for cursor position
function getLineInfo(text: string, cursor: number): { line: number; col: number; lines: string[] } {
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

// Helper: Convert line/col to cursor position
function lineToCursor(lines: string[], targetLine: number, targetCol: number): number {
  let cursor = 0;
  for (let i = 0; i < targetLine && i < lines.length; i++) {
    cursor += lines[i].length + 1; // +1 for \n
  }
  const lineLength = lines[targetLine]?.length || 0;
  cursor += Math.min(targetCol, lineLength);
  return cursor;
}

// No reducer needed - fully controlled component

export default function ControlledTextInput({
  value,
  onChange,
  cursor,
  onCursorChange,
  onSubmit,
  placeholder,
  showCursor = true,
  focus = true,
}: ControlledTextInputProps) {
  // Kill buffer for Ctrl+K, Ctrl+U, Ctrl+W → Ctrl+Y
  const killBufferRef = useRef('');

  useInput(
    (input, key) => {
      // DEBUG: Log all key presses to understand Mac delete behavior
      if (process.env.DEBUG_INPUT) {
        console.log('[INPUT]', {
          input: JSON.stringify(input),
          keys: Object.keys(key).filter((k) => key[k as keyof typeof key]),
          value: JSON.stringify(value),
          cursor,
        });
      }

      // ===========================================
      // Movement (Character)
      // ===========================================

      // Ctrl+B or Left Arrow - move left
      if (key.leftArrow || (key.ctrl && input?.toLowerCase() === 'b')) {
        onCursorChange(clampCursor(cursor - 1, value.length));
        return;
      }

      // Ctrl+F or Right Arrow - move right
      if (key.rightArrow || (key.ctrl && input?.toLowerCase() === 'f')) {
        onCursorChange(clampCursor(cursor + 1, value.length));
        return;
      }

      // Ctrl+A or Home - move to start
      if (key.home || (key.ctrl && input?.toLowerCase() === 'a')) {
        onCursorChange(0);
        return;
      }

      // Ctrl+E or End - move to end
      if (key.end || (key.ctrl && input?.toLowerCase() === 'e')) {
        onCursorChange(value.length);
        return;
      }

      // Up Arrow - move to previous line
      if (key.upArrow) {
        const { line, col, lines } = getLineInfo(value, cursor);
        if (line > 0) {
          onCursorChange(lineToCursor(lines, line - 1, col));
        }
        return;
      }

      // Down Arrow - move to next line
      if (key.downArrow) {
        const { line, col, lines } = getLineInfo(value, cursor);
        if (line < lines.length - 1) {
          onCursorChange(lineToCursor(lines, line + 1, col));
        }
        return;
      }

      // ===========================================
      // Movement (Word)
      // ===========================================

      // Meta+B (Option+B on Mac, Alt+B on Linux/Win) or Ctrl+Left - move word left
      if ((key.meta && input?.toLowerCase() === 'b') || (key.ctrl && key.leftArrow)) {
        onCursorChange(findWordStart(value, cursor));
        return;
      }

      // Meta+F (Option+F on Mac, Alt+F on Linux/Win) or Ctrl+Right - move word right
      if ((key.meta && input?.toLowerCase() === 'f') || (key.ctrl && key.rightArrow)) {
        onCursorChange(findWordEnd(value, cursor));
        return;
      }

      // ===========================================
      // Deletion (Character)
      // ===========================================

      // Delete (Mac) or Backspace (Windows/Linux) or Ctrl+H - delete char left (backward)
      // Note: Mac Delete key maps to key.delete, but should delete backward like Backspace
      if (key.delete || key.backspace || (key.ctrl && input?.toLowerCase() === 'h')) {
        // Don't delete if combined with meta (that's word delete)
        if (key.meta) {
          // Fall through to word deletion below
        } else {
          if (cursor === 0) return;
          const before = value.slice(0, cursor - 1);
          const after = value.slice(cursor);
          onChange(before + after);
          onCursorChange(cursor - 1);
          return;
        }
      }

      // Ctrl+D - delete char right (forward)
      // Note: No standalone forward delete key on Mac (would need Fn+Delete which we can't detect)
      if (key.ctrl && input?.toLowerCase() === 'd') {
        if (cursor >= value.length) return;
        const before = value.slice(0, cursor);
        const after = value.slice(cursor + 1);
        onChange(before + after);
        return;
      }

      // ===========================================
      // Deletion (Word)
      // ===========================================

      // Ctrl+W or Meta+Backspace (Option+Delete on Mac) - delete word left
      if (
        (key.ctrl && input?.toLowerCase() === 'w') ||
        (key.meta && key.backspace) ||
        (key.meta && key.delete)
      ) {
        if (cursor === 0) return;
        const wordStart = findWordStart(value, cursor);
        const before = value.slice(0, wordStart);
        const deleted = value.slice(wordStart, cursor);
        const after = value.slice(cursor);
        killBufferRef.current = deleted;
        onChange(before + after);
        onCursorChange(wordStart);
        return;
      }

      // Meta+D (Option+D on Mac, Alt+D on Linux/Win) - delete word right
      if (key.meta && input?.toLowerCase() === 'd') {
        if (cursor >= value.length) return;
        const wordEnd = findWordEnd(value, cursor);
        const before = value.slice(0, cursor);
        const deleted = value.slice(cursor, wordEnd);
        const after = value.slice(wordEnd);
        killBufferRef.current = deleted;
        onChange(before + after);
        return;
      }

      // ===========================================
      // Deletion (Line)
      // ===========================================

      // Ctrl+U - delete to start of line
      if (key.ctrl && input?.toLowerCase() === 'u') {
        const deleted = value.slice(0, cursor);
        const after = value.slice(cursor);
        killBufferRef.current = deleted;
        onChange(after);
        onCursorChange(0);
        return;
      }

      // Ctrl+K - delete to end of line
      if (key.ctrl && input?.toLowerCase() === 'k') {
        const before = value.slice(0, cursor);
        const deleted = value.slice(cursor);
        killBufferRef.current = deleted;
        onChange(before);
        return;
      }

      // ===========================================
      // Special Operations
      // ===========================================

      // Ctrl+T - transpose characters
      if (key.ctrl && input?.toLowerCase() === 't') {
        if (value.length < 2) return;

        let pos = cursor;
        if (pos === value.length) pos = value.length - 1;
        if (pos === 0) return;

        const before = value.slice(0, pos - 1);
        const char1 = value[pos - 1];
        const char2 = value[pos];
        const after = value.slice(pos + 1);

        onChange(before + char2 + char1 + after);
        onCursorChange(pos + 1);
        return;
      }

      // Ctrl+Y - yank (paste from kill buffer)
      if (key.ctrl && input?.toLowerCase() === 'y') {
        if (!killBufferRef.current) return;
        const before = value.slice(0, cursor);
        const after = value.slice(cursor);
        onChange(before + killBufferRef.current + after);
        onCursorChange(cursor + killBufferRef.current.length);
        return;
      }

      // ===========================================
      // Enter - Submit or Newline
      // ===========================================

      if (key.return && !input) {
        // Shift+Enter or Option+Enter (Meta+Enter) - insert newline
        // Matches Claude Code official behavior
        if (key.shift || key.meta) {
          const before = value.slice(0, cursor);
          const after = value.slice(cursor);
          onChange(before + '\n' + after);
          onCursorChange(cursor + 1);
          return;
        }

        // Regular Enter - submit (Claude Code default)
        onSubmit?.(value);
        return;
      }

      // Ctrl+J - insert newline (Claude Code alternative)
      // "Line feed character for multiline"
      if (key.ctrl && input?.toLowerCase() === 'j') {
        const before = value.slice(0, cursor);
        const after = value.slice(cursor);
        onChange(before + '\n' + after);
        onCursorChange(cursor + 1);
        return;
      }

      // ===========================================
      // Regular Input
      // ===========================================

      // Ignore other control/meta combinations
      if (key.ctrl || key.meta) return;

      // Insert text (including paste with newlines)
      if (input) {
        // Normalize line endings: \r\n and \r → \n
        const normalizedInput = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const before = value.slice(0, cursor);
        const after = value.slice(cursor);
        onChange(before + normalizedInput + after);
        onCursorChange(cursor + normalizedInput.length);
      }
    },
    { isActive: focus }
  );

  // Empty with placeholder
  if (value.length === 0 && placeholder) {
    return (
      <Box>
        {showCursor && <Text inverse> </Text>}
        <Text dimColor>{placeholder}</Text>
      </Box>
    );
  }

  // Split into lines
  const lines = value.split('\n');

  // Find cursor line and column
  let charCount = 0;
  let cursorLine = 0;
  let cursorCol = cursor;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    if (cursor <= charCount + lineLength) {
      cursorLine = i;
      cursorCol = cursor - charCount;
      break;
    }
    charCount += lineLength + 1; // +1 for \n
  }

  // Render each line
  return (
    <Box flexDirection="column">
      {lines.map((line, idx) => {
        const isCursorLine = idx === cursorLine;

        if (!isCursorLine) {
          return (
            <Box key={idx}>
              <Text>{line || ' '}</Text>
            </Box>
          );
        }

        // Line with cursor
        const before = line.slice(0, cursorCol);
        const char = line[cursorCol] || ' ';
        const after = line.slice(cursorCol + 1);

        return (
          <Box key={idx}>
            <Text>{before}</Text>
            {showCursor && <Text inverse>{char}</Text>}
            <Text>{after}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
