/**
 * Controlled Text Input with Programmatic Cursor Control
 * Supports explicit cursor positioning via props
 */

import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { clampCursor, moveCursorUp, moveCursorDown, getCursorLinePosition } from '../utils/cursor-utils.js';
import { renderTextWithTags } from '../utils/text-rendering-utils.js';

export interface ControlledTextInputProps {
  value: string;
  onChange: (value: string) => void;
  cursor: number; // Controlled cursor position (0..value.length)
  onCursorChange: (cursor: number) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  maskChar?: string; // Optional: display * like password input
  showCursor?: boolean;
  focus?: boolean;
  validTags?: Set<string>; // Set of valid @file references (e.g., "src/file.ts")
}

export default function ControlledTextInput({
  value,
  onChange,
  cursor,
  onCursorChange,
  onSubmit,
  placeholder,
  maskChar,
  showCursor = true,
  focus = true,
  validTags,
}: ControlledTextInputProps) {
  const text = maskChar ? maskChar.repeat(value.length) : value;

  // Safe cursor position setter (clamp to valid range)
  const safeSetCursor = (n: number) => onCursorChange(clampCursor(n, value.length));

  // Auto-correct cursor if value changes and cursor is out of bounds
  useEffect(() => {
    if (cursor > value.length) {
      safeSetCursor(value.length);
    }
  }, [value.length]);

  useInput(
    (input, key) => {
      // Left arrow - move cursor left
      if (key.leftArrow) {
        safeSetCursor(cursor - 1);
        return;
      }

      // Right arrow - move cursor right
      if (key.rightArrow) {
        safeSetCursor(cursor + 1);
        return;
      }

      // Up arrow - move cursor to previous line
      if (key.upArrow) {
        safeSetCursor(moveCursorUp(value, cursor));
        return;
      }

      // Down arrow - move cursor to next line
      if (key.downArrow) {
        safeSetCursor(moveCursorDown(value, cursor));
        return;
      }

      // Home - move to start
      if (key.home || (key.ctrl && input?.toLowerCase() === 'a')) {
        safeSetCursor(0);
        return;
      }

      // End - move to end
      if (key.end || (key.ctrl && input?.toLowerCase() === 'e')) {
        safeSetCursor(value.length);
        return;
      }

      // Backspace/Delete handling
      // Standard cross-platform approach: treat both as backspace
      // - Windows: Backspace key → key.backspace=true
      // - Mac: Delete key (backspace function) → key.delete=true
      // - Also check \x7F and \b character codes for compatibility
      if (key.backspace || key.delete || input === '\x7F' || input === '\b') {
        // Backward delete (delete char before cursor)
        if (cursor > 0) {
          const next = value.slice(0, cursor - 1) + value.slice(cursor);
          onChange(next);
          safeSetCursor(cursor - 1);
        }
        return;
      }

      // Enter - submit
      if (key.return) {
        onSubmit?.(value);
        return;
      }

      // Ctrl+U - delete from cursor to start (Unix convention)
      if (key.ctrl && input?.toLowerCase() === 'u') {
        const next = value.slice(cursor);
        onChange(next);
        safeSetCursor(0);
        return;
      }

      // Ctrl+K - delete from cursor to end (Unix convention)
      if (key.ctrl && input?.toLowerCase() === 'k') {
        const next = value.slice(0, cursor);
        onChange(next);
        // cursor stays at same position
        return;
      }

      // Ctrl+W - delete word before cursor (Unix convention)
      if (key.ctrl && input?.toLowerCase() === 'w') {
        const before = value.slice(0, cursor);
        const after = value.slice(cursor);
        // Find last word boundary
        const match = before.match(/\s*\S*$/);
        if (match) {
          const deleteCount = match[0].length;
          const next = before.slice(0, -deleteCount) + after;
          onChange(next);
          safeSetCursor(cursor - deleteCount);
        }
        return;
      }

      // Ignore other control key combinations
      if (key.ctrl || key.meta) return;

      // Insert regular character at cursor position
      if (input) {
        const next = value.slice(0, cursor) + input + value.slice(cursor);
        onChange(next);
        onCursorChange(cursor + input.length); // Don't use safeSetCursor - new value is longer
      }
    },
    { isActive: focus }
  );

  // Handle multiline text with proper cursor positioning
  if (value.length === 0 && placeholder) {
    return (
      <Box>
        {showCursor && <Text inverse> </Text>}
        <Text dimColor>{placeholder}</Text>
      </Box>
    );
  }

  // Split text into lines
  const lines = text.split('\n');
  const { line: cursorLine, column: cursorColumn } = getCursorLinePosition(text, cursor);

  // Get terminal width (default to reasonable value if not available)
  const terminalWidth = process.stdout.columns || 120;
  // Reserve some space for margins and indicators
  const maxLineWidth = Math.max(40, terminalWidth - 10);

  return (
    <Box flexDirection="column">
      {lines.map((line, lineIndex) => {
        const isCursorLine = lineIndex === cursorLine;
        const cursorPosForLine = isCursorLine ? cursorColumn : undefined;

        // Handle long lines by showing a viewport around the cursor
        let displayLine = line;
        let displayCursor = cursorPosForLine;

        if (line.length > maxLineWidth && cursorPosForLine !== undefined) {
          // Calculate viewport window centered on cursor
          const halfWindow = Math.floor(maxLineWidth / 2);
          let start = Math.max(0, cursorPosForLine - halfWindow);
          let end = Math.min(line.length, start + maxLineWidth);

          // Adjust if we're near the end
          if (end === line.length && end - start < maxLineWidth) {
            start = Math.max(0, end - maxLineWidth);
          }

          // Extract the visible portion
          displayLine = line.slice(start, end);
          displayCursor = cursorPosForLine - start;

          // Replace first/last char with indicators for hidden content
          if (start > 0 && displayLine.length > 0) {
            displayLine = '‹' + displayLine.slice(1);
          }
          if (end < line.length && displayLine.length > 0) {
            displayLine = displayLine.slice(0, -1) + '›';
          }
        }

        return (
          <Box key={lineIndex}>
            {renderTextWithTags(displayLine, displayCursor, showCursor, validTags)}
          </Box>
        );
      })}
    </Box>
  );
}
