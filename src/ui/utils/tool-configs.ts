/**
 * Tool Display Configurations
 * Single source of truth for all tool display logic
 *
 * Two ways to configure tool display:
 * 1. Formatter config (simple): displayName + formatArgs + formatResult
 * 2. Custom component (advanced): complete control over rendering
 */

import type { FC } from 'react';
import type { ArgsFormatter, ResultFormatter } from './tool-formatters.js';
import {
  truncateString,
  getRelativePath,
  isDefaultCwd,
  pluralize,
} from './tool-formatters.js';

/**
 * Tool display props (for custom components)
 */
export interface ToolDisplayProps {
  name: string;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  args?: unknown;
  result?: unknown;
  error?: string;
}

/**
 * Tool configuration
 * - component: custom React component (optional)
 * - displayName, formatArgs, formatResult: for default display (optional)
 *
 * If component is provided, it will be used.
 * Otherwise, DefaultToolComponent will use the formatters.
 */
export interface ToolConfig {
  component?: FC<ToolDisplayProps>;
  displayName?: string;
  formatArgs?: ArgsFormatter;
  formatResult?: ResultFormatter;
}

/**
 * Helper to convert result to lines
 */
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
 * Tool configurations registry
 * Add new tools here - single source of truth
 *
 * Examples:
 * - Default display: { displayName: '...', formatArgs: ..., formatResult: ... }
 * - Custom component: { component: MyCustomComponent }
 */
export const toolConfigs: Record<string, ToolConfig> = {
  // Ask tool
  ask: {
    displayName: 'Ask',
    formatArgs: (args) =>
      args.question ? truncateString(String(args.question), 80) : '',
    formatResult: (result) => ({
      lines: resultToLines(result),
      summary: undefined,
    }),
  },

  // Read tool
  read: {
    displayName: 'Read',
    formatArgs: (args) =>
      args.file_path ? getRelativePath(String(args.file_path)) : '',
    formatResult: (result) => {
      const content = typeof result === 'object' && result !== null && 'content' in result
        ? String((result as any).content)
        : typeof result === 'string'
        ? result
        : JSON.stringify(result);

      const lines = content.split('\n').filter(line => line.trim());
      return {
        lines: [],
        summary: `Read ${lines.length} ${pluralize(lines.length, 'line')}`,
      };
    },
  },

  // Write tool
  write: {
    displayName: 'Write',
    formatArgs: (args) =>
      args.file_path ? getRelativePath(String(args.file_path)) : '',
    formatResult: (result) => {
      if (typeof result !== 'object' || result === null || !('preview' in result)) {
        return { lines: resultToLines(result) };
      }

      const { fileName, lineCount, preview } = result as any;
      return {
        lines: preview,
        summary: `Wrote ${fileName} (${lineCount} ${pluralize(lineCount, 'line')})`,
      };
    },
  },

  // Edit tool
  edit: {
    displayName: 'Update',
    formatArgs: (args) =>
      args.file_path ? getRelativePath(String(args.file_path)) : '',
    formatResult: (result) => {
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
    },
  },

  // Bash tool
  bash: {
    displayName: 'Bash',
    formatArgs: (args) => {
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
    },
    formatResult: (result) => {
      // Background mode
      if (typeof result === 'object' && result !== null && 'mode' in result && (result as any).mode === 'background') {
        const { bash_id, message } = result as any;
        return {
          lines: [`bash_id: ${bash_id}`],
          summary: message,
        };
      }

      // Foreground mode
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
    },
  },

  // Bash output tool
  'bash-output': {
    displayName: 'BashOutput',
    formatArgs: (args) => args.bash_id ? String(args.bash_id) : '',
    formatResult: (result) => {
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
    },
  },

  // Kill bash tool
  'kill-bash': {
    displayName: 'KillBash',
    formatArgs: (args) => args.bash_id ? String(args.bash_id) : '',
    formatResult: (result) => {
      if (typeof result === 'object' && result !== null && 'message' in result) {
        const { message } = result as any;
        return {
          lines: [],
          summary: message,
        };
      }

      return { lines: resultToLines(result) };
    },
  },

  // Grep tool
  grep: {
    displayName: 'Search',
    formatArgs: (args) => {
      const pattern = args.pattern ? String(args.pattern) : '';
      const globPattern = args.glob ? String(args.glob) : '';
      const type = args.type ? String(args.type) : '';
      const path = args.path ? String(args.path) : '';

      let display = `"${truncateString(pattern, 40)}"`;

      if (globPattern) {
        display += ` in ${globPattern}`;
      } else if (type) {
        display += ` [${type}]`;
      }

      if (path && !isDefaultCwd(path)) {
        display += ` [${getRelativePath(path)}]`;
      }

      return display;
    },
    formatResult: (result) => {
      if (typeof result !== 'object' || result === null) {
        return { lines: resultToLines(result) };
      }

      const res = result as any;

      // Content mode
      if ('matches' in res) {
        const matches = res.matches as Array<{ file: string; line: number; content: string }>;
        const lines = matches.map(m => `${m.file}:${m.line}: ${m.content}`);
        return {
          lines,
          summary: `Found ${matches.length} ${pluralize(matches.length, 'match', 'matches')}`,
        };
      }

      // Files mode
      if ('files' in res) {
        const files = res.files as string[];
        return {
          lines: files,
          summary: `Found ${files.length} ${pluralize(files.length, 'file')}`,
        };
      }

      // Count mode
      if ('count' in res && !('matches' in res) && !('files' in res)) {
        return {
          lines: [],
          summary: `Found ${res.count} ${pluralize(res.count, 'match', 'matches')}`,
        };
      }

      return { lines: resultToLines(result) };
    },
  },

  // Glob tool
  glob: {
    displayName: 'Search',
    formatArgs: (args) => {
      const pattern = args.pattern ? String(args.pattern) : '';
      const path = args.path ? String(args.path) : '';

      return path && !isDefaultCwd(path)
        ? `${pattern} in ${getRelativePath(path)}`
        : pattern;
    },
    formatResult: (result) => {
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
    },
  },

  // Update todos tool
  updateTodos: {
    displayName: 'Tasks',
    formatArgs: (args) => {
      const todos = args.todos as any[] | undefined;
      if (!todos || todos.length === 0) return '';

      const adding = todos.filter((t) => !t.id).length;
      const updating = todos.filter((t) => t.id).length;

      const parts: string[] = [];
      if (adding > 0) parts.push(`${adding} new`);
      if (updating > 0) parts.push(`${updating} updated`);

      return parts.join(', ');
    },
    formatResult: (result) => {
      if (typeof result === 'object' && result !== null && 'summary' in result) {
        const { summary, changes, total } = result as any;
        return {
          lines: changes || [],
          summary: `${summary} • ${total} active`,
        };
      }

      return { lines: resultToLines(result) };
    },
  },
};

