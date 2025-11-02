/**
 * Tool Display Component
 * Supports two modes:
 * 1. Custom component: if tool has a registered component, use it
 * 2. Default display: use formatters for args/results (most tools)
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from './Spinner.js';
import {
  formatArgs,
  formatResult,
  getDisplayName,
  isBuiltInTool,
  getToolConfig,
  type ToolDisplayProps,
} from '../utils/tool-configs.js';
import { truncateLines, getDiffLineColor } from '../utils/tool-display-utils.js';

/**
 * Component rendering helpers
 */
const StatusIndicator: React.FC<{ status: ToolDisplayProps['status'] }> = ({ status }) => {
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

const ToolHeader: React.FC<{
  statusIndicator: React.ReactNode;
  displayName: string;
  formattedArgs: string;
  isBuiltIn: boolean;
  duration?: number;
  status: ToolDisplayProps['status'];
}> = ({ statusIndicator, displayName, formattedArgs, isBuiltIn, duration, status }) => (
  <Box>
    {statusIndicator}
    <Text color="white">{displayName}</Text>
    {formattedArgs && (
      <>
        <Text color="white"> </Text>
        <Text color="white">{formattedArgs}</Text>
      </>
    )}
    {duration !== undefined && (status === 'completed' || status === 'running') && (
      <Text dimColor> {duration}ms</Text>
    )}
  </Box>
);

const DiffLine: React.FC<{ line: string; index: number; isEditTool: boolean }> = ({ line, index, isEditTool }) => {
  const color = isEditTool ? getDiffLineColor(line) : undefined;
  return <Text key={index} color={color || 'gray'}>{line}</Text>;
};

const ResultLines: React.FC<{ lines: string[]; isEditTool: boolean }> = ({ lines, isEditTool }) => (
  <Box flexDirection="column" paddingTop={1}>
    {truncateLines(lines).map((line, idx) => (
      <DiffLine key={idx} line={line} index={idx} isEditTool={isEditTool} />
    ))}
  </Box>
);

const ResultDisplay: React.FC<{
  status: ToolDisplayProps['status'];
  result: unknown;
  toolName: string;
  error?: string;
}> = ({ status, result, toolName, error }) => {
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
  if (status === 'completed' && result !== undefined) {
    const { lines, summary } = formatResult(toolName, result);

    // Only show summary, not full output
    if (summary) {
      return (
        <Box marginLeft={2}>
          <Text dimColor>{summary}</Text>
        </Box>
      );
    }
  }

  return null;
};

export function ToolDisplay(props: ToolDisplayProps) {
  const { name, status, duration, args, result, error } = props;

  // Check if tool has a custom component registered
  const config = getToolConfig(name);
  if (config && config.type === 'component') {
    const CustomComponent = config.component;
    return <CustomComponent {...props} />;
  }

  // Use default display with formatters
  const formattedArgs = formatArgs(name, args);
  const isBuiltIn = isBuiltInTool(name);
  const displayName = getDisplayName(name);

  return (
    <Box flexDirection="column">
      <ToolHeader
        statusIndicator={<StatusIndicator status={status} />}
        displayName={displayName}
        formattedArgs={formattedArgs}
        isBuiltIn={isBuiltIn}
        duration={duration}
        status={status}
      />
      <ResultDisplay status={status} result={result} toolName={name} error={error} />
    </Box>
  );
}
