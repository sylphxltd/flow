/**
 * Functional composable for file system operations
 * Returns Result instead of throwing exceptions
 *
 * DESIGN RATIONALE:
 * - Explicit error handling
 * - Composable file operations
 * - Type-safe path handling
 * - Separation of concerns (pure path operations vs side effects)
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { FileSystemError } from '../../core/functional/error-types.js';
import { fileSystemError } from '../../core/functional/error-types.js';
import type { Result } from '../../core/functional/result.js';
import { tryCatchAsync } from '../../core/functional/result.js';

/**
 * Pure path operations (no side effects)
 */

export const joinPath = (...segments: string[]): string => path.join(...segments);

export const resolvePath = (...segments: string[]): string => path.resolve(...segments);

export const dirname = (filePath: string): string => path.dirname(filePath);

export const basename = (filePath: string, ext?: string): string => path.basename(filePath, ext);

export const extname = (filePath: string): string => path.extname(filePath);

/**
 * File system operations (side effects, return Result)
 */

export const readFile = async (filePath: string): Promise<Result<string, FileSystemError>> => {
  return tryCatchAsync(
    async () => {
      return await fsPromises.readFile(filePath, 'utf-8');
    },
    (error) =>
      fileSystemError(`Failed to read file: ${filePath}`, filePath, 'read', {
        cause: error instanceof Error ? error : undefined,
      })
  );
};

export const writeFile = async (
  filePath: string,
  content: string
): Promise<Result<void, FileSystemError>> => {
  return tryCatchAsync(
    async () => {
      await fsPromises.writeFile(filePath, content, 'utf-8');
    },
    (error) =>
      fileSystemError(`Failed to write file: ${filePath}`, filePath, 'write', {
        cause: error instanceof Error ? error : undefined,
      })
  );
};

export const deleteFile = async (filePath: string): Promise<Result<void, FileSystemError>> => {
  return tryCatchAsync(
    async () => {
      await fsPromises.unlink(filePath);
    },
    (error) =>
      fileSystemError(`Failed to delete file: ${filePath}`, filePath, 'delete', {
        cause: error instanceof Error ? error : undefined,
      })
  );
};

export const createDirectory = async (
  dirPath: string,
  options?: { recursive?: boolean }
): Promise<Result<void, FileSystemError>> => {
  return tryCatchAsync(
    async () => {
      await fsPromises.mkdir(dirPath, { recursive: options?.recursive ?? true });
    },
    (error) =>
      fileSystemError(`Failed to create directory: ${dirPath}`, dirPath, 'create', {
        cause: error instanceof Error ? error : undefined,
      })
  );
};

export const pathExists = async (filePath: string): Promise<Result<boolean, FileSystemError>> => {
  return tryCatchAsync(
    async () => {
      try {
        await fsPromises.access(filePath);
        return true;
      } catch {
        return false;
      }
    },
    (error) =>
      fileSystemError(`Failed to check if path exists: ${filePath}`, filePath, 'stat', {
        cause: error instanceof Error ? error : undefined,
      })
  );
};

export const readDirectory = async (
  dirPath: string
): Promise<Result<string[], FileSystemError>> => {
  return tryCatchAsync(
    async () => {
      return await fsPromises.readdir(dirPath);
    },
    (error) =>
      fileSystemError(`Failed to read directory: ${dirPath}`, dirPath, 'read', {
        cause: error instanceof Error ? error : undefined,
      })
  );
};

export const getStats = async (
  filePath: string
): Promise<Result<{ isFile: boolean; isDirectory: boolean; size: number }, FileSystemError>> => {
  return tryCatchAsync(
    async () => {
      const stats = await fsPromises.stat(filePath);
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
      };
    },
    (error) =>
      fileSystemError(`Failed to get stats for: ${filePath}`, filePath, 'stat', {
        cause: error instanceof Error ? error : undefined,
      })
  );
};
