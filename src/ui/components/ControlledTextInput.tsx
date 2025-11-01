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

      // Up arrow - move cursor to previous line
      if (key.upArrow) {
        const lines = value.split('\n');
        let charCount = 0;
        let currentLine = 0;
        let currentColumn = 0;

        // Find current line and column
        for (let i = 0; i < lines.length; i++) {
          if (charCount + lines[i].length >= cursor) {
            currentLine = i;
            currentColumn = cursor - charCount;
            break;
          }
          charCount += lines[i].length + 1; // +1 for \n
        }

        // Move to previous line if exists
        if (currentLine > 0) {
          const prevLine = lines[currentLine - 1];
          const targetColumn = Math.min(currentColumn, prevLine.length);
          let newCursor = 0;
          for (let i = 0; i < currentLine - 1; i++) {
            newCursor += lines[i].length + 1;
          }
          newCursor += targetColumn;
          safeSetCursor(newCursor);
        }
        return;
      }

      // Down arrow - move cursor to next line
      if (key.downArrow) {
        const lines = value.split('\n');
        let charCount = 0;
        let currentLine = 0;
        let currentColumn = 0;

        // Find current line and column
        for (let i = 0; i < lines.length; i++) {
          if (charCount + lines[i].length >= cursor) {
            currentLine = i;
            currentColumn = cursor - charCount;
            break;
          }
          charCount += lines[i].length + 1; // +1 for \n
        }

        // Move to next line if exists
        if (currentLine < lines.length - 1) {
          const nextLine = lines[currentLine + 1];
          const targetColumn = Math.min(currentColumn, nextLine.length);
          let newCursor = 0;
          for (let i = 0; i <= currentLine; i++) {
            newCursor += lines[i].length + 1;
          }
          newCursor += targetColumn;
          safeSetCursor(newCursor);
        }
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

  // Helper function to render text with @file highlighting
  const renderTextWithTags = (text: string, cursorPos?: number) => {
    if (text.length === 0) {
      return <Text> </Text>;
    }

    const parts: React.ReactNode[] = [];
    const regex = /@([^\s]+)/g;
    let lastIndex = 0;
    let match;
    let partIndex = 0;
    let cursorRendered = cursorPos === undefined;

    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      // Add text before match
      if (matchStart > lastIndex) {
        const beforeText = text.slice(lastIndex, matchStart);

        // Check if cursor is in this segment
        if (!cursorRendered && cursorPos >= lastIndex && cursorPos < matchStart) {
          const leftPart = beforeText.slice(0, cursorPos - lastIndex);
          const rightPart = beforeText.slice(cursorPos - lastIndex);
          parts.push(
            <Text key={`before-${partIndex}`}>
              {leftPart}
              {showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : ' '}</Text>}
              {rightPart.slice(1)}
            </Text>
          );
          cursorRendered = true;
        } else {
          parts.push(<Text key={`before-${partIndex}`}>{beforeText}</Text>);
        }
        partIndex++;
      }

      // Check if this tag is valid (exists in validTags)
      const fileName = match[1]; // The captured group (filename without @)
      const isValidTag = validTags ? validTags.has(fileName) : false;

      // Add @file tag with background (only if valid)
      if (!cursorRendered && cursorPos >= matchStart && cursorPos < matchEnd) {
        // Cursor is inside the tag
        const tagText = match[0];
        const leftPart = tagText.slice(0, cursorPos - matchStart);
        const rightPart = tagText.slice(cursorPos - matchStart);

        if (isValidTag) {
          parts.push(
            <Text key={`tag-${partIndex}`} backgroundColor="#1a472a" color="#00FF88">
              {leftPart}
              {showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : ' '}</Text>}
              {rightPart.slice(1)}
            </Text>
          );
        } else {
          // Invalid tag - render as normal text with cursor
          parts.push(
            <Text key={`tag-${partIndex}`}>
              {leftPart}
              {showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : ' '}</Text>}
              {rightPart.slice(1)}
            </Text>
          );
        }
        cursorRendered = true;
      } else {
        if (isValidTag) {
          parts.push(
            <Text key={`tag-${partIndex}`} backgroundColor="#1a472a" color="#00FF88">
              {match[0]}
            </Text>
          );
        } else {
          // Invalid tag - render as normal text
          parts.push(<Text key={`tag-${partIndex}`}>{match[0]}</Text>);
        }
      }
      partIndex++;

      lastIndex = matchEnd;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);

      if (!cursorRendered && cursorPos >= lastIndex && cursorPos <= text.length) {
        const leftPart = remainingText.slice(0, cursorPos - lastIndex);
        const rightPart = remainingText.slice(cursorPos - lastIndex);
        parts.push(
          <Text key={`after-${partIndex}`}>
            {leftPart}
            {showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : ' '}</Text>}
            {rightPart.slice(1)}
          </Text>
        );
        cursorRendered = true;
      } else {
        parts.push(<Text key={`after-${partIndex}`}>{remainingText}</Text>);
      }
    }

    // If cursor is at the end and hasn't been rendered
    if (!cursorRendered && showCursor) {
      parts.push(<Text key="cursor-end" inverse> </Text>);
    }

    return <>{parts}</>;
  };

  return (
    <Box flexDirection="column">
      {lines.map((line, lineIndex) => {
        const isCursorLine = lineIndex === cursorLine;

        return (
          <Box key={lineIndex}>
            {isCursorLine
              ? renderTextWithTags(line, cursorColumn)
              : renderTextWithTags(line)}
          </Box>
        );
      })}
    </Box>
  );
}
