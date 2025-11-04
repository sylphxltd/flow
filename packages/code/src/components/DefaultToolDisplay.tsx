/**
 * Default Tool Display Factory
 * Creates a tool display component with custom formatters
 * Generic - does not know about specific tools
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from './Spinner.js';
import { useElapsedTime } from '@sylphx/code-client';
import type { ArgsFormatter, ResultFormatter } from '@sylphx/code-core';
import type { ToolDisplayProps } from '@sylphx/code-client';

interface StatusIndicatorProps {
  status: 'running' | 'completed' | 'failed';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  if (status === 'running') {
    return (
      <>
        <Spinner color="#FFD700" />
        <Text> </Text>
      </>
    );
  }

  return status === 'completed'
    ? <Text color="#00FF88">✓ </Text>
    : <Text color="#FF3366">✗ </Text>;
};

interface ToolHeaderProps {
  statusIndicator: React.ReactNode;
  displayName: string;
  formattedArgs: string;
  durationDisplay?: string;
  status: 'running' | 'completed' | 'failed';
}

const ToolHeader: React.FC<ToolHeaderProps> = ({
  statusIndicator,
  displayName,
  formattedArgs,
  durationDisplay,
  status,
}) => (
  <Box>
    {statusIndicator}
    <Text bold>{displayName}</Text>
    {formattedArgs && (
      <>
        <Text> </Text>
        <Text>{formattedArgs}</Text>
      </>
    )}
    {durationDisplay && (status === 'completed' || status === 'running') && (
      <Text dimColor> {durationDisplay}</Text>
    )}
  </Box>
);

interface ResultDisplayProps {
  status: 'running' | 'completed' | 'failed';
  result: unknown;
  formattedResult: { lines: string[]; summary?: string };
  error?: string;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  status,
  formattedResult,
  error,
}) => {
  // Don't show anything for running tools
  if (status === 'running') {
    return null;
  }

  if (status === 'failed') {
    return (
      <Box marginLeft={2}>
        <Text color="#FF3366">{error || 'Failed'}</Text>
      </Box>
    );
  }

  // For completed tools, show summary if available
  if (status === 'completed' && formattedResult.summary) {
    return (
      <Box marginLeft={2}>
        <Text>{formattedResult.summary}</Text>
      </Box>
    );
  }

  return null;
};

/**
 * Factory function to create a default tool display component
 *
 * @param displayName - Tool display name
 * @param formatArgs - Function to format tool arguments
 * @param formatResult - Function to format tool results
 * @returns A React component for displaying the tool
 */
export function createDefaultToolDisplay(
  displayName: string,
  formatArgs: ArgsFormatter,
  formatResult: ResultFormatter
): React.FC<ToolDisplayProps> {
  return function DefaultToolDisplay(props: ToolDisplayProps) {
    const { status, duration, args, result, error, startTime } = props;

    // Calculate real-time elapsed time for running tools
    const { display: durationDisplay } = useElapsedTime({
      startTime,
      duration,
      isRunning: status === 'running',
    });

    const formattedArgs = formatArgs(args as Record<string, unknown>);
    const formattedResult = formatResult(result);

    return (
      <Box flexDirection="column">
        <ToolHeader
          statusIndicator={<StatusIndicator status={status} />}
          displayName={displayName}
          formattedArgs={formattedArgs}
          durationDisplay={durationDisplay}
          status={status}
        />
        <ResultDisplay
          status={status}
          result={result}
          formattedResult={formattedResult}
          error={error}
        />
      </Box>
    );
  };
}
