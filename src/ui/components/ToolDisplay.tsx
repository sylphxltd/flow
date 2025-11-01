/**
 * Tool Display Component
 * Beautiful display for tool calls with special handling for built-in tools
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from './Spinner.js';

interface ToolDisplayProps {
  name: string;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  args?: unknown;
  result?: unknown;
}

/**
 * Format tool args for display
 */
function formatArgs(toolName: string, args: unknown): string {
  if (!args || typeof args !== 'object') {
    return '';
  }

  const argsObj = args as Record<string, unknown>;

  // Special formatting for built-in tools
  switch (toolName) {
    case 'ask':
      return argsObj.question ? String(argsObj.question) : '';
    case 'read':
    case 'write':
    case 'edit':
      return argsObj.file_path ? String(argsObj.file_path) : '';
    case 'bash':
      return argsObj.command ? String(argsObj.command) : '';
    case 'grep':
      return argsObj.pattern ? String(argsObj.pattern) : '';
    case 'glob':
      return argsObj.pattern ? String(argsObj.pattern) : '';
    default:
      // For other tools (like MCP), show JSON
      return JSON.stringify(args);
  }
}

/**
 * Format tool result for display
 */
function formatResult(toolName: string, result: unknown): { lines: string[]; summary?: string } {
  if (result === null || result === undefined) {
    return { lines: [] };
  }

  // Convert result to string
  let resultStr: string;
  if (typeof result === 'string') {
    resultStr = result;
  } else if (typeof result === 'object') {
    resultStr = JSON.stringify(result, null, 2);
  } else {
    resultStr = String(result);
  }

  const lines = resultStr.split('\n').filter(line => line.trim());

  // Special handling for built-in tools
  switch (toolName) {
    case 'read':
      return {
        lines,
        summary: `Read ${lines.length} lines`,
      };
    case 'grep':
      return {
        lines,
        summary: `Found ${lines.length} matches`,
      };
    case 'bash':
      return {
        lines,
        summary: lines.length > 0 ? undefined : 'Command completed',
      };
    case 'ask':
      return {
        lines,
        summary: undefined,
      };
    default:
      return { lines };
  }
}

/**
 * Truncate lines to max 3, showing first and last
 */
function truncateLines(lines: string[], maxLines: number = 3): string[] {
  if (lines.length <= maxLines) {
    return lines;
  }

  return [
    lines[0],
    '...',
    lines[lines.length - 1],
  ];
}

export function ToolDisplay({ name, status, duration, args, result }: ToolDisplayProps) {
  const formattedArgs = formatArgs(name, args);
  const isBuiltIn = ['ask', 'read', 'write', 'edit', 'bash', 'grep', 'glob'].includes(name);

  // Status indicator
  const statusIndicator = status === 'running' ? (
    <>
      <Spinner color="#FFD700" />
      <Text> </Text>
    </>
  ) : status === 'completed' ? (
    <Text color="#00FF88">✓ </Text>
  ) : (
    <Text color="#FF3366">✗ </Text>
  );

  // Tool name and args display
  const toolHeader = isBuiltIn ? (
    <Box>
      {statusIndicator}
      <Text color="white" bold>{name}</Text>
      <Text color="gray">(</Text>
      <Text color="#00D9FF">{formattedArgs}</Text>
      <Text color="gray">)</Text>
      {duration !== undefined && status === 'completed' && (
        <Text color="gray" dimColor> {duration}ms</Text>
      )}
    </Box>
  ) : (
    <Box>
      {statusIndicator}
      <Text color="white" bold>{name}</Text>
      <Text color="gray">(</Text>
      <Text color="gray" dimColor>{formattedArgs}</Text>
      <Text color="gray">)</Text>
      {duration !== undefined && status === 'completed' && (
        <Text color="gray" dimColor> {duration}ms</Text>
      )}
    </Box>
  );

  // Result display
  let resultDisplay: React.ReactNode = null;

  if (status === 'running') {
    resultDisplay = (
      <Box marginLeft={2}>
        <Text dimColor>... waiting for result</Text>
      </Box>
    );
  } else if (status === 'completed' && result !== undefined) {
    const { lines, summary } = formatResult(name, result);

    if (summary) {
      // Show summary for tools like Read
      resultDisplay = (
        <Box marginLeft={2}>
          <Text color="gray">{summary}</Text>
        </Box>
      );
    } else if (lines.length > 0) {
      // Show truncated result
      const displayLines = truncateLines(lines);
      resultDisplay = (
        <Box flexDirection="column" marginLeft={2}>
          {displayLines.map((line, idx) => (
            <Text key={idx} color="gray">{line}</Text>
          ))}
        </Box>
      );
    }
  } else if (status === 'failed') {
    resultDisplay = (
      <Box marginLeft={2}>
        <Text color="#FF3366">Failed</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {toolHeader}
      {resultDisplay}
    </Box>
  );
}
