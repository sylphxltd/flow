import { Box, Text } from 'ink';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="cyan">
        ▸ {title}
      </Text>
      {subtitle && (
        <Text color="gray" dimColor>
          {subtitle}
        </Text>
      )}
    </Box>
  );
}
