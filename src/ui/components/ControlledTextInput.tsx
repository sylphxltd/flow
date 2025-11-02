/**
 * Controlled Text Input - Simplified
 * Minimal implementation with proper multi-line handling
 */

import React, { useReducer, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { clampCursor } from '../utils/cursor-utils.js';

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

interface State {
  value: string;
  cursor: number;
}

type Action =
  | { type: 'SYNC'; value: string; cursor: number }
  | { type: 'INSERT'; text: string }
  | { type: 'BACKSPACE' }
  | { type: 'MOVE'; cursor: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SYNC':
      return { value: action.value, cursor: action.cursor };

    case 'INSERT': {
      const before = state.value.slice(0, state.cursor);
      const after = state.value.slice(state.cursor);
      return {
        value: before + action.text + after,
        cursor: state.cursor + action.text.length,
      };
    }

    case 'BACKSPACE': {
      if (state.cursor === 0) return state;
      const before = state.value.slice(0, state.cursor - 1);
      const after = state.value.slice(state.cursor);
      return {
        value: before + after,
        cursor: state.cursor - 1,
      };
    }

    case 'MOVE': {
      return {
        ...state,
        cursor: clampCursor(action.cursor, state.value.length),
      };
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
  showCursor = true,
  focus = true,
}: ControlledTextInputProps) {
  const [state, dispatch] = useReducer(reducer, { value, cursor });

  // Sync props → state
  useEffect(() => {
    if (value !== state.value || cursor !== state.cursor) {
      dispatch({ type: 'SYNC', value, cursor });
    }
  }, [value, cursor]);

  // Sync state → parent
  useEffect(() => {
    if (state.value !== value) onChange(state.value);
  }, [state.value]);

  useEffect(() => {
    if (state.cursor !== cursor) onCursorChange(state.cursor);
  }, [state.cursor]);

  useInput(
    (input, key) => {
      // DEBUG: Log all input events
      console.log('[INPUT]', {
        input: JSON.stringify(input),
        inputLength: input?.length,
        hasNewline: input?.includes('\n'),
        key: Object.keys(key).filter(k => key[k as keyof typeof key]),
        currentValue: JSON.stringify(state.value),
        currentCursor: state.cursor,
      });

      // Arrow keys
      if (key.leftArrow) {
        dispatch({ type: 'MOVE', cursor: state.cursor - 1 });
        return;
      }
      if (key.rightArrow) {
        dispatch({ type: 'MOVE', cursor: state.cursor + 1 });
        return;
      }

      // Home/End
      if (key.home) {
        dispatch({ type: 'MOVE', cursor: 0 });
        return;
      }
      if (key.end) {
        dispatch({ type: 'MOVE', cursor: state.value.length });
        return;
      }

      // Backspace
      if (key.backspace || key.delete) {
        console.log('[BACKSPACE] before:', state.value.length, 'cursor:', state.cursor);
        dispatch({ type: 'BACKSPACE' });
        return;
      }

      // Enter
      if (key.return && !input) {
        // Shift+Enter inserts newline
        if (key.shift) {
          console.log('[SHIFT+ENTER] inserting newline');
          dispatch({ type: 'INSERT', text: '\n' });
          return;
        }
        // Regular Enter submits
        console.log('[ENTER] submitting:', JSON.stringify(state.value));
        onSubmit?.(state.value);
        return;
      }

      // Ignore other control keys
      if (key.ctrl || key.meta) return;

      // Insert text (handles paste with \n)
      if (input) {
        console.log('[INSERT]', JSON.stringify(input), 'at cursor', state.cursor);
        // Normalize line endings: \r\n and \r → \n
        const normalizedInput = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        console.log('[NORMALIZED]', JSON.stringify(normalizedInput));
        dispatch({ type: 'INSERT', text: normalizedInput });
      }
    },
    { isActive: focus }
  );

  // Empty with placeholder
  if (state.value.length === 0 && placeholder) {
    return (
      <Box>
        {showCursor && <Text inverse> </Text>}
        <Text dimColor>{placeholder}</Text>
      </Box>
    );
  }

  // Split into lines
  const lines = state.value.split('\n');

  // Find cursor line and column
  let charCount = 0;
  let cursorLine = 0;
  let cursorCol = state.cursor;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length;
    if (state.cursor <= charCount + lineLength) {
      cursorLine = i;
      cursorCol = state.cursor - charCount;
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
          // Line without cursor
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
