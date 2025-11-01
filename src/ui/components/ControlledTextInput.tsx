/**
 * Controlled Text Input with Programmatic Cursor Control
 * Supports explicit cursor positioning via props
 */

import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

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
}: ControlledTextInputProps) {
  const text = maskChar ? maskChar.repeat(value.length) : value;

  // Safe cursor position setter (clamp to valid range)
  const safeSetCursor = (n: number) =>
    onCursorChange(Math.max(0, Math.min(n, value.length)));

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

  // Find which line the cursor is on and position within that line
  let remainingCursor = cursor;
  let cursorLine = 0;
  let cursorColumn = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;

    if (remainingCursor <= lineLength) {
      cursorLine = i;
      cursorColumn = remainingCursor;
      break;
    }

    // Account for the newline character
    remainingCursor -= lineLength + 1;

    // If we're at the last line, cursor is at the end
    if (i === lines.length - 1) {
      cursorLine = i;
      cursorColumn = lineLength;
    }
  }

  return (
    <Box flexDirection="column">
      {lines.map((line, lineIndex) => {
        const isCursorLine = lineIndex === cursorLine;

        if (isCursorLine) {
          const left = line.slice(0, cursorColumn);
          const right = line.slice(cursorColumn);

          return (
            <Box key={lineIndex}>
              {left.length > 0 ? <Text>{left}</Text> : null}
              {showCursor && (
                <Text inverse>{right.length > 0 ? right[0] : ' '}</Text>
              )}
              {right.slice(1).length > 0 ? <Text>{right.slice(1)}</Text> : null}
            </Box>
          );
        }

        // For empty lines, render at least one space to ensure line height
        return (
          <Box key={lineIndex}>
            <Text>{line.length > 0 ? line : ' '}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