/**
 * Get tool configuration
 */
export const getToolConfig = (toolName: string): ToolConfig | null => {
  return toolConfigs[toolName] || null;
};

/**
 * Check if tool is built-in (has a config)
 */
export const isBuiltInTool = (toolName: string): boolean => {
  return toolName in toolConfigs;
};

/**
 * Get display name for tool
 */
export const getDisplayName = (toolName: string): string => {
  const config = getToolConfig(toolName);
  return config?.displayName || toolName;
};

/**
 * Format tool arguments
 */
export const formatArgs = (toolName: string, args: unknown): string => {
  if (!args || typeof args !== 'object') {
    return '';
  }

  const config = getToolConfig(toolName);
  if (config?.formatArgs) {
    return config.formatArgs(args as Record<string, unknown>);
  }
  return JSON.stringify(args);
};

/**
 * Format tool result
 */
export const formatResult = (toolName: string, result: unknown): { lines: string[]; summary?: string } => {
  if (result === null || result === undefined) {
    return { lines: [] };
  }

  const config = getToolConfig(toolName);
  if (config?.formatResult) {
    return config.formatResult(result);
  }
  return { lines: resultToLines(result) };
};

/**
 * Register a tool display configuration
 *
 * Examples:
 * ```ts
 * // Custom component
 * registerTool('myTool', { component: MyToolComponent });
 *
 * // Default display with formatters
 * registerTool('myTool', {
 *   displayName: 'My Tool',
 *   formatArgs: (args) => args.foo,
 *   formatResult: (result) => ({ lines: [String(result)] }),
 * });
 * ```
 */
export const registerTool = (toolName: string, config: ToolConfig): void => {
  toolConfigs[toolName] = config;
};
