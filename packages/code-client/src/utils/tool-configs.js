/**
 * Tool Display Configurations
 * Single source of truth for all tool display logic
 *
 * Two ways to configure tool display:
 * 1. Formatter config (simple): displayName + formatArgs + formatResult
 * 2. Custom component (advanced): complete control over rendering
 */
import { truncateString, getRelativePath, isDefaultCwd, pluralize, } from './tool-formatters.js';
import { createDefaultToolDisplay } from '../components/DefaultToolDisplay.js';
/**
 * Helper to convert result to lines
 */
const resultToLines = (result) => {
    if (result === null || result === undefined)
        return [];
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
 * - Default display: createDefaultToolDisplay('Name', formatArgs, formatResult)
 * - Custom component: MyCustomComponent
 */
export const toolConfigs = {
    // Ask tool
    ask: createDefaultToolDisplay('Ask', (args) => args.question ? truncateString(String(args.question), 80) : '', (result) => ({
        lines: resultToLines(result),
        summary: undefined,
    })),
    // Read tool
    read: createDefaultToolDisplay('Read', (args) => args.file_path ? getRelativePath(String(args.file_path)) : '', (result) => {
        // Handle undefined/null results
        if (result === null || result === undefined) {
            return {
                lines: [],
                summary: 'Read 0 lines',
            };
        }
        const content = typeof result === 'object' && result !== null && 'content' in result
            ? String(result.content)
            : typeof result === 'string'
                ? result
                : JSON.stringify(result);
        const lines = content.split('\n').filter(line => line.trim());
        return {
            lines: [],
            summary: `Read ${lines.length} ${pluralize(lines.length, 'line')}`,
        };
    }),
    // Write tool
    write: createDefaultToolDisplay('Write', (args) => args.file_path ? getRelativePath(String(args.file_path)) : '', (result) => {
        if (typeof result !== 'object' || result === null || !('preview' in result)) {
            return { lines: resultToLines(result) };
        }
        const { fileName, lineCount, preview } = result;
        return {
            lines: preview,
            summary: `Wrote ${fileName} (${lineCount} ${pluralize(lineCount, 'line')})`,
        };
    }),
    // Edit tool
    edit: createDefaultToolDisplay('Update', (args) => args.file_path ? getRelativePath(String(args.file_path)) : '', (result) => {
        if (typeof result !== 'object' || result === null || !('diff' in result)) {
            return { lines: resultToLines(result) };
        }
        const { diff, path, old_string, new_string } = result;
        const fileName = path ? path.split('/').pop() : '';
        const additions = new_string.split('\n').length;
        const removals = old_string.split('\n').length;
        return {
            lines: diff,
            summary: `Updated ${fileName} with ${additions} ${pluralize(additions, 'addition')} and ${removals} ${pluralize(removals, 'removal')}`,
        };
    }),
    // Bash tool
    bash: createDefaultToolDisplay('Bash', (args) => {
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
    }, (result) => {
        // Background mode
        if (typeof result === 'object' && result !== null && 'mode' in result && result.mode === 'background') {
            const { bash_id, message } = result;
            return {
                lines: [`bash_id: ${bash_id}`],
                summary: message,
            };
        }
        // Foreground mode
        if (typeof result === 'object' && result !== null && 'stdout' in result) {
            const { stdout, stderr, exitCode } = result;
            const output = stderr && exitCode !== 0 ? stderr : stdout;
            const lines = output ? output.split('\n').filter((line) => line.trim()) : [];
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
    }),
    // Bash output tool
    'bash-output': createDefaultToolDisplay('BashOutput', (args) => args.bash_id ? String(args.bash_id) : '', (result) => {
        if (typeof result === 'object' && result !== null && 'bash_id' in result) {
            const { stdout, stderr, exitCode, isRunning, duration } = result;
            const output = stderr && exitCode !== 0 ? stderr : stdout;
            const lines = output ? output.split('\n').filter((line) => line.trim()) : [];
            const status = isRunning ? 'Still running' : `Completed (exit: ${exitCode})`;
            const durationSec = Math.floor(duration / 1000);
            return {
                lines,
                summary: `${status} - ${durationSec}s`,
            };
        }
        return { lines: resultToLines(result) };
    }),
    // Kill bash tool
    'kill-bash': createDefaultToolDisplay('KillBash', (args) => args.bash_id ? String(args.bash_id) : '', (result) => {
        if (typeof result === 'object' && result !== null && 'message' in result) {
            const { message } = result;
            return {
                lines: [],
                summary: message,
            };
        }
        return { lines: resultToLines(result) };
    }),
    // Grep tool
    grep: createDefaultToolDisplay('Search', (args) => {
        const pattern = args.pattern ? String(args.pattern) : '';
        const globPattern = args.glob ? String(args.glob) : '';
        const type = args.type ? String(args.type) : '';
        const path = args.path ? String(args.path) : '';
        let display = `"${truncateString(pattern, 40)}"`;
        if (globPattern) {
            display += ` in ${globPattern}`;
        }
        else if (type) {
            display += ` [${type}]`;
        }
        if (path && !isDefaultCwd(path)) {
            display += ` [${getRelativePath(path)}]`;
        }
        return display;
    }, (result) => {
        if (typeof result !== 'object' || result === null) {
            return { lines: resultToLines(result) };
        }
        const res = result;
        // Content mode
        if ('matches' in res) {
            const matches = res.matches;
            const lines = matches.map(m => `${m.file}:${m.line}: ${m.content}`);
            return {
                lines,
                summary: `Found ${matches.length} ${pluralize(matches.length, 'match', 'matches')}`,
            };
        }
        // Files mode
        if ('files' in res) {
            const files = res.files;
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
    }),
    // Glob tool
    glob: createDefaultToolDisplay('Search', (args) => {
        const pattern = args.pattern ? String(args.pattern) : '';
        const path = args.path ? String(args.path) : '';
        return path && !isDefaultCwd(path)
            ? `${pattern} in ${getRelativePath(path)}`
            : pattern;
    }, (result) => {
        if (typeof result === 'object' && result !== null && 'files' in result) {
            const files = result.files;
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
    }),
    // Update todos tool
    updateTodos: createDefaultToolDisplay('Tasks', (args) => {
        const todos = args.todos;
        if (!todos || todos.length === 0)
            return '';
        const adding = todos.filter((t) => !t.id).length;
        const updating = todos.filter((t) => t.id).length;
        const parts = [];
        if (adding > 0)
            parts.push(`${adding} new`);
        if (updating > 0)
            parts.push(`${updating} updated`);
        return parts.join(', ');
    }, (result) => {
        if (typeof result === 'object' && result !== null && 'summary' in result) {
            const { summary, changes, total } = result;
            return {
                lines: changes || [],
                summary: `${summary} • ${total} active`,
            };
        }
        return { lines: resultToLines(result) };
    }),
};
/**
 * Get tool display component
 */
export const getToolComponent = (toolName) => {
    return toolConfigs[toolName] || null;
};
/**
 * Check if tool has a registered display component
 */
export const isBuiltInTool = (toolName) => {
    return toolName in toolConfigs;
};
/**
 * Register a tool display component
 *
 * Examples:
 * ```ts
 * // Using factory for default display
 * registerTool('myTool', createDefaultToolDisplay(
 *   'My Tool',
 *   (args) => args.foo,
 *   (result) => ({ lines: [String(result)] })
 * ));
 *
 * // Using custom component
 * registerTool('myTool', MyCustomComponent);
 * ```
 */
export const registerTool = (toolName, component) => {
    toolConfigs[toolName] = component;
};
//# sourceMappingURL=tool-configs.js.map