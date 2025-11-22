/**
 * File collection and information utilities
 */

import path from 'node:path';
import {
  deletePathSafe,
  getFileInfo,
  readDirectorySafe,
  readFileSafe,
} from '../../utils/files/file-operations.js';
import type { ProcessResult } from '../types/index.js';

/**
 * Collect files from directory with specified extensions
 * @param dir - Directory to search
 * @param extensions - File extensions to include
 * @returns Array of file paths relative to directory
 */
export async function collectFiles(dir: string, extensions: string[]): Promise<string[]> {
  try {
    const allFiles = await readDirectorySafe(dir, {
      recursive: true,
      includeFiles: true,
      includeDirectories: false,
    });

    return allFiles
      .filter((filePath) => extensions.some((ext) => filePath.endsWith(ext)))
      .map((filePath) => path.relative(dir, filePath))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Get local file information including content and modification time
 * @param filePath - Path to file
 * @returns File info with content and mtime, or null if file doesn't exist
 */
export async function getLocalFileInfo(
  filePath: string
): Promise<{ content: string; mtime: Date } | null> {
  const info = await getFileInfo(filePath);

  if (!info.exists || !info.isFile) {
    return null;
  }

  const content = await readFileSafe(filePath);

  if (content === null) {
    return null;
  }

  return {
    content,
    mtime: info.mtime!,
  };
}

/**
 * Clear obsolete files from target directory
 * @param targetDir - Target directory
 * @param expectedFiles - Set of expected file names
 * @param extensions - Valid file extensions
 * @param results - Array to store process results
 */
export async function clearObsoleteFiles(
  targetDir: string,
  expectedFiles: Set<string>,
  extensions: string[],
  results: ProcessResult[]
): Promise<void> {
  try {
    const items = await readDirectorySafe(targetDir, {
      recursive: false,
      includeFiles: true,
      includeDirectories: false,
    });

    for (const itemPath of items) {
      const fileName = path.basename(itemPath);
      const hasValidExtension = extensions.some((ext) => fileName.endsWith(ext));

      if (hasValidExtension && !expectedFiles.has(fileName)) {
        await deletePathSafe(itemPath);
        results.push({
          file: fileName,
          status: 'skipped',
          action: 'Removed obsolete file',
        });
      }
    }
  } catch {
    // Directory doesn't exist, nothing to clear
  }
}
