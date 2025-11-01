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
  error?: string;
}

/**
 * Utility functions
 */
const truncateString = (str: string, maxLength: number = 60): string =>
  str.length <= maxLength ? str : str.slice(0, maxLength) + '...';

const getRelativePath = (filePath: string): string => {
  const cwd = process.cwd();
  return filePath.startsWith(cwd) ? '.' + filePath.slice(cwd.length) : filePath;
};

const isDefaultCwd = (dir: string | undefined): boolean =>
  !dir || dir === process.cwd();

/**
 * Tool argument formatters
 */
type ArgsFormatter = (args: Record<string, unknown>) => string;

const formatAskArgs: ArgsFormatter = (args) =>
  args.question ? truncateString(String(args.question), 80) : '';

const formatFilePathArgs: ArgsFormatter = (args) =>
  args.file_path ? getRelativePath(String(args.file_path)) : '';

const formatBashArgs: ArgsFormatter = (args) => {
  const command = args.command ? String(args.command) : '';
  const cwd = args.cwd ? String(args.cwd) : '';
  const runInBackground = args.run_in_background;

  let display = truncateString(command, 80);

  if (runInBackground) {
    display += ' [background]';
  }

  if (cwd && cwd !== process.cwd()) {
    display += ` [in ${getRelativePath(cwd)}]`;
  }

  return display;
};

const formatBashIdArgs: ArgsFormatter = (args) =>
  args.bash_id ? String(args.bash_id) : '';

const formatGrepArgs: ArgsFormatter = (args) => {
  const pattern = args.pattern ? String(args.pattern) : '';
  const globPattern = args.glob ? String(args.glob) : '';
  const type = args.type ? String(args.type) : '';
  const path = args.path ? String(args.path) : '';

  let display = `"${truncateString(pattern, 40)}"`;

  // Show file filter (glob or type)
  if (globPattern) {
    display += ` in ${globPattern}`;
  } else if (type) {
    display += ` [${type}]`;
  }

  // Show path if not default
  if (path && !isDefaultCwd(path)) {
    display += ` [${getRelativePath(path)}]`;
  }

  return display;
};

const formatGlobArgs: ArgsFormatter = (args) => {
  const pattern = args.pattern ? String(args.pattern) : '';
  const path = args.path ? String(args.path) : '';

  return path && !isDefaultCwd(path)
    ? `${pattern} in ${getRelativePath(path)}`
    : pattern;
};

/**
 * Tool formatter registry
 */
const argsFormatters: Record<string, ArgsFormatter> = {
  ask: formatAskArgs,
  read: formatFilePathArgs,
  write: formatFilePathArgs,
  edit: formatFilePathArgs,
  bash: formatBashArgs,
  'bash-output': formatBashIdArgs,
  'kill-bash': formatBashIdArgs,
  grep: formatGrepArgs,
  glob: formatGlobArgs,
};

/**
 * Format tool args for display
 */
const formatArgs = (toolName: string, args: unknown): string => {
  if (!args || typeof args !== 'object') {
    return '';
  }

  const formatter = argsFormatters[toolName.toLowerCase()];
  return formatter
    ? formatter(args as Record<string, unknown>)
    : JSON.stringify(args);
};

/**
 * Result formatting types and utilities
 */
type FormattedResult = { lines: string[]; summary?: string };
type ResultFormatter = (result: unknown) => FormattedResult;

const pluralize = (count: number, singular: string, plural?: string): string =>
  count === 1 ? singular : (plural || `${singular}s`);

const resultToLines = (result: unknown): string[] => {
  if (result === null || result === undefined) return [];

  const resultStr = typeof result === 'string'
    ? result
    : typeof result === 'object'
    ? JSON.stringify(result, null, 2)
    : String(result);

  return resultStr.split('\n').filter(line => line.trim());
};

/**
 * Tool result formatters
 */
