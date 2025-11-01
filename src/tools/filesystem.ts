/**
 * Filesystem Tools
 * Tools for reading and writing files
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';

/**
 * Read file tool
 */
export const readFileTool = tool({
  description: `Read contents of a file from the filesystem.

Usage:
- Read source code files
- Read configuration files
- Read documentation files

The file path must be absolute or relative to the current working directory.`,
  inputSchema: z.object({
    file_path: z.string().describe('Path to the file to read'),
    encoding: z
      .enum(['utf8', 'base64'])
      .default('utf8')
      .optional()
      .describe('File encoding (default: utf8)'),
  }),
  execute: async ({ file_path, encoding = 'utf8' }) => {
    const content = await readFile(file_path, encoding as BufferEncoding);
    return {
      path: file_path,
      content,
      encoding,
    };
  },
});

/**
 * Write file tool
 */
export const writeFileTool = tool({
  description: `Write content to a file. Creates parent directories if they don't exist.

Usage:
- Create new files
- Overwrite existing files
- Write generated code or data

IMPORTANT: This will overwrite the file if it exists.`,
  inputSchema: z.object({
    file_path: z.string().describe('Path where the file should be written'),
    content: z.string().describe('Content to write to the file'),
    encoding: z
      .enum(['utf8', 'base64'])
      .default('utf8')
      .optional()
      .describe('File encoding (default: utf8)'),
  }),
  execute: async ({ file_path, content, encoding = 'utf8' }) => {
    // Create parent directories if they don't exist
    const dir = dirname(file_path);
    await mkdir(dir, { recursive: true });

    await writeFile(file_path, content, encoding as BufferEncoding);
    return {
      path: file_path,
      bytes: Buffer.byteLength(content, encoding as BufferEncoding),
    };
  },
});

/**
 * All filesystem tools
 */
export const filesystemTools = {
  read: readFileTool,
  write: writeFileTool,
};
