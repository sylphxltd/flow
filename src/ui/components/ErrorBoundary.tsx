/**
 * Error Boundary Component
 * Catches React errors to prevent app crashes
 */

import React from 'react';
import { Box, Text } from 'ink';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('React Error Boundary caught error:', error);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box flexDirection="column" padding={1}>
          <Box marginBottom={1}>
            <Text color="red" bold>
              ❌ Application Error
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="yellow">
              The application encountered an error and needs to restart.
            </Text>
          </Box>
          {this.state.error && (
            <Box flexDirection="column" marginBottom={1}>
              <Text color="gray">Error: {this.state.error.message}</Text>
              {this.state.error.stack && (
                <Text color="gray" dimColor>
                  {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                </Text>
              )}
            </Box>
          )}
          <Box>
            <Text dimColor>
              Press Ctrl+C to exit and restart the application.
            </Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