const formatReadResult: ResultFormatter = (result) => {
  // Extract content from { path, content, encoding } structure
  const content = typeof result === 'object' && result !== null && 'content' in result
    ? String((result as any).content)
    : typeof result === 'string'
    ? result
    : JSON.stringify(result);

  const lines = content.split('\n').filter(line => line.trim());
  return {
    lines: [], // Don't show content for read operations
    summary: `Read ${lines.length} ${pluralize(lines.length, 'line')}`,
  };
};

const formatEditResult: ResultFormatter = (result) => {
  if (typeof result !== 'object' || result === null || !('diff' in result)) {
    return { lines: resultToLines(result) };
  }

  const { diff, path, old_string, new_string } = result as any;
  const fileName = path ? path.split('/').pop() : '';
  const additions = new_string.split('\n').length;
  const removals = old_string.split('\n').length;

  return {
    lines: diff,
    summary: `Updated ${fileName} with ${additions} ${pluralize(additions, 'addition')} and ${removals} ${pluralize(removals, 'removal')}`,
  };
};

const formatWriteResult: ResultFormatter = (result) => {
  if (typeof result !== 'object' || result === null || !('preview' in result)) {
    return { lines: resultToLines(result) };
  }

  const { fileName, lineCount, preview } = result as any;
  return {
    lines: preview,
    summary: `Wrote ${fileName} (${lineCount} ${pluralize(lineCount, 'line')})`,
  };
};

const formatGrepResult: ResultFormatter = (result) => {
  if (typeof result !== 'object' || result === null) {
    return { lines: resultToLines(result) };
  }

  const res = result as any;

  // Content mode: { pattern, directory, matches, count }
  if ('matches' in res) {
    const matches = res.matches as Array<{ file: string; line: number; content: string }>;
    const lines = matches.map(m => `${m.file}:${m.line}: ${m.content}`);
    return {
      lines,
      summary: `Found ${matches.length} ${pluralize(matches.length, 'match', 'matches')}`,
    };
  }

  // Files mode: { pattern, directory, files, count }
  if ('files' in res) {
    const files = res.files as string[];
    return {
      lines: files,
      summary: `Found ${files.length} ${pluralize(files.length, 'file')}`,
    };
  }

  // Count mode: { pattern, directory, count }
  if ('count' in res && !('matches' in res) && !('files' in res)) {
    return {
      lines: [],
      summary: `Found ${res.count} ${pluralize(res.count, 'match', 'matches')}`,
    };
  }

  return { lines: resultToLines(result) };
};

const formatGlobResult: ResultFormatter = (result) => {
  // Extract files from { pattern, directory, files, count } structure
  if (typeof result === 'object' && result !== null && 'files' in result) {
    const files = (result as any).files as string[];
    return {
      lines: files,
      summary: `Found ${files.length} ${pluralize(files.length, 'file')}`,
    };
  }

  const lines = resultToLines(result);
  return {
    lines,
    summary: `Found ${lines.length} ${pluralize(lines.length, 'file')}`,
  };
};

const formatBashResult: ResultFormatter = (result) => {
  // Handle background mode: { bash_id, command, mode, message }
  if (typeof result === 'object' && result !== null && 'mode' in result && (result as any).mode === 'background') {
    const { bash_id, message } = result as any;
    return {
      lines: [`bash_id: ${bash_id}`],
      summary: message,
    };
  }

  // Handle foreground mode: { command, stdout, stderr, exitCode }
  if (typeof result === 'object' && result !== null && 'stdout' in result) {
    const { stdout, stderr, exitCode } = result as any;
    const output = stderr && exitCode !== 0 ? stderr : stdout;
    const lines = output ? output.split('\n').filter((line: string) => line.trim()) : [];
    return {
      lines,
      summary: lines.length > 0 ? undefined : 'Command completed',
    };
  }

  const lines = resultToLines(result);
  return {
    lines,
    summary: lines.length > 0 ? undefined : 'Command completed',
  };
};

const formatAskResult: ResultFormatter = (result) => ({
  lines: resultToLines(result),
  summary: undefined,
});

