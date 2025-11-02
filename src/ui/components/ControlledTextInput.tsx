/**
 * Controlled Text Input with Programmatic Cursor Control
 * Supports explicit cursor positioning via props
 */

import React, { useEffect, useRef } from 'react';
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

  // Use refs to track latest value and cursor for paste handling
  // This prevents race conditions when multiple characters arrive quickly
  const latestValueRef = useRef(value);
  const latestCursorRef = useRef(cursor);

  // Update refs when props change, but only if we're not in the middle of handling input
  // This prevents race conditions where value and cursor update at different times
  const isHandlingInputRef = useRef(false);
  useEffect(() => {
    if (!isHandlingInputRef.current) {
      latestValueRef.current = value;
      latestCursorRef.current = cursor;
    }
  }, [value, cursor]);

  // Safe cursor position setter (clamp to valid range)
  const safeSetCursor = (n: number) => onCursorChange(clampCursor(n, latestValueRef.current.length));

  // Auto-correct cursor if value changes and cursor is out of bounds
  useEffect(() => {
    if (cursor > value.length) {
      safeSetCursor(value.length);
    }
  }, [value.length]);

  useInput(
    (input, key) => {
      // Mark that we're handling input to prevent useEffect from overwriting refs
      isHandlingInputRef.current = true;

      try {
        // Use latest values from refs to handle fast paste operations
        const currentValue = latestValueRef.current;
        const currentCursor = latestCursorRef.current;

        // Left arrow - move cursor left
        if (key.leftArrow) {
          safeSetCursor(currentCursor - 1);
          return;
        }

        // Right arrow - move cursor right
        if (key.rightArrow) {
          safeSetCursor(currentCursor + 1);
          return;
        }

        // Up arrow - move cursor to previous line
        if (key.upArrow) {
          safeSetCursor(moveCursorUp(currentValue, currentCursor));
          return;
        }

        // Down arrow - move cursor to next line
        if (key.downArrow) {
          safeSetCursor(moveCursorDown(currentValue, currentCursor));
          return;
        }

        // Home - move to start
        if (key.home || (key.ctrl && input?.toLowerCase() === 'a')) {
          safeSetCursor(0);
          return;
        }

        // End - move to end
        if (key.end || (key.ctrl && input?.toLowerCase() === 'e')) {
          safeSetCursor(currentValue.length);
          return;
        }

        // Backspace/Delete handling
        // Standard cross-platform approach: treat both as backspace
        // - Windows: Backspace key → key.backspace=true
        // - Mac: Delete key (backspace function) → key.delete=true
        // - Also check \x7F and \b character codes for compatibility
        if (key.backspace || key.delete || input === '\x7F' || input === '\b') {
          // Backward delete (delete char before cursor)
          if (currentCursor > 0) {
            const next = currentValue.slice(0, currentCursor - 1) + currentValue.slice(currentCursor);
            onChange(next);
            safeSetCursor(currentCursor - 1);
          }
          return;
        }

        // Enter - submit (but allow Shift+Enter for newline)
        // Note: When pasting multi-line text, input will contain '\n' but key.return will be false
        if (key.return && !input) {
          // Allow Shift+Enter to insert newline instead of submitting
          if (key.shift) {
            const next = currentValue.slice(0, currentCursor) + '\n' + currentValue.slice(currentCursor);
            onChange(next);
            safeSetCursor(currentCursor + 1);
            return;
          }
          onSubmit?.(currentValue);
          return;
        }

        // Ctrl+U - delete from cursor to start (Unix convention)
        if (key.ctrl && input?.toLowerCase() === 'u') {
          const next = currentValue.slice(currentCursor);
          onChange(next);
          safeSetCursor(0);
          return;
        }

        // Ctrl+K - delete from cursor to end (Unix convention)
        if (key.ctrl && input?.toLowerCase() === 'k') {
          const next = currentValue.slice(0, currentCursor);
          onChange(next);
          // cursor stays at same position
          return;
        }

        // Ctrl+W - delete word before cursor (Unix convention)
        if (key.ctrl && input?.toLowerCase() === 'w') {
          const before = currentValue.slice(0, currentCursor);
          const after = currentValue.slice(currentCursor);
          // Find last word boundary
          const match = before.match(/\s*\S*$/);
          if (match) {
            const deleteCount = match[0].length;
            const next = before.slice(0, -deleteCount) + after;
            onChange(next);
            safeSetCursor(currentCursor - deleteCount);
          }
          return;
        }

        // Ignore other control key combinations (but allow paste which might have ctrl)
        if ((key.ctrl || key.meta) && !input) return;

        // Insert regular character at cursor position
        // Use refs to handle fast paste - each character uses latest value
        // Note: Pasted text may contain newlines - preserve them
        if (input) {
          const next = currentValue.slice(0, currentCursor) + input + currentValue.slice(currentCursor);
          const newCursor = currentCursor + input.length;

          // Update refs immediately for next character
          latestValueRef.current = next;
          latestCursorRef.current = newCursor;

          // Then update parent state
          onChange(next);
          onCursorChange(newCursor);
        }
      } finally {
        // Reset the flag after all state updates are done
        // Use queueMicrotask to ensure this runs after the current event loop
        queueMicrotask(() => {
          isHandlingInputRef.current = false;
        });
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
