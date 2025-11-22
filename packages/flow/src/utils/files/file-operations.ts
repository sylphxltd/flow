/**
 * Standardized file operations utilities
 * Provides consistent async file operations with proper error handling
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { pathSecurity } from '../security/security.js';
import { formatFileSize as formatFileSizeCore } from '../../core/formatting/bytes.js';

export interface FileReadOptions {
  encoding?: BufferEncoding;
  fallback?: string;
}

export interface FileWriteOptions {
  encoding?: BufferEncoding;
  createDir?: boolean;
  backup?: boolean;
}

export interface FileCopyOptions {
  overwrite?: boolean;
  createDir?: boolean;
}

export interface FileInfo {
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size?: number;
  mtime?: Date;
  atime?: Date;
  ctime?: Date;
}

/**
 * Safely read a file with encoding and fallback options
 */
export async function readFileSafe(
  filePath: string,
  options: FileReadOptions = {}
): Promise<string | null> {
  const { encoding = 'utf8', fallback } = options;

  try {
    const content = await fs.readFile(filePath, encoding);
    return content;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' && fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

/**
 * Safely write a file with directory creation and backup options
 */
export async function writeFileSafe(
  filePath: string,
  content: string,
  options: FileWriteOptions = {}
): Promise<void> {
  const { encoding = 'utf8', createDir = true, backup = false } = options;

  // Validate path security
  pathSecurity.validatePath(filePath);

  // Create directory if needed
  if (createDir) {
    const dir = path.dirname(filePath);
    await ensureDirectory(dir);
  }

  // Create backup if requested and file exists
  if (backup && (await fileExists(filePath))) {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
  }

  await fs.writeFile(filePath, content, encoding);
}

/**
 * Check if a file or directory exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get comprehensive file information
 */
export async function getFileInfo(filePath: string): Promise<FileInfo> {
  try {
    const stats = await fs.stat(filePath);
    return {
      exists: true,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime,
      atime: stats.atime,
      ctime: stats.ctime,
    };
  } catch {
    return {
      exists: false,
      isFile: false,
      isDirectory: false,
    };
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Safely copy a file with options
 */
export async function copyFileSafe(
  sourcePath: string,
  destPath: string,
  options: FileCopyOptions = {}
): Promise<void> {
  const { overwrite = false, createDir = true } = options;

  // Validate path security
  pathSecurity.validatePath(sourcePath);
  pathSecurity.validatePath(destPath);

  // Check if source exists
  if (!(await fileExists(sourcePath))) {
    throw new Error(`Source file does not exist: ${sourcePath}`);
  }

  // Check if destination exists and overwrite is false
  if (!overwrite && (await fileExists(destPath))) {
    throw new Error(`Destination file already exists: ${destPath}`);
  }

  // Create destination directory if needed
  if (createDir) {
    const destDir = path.dirname(destPath);
    await ensureDirectory(destDir);
  }

  await fs.copyFile(sourcePath, destPath);
}

/**
 * Safely delete a file or directory
 */
export async function deletePathSafe(targetPath: string): Promise<void> {
  // Validate path security
  pathSecurity.validatePath(targetPath);

  if (!(await fileExists(targetPath))) {
    return; // Already deleted
  }

  const info = await getFileInfo(targetPath);

  if (info.isDirectory) {
    await fs.rm(targetPath, { recursive: true, force: true });
  } else {
    await fs.unlink(targetPath);
  }
}

/**
 * Read directory contents safely
 */
export async function readDirectorySafe(
  dirPath: string,
  options: { recursive?: boolean; includeFiles?: boolean; includeDirectories?: boolean } = {}
): Promise<string[]> {
  const { recursive = false, includeFiles = true, includeDirectories = true } = options;

  // Validate path security
  pathSecurity.validatePath(dirPath);

  if (!(await fileExists(dirPath))) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  const info = await getFileInfo(dirPath);
  if (!info.isDirectory) {
    throw new Error(`Path is not a directory: ${dirPath}`);
  }

  if (recursive) {
    const results: string[] = [];
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory() && includeDirectories) {
        results.push(fullPath);
        const subResults = await readDirectorySafe(fullPath, options);
        results.push(...subResults);
      } else if (item.isFile() && includeFiles) {
        results.push(fullPath);
      }
    }

    return results;
  }
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  return items
    .filter((item) => {
      if (item.isFile() && includeFiles) {
        return true;
      }
      if (item.isDirectory() && includeDirectories) {
        return true;
      }
      return false;
    })
    .map((item) => path.join(dirPath, item.name));
}

/**
 * Find files matching patterns in a directory
 */
export async function findFiles(
  dirPath: string,
  patterns: string[],
  options: { recursive?: boolean; caseSensitive?: boolean } = {}
): Promise<string[]> {
  const { recursive = true, caseSensitive = true } = options;

  const allFiles = await readDirectorySafe(dirPath, {
    recursive,
    includeFiles: true,
    includeDirectories: false,
  });

  const regexPatterns = patterns.map((pattern) => {
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(regexPattern, caseSensitive ? '' : 'i');
  });

  return allFiles.filter((filePath) => {
    const fileName = path.basename(filePath);
    return regexPatterns.some((regex) => regex.test(fileName));
  });
}

/**
 * Move a file safely with validation
 */
export async function moveFileSafe(
  sourcePath: string,
  destPath: string,
  options: { overwrite?: boolean; createDir?: boolean } = {}
): Promise<void> {
  const { overwrite = false, createDir = true } = options;

  // Copy first, then delete original
  await copyFileSafe(sourcePath, destPath, { overwrite, createDir });
  await deletePathSafe(sourcePath);
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  return formatFileSizeCore(bytes);
}

/**
 * Validate file path against security constraints
 */
export function validateFilePath(filePath: string, allowedBasePaths?: string[]): boolean {
  try {
    pathSecurity.validatePath(filePath);

    if (allowedBasePaths) {
      const resolved = path.resolve(filePath);
      const isAllowed = allowedBasePaths.some((basePath) => {
        const resolvedBase = path.resolve(basePath);
        return resolved.startsWith(resolvedBase);
      });

      if (!isAllowed) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
