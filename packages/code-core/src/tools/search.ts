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
  description: 'Search for files matching a glob pattern',
  inputSchema: z.object({
    pattern: z.string().describe('Glob pattern: * (any except /), ** (any), ? (single). Examples: "*.ts", "src/**/*.tsx"'),
    path: z
      .string()
      .optional()
      .describe('Directory to search'),
  }),
  execute: async ({ pattern, path }) => {
    const searchDir = path || process.cwd();
    const results = await searchFiles(searchDir, pattern, 1000); // Internal limit of 1000

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
  description: 'Search for text content within files using regex patterns',
  inputSchema: z.object({
    pattern: z.string().describe('Regex pattern to search'),
    path: z.string().optional().describe('File or directory to search'),
    output_mode: z
      .enum(['content', 'files_with_matches', 'count'])
      .default('files_with_matches')
      .optional()
      .describe('content: show lines | files_with_matches: show paths | count: show counts'),
    type: z.string().optional().describe('File type: js, ts, py, rust, go, java, c, cpp, html, css, json, yaml, md'),
    glob: z.string().optional().describe('Glob filter: "*.js", "*.{ts,tsx}"'),
    '-i': z.boolean().optional().describe('Case insensitive'),
    '-n': z.boolean().optional().describe('Show line numbers (content mode only)'),
    '-A': z.number().optional().describe('Lines after match (content mode only)'),
    '-B': z.number().optional().describe('Lines before match (content mode only)'),
    '-C': z.number().optional().describe('Lines before and after match (content mode only)'),
    multiline: z.boolean().optional().describe('Multiline mode: . matches newlines'),
    head_limit: z.number().optional().describe('Limit output to first N entries'),
  }),
  execute: async ({
    pattern,
    path,
    output_mode = 'files_with_matches',
    type,
    glob: globPattern,
    '-i': caseInsensitive = false,
    '-n': showLineNumbers = false,
    '-A': afterContext = 0,
    '-B': beforeContext = 0,
    '-C': aroundContext,
    multiline = false,
    head_limit,
  }) => {
    const searchDir = path || process.cwd();

    // Determine file pattern based on type or glob
    let filePattern = '**/*';
    if (globPattern) {
      filePattern = globPattern;
    } else if (type) {
      // Map common file types to extensions
      const typeMap: Record<string, string> = {
        js: '*.{js,jsx}',
        ts: '*.{ts,tsx}',
        py: '*.py',
        rust: '*.rs',
        go: '*.go',
        java: '*.java',
        c: '*.{c,h}',
        cpp: '*.{cpp,hpp,cc,cxx}',
        html: '*.{html,htm}',
        css: '*.{css,scss,sass}',
        json: '*.json',
        yaml: '*.{yaml,yml}',
        md: '*.md',
      };
      filePattern = typeMap[type] || `*.${type}`;
    }

    const files = await searchFiles(searchDir, filePattern, 1000);

    // Determine context lines
    const before = aroundContext !== undefined ? aroundContext : beforeContext || 0;
    const after = aroundContext !== undefined ? aroundContext : afterContext || 0;

    // Build regex flags
    let regexFlags = 'g';
    if (caseInsensitive) regexFlags += 'i';
    if (multiline) regexFlags += 's'; // 's' flag makes . match newlines

    const regex = new RegExp(pattern, regexFlags);

    const matches: Array<{ file: string; line: number; content: string }> = [];
    const filesWithMatches = new Set<string>();
    let matchCount = 0;

    for (const file of files) {
      try {
        const stats = await stat(file);
        if (stats.size > 1024 * 1024) continue; // Skip files > 1MB

        const content = await readFile(file, 'utf8');

        if (multiline) {
          // Multiline matching - check if file contains pattern
          if (regex.test(content)) {
            filesWithMatches.add(file);
            matchCount++;
          }
        } else {
          // Line-by-line matching
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              filesWithMatches.add(file);
              matchCount++;

              if (output_mode === 'content') {
                // Collect context lines
                const startLine = Math.max(0, i - before);
                const endLine = Math.min(lines.length - 1, i + after);

                for (let j = startLine; j <= endLine; j++) {
                  const lineContent = showLineNumbers
                    ? `${j + 1}: ${lines[j]}`
                    : lines[j];

                  matches.push({
                    file,
                    line: j + 1,
                    content: lineContent,
                  });
                }
              }
            }
          }
        }
      } catch {
        // Skip files we can't read
        continue;
      }
    }

    // Apply head_limit
    const applyLimit = <T>(arr: T[]): T[] => {
      return head_limit ? arr.slice(0, head_limit) : arr;
    };

    // Return based on output mode
    if (output_mode === 'content') {
      return {
        pattern,
        directory: searchDir,
        matches: applyLimit(matches),
        count: matches.length,
      };
    } else if (output_mode === 'files_with_matches') {
      return {
        pattern,
        directory: searchDir,
        files: applyLimit(Array.from(filesWithMatches)),
        count: filesWithMatches.size,
      };
    } else {
      // count mode
      return {
        pattern,
        directory: searchDir,
        count: matchCount,
      };
    }
  },
});

/**
 * All search tools
 */
export const searchTools = {
  glob: globTool,
  grep: grepTool,
};
