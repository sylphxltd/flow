/**
 * SelectionFilterInput Component
 * Primitive component for filtering selection options
 */

import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface SelectionFilterInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SelectionFilterInput({
  value,
  onChange,
  placeholder = 'Type to filter...'
}: SelectionFilterInputProps) {
  return (
    <Box marginBottom={1}>
      <Text dimColor>Filter: </Text>
      <TextInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        showCursor
      />
    </Box>
  );
}
