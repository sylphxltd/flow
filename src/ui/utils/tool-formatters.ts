/**
 * Tool Formatters
 * Formatting functions for tool arguments and results
 */

/**
 * Utility functions
 */
export const truncateString = (str: string, maxLength: number = 60): string =>
  str.length <= maxLength ? str : str.slice(0, maxLength) + '...';

export const getRelativePath = (filePath: string): string => {
  const cwd = process.cwd();
  return filePath.startsWith(cwd) ? '.' + filePath.slice(cwd.length) : filePath;
};

export const isDefaultCwd = (dir: string | undefined): boolean =>
  !dir || dir === process.cwd();

export const pluralize = (count: number, singular: string, plural?: string): string =>
  count === 1 ? singular : (plural || `${singular}s`);

/**
 * Tool argument formatters
 */
export type ArgsFormatter = (args: Record<string, unknown>) => string;

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

const formatUpdateTodosArgs: ArgsFormatter = (args) => {
  const todos = args.todos as any[] | undefined;
  if (!todos || todos.length === 0) return '';

  const adding = todos.filter((t) => !t.id).length;
  const updating = todos.filter((t) => t.id).length;

  const parts: string[] = [];
  if (adding > 0) parts.push(`${adding} new`);
  if (updating > 0) parts.push(`${updating} updated`);

  return parts.join(', ');
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
  updateTodos: formatUpdateTodosArgs,
};

/**
 * Format tool args for display
 */
export const formatArgs = (toolName: string, args: unknown): string => {
  if (!args || typeof args !== 'object') {
    return '';
  }

  const formatter = argsFormatters[toolName];
  return formatter
    ? formatter(args as Record<string, unknown>)
    : JSON.stringify(args);
};

/**
 * Result formatting types and utilities
 */
export type FormattedResult = { lines: string[]; summary?: string };
export type ResultFormatter = (result: unknown) => FormattedResult;

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

const formatUpdateTodosResult: ResultFormatter = (result) => {
  // Handle updateTodos result: { summary, changes, total }
  if (typeof result === 'object' && result !== null && 'summary' in result) {
    const { summary, changes, total } = result as any;
    return {
      lines: changes || [],
      summary: `${summary} • ${total} active`,
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
  updateTodos: formatUpdateTodosResult,
};

/**
 * Format tool result for display
 */
export const formatResult = (toolName: string, result: unknown): FormattedResult => {
  if (result === null || result === undefined) {
    return { lines: [] };
  }

  const formatter = resultFormatters[toolName];
  return formatter
    ? formatter(result)
    : { lines: resultToLines(result) };
};
