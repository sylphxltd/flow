/**
 * Search Tools
 * Tools for searching files and content
 */
/**
 * Glob file search tool
 */
export declare const globTool: import("ai").Tool<{
    pattern: string;
    path?: string | undefined;
}, {
    pattern: string;
    directory: string;
    files: string[];
    count: number;
}>;
/**
 * Grep content search tool
 */
export declare const grepTool: import("ai").Tool<{
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
/**
 * All search tools
 */
export declare const searchTools: {
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
};
//# sourceMappingURL=search.d.ts.map