/**
 * Filesystem Tools
 * Tools for reading, writing, and listing files
 */

import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { z } from 'zod';
import type { ToolDefinition } from './base.js';
import { success, failure } from './base.js';

/**
 * Read file tool
 */
export const readFileTool: ToolDefinition = {
  name: 'read_file',
  description: `Read contents of a file from the filesystem.

Usage:
- Read source code files
- Read configuration files
- Read documentation files

The file path must be absolute or relative to the current working directory.`,
  parameters: z.object({
    file_path: z.string().describe('Path to the file to read'),
    encoding: z
      .enum(['utf8', 'base64'])
      .default('utf8')
      .optional()
      .describe('File encoding (default: utf8)'),
  }),
  execute: async ({ file_path, encoding = 'utf8' }) => {
    try {
      const content = await readFile(file_path, encoding as BufferEncoding);
      return success({
        path: file_path,
        content,
        encoding,
      });
    } catch (error) {
      return failure(`Failed to read file: ${(error as Error).message}`);
    }
  },
};

/**
 * Write file tool
 */
export const writeFileTool: ToolDefinition = {
  name: 'write_file',
  description: `Write content to a file. Creates parent directories if they don't exist.

Usage:
- Create new files
- Overwrite existing files
- Write generated code or data

IMPORTANT: This will overwrite the file if it exists.`,
  parameters: z.object({
    file_path: z.string().describe('Path where the file should be written'),
    content: z.string().describe('Content to write to the file'),
    encoding: z
      .enum(['utf8', 'base64'])
      .default('utf8')
      .optional()
      .describe('File encoding (default: utf8)'),
  }),
  execute: async ({ file_path, content, encoding = 'utf8' }) => {
    try {
      // Create parent directories if they don't exist
      const dir = dirname(file_path);
      await mkdir(dir, { recursive: true });

      await writeFile(file_path, content, encoding as BufferEncoding);
      return success({
        path: file_path,
        bytes: Buffer.byteLength(content, encoding as BufferEncoding),
      });
    } catch (error) {
      return failure(`Failed to write file: ${(error as Error).message}`);
    }
  },
};

/**
 * List directory tool
 */
export const listDirectoryTool: ToolDefinition = {
  name: 'list_directory',
  description: `List files and directories in a specified path.

Usage:
- Explore project structure
- Find files in a directory
- Check if files exist

Returns file names, types, and sizes.`,
  parameters: z.object({
    path: z.string().describe('Directory path to list'),
    recursive: z
      .boolean()
      .default(false)
      .optional()
      .describe('List subdirectories recursively (default: false)'),
  }),
  execute: async ({ path, recursive = false }) => {
    try {
      const entries = await readdir(path, { withFileTypes: true });
      const items = [];

      for (const entry of entries) {
        const fullPath = join(path, entry.name);
        const stats = await stat(fullPath);

        items.push({
          name: entry.name,
          path: fullPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime,
        });

        // Recursively list subdirectories if requested
        if (recursive && entry.isDirectory()) {
          const subItems = await listDirectoryTool.execute({
            path: fullPath,
            recursive: true,
          });
          if (subItems.success && subItems.data?.items) {
            items.push(...subItems.data.items);
          }
        }
      }

      return success({
        path,
        items,
        count: items.length,
      });
    } catch (error) {
      return failure(`Failed to list directory: ${(error as Error).message}`);
    }
  },
};

/**
 * Get file stats tool
 */
export const fileStatsTool: ToolDefinition = {
  name: 'file_stats',
  description: `Get detailed information about a file or directory.

Usage:
- Check if file exists
- Get file size
- Get modification time
- Check if path is file or directory`,
  parameters: z.object({
    path: z.string().describe('File or directory path'),
  }),
  execute: async ({ path }) => {
    try {
      const stats = await stat(path);
      return success({
        path,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
      });
    } catch (error) {
      return failure(`Failed to get file stats: ${(error as Error).message}`);
    }
  },
};

/**
 * All filesystem tools
 */
export const filesystemTools = {
  read_file: readFileTool,
  write_file: writeFileTool,
  list_directory: listDirectoryTool,
  file_stats: fileStatsTool,
};
