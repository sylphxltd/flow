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
}: TextInputWithHintProps) {
  // Internal cursor state (used when not controlled from parent)
  const [internalCursor, setInternalCursor] = useState(value.length);

  // Use controlled cursor if provided, otherwise use internal state
  const cursor = controlledCursor !== undefined ? controlledCursor : internalCursor;
  const onCursorChange = controlledOnCursorChange || setInternalCursor;

  // Sync internal cursor when value changes (for uncontrolled mode)
  React.useEffect(() => {
    if (controlledCursor === undefined) {
      setInternalCursor(value.length);
    }
  }, [value, controlledCursor]);

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
      />
      {hint && value.length > 0 && (
        <Text color="#444444">{hint}</Text>
      )}
    </Box>
  );
}
