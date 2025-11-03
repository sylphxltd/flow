/**
 * Controlled Text Input - Readline Compatible
 * Implements standard readline keybindings for cross-platform compatibility
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Memoized with React.memo to prevent unnecessary re-renders
 * - useCallback for stable function references
 * - Optimized key handlers to return early when possible
 */

import React, { useRef, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';

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
  maxLines?: number; // Maximum lines to display (default: 10)
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

// Helper: Wrap a long line into physical lines based on terminal width
function wrapLine(text: string, width: number): string[] {
  if (text.length === 0) return [''];
  if (width <= 0) return [text];

  const wrapped: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= width) {
      wrapped.push(remaining);
      break;
    }

    // Take up to width characters
    wrapped.push(remaining.slice(0, width));
    remaining = remaining.slice(width);
  }

  return wrapped;
}

// Helper: Calculate physical cursor position after wrapping
function getPhysicalCursorPos(text: string, logicalCursor: number, terminalWidth: number): {
  physicalLine: number;
  physicalCol: number;
} {
  if (terminalWidth <= 0) {
    return { physicalLine: 0, physicalCol: logicalCursor };
  }

  // Calculate which physical line the cursor is on
  const physicalLine = Math.floor(logicalCursor / terminalWidth);
  const physicalCol = logicalCursor % terminalWidth;

  return { physicalLine, physicalCol };
}

// Helper: Move cursor up one physical line (accounting for wrapping)
function moveCursorUpPhysical(value: string, cursor: number, terminalWidth: number): number {
  if (terminalWidth <= 0) return cursor;

  // Find cursor's logical line
  const lines = value.split('\n');
  let charCount = 0;
  let logicalLine = 0;
  let posInLogicalLine = cursor;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    if (cursor <= charCount + lineLength) {
      logicalLine = i;
      posInLogicalLine = cursor - charCount;
      break;
    }
    charCount += lineLength + 1; // +1 for \n
  }

  const currentLineText = lines[logicalLine];
  const { physicalLine: physicalIdx, physicalCol } =
    getPhysicalCursorPos(currentLineText, posInLogicalLine, terminalWidth);

  // If we're not on the first physical line of this logical line, move up within same logical line
  if (physicalIdx > 0) {
    const targetPhysicalLine = physicalIdx - 1;
    const targetPos = targetPhysicalLine * terminalWidth + physicalCol;
    // Clamp to line length
    const newPosInLine = Math.min(targetPos, currentLineText.length);

    // Calculate absolute cursor position
    let absolutePos = 0;
    for (let i = 0; i < logicalLine; i++) {
      absolutePos += lines[i].length + 1;
    }
    return absolutePos + newPosInLine;
  }

  // Otherwise, move to previous logical line
  if (logicalLine === 0) {
    // Already at first line
    return cursor;
  }

  // Move to previous logical line, same column if possible
  const prevLineText = lines[logicalLine - 1];
  const wrappedPrevLines = wrapLine(prevLineText, terminalWidth);
  const lastPhysicalLine = wrappedPrevLines.length - 1;

  // Try to maintain column position
  const targetPos = lastPhysicalLine * terminalWidth + physicalCol;
  const newPosInLine = Math.min(targetPos, prevLineText.length);

  // Calculate absolute position
  let absolutePos = 0;
  for (let i = 0; i < logicalLine - 1; i++) {
    absolutePos += lines[i].length + 1;
  }
  return absolutePos + newPosInLine;
}

// Helper: Move cursor down one physical line (accounting for wrapping)
function moveCursorDownPhysical(value: string, cursor: number, terminalWidth: number): number {
  if (terminalWidth <= 0) return cursor;

  // Find cursor's logical line
  const lines = value.split('\n');
  let charCount = 0;
  let logicalLine = 0;
  let posInLogicalLine = cursor;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    if (cursor <= charCount + lineLength) {
      logicalLine = i;
      posInLogicalLine = cursor - charCount;
      break;
    }
    charCount += lineLength + 1; // +1 for \n
  }

  const currentLineText = lines[logicalLine];
  const wrappedCurrentLines = wrapLine(currentLineText, terminalWidth);
  const { physicalLine: physicalIdx, physicalCol } =
    getPhysicalCursorPos(currentLineText, posInLogicalLine, terminalWidth);

  // If we're not on the last physical line of this logical line, move down within same logical line
  if (physicalIdx < wrappedCurrentLines.length - 1) {
    const targetPhysicalLine = physicalIdx + 1;
    const targetPos = targetPhysicalLine * terminalWidth + physicalCol;
    // Clamp to line length
    const newPosInLine = Math.min(targetPos, currentLineText.length);

    // Calculate absolute cursor position
    let absolutePos = 0;
    for (let i = 0; i < logicalLine; i++) {
      absolutePos += lines[i].length + 1;
    }
    return absolutePos + newPosInLine;
  }

  // Otherwise, move to next logical line
  if (logicalLine === lines.length - 1) {
    // Already at last line
    return cursor;
  }

  // Move to next logical line, first physical line, same column if possible
  const nextLineText = lines[logicalLine + 1];
  const newPosInLine = Math.min(physicalCol, nextLineText.length);

  // Calculate absolute position
  let absolutePos = 0;
  for (let i = 0; i <= logicalLine; i++) {
    absolutePos += lines[i].length + 1;
  }
  return absolutePos + newPosInLine;
}

