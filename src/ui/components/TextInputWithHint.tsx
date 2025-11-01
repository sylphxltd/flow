/**
 * Text Input With Hint
 * TextInput with inline ghost text hint and cursor control
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import ControlledTextInput from './ControlledTextInput.js';

interface TextInputWithHintProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  showCursor?: boolean;
  hint?: string; // Ghost text to show after cursor
  cursor?: number; // Optional controlled cursor position
  onCursorChange?: (cursor: number) => void;
  focus?: boolean; // Whether to handle input (for autocomplete)
  validTags?: Set<string>; // Set of valid @file references
}

export default function TextInputWithHint({
  value,
  onChange,
  onSubmit,
  placeholder,
  showCursor = true,
  hint,
  cursor: controlledCursor,
  onCursorChange: controlledOnCursorChange,
  focus = true,
  validTags,
}: TextInputWithHintProps) {
  // Internal cursor state (used when not controlled from parent)
  const [internalCursor, setInternalCursor] = useState(0);

  // Use controlled cursor if provided, otherwise use internal state
  const cursor = controlledCursor !== undefined ? controlledCursor : internalCursor;
  const onCursorChange = controlledOnCursorChange || setInternalCursor;

  // For uncontrolled mode, sync cursor when value changes
  // But preserve cursor position if it's still valid
  React.useEffect(() => {
    if (controlledCursor === undefined) {
      // If cursor is beyond new value length, move it to end
      if (internalCursor > value.length) {
        setInternalCursor(value.length);
      }
    }
  }, [value.length, controlledCursor, internalCursor]);

  return (
    <Box>
      <ControlledTextInput
        value={value}
        onChange={onChange}
        cursor={cursor}
        onCursorChange={onCursorChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
        showCursor={showCursor}
        focus={focus}
        validTags={validTags}
      />
      {hint && value.length > 0 && (
        <Text color="#444444">{hint}</Text>
      )}
    </Box>
  );
}
