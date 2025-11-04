/**
 * Controlled Text Input - Readline Compatible
 * Implements standard readline keybindings for cross-platform compatibility
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Memoized with React.memo to prevent unnecessary re-renders
 * - useCallback for stable function references
 * - Optimized key handlers to return early when possible
 */

import { renderTextWithTags } from '@sylphx/code-client';
import * as Cursor from '@sylphx/code-core';
import * as Wrapping from '@sylphx/code-core';
import * as TextOps from '@sylphx/code-core';
import { Box, Text, useInput, useStdout } from 'ink';
import React, { useCallback, useRef } from 'react';

export interface ControlledTextInputProps {
  value: string;
  onChange: (value: string) => void;
  cursor: number;
  onCursorChange: (cursor: number) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  showCursor?: boolean;
  focus?: boolean;
  validTags?: Set<string>; // Set of valid @file references for highlighting
  maxLines?: number; // Maximum lines to display (default: 10)
  disableUpDownArrows?: boolean; // Disable up/down arrow navigation (for autocomplete)
}

// Helpers now imported from features/input/utils/*

function ControlledTextInput({
  value,
  onChange,
  cursor,
  onCursorChange,
  onSubmit,
  placeholder,
  showCursor = true,
  focus = true,
  validTags,
  maxLines = 10,
  disableUpDownArrows = false,
}: ControlledTextInputProps) {
  // Kill buffer for Ctrl+K, Ctrl+U, Ctrl+W → Ctrl+Y
  const killBufferRef = useRef('');

  // Get terminal width for wrapping calculations
  const { stdout } = useStdout();
  const terminalWidth = stdout.columns || 80;
  const availableWidth = Math.max(40, terminalWidth - 10);

  // Memoize input handler to prevent recreating on every render
  const handleInput = useCallback(
    (input: string, key: any) => {
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
        onCursorChange(Cursor.moveCursorLeft(cursor, value.length));
        return;
      }

      // Ctrl+F or Right Arrow - move right
      if (key.rightArrow || (key.ctrl && input?.toLowerCase() === 'f')) {
        onCursorChange(Cursor.moveCursorRight(cursor, value.length));
        return;
      }

      // Ctrl+A or Home - move to start
      if (key.home || (key.ctrl && input?.toLowerCase() === 'a')) {
        onCursorChange(Cursor.moveCursorToStart());
        return;
      }

      // Ctrl+E or End - move to end
      if (key.end || (key.ctrl && input?.toLowerCase() === 'e')) {
        onCursorChange(Cursor.moveCursorToEnd(value.length));
        return;
      }

      // Up Arrow - move to previous physical line (accounting for wrapping)
      // Skip if autocomplete is active (let parent handle navigation)
      if (key.upArrow) {
        if (disableUpDownArrows) return; // Let parent handle (autocomplete navigation)
        const newCursor = Wrapping.moveCursorUpPhysical(value, cursor, availableWidth);
        onCursorChange(newCursor);
        return;
      }

      // Down Arrow - move to next physical line (accounting for wrapping)
      // Skip if autocomplete is active (let parent handle navigation)
      if (key.downArrow) {
        if (disableUpDownArrows) return; // Let parent handle (autocomplete navigation)
        const newCursor = Wrapping.moveCursorDownPhysical(value, cursor, availableWidth);
        onCursorChange(newCursor);
        return;
      }

      // ===========================================
      // Movement (Word)
      // ===========================================

      // Meta+B (Option+B on Mac, Alt+B on Linux/Win) or Ctrl+Left - move word left
      if ((key.meta && input?.toLowerCase() === 'b') || (key.ctrl && key.leftArrow)) {
        onCursorChange(Cursor.findWordStart(value, cursor));
        return;
      }

      // Meta+F (Option+F on Mac, Alt+F on Linux/Win) or Ctrl+Right - move word right
      if ((key.meta && input?.toLowerCase() === 'f') || (key.ctrl && key.rightArrow)) {
        onCursorChange(Cursor.findWordEnd(value, cursor));
        return;
      }

      // ===========================================
      // Deletion (Character)
      // ===========================================

      // Ctrl+H - delete char left (backward) - separate from delete/backspace
      if (!key.meta && key.ctrl && input?.toLowerCase() === 'h') {
        const result = TextOps.deleteCharLeft(value, cursor);
        onChange(result.text);
        onCursorChange(result.cursor);
        return;
      }

      // Delete (Mac) or Backspace (Windows/Linux) - delete char left (backward)
      // Note: Mac Delete key maps to key.delete, but should delete backward like Backspace
      // Skip if meta is pressed (word delete handled below)
      if ((key.delete || key.backspace) && !key.meta && !key.ctrl) {
        const result = TextOps.deleteCharLeft(value, cursor);
        onChange(result.text);
        onCursorChange(result.cursor);
        return;
      }

      // Ctrl+D - delete char right (forward)
      // Note: No standalone forward delete key on Mac (would need Fn+Delete which we can't detect)
      if (key.ctrl && input?.toLowerCase() === 'd') {
        const result = TextOps.deleteCharRight(value, cursor);
        onChange(result.text);
        onCursorChange(result.cursor);
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
        const wordStart = Cursor.findWordStart(value, cursor);
        const result = TextOps.deleteWordLeft(value, cursor, wordStart);
        killBufferRef.current = result.deleted;
        onChange(result.text);
        onCursorChange(result.cursor);
        return;
      }

      // Meta+D (Option+D on Mac, Alt+D on Linux/Win) - delete word right
      if (key.meta && input?.toLowerCase() === 'd') {
        const wordEnd = Cursor.findWordEnd(value, cursor);
        const result = TextOps.deleteWordRight(value, cursor, wordEnd);
        killBufferRef.current = result.deleted;
        onChange(result.text);
        onCursorChange(result.cursor);
        return;
      }

      // ===========================================
      // Deletion (Line)
      // ===========================================

      // Ctrl+U - delete to start of line
      if (key.ctrl && input?.toLowerCase() === 'u') {
        const result = TextOps.deleteToStart(value, cursor);
        killBufferRef.current = result.deleted;
        onChange(result.text);
        onCursorChange(result.cursor);
        return;
      }

      // Ctrl+K - delete to end of line
      if (key.ctrl && input?.toLowerCase() === 'k') {
        const result = TextOps.deleteToEnd(value, cursor);
        killBufferRef.current = result.deleted;
        onChange(result.text);
        onCursorChange(result.cursor);
        return;
      }

      // ===========================================
      // Special Operations
      // ===========================================

      // Ctrl+T - transpose characters
      if (key.ctrl && input?.toLowerCase() === 't') {
        const result = TextOps.transposeChars(value, cursor);
        onChange(result.text);
        onCursorChange(result.cursor);
        return;
      }

      // Ctrl+Y - yank (paste from kill buffer)
      if (key.ctrl && input?.toLowerCase() === 'y') {
        const result = TextOps.yankText(value, cursor, killBufferRef.current);
        onChange(result.text);
        onCursorChange(result.cursor);
        return;
      }

      // ===========================================
      // Return/Enter - Submit or Newline
      // ===========================================

      // Return key pressed (input will be '\r' or '\n')
      if (key.return) {
        // Shift+Return or Option+Return (Meta+Return) - insert newline
        // Matches Claude Code official behavior
        if (key.shift || key.meta) {
          const result = TextOps.insertText(value, cursor, '\n');
          onChange(result.text);
          onCursorChange(result.cursor);
          return;
        }

        // Regular Return - submit (Claude Code default)
        onSubmit?.(value);
        return;
      }

      // Ctrl+J - insert newline (Claude Code alternative)
      // "Line feed character for multiline"
      if (key.ctrl && input?.toLowerCase() === 'j') {
        const result = TextOps.insertText(value, cursor, '\n');
        onChange(result.text);
        onCursorChange(result.cursor);
        return;
      }

      // ===========================================
      // Regular Input
      // ===========================================

      // Ignore other control/meta combinations
      if (key.ctrl || key.meta) return;

      // Insert text (including paste with newlines)
      if (input) {
        const normalizedInput = TextOps.normalizeLineEndings(input);
        const result = TextOps.insertText(value, cursor, normalizedInput);
        onChange(result.text);
        onCursorChange(result.cursor);
      }
    },
    [value, cursor, onChange, onCursorChange, onSubmit, availableWidth, disableUpDownArrows]
  );

  useInput(handleInput, { isActive: focus });

  // Empty with placeholder
  if (value.length === 0 && placeholder) {
    return (
      <Box>
        {showCursor && <Text inverse> </Text>}
        <Text dimColor>{placeholder}</Text>
      </Box>
    );
  }

  // Split into logical lines (separated by \n)
  const logicalLines = value.split('\n');

  // Find cursor's logical line and column
  let charCount = 0;
  let cursorLogicalLine = 0;
  let cursorLogicalCol = cursor;

  for (let i = 0; i < logicalLines.length; i++) {
    const lineLength = logicalLines[i].length;
    if (cursor <= charCount + lineLength) {
      cursorLogicalLine = i;
      cursorLogicalCol = cursor - charCount;
      break;
    }
    charCount += lineLength + 1; // +1 for \n
  }

  // Build physical lines (accounting for wrapping) and track cursor position
  interface PhysicalLine {
    text: string;
    logicalLineIdx: number;
    hasCursor: boolean;
    cursorPos?: number;
  }

  const physicalLines: PhysicalLine[] = [];

  for (let i = 0; i < logicalLines.length; i++) {
    const logicalLine = logicalLines[i];
    const wrappedLines = Wrapping.wrapLine(logicalLine, availableWidth);

    if (i === cursorLogicalLine) {
      // This logical line contains the cursor
      const { physicalLine: cursorPhysicalIdx, physicalCol } = Wrapping.getPhysicalCursorPos(
        logicalLine,
        cursorLogicalCol,
        availableWidth
      );

      // Add each wrapped line
      wrappedLines.forEach((wrappedText, idx) => {
        physicalLines.push({
          text: wrappedText,
          logicalLineIdx: i,
          hasCursor: idx === cursorPhysicalIdx,
          cursorPos: idx === cursorPhysicalIdx ? physicalCol : undefined,
        });
      });
    } else {
      // No cursor in this logical line
      wrappedLines.forEach((wrappedText) => {
        physicalLines.push({
          text: wrappedText,
          logicalLineIdx: i,
          hasCursor: false,
        });
      });
    }
  }

  // Calculate visible window (scroll to keep cursor in view)
  const totalPhysicalLines = physicalLines.length;
  const cursorPhysicalLineIdx = physicalLines.findIndex((line) => line.hasCursor);

  let startLine = 0;
  let endLine = totalPhysicalLines;

  if (totalPhysicalLines > maxLines) {
    // Center cursor in viewport if possible
    const halfWindow = Math.floor(maxLines / 2);
    startLine = Math.max(0, cursorPhysicalLineIdx - halfWindow);
    endLine = Math.min(totalPhysicalLines, startLine + maxLines);

    // Adjust if we hit the bottom
    if (endLine === totalPhysicalLines) {
      startLine = Math.max(0, totalPhysicalLines - maxLines);
    }
  }

  const visibleLines = physicalLines.slice(startLine, endLine);

  // Render visible lines
  return (
    <Box flexDirection="column">
      {startLine > 0 && (
        <Box>
          <Text dimColor>... ({startLine} more lines above)</Text>
        </Box>
      )}
      {visibleLines.map((physicalLine, idx) => {
        const actualIdx = startLine + idx;

        if (!physicalLine.hasCursor) {
          return (
            <Box key={actualIdx}>
              {renderTextWithTags(physicalLine.text, undefined, false, validTags)}
            </Box>
          );
        }

        // Line with cursor - render with tags and cursor highlighting
        const cursorPos = physicalLine.cursorPos!;
        return (
          <Box key={actualIdx}>
            {renderTextWithTags(physicalLine.text, cursorPos, showCursor, validTags)}
          </Box>
        );
      })}
      {endLine < totalPhysicalLines && (
        <Box>
          <Text dimColor>... ({totalPhysicalLines - endLine} more lines below)</Text>
        </Box>
      )}
    </Box>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render when props actually change
export default React.memo(ControlledTextInput, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.cursor === nextProps.cursor &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.showCursor === nextProps.showCursor &&
    prevProps.focus === nextProps.focus &&
    prevProps.maxLines === nextProps.maxLines &&
    prevProps.disableUpDownArrows === nextProps.disableUpDownArrows
  );
});