const formatBashOutputResult: ResultFormatter = (result) => {
  // Handle bash-output result: { bash_id, command, stdout, stderr, exitCode, isRunning, duration }
  if (typeof result === 'object' && result !== null && 'bash_id' in result) {
    const { stdout, stderr, exitCode, isRunning, duration } = result as any;
    const output = stderr && exitCode !== 0 ? stderr : stdout;
    const lines = output ? output.split('\n').filter((line: string) => line.trim()) : [];

    const status = isRunning ? 'Still running' : `Completed (exit: ${exitCode})`;
    const durationSec = Math.floor((duration as number) / 1000);

    return {
      lines,
      summary: `${status} - ${durationSec}s`,
    };
  }

  return { lines: resultToLines(result) };
};

const formatKillBashResult: ResultFormatter = (result) => {
  // Handle kill-bash result: { bash_id, status, message }
  if (typeof result === 'object' && result !== null && 'message' in result) {
    const { message } = result as any;
    return {
      lines: [],
      summary: message,
    };
  }

  return { lines: resultToLines(result) };
};

/**
 * Result formatter registry
 */
const resultFormatters: Record<string, ResultFormatter> = {
  read: formatReadResult,
  edit: formatEditResult,
  write: formatWriteResult,
  grep: formatGrepResult,
  glob: formatGlobResult,
  bash: formatBashResult,
  'bash-output': formatBashOutputResult,
  'kill-bash': formatKillBashResult,
  ask: formatAskResult,
};

/**
 * Format tool result for display
 */
const formatResult = (toolName: string, result: unknown): FormattedResult => {
  if (result === null || result === undefined) {
    return { lines: [] };
  }

  const formatter = resultFormatters[toolName.toLowerCase()];
  return formatter
    ? formatter(result)
    : { lines: resultToLines(result) };
};

/**
 * Truncate lines to max 5, showing first and last with count
 */
const truncateLines = (lines: string[], maxLines: number = 5): string[] => {
  if (lines.length <= maxLines) return lines;

  const hiddenCount = lines.length - 2;
  return [
    lines[0],
    `... ${hiddenCount} more ${pluralize(hiddenCount, 'line')} ...`,
    lines[lines.length - 1],
  ];
};

/**
 * Display name registry
 */
const displayNames: Record<string, string> = {
  read: 'Read',
  write: 'Write',
  edit: 'Update',
  bash: 'Bash',
  'bash-output': 'BashOutput',
  'kill-bash': 'KillBash',
  grep: 'Search',
  glob: 'Search',
  ask: 'Ask',
};

/**
 * Get display name for tool
 */
const getDisplayName = (toolName: string): string =>
  displayNames[toolName.toLowerCase()] || toolName;

/**
 * Component rendering helpers
 */
const builtInTools = new Set(['ask', 'read', 'write', 'edit', 'bash', 'bash-output', 'kill-bash', 'grep', 'glob']);

const isBuiltInTool = (name: string): boolean =>
  builtInTools.has(name.toLowerCase());

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
    <Text dimColor>{displayName}</Text>
    {formattedArgs && (
      <>
        <Text dimColor> </Text>
        <Text dimColor>{formattedArgs}</Text>
      </>
    )}
    {duration !== undefined && status === 'completed' && (
      <Text dimColor> • {duration}ms</Text>
    )}
  </Box>
);

const getDiffLineColor = (line: string): string | undefined => {
  const match = line.match(/^\s*\d+\s+([-+])/);
  if (!match) return undefined;

  return match[1] === '-' ? '#FF3366' : '#00FF88';
};

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
  // Don't show anything for running or completed tools (info is in header)
  if (status === 'running') {
    return null;
  }

  if (status === 'failed') {
    return (
      <Box marginLeft={2}>
        <Text color="#FF3366">✗ {error || 'Failed'}</Text>
      </Box>
    );
  }

  // For completed tools, only show result if it's truly important
  // Most tools don't need to show results (the summary in formatResult handles this)
  return null;
};

export function ToolDisplay({ name, status, duration, args, result, error }: ToolDisplayProps) {
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
