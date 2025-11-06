/**
 * Tool Registry
 * Central registry for all AI SDK tools
 */
import { type TodoToolContext } from './todo.js';
/**
 * Options for getting AI SDK tools
 */
export interface GetToolsOptions {
    /**
     * Whether to include interactive tools (ask). Default: true
     */
    interactive?: boolean;
    /**
     * Todo tool context for session management
     * If provided, todo tools will be included
     * If omitted, todo tools will be excluded
     */
    todoContext?: TodoToolContext;
}
/**
 * Get all tools in AI SDK Tool format
 *
 * @example
 * ```typescript
 * // Without todo tools (headless mode)
 * const tools = getAISDKTools();
 *
 * // With todo tools (requires session context)
 * const tools = getAISDKTools({
 *   todoContext: {
 *     getCurrentSession: async () => await db.getCurrentSession(),
 *     updateTodos: async (sessionId, todos, nextId) => await db.updateTodos(...)
 *   }
 * });
 * ```
 */
export declare function getAISDKTools(options?: GetToolsOptions): {
    ask?: import("ai").Tool<{
        question: string;
        options: {
            label: string;
            value?: string | undefined;
            freeText?: boolean | undefined;
            placeholder?: string | undefined;
            checked?: boolean | undefined;
        }[];
        multiSelect?: boolean | undefined;
        preSelected?: string[] | undefined;
    }, string> | undefined;
    glob: import("ai").Tool<{
        pattern: string;
        path?: string | undefined;
    }, {
        pattern: string;
        directory: string;
        files: string[];
        count: number;
    }>;
    grep: import("ai").Tool<{
        pattern: string;
        path?: string | undefined;
        output_mode?: "content" | "files_with_matches" | "count" | undefined;
        type?: string | undefined;
        glob?: string | undefined;
        '-i'?: boolean | undefined;
        '-n'?: boolean | undefined;
        '-A'?: number | undefined;
        '-B'?: number | undefined;
        '-C'?: number | undefined;
        multiline?: boolean | undefined;
        head_limit?: number | undefined;
    }, {
        pattern: string;
        directory: string;
        matches: {
            file: string;
            line: number;
            content: string;
        }[];
        count: number;
        files?: undefined;
    } | {
        pattern: string;
        directory: string;
        files: string[];
        count: number;
        matches?: undefined;
    } | {
        pattern: string;
        directory: string;
        count: number;
        matches?: undefined;
        files?: undefined;
    }>;
    bash: import("ai").Tool<{
        command: string;
        cwd?: string | undefined;
        timeout?: number | undefined;
        run_in_background?: boolean | undefined;
    }, {
        bash_id: string;
        command: string;
        mode: string;
        message: string;
        stdout?: undefined;
        stderr?: undefined;
        exitCode?: undefined;
    } | {
        command: string;
        stdout: any;
        stderr: any;
        exitCode: any;
        bash_id?: undefined;
        mode?: undefined;
        message?: undefined;
    }>;
    'bash-output': import("ai").Tool<{
        bash_id: string;
        filter?: string | undefined;
    }, {
        bash_id: string;
        command: string;
        stdout: string;
        stderr: string;
        exitCode: number | null;
        isRunning: boolean;
        duration: number;
    }>;
    'kill-bash': import("ai").Tool<{
        bash_id: string;
    }, {
        bash_id: string;
        status: string;
        message: string;
    }>;
    read: import("ai").Tool<{
        file_path: string;
        offset?: number | undefined;
        limit?: number | undefined;
    }, {
        path: string;
        error: string;
        encoding: string;
        content?: undefined;
    } | {
        path: string;
        content: string;
        encoding: string;
        error?: undefined;
    }>;
    write: import("ai").Tool<{
        file_path: string;
        content: string;
    }, {
        path: string;
        bytes: number;
        fileName: string;
        lineCount: number;
        preview: string[];
    }>;
    edit: import("ai").Tool<{
        file_path: string;
        old_string: string;
        new_string: string;
        replace_all?: boolean | undefined;
    }, {
        path: string;
        replacements: number;
        old_length: number;
        new_length: number;
        diff: string[];
        old_string: string;
        new_string: string;
    }>;
} | {
    updateTodos: import("ai").Tool<{
        todos: {
            id?: number | undefined;
            content?: string | undefined;
            activeForm?: string | undefined;
            status?: "pending" | "in_progress" | "completed" | "removed" | undefined;
            reorder?: {
                type: "before" | "after" | "top" | "last";
                id?: number | undefined;
            } | undefined;
        }[];
    }, {
        error: string;
        summary: string;
        changes: never[];
        total: number;
    } | {
        summary: string;
        changes: string[];
        total: number;
        error?: undefined;
    }>;
    ask?: import("ai").Tool<{
        question: string;
        options: {
            label: string;
            value?: string | undefined;
            freeText?: boolean | undefined;
            placeholder?: string | undefined;
            checked?: boolean | undefined;
        }[];
        multiSelect?: boolean | undefined;
        preSelected?: string[] | undefined;
    }, string> | undefined;
    glob: import("ai").Tool<{
        pattern: string;
        path?: string | undefined;
    }, {
        pattern: string;
        directory: string;
        files: string[];
        count: number;
    }>;
    grep: import("ai").Tool<{
        pattern: string;
        path?: string | undefined;
        output_mode?: "content" | "files_with_matches" | "count" | undefined;
        type?: string | undefined;
        glob?: string | undefined;
        '-i'?: boolean | undefined;
        '-n'?: boolean | undefined;
        '-A'?: number | undefined;
        '-B'?: number | undefined;
        '-C'?: number | undefined;
        multiline?: boolean | undefined;
        head_limit?: number | undefined;
    }, {
        pattern: string;
        directory: string;
        matches: {
            file: string;
            line: number;
            content: string;
        }[];
        count: number;
        files?: undefined;
    } | {
        pattern: string;
        directory: string;
        files: string[];
        count: number;
        matches?: undefined;
    } | {
        pattern: string;
        directory: string;
        count: number;
        matches?: undefined;
        files?: undefined;
    }>;
    bash: import("ai").Tool<{
        command: string;
        cwd?: string | undefined;
        timeout?: number | undefined;
        run_in_background?: boolean | undefined;
    }, {
        bash_id: string;
        command: string;
        mode: string;
        message: string;
        stdout?: undefined;
        stderr?: undefined;
        exitCode?: undefined;
    } | {
        command: string;
        stdout: any;
        stderr: any;
        exitCode: any;
        bash_id?: undefined;
        mode?: undefined;
        message?: undefined;
    }>;
    'bash-output': import("ai").Tool<{
        bash_id: string;
        filter?: string | undefined;
    }, {
        bash_id: string;
        command: string;
        stdout: string;
        stderr: string;
        exitCode: number | null;
        isRunning: boolean;
        duration: number;
    }>;
    'kill-bash': import("ai").Tool<{
        bash_id: string;
    }, {
        bash_id: string;
        status: string;
        message: string;
    }>;
    read: import("ai").Tool<{
        file_path: string;
        offset?: number | undefined;
        limit?: number | undefined;
    }, {
        path: string;
        error: string;
        encoding: string;
        content?: undefined;
    } | {
        path: string;
        content: string;
        encoding: string;
        error?: undefined;
    }>;
    write: import("ai").Tool<{
        file_path: string;
        content: string;
    }, {
        path: string;
        bytes: number;
        fileName: string;
        lineCount: number;
        preview: string[];
    }>;
    edit: import("ai").Tool<{
        file_path: string;
        old_string: string;
        new_string: string;
        replace_all?: boolean | undefined;
    }, {
        path: string;
        replacements: number;
        old_length: number;
        new_length: number;
        diff: string[];
        old_string: string;
        new_string: string;
    }>;
};
/**
 * Get tool names grouped by category
 */
export declare function getToolCategories(options?: GetToolsOptions): Record<string, string[]>;
/**
 * Get all tool names
 */
export declare function getAllToolNames(options?: GetToolsOptions): string[];
//# sourceMappingURL=registry.d.ts.map