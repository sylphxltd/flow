/**
 * Codebase indexing helper functions
 * Utility functions for file scanning and language detection
 */

import fs from 'node:fs';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';

/**
 * Detect programming language from file extension
 */
export function detectLanguage(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TSX',
    '.js': 'JavaScript',
    '.jsx': 'JSX',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.rs': 'Rust',
    '.c': 'C',
    '.cpp': 'C++',
    '.cs': 'C#',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.sql': 'SQL',
    '.sh': 'Shell',
    '.bash': 'Bash',
  };
  return languageMap[ext];
}

/**
 * Check if file is text-based (not binary)
 */
export function isTextFile(filePath: string): boolean {
  const textExtensions = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.java',
    '.go',
    '.rs',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.cs',
    '.rb',
    '.php',
    '.swift',
    '.kt',
    '.md',
    '.txt',
    '.json',
    '.yaml',
    '.yml',
    '.toml',
    '.xml',
    '.sql',
    '.sh',
    '.bash',
    '.zsh',
    '.fish',
    '.dockerfile',
    '.gitignore',
    '.env',
    '.env.example',
    '.env.local',
    '.env.development',
    '.env.production',
  ]);

  const ext = path.extname(filePath).toLowerCase();
  return textExtensions.has(ext) || !ext; // Files without extension might be text
}

/**
 * Load .gitignore file and create ignore filter
 */
export function loadGitignore(codebaseRoot: string): Ignore {
  const ig = ignore();

  // Add default ignore patterns
  ig.add([
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    '.DS_Store',
    '.idea',
    '.vscode',
    '*.suo',
    '*.ntvs*',
    '*.njsproj',
    '*.sln',
    '*.swp',
    '.sylphx-flow',
    '.cache',
    'dist',
    'build',
    'coverage',
    '.nyc_output',
  ]);

  const gitignorePath = path.join(codebaseRoot, '.gitignore');

  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      ig.add(content);
    } catch (error) {
      console.warn(`[WARN] Failed to read .gitignore: ${error}`);
    }
  }

  return ig;
}

/**
 * Scan directory recursively for files
 */
export interface ScanOptions {
  ignoreFilter?: Ignore;
  codebaseRoot?: string;
}

export interface ScanResult {
  path: string;
  absolutePath: string;
  content: string;
  size: number;
  mtime: number;
}

/**
 * Scan files in directory with .gitignore support
 */
export function scanFiles(dir: string, options: ScanOptions = {}): ScanResult[] {
  const results: ScanResult[] = [];
  const ignoreFilter = options.ignoreFilter;
  const codebaseRoot = options.codebaseRoot || dir;

  function scan(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(codebaseRoot, fullPath);

      // Skip ignored files
      if (ignoreFilter?.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          const _ext = path.extname(fullPath);

          // Only process text files
          if (!isTextFile(fullPath)) {
            continue;
          }

          const content = fs.readFileSync(fullPath, 'utf8');

          results.push({
            path: relativePath,
            absolutePath: fullPath,
            content,
            size: stats.size,
            mtime: stats.mtimeMs,
          });
        } catch (error) {
          console.warn(`[WARN] Failed to read file: ${relativePath}`, error);
        }
      }
    }
  }

  scan(dir);
  return results;
}

/**
 * Calculate simple hash for file content (for change detection)
 */
export function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
