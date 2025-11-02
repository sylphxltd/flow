/**
 * Controlled Text Input with Programmatic Cursor Control
 * Uses useReducer to ensure state updates are based on latest state
 */

import React, { useReducer, useEffect } from 'react';
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

interface State {
  value: string;
  cursor: number;
}

type Action =
  | { type: 'SET_FROM_PROPS'; value: string; cursor: number }
  | { type: 'INSERT_TEXT'; text: string }
  | { type: 'DELETE_BEFORE_CURSOR' }
  | { type: 'INSERT_NEWLINE' }
  | { type: 'DELETE_TO_START' }
  | { type: 'DELETE_TO_END' }
  | { type: 'DELETE_WORD' }
  | { type: 'SET_CURSOR'; cursor: number }
  | { type: 'SET_VALUE'; value: string; cursor: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FROM_PROPS':
      return { value: action.value, cursor: action.cursor };

    case 'INSERT_TEXT': {
      const next = state.value.slice(0, state.cursor) + action.text + state.value.slice(state.cursor);
      return { value: next, cursor: state.cursor + action.text.length };
    }

    case 'DELETE_BEFORE_CURSOR': {
      if (state.cursor === 0) return state;
      const next = state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor);
      return { value: next, cursor: state.cursor - 1 };
    }

    case 'INSERT_NEWLINE': {
      const next = state.value.slice(0, state.cursor) + '\n' + state.value.slice(state.cursor);
      return { value: next, cursor: state.cursor + 1 };
    }

    case 'DELETE_TO_START': {
      const next = state.value.slice(state.cursor);
      return { value: next, cursor: 0 };
    }

    case 'DELETE_TO_END': {
      const next = state.value.slice(0, state.cursor);
      return { value: next, cursor: state.cursor };
    }

    case 'DELETE_WORD': {
      const before = state.value.slice(0, state.cursor);
      const after = state.value.slice(state.cursor);
      const match = before.match(/\s*\S*$/);
      if (!match) return state;
      const deleteCount = match[0].length;
      const next = before.slice(0, -deleteCount) + after;
      return { value: next, cursor: state.cursor - deleteCount };
    }

    case 'SET_CURSOR': {
      const clamped = clampCursor(action.cursor, state.value.length);
      return { ...state, cursor: clamped };
    }

    case 'SET_VALUE': {
      return { value: action.value, cursor: action.cursor };
    }

    default:
      return state;
  }
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
  const [state, dispatch] = useReducer(reducer, { value, cursor });

  // Sync from props when they change externally
  useEffect(() => {
    if (value !== state.value || cursor !== state.cursor) {
      dispatch({ type: 'SET_FROM_PROPS', value, cursor });
    }
  }, [value, cursor]);

  // Notify parent of changes
  useEffect(() => {
    if (state.value !== value) {
      onChange(state.value);
    }
  }, [state.value]);

  useEffect(() => {
    if (state.cursor !== cursor) {
      onCursorChange(state.cursor);
    }
  }, [state.cursor]);

  const text = maskChar ? maskChar.repeat(state.value.length) : state.value;

  useInput(
    (input, key) => {
      // Left arrow
      if (key.leftArrow) {
        dispatch({ type: 'SET_CURSOR', cursor: state.cursor - 1 });
        return;
      }

      // Right arrow
      if (key.rightArrow) {
        dispatch({ type: 'SET_CURSOR', cursor: state.cursor + 1 });
        return;
      }

      // Up arrow
      if (key.upArrow) {
        dispatch({ type: 'SET_CURSOR', cursor: moveCursorUp(state.value, state.cursor) });
        return;
      }

      // Down arrow
      if (key.downArrow) {
        dispatch({ type: 'SET_CURSOR', cursor: moveCursorDown(state.value, state.cursor) });
        return;
      }

      // Home
      if (key.home || (key.ctrl && input?.toLowerCase() === 'a')) {
        dispatch({ type: 'SET_CURSOR', cursor: 0 });
        return;
      }

      // End
      if (key.end || (key.ctrl && input?.toLowerCase() === 'e')) {
        dispatch({ type: 'SET_CURSOR', cursor: state.value.length });
        return;
      }

      // Backspace
      if (key.backspace || key.delete || input === '\x7F' || input === '\b') {
        dispatch({ type: 'DELETE_BEFORE_CURSOR' });
        return;
      }

      // Enter - submit or newline
      if (key.return && !input) {
        if (key.shift) {
          dispatch({ type: 'INSERT_NEWLINE' });
          return;
        }
        onSubmit?.(state.value);
        return;
      }

      // Ctrl+U - delete to start
      if (key.ctrl && input?.toLowerCase() === 'u') {
        dispatch({ type: 'DELETE_TO_START' });
        return;
      }

      // Ctrl+K - delete to end
      if (key.ctrl && input?.toLowerCase() === 'k') {
        dispatch({ type: 'DELETE_TO_END' });
        return;
      }

      // Ctrl+W - delete word
      if (key.ctrl && input?.toLowerCase() === 'w') {
        dispatch({ type: 'DELETE_WORD' });
        return;
      }

      // Ignore other control keys
      if ((key.ctrl || key.meta) && !input) return;

      // Insert character (including pasted text with newlines)
      if (input) {
        dispatch({ type: 'INSERT_TEXT', text: input });
      }
    },
    { isActive: focus }
  );

  // Handle multiline text with proper cursor positioning
  if (state.value.length === 0 && placeholder) {
    return (
      <Box>
        {showCursor && <Text inverse> </Text>}
        <Text dimColor>{placeholder}</Text>
      </Box>
    );
  }

  // Split text into lines
  const lines = text.split('\n');
  const { line: cursorLine, column: cursorColumn } = getCursorLinePosition(text, state.cursor);

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
