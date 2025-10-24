import { Box, Text } from 'ink';

interface SelectFieldProps {
  label: string;
  options: string[];
  value: string;
  selectedIndex: number;
  active?: boolean;
  isOpen?: boolean;
  required?: boolean;
}

export function SelectField({
  label,
  options,
  value,
  selectedIndex,
  active,
  isOpen,
  required,
}: SelectFieldProps) {
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
        {active && isOpen ? (
          <Box flexDirection="column">
            {options.map((option, index) => (
              <Text key={option} color={index === selectedIndex ? 'cyan' : 'gray'}>
                {index === selectedIndex ? '❯ ' : '  '}
                {option}
              </Text>
            ))}
          </Box>
        ) : (
          <Text color={value ? 'white' : 'gray'}>
            {value || '—'}
            {active && ' ▼'}
          </Text>
        )}
      </Box>
    </Box>
  );
}
