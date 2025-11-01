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
 * Edit file tool
 */
export const editFileTool = tool({
  description: `Performs exact string replacements in files.

Usage:
- Modify existing files
- Replace specific code sections
- Update configuration values

IMPORTANT:
- The edit will FAIL if old_string is not unique in the file
- Provide more context in old_string to make it unique
- Use replace_all to change every instance of old_string
- You must use the exact string from the file (preserve indentation, whitespace)`,
  inputSchema: z.object({
    file_path: z.string().describe('Absolute path to the file to modify'),
    old_string: z.string().describe('The exact text to replace (must match exactly)'),
    new_string: z.string().describe('The text to replace it with (must be different from old_string)'),
    replace_all: z
      .boolean()
      .default(false)
      .optional()
      .describe('Replace all occurrences of old_string (default: false)'),
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
        throw new Error(
          'old_string appears multiple times in the file. Either provide more context to make it unique or use replace_all=true'
        );
      }
    }

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

    return {
      path: file_path,
      replacements: occurrences,
      old_length: old_string.length,
      new_length: new_string.length,
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
