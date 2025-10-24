import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secret?: boolean;
  active?: boolean;
  required?: boolean;
}

export function InputField({
  label,
  value,
  onChange,
  placeholder,
  secret,
  active,
  required,
}: InputFieldProps) {
  return (
    <Box marginBottom={1}>
      <Box width={25}>
        <Text color={active ? 'cyan' : 'gray'}>
          {active ? '❯ ' : '  '}
          {label}
          {required && <Text color="red">*</Text>}
        </Text>
      </Box>
      <Box flexGrow={1}>
        {active ? (
          <TextInput
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            mask={secret ? '•' : undefined}
          />
        ) : (
          <Text color={value ? 'white' : 'gray'}>
            {secret && value ? '•'.repeat(Math.min(8, value.length)) : value || '—'}
          </Text>
        )}
      </Box>
    </Box>
  );
}
