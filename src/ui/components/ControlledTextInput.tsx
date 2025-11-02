/**
 * Controlled Text Input - Readline Compatible
 * Implements standard readline keybindings for cross-platform compatibility
 */

import React, { useReducer, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

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
  killBuffer: string; // For Ctrl+Y (yank)
}

type Action =
  | { type: 'SYNC'; value: string; cursor: number }
  | { type: 'INSERT'; text: string }
  | { type: 'DELETE_CHAR_LEFT' }
  | { type: 'DELETE_CHAR_RIGHT' }
  | { type: 'DELETE_WORD_LEFT' }
  | { type: 'DELETE_WORD_RIGHT' }
  | { type: 'DELETE_TO_START' }
  | { type: 'DELETE_TO_END' }
  | { type: 'DELETE_LINE' }
  | { type: 'MOVE_CHAR_LEFT' }
  | { type: 'MOVE_CHAR_RIGHT' }
  | { type: 'MOVE_WORD_LEFT' }
  | { type: 'MOVE_WORD_RIGHT' }
  | { type: 'MOVE_TO_START' }
  | { type: 'MOVE_TO_END' }
  | { type: 'MOVE_LINE_UP' }
  | { type: 'MOVE_LINE_DOWN' }
  | { type: 'TRANSPOSE_CHARS' }
  | { type: 'YANK' };

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

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SYNC':
      return { ...state, value: action.value, cursor: action.cursor };

    case 'INSERT': {
      const before = state.value.slice(0, state.cursor);
      const after = state.value.slice(state.cursor);
      return {
        ...state,
        value: before + action.text + after,
        cursor: state.cursor + action.text.length,
      };
    }

    case 'DELETE_CHAR_LEFT': {
      if (state.cursor === 0) return state;
      const before = state.value.slice(0, state.cursor - 1);
      const after = state.value.slice(state.cursor);
      return {
        ...state,
        value: before + after,
        cursor: state.cursor - 1,
      };
    }

    case 'DELETE_CHAR_RIGHT': {
      if (state.cursor >= state.value.length) return state;
      const before = state.value.slice(0, state.cursor);
      const after = state.value.slice(state.cursor + 1);
      return {
        ...state,
        value: before + after,
      };
    }

    case 'DELETE_WORD_LEFT': {
      if (state.cursor === 0) return state;
      const wordStart = findWordStart(state.value, state.cursor);
      const before = state.value.slice(0, wordStart);
      const deleted = state.value.slice(wordStart, state.cursor);
      const after = state.value.slice(state.cursor);
      return {
        ...state,
        value: before + after,
        cursor: wordStart,
        killBuffer: deleted,
      };
    }

    case 'DELETE_WORD_RIGHT': {
      if (state.cursor >= state.value.length) return state;
      const wordEnd = findWordEnd(state.value, state.cursor);
      const before = state.value.slice(0, state.cursor);
      const deleted = state.value.slice(state.cursor, wordEnd);
      const after = state.value.slice(wordEnd);
      return {
        ...state,
        value: before + after,
        killBuffer: deleted,
      };
    }

    case 'DELETE_TO_START': {
      const deleted = state.value.slice(0, state.cursor);
      const after = state.value.slice(state.cursor);
      return {
        ...state,
        value: after,
        cursor: 0,
        killBuffer: deleted,
      };
    }

    case 'DELETE_TO_END': {
      const before = state.value.slice(0, state.cursor);
      const deleted = state.value.slice(state.cursor);
      return {
        ...state,
        value: before,
        killBuffer: deleted,
      };
    }

    case 'DELETE_LINE': {
      return {
        ...state,
        value: '',
        cursor: 0,
        killBuffer: state.value,
      };
    }

    case 'MOVE_CHAR_LEFT': {
      return {
        ...state,
        cursor: clampCursor(state.cursor - 1, state.value.length),
      };
    }

    case 'MOVE_CHAR_RIGHT': {
      return {
        ...state,
        cursor: clampCursor(state.cursor + 1, state.value.length),
      };
    }

    case 'MOVE_WORD_LEFT': {
      const wordStart = findWordStart(state.value, state.cursor);
      return {
        ...state,
        cursor: wordStart,
      };
    }

    case 'MOVE_WORD_RIGHT': {
      const wordEnd = findWordEnd(state.value, state.cursor);
      return {
        ...state,
        cursor: wordEnd,
      };
    }

    case 'MOVE_TO_START': {
      return {
        ...state,
        cursor: 0,
      };
    }

    case 'MOVE_TO_END': {
      return {
        ...state,
        cursor: state.value.length,
      };
    }

    case 'MOVE_LINE_UP': {
      const { line, col, lines } = getLineInfo(state.value, state.cursor);
      if (line === 0) return state; // Already on first line
      const newCursor = lineToCursor(lines, line - 1, col);
      return {
        ...state,
        cursor: newCursor,
      };
    }

    case 'MOVE_LINE_DOWN': {
      const { line, col, lines } = getLineInfo(state.value, state.cursor);
      if (line >= lines.length - 1) return state; // Already on last line
      const newCursor = lineToCursor(lines, line + 1, col);
      return {
        ...state,
        cursor: newCursor,
      };
    }

    case 'TRANSPOSE_CHARS': {
      if (state.value.length < 2) return state;

      let pos = state.cursor;
      // If at end, transpose last two chars
      if (pos === state.value.length) {
        pos = state.value.length - 1;
      }
      // If at start, can't transpose
      if (pos === 0) return state;

      const before = state.value.slice(0, pos - 1);
      const char1 = state.value[pos - 1];
      const char2 = state.value[pos];
      const after = state.value.slice(pos + 1);

      return {
        ...state,
        value: before + char2 + char1 + after,
        cursor: pos + 1,
      };
    }

    case 'YANK': {
      if (!state.killBuffer) return state;
      const before = state.value.slice(0, state.cursor);
      const after = state.value.slice(state.cursor);
      return {
        ...state,
        value: before + state.killBuffer + after,
        cursor: state.cursor + state.killBuffer.length,
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
  const [state, dispatch] = useReducer(reducer, {
    value,
    cursor,
    killBuffer: '',
  });

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
      // DEBUG: Log all key presses to understand Mac delete behavior
      if (process.env.DEBUG_INPUT) {
        console.log('[INPUT]', {
          input: JSON.stringify(input),
          key: Object.keys(key).filter((k) => key[k as keyof typeof key]),
          value: JSON.stringify(state.value),
          cursor: state.cursor,
        });
      }

      // ===========================================
      // Movement (Character)
      // ===========================================

      // Ctrl+B or Left Arrow - move left
      if (key.leftArrow || (key.ctrl && input?.toLowerCase() === 'b')) {
        dispatch({ type: 'MOVE_CHAR_LEFT' });
        return;
      }

      // Ctrl+F or Right Arrow - move right
      if (key.rightArrow || (key.ctrl && input?.toLowerCase() === 'f')) {
        dispatch({ type: 'MOVE_CHAR_RIGHT' });
        return;
      }

      // Ctrl+A or Home - move to start
      if (key.home || (key.ctrl && input?.toLowerCase() === 'a')) {
        dispatch({ type: 'MOVE_TO_START' });
        return;
      }

      // Ctrl+E or End - move to end
      if (key.end || (key.ctrl && input?.toLowerCase() === 'e')) {
        dispatch({ type: 'MOVE_TO_END' });
        return;
      }

      // Up Arrow - move to previous line
      if (key.upArrow) {
        dispatch({ type: 'MOVE_LINE_UP' });
        return;
      }

      // Down Arrow - move to next line
      if (key.downArrow) {
        dispatch({ type: 'MOVE_LINE_DOWN' });
        return;
      }

      // ===========================================
      // Movement (Word)
      // ===========================================

      // Meta+B (Option+B on Mac, Alt+B on Linux/Win) or Ctrl+Left - move word left
      if ((key.meta && input?.toLowerCase() === 'b') || (key.ctrl && key.leftArrow)) {
        dispatch({ type: 'MOVE_WORD_LEFT' });
        return;
      }

      // Meta+F (Option+F on Mac, Alt+F on Linux/Win) or Ctrl+Right - move word right
      if ((key.meta && input?.toLowerCase() === 'f') || (key.ctrl && key.rightArrow)) {
        dispatch({ type: 'MOVE_WORD_RIGHT' });
        return;
      }

      // ===========================================
      // Deletion (Character)
      // ===========================================

      // Backspace or Ctrl+H - delete char left
      if (key.backspace || (key.ctrl && input?.toLowerCase() === 'h')) {
        dispatch({ type: 'DELETE_CHAR_LEFT' });
        return;
      }

      // Delete or Ctrl+D - delete char right
      if (key.delete || (key.ctrl && input?.toLowerCase() === 'd')) {
        dispatch({ type: 'DELETE_CHAR_RIGHT' });
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
        dispatch({ type: 'DELETE_WORD_LEFT' });
        return;
      }

      // Meta+D (Option+D on Mac, Alt+D on Linux/Win) - delete word right
      if (key.meta && input?.toLowerCase() === 'd') {
        dispatch({ type: 'DELETE_WORD_RIGHT' });
        return;
      }

      // ===========================================
      // Deletion (Line)
      // ===========================================

      // Ctrl+U - delete to start of line
      if (key.ctrl && input?.toLowerCase() === 'u') {
        dispatch({ type: 'DELETE_TO_START' });
        return;
      }

      // Ctrl+K - delete to end of line
      if (key.ctrl && input?.toLowerCase() === 'k') {
        dispatch({ type: 'DELETE_TO_END' });
        return;
      }

      // ===========================================
      // Special Operations
      // ===========================================

      // Ctrl+T - transpose characters
      if (key.ctrl && input?.toLowerCase() === 't') {
        dispatch({ type: 'TRANSPOSE_CHARS' });
        return;
      }

      // Ctrl+Y - yank (paste from kill buffer)
      if (key.ctrl && input?.toLowerCase() === 'y') {
        dispatch({ type: 'YANK' });
        return;
      }

      // ===========================================
      // Enter - Submit or Newline
      // ===========================================

      if (key.return && !input) {
        if (key.shift) {
          // Shift+Enter - insert newline
          dispatch({ type: 'INSERT', text: '\n' });
          return;
        }
        // Regular Enter - submit
        onSubmit?.(state.value);
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
