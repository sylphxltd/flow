import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

type StatusType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface StatusMessageProps {
  type: StatusType;
  message: string;
}

export function StatusMessage({ type, message }: StatusMessageProps) {
  const colors = {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'cyan',
    loading: 'cyan',
  } as const;

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    loading: '',
  };

  return (
    <Box>
      {type === 'loading' ? (
        <Text color={colors[type]}>
          <Spinner type="dots" /> {message}
        </Text>
      ) : (
        <Text color={colors[type]}>
          {icons[type]} {message}
        </Text>
      )}
    </Box>
  );
}
