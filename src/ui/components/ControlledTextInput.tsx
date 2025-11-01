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

      // Backspace - delete char at cursor position (block cursor deletes the char it's on)
      const isBackspace = key.backspace || input === '\x7F';
      if (isBackspace) {
        if (cursor > 0) {
          // Delete the character before cursor (since cursor is between chars)
          const next = value.slice(0, cursor - 1) + value.slice(cursor);
          onChange(next);
          safeSetCursor(cursor - 1);
        }
        return;
      }

      // Delete - delete char after cursor
      if (key.delete) {
        if (cursor < value.length) {
          // Delete the character at cursor position
          const next = value.slice(0, cursor) + value.slice(cursor + 1);
          onChange(next);
          // cursor stays at same position
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

  // Split text at cursor position
  const left = text.slice(0, cursor);
  const right = text.slice(cursor);

  return (
    <Box>
      {value.length === 0 && placeholder ? (
        <>
          <Text dimColor>{placeholder}</Text>
          {showCursor && <Text inverse> </Text>}
        </>
      ) : (
        <>
          <Text>{left}</Text>
          {showCursor && (
            <Text inverse>{right.length > 0 ? right[0] : ' '}</Text>
          )}
          <Text>{right.slice(1)}</Text>
        </>
      )}
    </Box>
  );
}