// No reducer needed - fully controlled component

function ControlledTextInput({
  value,
  onChange,
  cursor,
  onCursorChange,
  onSubmit,
  placeholder,
  showCursor = true,
  focus = true,
  maxLines = 10,
}: ControlledTextInputProps) {
  // Kill buffer for Ctrl+K, Ctrl+U, Ctrl+W → Ctrl+Y
  const killBufferRef = useRef('');

  // Get terminal width for wrapping calculations
  const { stdout } = useStdout();
  const terminalWidth = stdout.columns || 80;
  const availableWidth = Math.max(40, terminalWidth - 10);

  // Memoize input handler to prevent recreating on every render
  const handleInput = useCallback((input: string, key: any) => {
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

      // Up Arrow - move to previous physical line (accounting for wrapping)
      if (key.upArrow) {
        const newCursor = moveCursorUpPhysical(value, cursor, availableWidth);
        onCursorChange(newCursor);
        return;
      }

      // Down Arrow - move to next physical line (accounting for wrapping)
      if (key.downArrow) {
        const newCursor = moveCursorDownPhysical(value, cursor, availableWidth);
        onCursorChange(newCursor);
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

      // Ctrl+H - delete char left (backward) - separate from delete/backspace
      if (!key.meta && key.ctrl && input?.toLowerCase() === 'h') {
        if (cursor === 0) return;
        const before = value.slice(0, cursor - 1);
        const after = value.slice(cursor);
        onChange(before + after);
        onCursorChange(cursor - 1);
        return;
      }

      // Delete (Mac) or Backspace (Windows/Linux) - delete char left (backward)
      // Note: Mac Delete key maps to key.delete, but should delete backward like Backspace
      // Skip if meta is pressed (word delete handled below)
      if ((key.delete || key.backspace) && !key.meta && !key.ctrl) {
        if (cursor === 0) return;
        const before = value.slice(0, cursor - 1);
        const after = value.slice(cursor);
        onChange(before + after);
        onCursorChange(cursor - 1);
        return;
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
      // Return/Enter - Submit or Newline
      // ===========================================

      // Return key pressed (input will be '\r' or '\n')
      if (key.return) {
        // Shift+Return or Option+Return (Meta+Return) - insert newline
        // Matches Claude Code official behavior
        if (key.shift || key.meta) {
          const before = value.slice(0, cursor);
          const after = value.slice(cursor);
          onChange(before + '\n' + after);
          onCursorChange(cursor + 1);
          return;
        }

        // Regular Return - submit (Claude Code default)
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
  }, [value, cursor, onChange, onCursorChange, onSubmit, availableWidth]);

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
    const wrappedLines = wrapLine(logicalLine, availableWidth);

    if (i === cursorLogicalLine) {
      // This logical line contains the cursor
      const { physicalLine: cursorPhysicalIdx, physicalCol } =
        getPhysicalCursorPos(logicalLine, cursorLogicalCol, availableWidth);

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
  const cursorPhysicalLineIdx = physicalLines.findIndex(line => line.hasCursor);

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
              <Text>{physicalLine.text || ' '}</Text>
            </Box>
          );
        }

        // Line with cursor
        const cursorPos = physicalLine.cursorPos!;
        const before = physicalLine.text.slice(0, cursorPos);
        const char = physicalLine.text[cursorPos] || ' ';
        const after = physicalLine.text.slice(cursorPos + 1);

        return (
          <Box key={actualIdx}>
            <Text>{before}</Text>
            {showCursor && <Text inverse>{char}</Text>}
            <Text>{after}</Text>
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
    prevProps.maxLines === nextProps.maxLines
  );
});
