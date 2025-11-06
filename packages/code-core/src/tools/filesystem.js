/**
 * Filesystem Tools
 * Tools for reading and writing files
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';
/**
 * Read file tool with size limits to prevent crashes
 */
export const readFileTool = tool({
    description: 'Read contents of a file from the filesystem',
    inputSchema: z.object({
        file_path: z.string().describe('Path to file'),
        offset: z
            .number()
            .optional()
            .describe('Start line number (1-based)'),
        limit: z
            .number()
            .optional()
            .describe('Number of lines to read'),
    }),
    execute: async ({ file_path, offset, limit }) => {
        // Check file size before reading to prevent memory exhaustion
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
        try {
            const { stat } = await import('node:fs/promises');
            const stats = await stat(file_path);
            if (stats.size > MAX_FILE_SIZE) {
                return {
                    path: file_path,
                    error: `File too large (${Math.round(stats.size / 1024 / 1024)}MB). Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Use offset and limit parameters to read specific sections.`,
                    encoding: 'utf8',
                };
            }
        }
        catch (error) {
            return {
                path: file_path,
                error: `Failed to check file size: ${error instanceof Error ? error.message : String(error)}`,
                encoding: 'utf8',
            };
        }
        const content = await readFile(file_path, 'utf8');
        // Apply line filtering if offset/limit specified
        if (offset !== undefined || limit !== undefined) {
            const lines = content.split('\n');
            const start = offset ? offset - 1 : 0; // Convert to 0-based index
            const end = limit ? start + limit : lines.length;
            const filteredLines = lines.slice(start, end);
            return {
                path: file_path,
                content: filteredLines.join('\n'),
                encoding: 'utf8',
            };
        }
        return {
            path: file_path,
            content,
            encoding: 'utf8',
        };
    },
});
/**
 * Write file tool
 */
export const writeFileTool = tool({
    description: 'Write content to a file',
    inputSchema: z.object({
        file_path: z.string().describe('Path to file (overwrites if exists)'),
        content: z.string().describe('Content to write'),
    }),
    execute: async ({ file_path, content }) => {
        // Create parent directories if they don't exist
        const dir = dirname(file_path);
        await mkdir(dir, { recursive: true });
        await writeFile(file_path, content, 'utf8');
        // Get file name and line preview
        const fileName = file_path.split('/').pop() || '';
        const lines = content.split('\n');
        return {
            path: file_path,
            bytes: Buffer.byteLength(content, 'utf8'),
            fileName,
            lineCount: lines.length,
            preview: lines.slice(0, 5), // First 5 lines for preview
        };
    },
});
/**
 * Edit file tool
 */
export const editFileTool = tool({
    description: 'Perform exact string replacements in files',
    inputSchema: z.object({
        file_path: z.string().describe('Path to file'),
        old_string: z.string().describe('Text to replace (must be exact and unique unless replace_all=true)'),
        new_string: z.string().describe('Replacement text'),
        replace_all: z
            .boolean()
            .default(false)
            .optional()
            .describe('Replace all occurrences. If false, old_string must be unique'),
    }),
    execute: async ({ file_path, old_string, new_string, replace_all = false }) => {
        // Validate strings are different
        if (old_string === new_string) {
            throw new Error('old_string and new_string must be different');
        }
        // Read file
        const content = await readFile(file_path, 'utf8');
        // Check if old_string exists
        if (!content.includes(old_string)) {
            throw new Error(`old_string not found in file: ${file_path}`);
        }
        // Check for multiple occurrences if not replace_all
        if (!replace_all) {
            const firstIndex = content.indexOf(old_string);
            const lastIndex = content.lastIndexOf(old_string);
            if (firstIndex !== lastIndex) {
                throw new Error('old_string appears multiple times in the file. Either provide more context to make it unique or use replace_all=true');
            }
        }
        // Find line number where replacement occurs
        const lines = content.split('\n');
        const beforeContent = content.substring(0, content.indexOf(old_string));
        const lineNumber = beforeContent.split('\n').length;
        // Get context lines (few lines before and after)
        const contextSize = 2;
        const startLine = Math.max(0, lineNumber - contextSize - 1);
        const endLine = Math.min(lines.length, lineNumber + contextSize);
        // Perform replacement
        const newContent = replace_all
            ? content.split(old_string).join(new_string)
            : content.replace(old_string, new_string);
        // Write back
        await writeFile(file_path, newContent, 'utf8');
        // Count replacements
        const occurrences = replace_all
            ? content.split(old_string).length - 1
            : 1;
        // Generate diff lines for display
        const contextLines = lines.slice(startLine, endLine);
        const diffLines = [];
        for (let i = 0; i < contextLines.length; i++) {
            const currentLineNum = startLine + i + 1;
            const line = contextLines[i];
            if (currentLineNum === lineNumber) {
                // This is the changed line
                const oldLines = old_string.split('\n');
                const newLines = new_string.split('\n');
                // Show removed lines
                oldLines.forEach((oldLine) => {
                    diffLines.push(`${currentLineNum.toString().padStart(6)} - ${oldLine}`);
                });
                // Show added lines
                newLines.forEach((newLine) => {
                    diffLines.push(`${currentLineNum.toString().padStart(6)} + ${newLine}`);
                });
            }
            else {
                // Context line
                diffLines.push(`${currentLineNum.toString().padStart(6)}   ${line}`);
            }
        }
        return {
            path: file_path,
            replacements: occurrences,
            old_length: old_string.length,
            new_length: new_string.length,
            diff: diffLines,
            old_string,
            new_string,
        };
    },
});
/**
 * All filesystem tools
 */
export const filesystemTools = {
    read: readFileTool,
    write: writeFileTool,
    edit: editFileTool,
};
//# sourceMappingURL=filesystem.js.map