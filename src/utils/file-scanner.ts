/**
 * File Scanner
 * Scan project files for @file auto-completion
 */

import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { readFile } from 'node:fs/promises';

interface FileInfo {
  path: string;
  relativePath: string;
  size: number;
}

// Default ignore patterns
const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.vercel',
  '.turbo',
  'coverage',
  '.cache',
  '.sylphx',
  'bun.lock',
  'package-lock.json',
  'yarn.lock',
];

/**
 * Load .gitignore patterns
 */
async function loadGitignore(rootPath: string): Promise<Set<string>> {
  const patterns = new Set<string>(DEFAULT_IGNORE);

  try {
    const gitignorePath = join(rootPath, '.gitignore');
    const content = await readFile(gitignorePath, 'utf8');

    // Parse gitignore file
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (trimmed && !trimmed.startsWith('#')) {
        // Remove trailing slashes
        const pattern = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
        patterns.add(pattern);
      }
    }
  } catch {
    // No .gitignore file, use defaults only
  }

  return patterns;
}

/**
 * Check if path should be ignored
 */
function shouldIgnore(relativePath: string, patterns: Set<string>): boolean {
  // Check if any part of the path matches ignore patterns
  const parts = relativePath.split('/');

  for (const pattern of patterns) {
    // Exact match
    if (relativePath === pattern) return true;

    // Directory match
    if (parts.includes(pattern)) return true;

    // Glob pattern (basic support for *)
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(relativePath)) return true;
    }
  }

  return false;
}

/**
 * Recursively scan directory for files
 */
async function scanDirectory(
  dirPath: string,
  rootPath: string,
  patterns: Set<string>,
  results: FileInfo[] = []
): Promise<FileInfo[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const relativePath = relative(rootPath, fullPath);

      // Skip ignored paths
      if (shouldIgnore(relativePath, patterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await scanDirectory(fullPath, rootPath, patterns, results);
      } else if (entry.isFile()) {
        // Add file to results
        const stats = await stat(fullPath);
        results.push({
          path: fullPath,
          relativePath,
          size: stats.size,
        });
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }

  return results;
}

/**
 * Scan project files
 * Returns list of files respecting .gitignore
 */
export async function scanProjectFiles(rootPath: string): Promise<FileInfo[]> {
  const patterns = await loadGitignore(rootPath);
  const files = await scanDirectory(rootPath, rootPath, patterns);

  // Sort by path for consistent ordering
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return files;
}

/**
 * Filter files by query string
 */
export function filterFiles(files: FileInfo[], query: string): FileInfo[] {
  if (!query) return files;

  const lowerQuery = query.toLowerCase();
  return files.filter((file) =>
    file.relativePath.toLowerCase().includes(lowerQuery)
  );
}
