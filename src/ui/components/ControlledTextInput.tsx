/**
 * Controlled Text Input with Programmatic Cursor Control
 * Simplified version - internal state with external sync
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from './Spinner.js';
import { clampCursor, moveCursorUp, moveCursorDown, getCursorLinePosition } from '../utils/cursor-utils.js';
import { renderTextWithTags } from '../utils/text-rendering-utils.js';

export interface ControlledTextInputProps {
  value: string;
  onChange: (value: string) => void;
  cursor: number;
  onCursorChange: (cursor: number) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  maskChar?: string;
  showCursor?: boolean;
  focus?: boolean;
  validTags?: Set<string>;
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
  // Internal state - source of truth during user input
  const [internalValue, setInternalValue] = useState(value);
  const [internalCursor, setInternalCursor] = useState(cursor);

  // Sync from props only when props change externally (not from our onChange)
  // Detect external changes by comparing with internal state
  useEffect(() => {
    if (value !== internalValue) {
      // External change (autocomplete, clear, etc.)
      setInternalValue(value);
      setInternalCursor(cursor);
    }
  }, [value]); // Only watch value, not internalValue (to avoid loop)

  // Sync cursor changes
  useEffect(() => {
    if (cursor !== internalCursor && value === internalValue) {
      // Cursor changed externally but value didn't
      setInternalCursor(cursor);
    }
  }, [cursor]);

  const text = maskChar ? maskChar.repeat(internalValue.length) : internalValue;

  // Helper to update both internal and external state
  const updateValue = (newValue: string, newCursor: number) => {
    setInternalValue(newValue);
    setInternalCursor(newCursor);
    onChange(newValue);
    onCursorChange(newCursor);
  };

  const safeSetCursor = (n: number) => {
    const clamped = clampCursor(n, internalValue.length);
    setInternalCursor(clamped);
    onCursorChange(clamped);
  };

  useInput(
    (input, key) => {
      // Left arrow
      if (key.leftArrow) {
        safeSetCursor(internalCursor - 1);
        return;
      }

      // Right arrow
      if (key.rightArrow) {
        safeSetCursor(internalCursor + 1);
        return;
      }

      // Up arrow
      if (key.upArrow) {
        safeSetCursor(moveCursorUp(internalValue, internalCursor));
        return;
      }

      // Down arrow
      if (key.downArrow) {
        safeSetCursor(moveCursorDown(internalValue, internalCursor));
        return;
      }

      // Home
      if (key.home || (key.ctrl && input?.toLowerCase() === 'a')) {
        safeSetCursor(0);
        return;
      }

      // End
      if (key.end || (key.ctrl && input?.toLowerCase() === 'e')) {
        safeSetCursor(internalValue.length);
        return;
      }

      // Backspace
      if (key.backspace || key.delete || input === '\x7F' || input === '\b') {
        if (internalCursor > 0) {
          const next = internalValue.slice(0, internalCursor - 1) + internalValue.slice(internalCursor);
          updateValue(next, internalCursor - 1);
        }
        return;
      }

      // Enter - submit or newline
      if (key.return && !input) {
        if (key.shift) {
          // Shift+Enter - insert newline
          const next = internalValue.slice(0, internalCursor) + '\n' + internalValue.slice(internalCursor);
          updateValue(next, internalCursor + 1);
          return;
        }
        onSubmit?.(internalValue);
        return;
      }

      // Ctrl+U - delete to start
      if (key.ctrl && input?.toLowerCase() === 'u') {
        const next = internalValue.slice(internalCursor);
        updateValue(next, 0);
        return;
      }

      // Ctrl+K - delete to end
      if (key.ctrl && input?.toLowerCase() === 'k') {
        const next = internalValue.slice(0, internalCursor);
        setInternalValue(next);
        onChange(next);
        return;
      }

      // Ctrl+W - delete word
      if (key.ctrl && input?.toLowerCase() === 'w') {
        const before = internalValue.slice(0, internalCursor);
        const after = internalValue.slice(internalCursor);
        const match = before.match(/\s*\S*$/);
        if (match) {
          const deleteCount = match[0].length;
          const next = before.slice(0, -deleteCount) + after;
          updateValue(next, internalCursor - deleteCount);
        }
        return;
      }

      // Ignore other control keys
      if ((key.ctrl || key.meta) && !input) return;

      // Insert character (including pasted text with newlines)
      if (input) {
        const next = internalValue.slice(0, internalCursor) + input + internalValue.slice(internalCursor);
        updateValue(next, internalCursor + input.length);
      }
    },
    { isActive: focus }
  );

  // Handle multiline text with proper cursor positioning
  if (internalValue.length === 0 && placeholder) {
    return (
      <Box>
        {showCursor && <Text inverse> </Text>}
        <Text dimColor>{placeholder}</Text>
      </Box>
    );
  }

  // Split text into lines
  const lines = text.split('\n');
  const { line: cursorLine, column: cursorColumn } = getCursorLinePosition(text, internalCursor);

  // Get terminal width
  const terminalWidth = process.stdout.columns || 120;
  const maxLineWidth = Math.max(40, terminalWidth - 10);

  return (
    <Box flexDirection="column">
      {lines.map((line, lineIndex) => {
        const isCursorLine = lineIndex === cursorLine;
        const cursorPosForLine = isCursorLine ? cursorColumn : undefined;

        // Handle long lines
        let displayLine = line;
        let displayCursor = cursorPosForLine;

        if (line.length > maxLineWidth && cursorPosForLine !== undefined) {
          const halfWindow = Math.floor(maxLineWidth / 2);
          let start = Math.max(0, cursorPosForLine - halfWindow);
          let end = Math.min(line.length, start + maxLineWidth);

          if (end === line.length && end - start < maxLineWidth) {
            start = Math.max(0, end - maxLineWidth);
          }

          displayLine = line.slice(start, end);
          displayCursor = cursorPosForLine - start;

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
