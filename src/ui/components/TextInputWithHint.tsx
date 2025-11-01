/**
 * Text Input With Hint
 * TextInput with inline ghost text hint
 */

import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface TextInputWithHintProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  showCursor?: boolean;
  hint?: string; // Ghost text to show after cursor
}

export default function TextInputWithHint({
  value,
  onChange,
  onSubmit,
  placeholder,
  showCursor = true,
  hint,
}: TextInputWithHintProps) {
  return (
    <Box>
      <TextInput
        value={value}
        onChange={onChange}
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
