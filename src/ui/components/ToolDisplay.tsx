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
    case 'edit':
      // Parse result to show replacement count
      if (typeof result === 'object' && result !== null && 'replacements' in result) {
        const replacements = (result as any).replacements;
        return {
          lines: [],
          summary: `Replaced ${replacements} occurrence${replacements > 1 ? 's' : ''}`,
        };
      }
      return { lines };
    case 'write':
      // Parse result to show bytes written
      if (typeof result === 'object' && result !== null && 'bytes' in result) {
        const bytes = (result as any).bytes;
        return {
          lines: [],
          summary: `Wrote ${bytes} bytes`,
        };
      }
      return { lines };
    case 'grep':
      return {
        lines,
        summary: `Found ${lines.length} matches`,
      };
    case 'glob':
      return {
        lines,
        summary: `Found ${lines.length} files`,
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
 * Truncate lines to max 5, showing first and last with count
 */
function truncateLines(lines: string[], maxLines: number = 5): string[] {
  if (lines.length <= maxLines) {
    return lines;
  }

  const hiddenCount = lines.length - 2; // First and last are shown
  return [
    lines[0],
    `... ${hiddenCount} more lines ...`,
    lines[lines.length - 1],
  ];
}

/**
 * Get display name for tool
 */
function getDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    'read': 'Read',
    'write': 'Write',
    'edit': 'Edit',
    'bash': 'Bash',
    'grep': 'Search',
    'glob': 'Search',
    'ask': 'Ask',
  };

  return displayNames[toolName.toLowerCase()] || toolName;
}

export function ToolDisplay({ name, status, duration, args, result }: ToolDisplayProps) {
  const formattedArgs = formatArgs(name, args);
  const isBuiltIn = ['ask', 'read', 'write', 'edit', 'bash', 'grep', 'glob'].includes(name.toLowerCase());
  const displayName = getDisplayName(name);

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
      <Text color="white" bold>{displayName}</Text>
      <Text color="white">(</Text>
      <Text color="white">{formattedArgs}</Text>
      <Text color="white">)</Text>
      {duration !== undefined && status === 'completed' && (
        <Text color="gray" dimColor> {duration}ms</Text>
      )}
    </Box>
  ) : (
    <Box>
      {statusIndicator}
      <Text color="white" bold>{displayName}</Text>
      <Text color="white">(</Text>
      <Text color="white" dimColor>{formattedArgs}</Text>
      <Text color="white">)</Text>
      {duration !== undefined && status === 'completed' && (
        <Text color="gray" dimColor> {duration}ms</Text>
      )}
    </Box>
  );

  // Result display - only show if there's actual content
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
    // If no summary and no lines, resultDisplay stays null (no empty space)
  } else if (status === 'failed') {
    resultDisplay = (
      <Box marginLeft={2}>
        <Text color="#FF3366">Failed</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingBottom={1}>
      {toolHeader}
      {resultDisplay}
    </Box>
  );
}
