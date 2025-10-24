import { Box, Text } from 'ink';

interface ControlsProps {
  items: Array<{ key: string; label: string }>;
}

export function Controls({ items }: ControlsProps) {
  return (
    <Box marginTop={1}>
      <Text dimColor>
        {items.map((item, i) => (
          <Text key={item.key}>
            {i > 0 && ' • '}
            {item.label}
          </Text>
        ))}
      </Text>
    </Box>
  );
}
