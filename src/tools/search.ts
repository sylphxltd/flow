/**
 * Search Tools
 * Tools for searching files and content
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';

/**
 * Match a glob pattern
 */
function matchGlob(pattern: string, path: string): boolean {
  // Simple glob matching - supports *, **, and ?
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Recursively search files matching pattern
 */
async function searchFiles(
  dir: string,
  pattern: string,
  maxResults: number,
  results: string[] = []
): Promise<string[]> {
  if (results.length >= maxResults) return results;

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      const fullPath = join(dir, entry.name);

      // Skip common directories
      if (
        entry.isDirectory() &&
        ['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await searchFiles(fullPath, pattern, maxResults, results);
      } else if (matchGlob(pattern, fullPath) || matchGlob(pattern, entry.name)) {
        results.push(fullPath);
      }
    }

    return results;
  } catch (error) {
    // Skip directories we can't read
    return results;
  }
}

/**
 * Glob file search tool
 */
export const globTool = tool({
  description: `Search for files matching a glob pattern.

Usage:
- Find files by name pattern
- Search for specific file types
- Locate files in project

Pattern syntax:
- * matches any characters except /
- ** matches any characters including /
- ? matches single character
- Examples: "*.ts", "src/**/*.tsx", "test?.js"`,
  inputSchema: z.object({
    pattern: z.string().describe('Glob pattern to match files'),
    directory: z
      .string()
      .optional()
      .describe('Directory to search in (default: current directory)'),
    max_results: z
      .number()
      .default(100)
      .optional()
      .describe('Maximum number of results (default: 100)'),
  }),
  execute: async ({ pattern, directory, max_results = 100 }) => {
    const searchDir = directory || process.cwd();
    const results = await searchFiles(searchDir, pattern, max_results);

    return {
      pattern,
      directory: searchDir,
      files: results,
      count: results.length,
    };
  },
});

/**
 * Grep content search tool
 */
export const grepTool = tool({
  description: `Search for text content within files.

Usage:
- Find code patterns
- Search for function names
- Locate specific text across files

Returns matching lines with line numbers and context.`,
  inputSchema: z.object({
    pattern: z.string().describe('Text or regex pattern to search for'),
    directory: z
      .string()
      .optional()
      .describe('Directory to search in (default: current directory)'),
    file_pattern: z
      .string()
      .optional()
      .describe('Glob pattern to filter files (e.g., "*.ts")'),
    max_results: z
      .number()
      .default(50)
      .optional()
      .describe('Maximum number of matches (default: 50)'),
    case_sensitive: z
      .boolean()
      .default(false)
      .optional()
      .describe('Case sensitive search (default: false)'),
  }),
  execute: async ({
    pattern,
    directory,
    file_pattern = '**/*',
    max_results = 50,
    case_sensitive = false,
  }) => {
    const searchDir = directory || process.cwd();
    const files = await searchFiles(searchDir, file_pattern, 1000);
    const matches: Array<{
      file: string;
      line: number;
      content: string;
    }> = [];

    const regex = new RegExp(pattern, case_sensitive ? 'g' : 'gi');

    for (const file of files) {
      if (matches.length >= max_results) break;

      try {
        const stats = await stat(file);
        // Skip large files and binary files
        if (stats.size > 1024 * 1024) continue; // Skip files > 1MB

        const content = await readFile(file, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (matches.length >= max_results) break;

          if (regex.test(lines[i])) {
            matches.push({
              file,
              line: i + 1,
              content: lines[i].trim(),
            });
          }
        }
      } catch {
        // Skip files we can't read
        continue;
      }
    }

    return {
      pattern,
      directory: searchDir,
      matches,
      count: matches.length,
    };
  },
});

/**
 * All search tools
 */
export const searchTools = {
  glob_files: globTool,
  grep_content: grepTool,
};
