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
 * Truncate long strings for display
 */
function truncateString(str: string, maxLength: number = 60): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Get relative file path (shorten from cwd)
 */
function getRelativePath(filePath: string): string {
  const cwd = process.cwd();
  if (filePath.startsWith(cwd)) {
    return '.' + filePath.slice(cwd.length);
  }
  return filePath;
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
  switch (toolName.toLowerCase()) {
    case 'ask': {
      // ask(question)
      return argsObj.question ? truncateString(String(argsObj.question), 80) : '';
    }

    case 'read': {
      // read(file_path)
      const filePath = argsObj.file_path ? String(argsObj.file_path) : '';
      return getRelativePath(filePath);
    }

    case 'write': {
      // write(file_path)
      const filePath = argsObj.file_path ? String(argsObj.file_path) : '';
      return getRelativePath(filePath);
    }

    case 'edit': {
      // edit(file_path)
      const filePath = argsObj.file_path ? String(argsObj.file_path) : '';
      return getRelativePath(filePath);
    }

    case 'bash': {
      // bash(command)
      const command = argsObj.command ? String(argsObj.command) : '';
      const cwd = argsObj.cwd ? String(argsObj.cwd) : '';

      // If cwd is specified and different from current, show it
      if (cwd && cwd !== process.cwd()) {
        return `${truncateString(command, 50)} [in ${getRelativePath(cwd)}]`;
      }

      return truncateString(command, 80);
    }

    case 'grep': {
      // grep(pattern, file_pattern?, directory?)
      const pattern = argsObj.pattern ? String(argsObj.pattern) : '';
      const filePattern = argsObj.file_pattern ? String(argsObj.file_pattern) : '';
      const directory = argsObj.directory ? String(argsObj.directory) : '';

      let display = `"${truncateString(pattern, 40)}"`;

      if (filePattern && filePattern !== '**/*') {
        display += ` in ${filePattern}`;
      }

      if (directory && directory !== process.cwd()) {
        display += ` [${getRelativePath(directory)}]`;
      }

      return display;
    }

    case 'glob': {
      // glob(pattern, directory?)
      const pattern = argsObj.pattern ? String(argsObj.pattern) : '';
      const directory = argsObj.directory ? String(argsObj.directory) : '';

      let display = pattern;

      if (directory && directory !== process.cwd()) {
        display += ` in ${getRelativePath(directory)}`;
      }

      return display;
    }

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
      // Parse result to show diff
      if (typeof result === 'object' && result !== null && 'diff' in result) {
        const diff = (result as any).diff as string[];
        const path = (result as any).path;
        const fileName = path ? path.split('/').pop() : '';
        const oldString = (result as any).old_string;
        const newString = (result as any).new_string;
        const additions = newString.split('\n').length;
        const removals = oldString.split('\n').length;

        return {
          lines: diff,
          summary: `Updated ${fileName} with ${additions} addition${additions !== 1 ? 's' : ''} and ${removals} removal${removals !== 1 ? 's' : ''}`,
        };
      }
      return { lines };
    case 'write':
      // Parse result to show file info and preview
      if (typeof result === 'object' && result !== null && 'preview' in result) {
        const fileName = (result as any).fileName;
        const lineCount = (result as any).lineCount;
        const preview = (result as any).preview as string[];

        return {
          lines: preview,
          summary: `Wrote ${fileName} (${lineCount} line${lineCount !== 1 ? 's' : ''})`,
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
    'edit': 'Update',
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

    if (summary && lines.length === 0) {
      // Show summary only (no lines to display)
      resultDisplay = (
        <Box marginLeft={2}>
          <Text color="gray">{summary}</Text>
        </Box>
      );
    } else if (summary && lines.length > 0) {
      // Show summary with lines below
      resultDisplay = (
        <Box flexDirection="column" marginLeft={2}>
          <Text color="gray">{summary}</Text>
          <Box flexDirection="column" paddingTop={1}>
            {truncateLines(lines).map((line, idx) => {
              // For edit tool, colorize based on diff markers
              if (name.toLowerCase() === 'edit' && typeof line === 'string') {
                const match = line.match(/^\s*\d+\s+([-+])/);
                if (match) {
                  const marker = match[1];
                  if (marker === '-') {
                    return <Text key={idx} color="#FF3366">{line}</Text>;
                  } else if (marker === '+') {
                    return <Text key={idx} color="#00FF88">{line}</Text>;
                  }
                }
              }
              return <Text key={idx} color="gray">{line}</Text>;
            })}
          </Box>
        </Box>
      );
    } else if (lines.length > 0) {
      // Show truncated result with special handling for edit tool diff
      const displayLines = truncateLines(lines);
      const isEditTool = name.toLowerCase() === 'edit';

      resultDisplay = (
        <Box flexDirection="column" marginLeft={2}>
          {displayLines.map((line, idx) => {
            // For edit tool, colorize based on diff markers
            if (isEditTool && typeof line === 'string') {
              // Check if line contains - or + after line number
              const match = line.match(/^\s*\d+\s+([-+])/);
              if (match) {
                const marker = match[1];
                if (marker === '-') {
                  return <Text key={idx} color="#FF3366">{line}</Text>; // Red for removals
                } else if (marker === '+') {
                  return <Text key={idx} color="#00FF88">{line}</Text>; // Green for additions
                }
              }
            }
            // Default gray for context lines or other tools
            return <Text key={idx} color="gray">{line}</Text>;
          })}
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
