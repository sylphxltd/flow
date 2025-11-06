/**
 * Filesystem Tools
 * Tools for reading and writing files
 */
/**
 * Read file tool with size limits to prevent crashes
 */
export declare const readFileTool: import("ai").Tool<{
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
/**
 * Write file tool
 */
export declare const writeFileTool: import("ai").Tool<{
    file_path: string;
    content: string;
}, {
    path: string;
    bytes: number;
    fileName: string;
    lineCount: number;
    preview: string[];
}>;
/**
 * Edit file tool
 */
export declare const editFileTool: import("ai").Tool<{
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
/**
 * All filesystem tools
 */
export declare const filesystemTools: {
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
//# sourceMappingURL=filesystem.d.ts.map