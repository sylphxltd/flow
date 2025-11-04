/**
 * File Scanner
 * Scan project files for @file auto-completion with caching
 */
export interface FileInfo {
    path: string;
    relativePath: string;
    size: number;
}
/**
 * Scan project files with caching
 * Returns list of files respecting .gitignore
 */
export declare function scanProjectFiles(rootPath: string): Promise<FileInfo[]>;
/**
 * Filter files by query string
 */
export declare function filterFiles(files: FileInfo[], query: string): FileInfo[];
//# sourceMappingURL=file-scanner.d.ts.map