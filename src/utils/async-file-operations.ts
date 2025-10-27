/**
 * Async File Operations Utility
 *
 * Provides async wrappers for common file operations with better error handling,
 * concurrency control, and performance optimizations
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export interface FileOperationOptions {
  encoding?: BufferEncoding;
  signal?: AbortSignal;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface FileStats {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isFile: boolean;
  isDirectory: boolean;
  permissions: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  stats?: FileStats;
}

export interface CopyOptions {
  overwrite?: boolean;
  preserveTimestamps?: boolean;
  filter?: (source: string, dest: string) => boolean;
  concurrency?: number;
}

export interface ReadDirOptions {
  withFileTypes?: boolean;
  recursive?: boolean;
  includeStats?: boolean;
  filter?: (entry: DirectoryEntry) => boolean;
  maxDepth?: number;
}

/**
 * Async file operations with error handling and retries
 */
export class AsyncFileOperations {
  private readonly defaultOptions: Required<FileOperationOptions> = {
    encoding: 'utf8',
    retryAttempts: 3,
    retryDelay: 1000,
    timeout: 30000,
  };

  /**
   * Read file content with retries
   */
  async readFile(filePath: string, options: FileOperationOptions = {}): Promise<string | Buffer> {
    const opts = { ...this.defaultOptions, ...options };

    return this.withRetry(
      async () => {
        if (opts.timeout) {
          return await this.withTimeout(() => fs.readFile(filePath, opts.encoding), opts.timeout);
        }
        return await fs.readFile(filePath, opts.encoding);
      },
      opts.retryAttempts,
      opts.retryDelay
    );
  }

  /**
   * Write file content with retries and backup
   */
  async writeFile(
    filePath: string,
    content: string | Buffer | NodeJS.ArrayBufferView,
    options: FileOperationOptions & { createBackup?: boolean } = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, createBackup: true, ...options };

    // Create backup if requested and file exists
    if (opts.createBackup && (await this.exists(filePath))) {
      await this.createBackup(filePath);
    }

    return this.withRetry(
      async () => {
        // Ensure directory exists
        await this.ensureDir(path.dirname(filePath));

        if (opts.timeout) {
          return await this.withTimeout(
            () => fs.writeFile(filePath, content, opts.encoding),
            opts.timeout
          );
        }
        return await fs.writeFile(filePath, content, opts.encoding);
      },
      opts.retryAttempts,
      opts.retryDelay
    );
  }

  /**
   * Append to file with retries
   */
  async appendFile(
    filePath: string,
    content: string | Buffer,
    options: FileOperationOptions = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    return this.withRetry(
      async () => {
        // Ensure directory exists
        await this.ensureDir(path.dirname(filePath));

        if (opts.timeout) {
          return await this.withTimeout(
            () => fs.appendFile(filePath, content, opts.encoding),
            opts.timeout
          );
        }
        return await fs.appendFile(filePath, content, opts.encoding);
      },
      opts.retryAttempts,
      opts.retryDelay
    );
  }

  /**
   * Check if file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file statistics
   */
  async getStats(filePath: string): Promise<FileStats> {
    const stats = await fs.stat(filePath);

    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      permissions: stats.mode.toString(8),
    };
  }

  /**
   * Create directory recursively
   */
  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Check if directory already exists
      if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) {
        throw error;
      }
    }
  }

  /**
   * Remove file or directory recursively
   */
  async remove(
    targetPath: string,
    options: { recursive?: boolean; force?: boolean } = {}
  ): Promise<void> {
    const { recursive = true, force = false } = options;

    try {
      const stats = await fs.lstat(targetPath);

      if (stats.isDirectory() && recursive) {
        await fs.rm(targetPath, { recursive: true, force });
      } else if (stats.isDirectory() && !recursive) {
        throw new Error('Cannot remove directory without recursive option');
      } else {
        await fs.unlink(targetPath);
      }
    } catch (error) {
      if (!force || !(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        throw error;
      }
    }
  }

  /**
   * Copy file or directory
   */
  async copy(source: string, destination: string, options: CopyOptions = {}): Promise<void> {
    const { overwrite = false, preserveTimestamps = true, filter, concurrency = 10 } = options;

    const sourceStats = await fs.lstat(source);

    if (sourceStats.isDirectory()) {
      await this.copyDirectory(source, destination, {
        overwrite,
        preserveTimestamps,
        filter,
        concurrency,
      });
    } else {
      await this.copyFile(source, destination, {
        overwrite,
        preserveTimestamps,
        filter,
      });
    }
  }

  /**
   * Move file or directory
   */
  async move(
    source: string,
    destination: string,
    options: { overwrite?: boolean } = {}
  ): Promise<void> {
    const { overwrite = false } = options;

    // Check if destination exists
    if ((await this.exists(destination)) && !overwrite) {
      throw new Error(`Destination already exists: ${destination}`);
    }

    try {
      await fs.rename(source, destination);
    } catch (error) {
      // Fallback to copy + delete if rename fails (cross-device)
      if (error instanceof Error && 'code' in error && error.code === 'EXDEV') {
        await this.copy(source, destination, { overwrite });
        await this.remove(source, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  /**
   * Read directory contents
   */
  async readDir(dirPath: string, options: ReadDirOptions = {}): Promise<DirectoryEntry[]> {
    const {
      withFileTypes = false,
      recursive = false,
      includeStats = false,
      filter,
      maxDepth = 10,
    } = options;

    const results: DirectoryEntry[] = [];

    const processDirectory = async (currentPath: string, currentDepth: number): Promise<void> => {
      if (currentDepth > maxDepth) {
        return;
      }

      try {
        const entries = await fs.readdir(currentPath, { withFileTypes });

        const promises = entries.map(async (entry) => {
          const fullPath = path.join(currentPath, entry.name);
          const directoryEntry: DirectoryEntry = {
            name: entry.name,
            path: fullPath,
            isFile: entry.isFile(),
            isDirectory: entry.isDirectory(),
          };

          if (includeStats) {
            try {
              directoryEntry.stats = await this.getStats(fullPath);
            } catch (_error) {
              // Skip if stats can't be retrieved
            }
          }

          // Apply filter if provided
          if (filter && !filter(directoryEntry)) {
            return;
          }

          results.push(directoryEntry);

          // Recursively process subdirectories
          if (recursive && entry.isDirectory()) {
            await processDirectory(fullPath, currentDepth + 1);
          }
        });

        await Promise.all(promises);
      } catch (error) {
        throw new Error(`Failed to read directory ${currentPath}: ${error}`);
      }
    };

    await processDirectory(dirPath, 0);
    return results;
  }

  /**
   * Calculate file hash
   */
  async calculateHash(filePath: string, algorithm = 'sha256'): Promise<string> {
    const content = await this.readFile(filePath);
    return createHash(algorithm)
      .update(content as Buffer)
      .digest('hex');
  }

  /**
   * Watch file or directory for changes
   */
  async watch(
    targetPath: string,
    callback: (eventType: string, filename: string | null) => void,
    options: { recursive?: boolean } = {}
  ): Promise<fs.FSWatcher> {
    const { recursive = false } = options;

    return new Promise((resolve, reject) => {
      try {
        const watcher = fs.watch(targetPath, { recursive }, callback);
        resolve(watcher);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Create backup of file
   */
  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup.${timestamp}`;
    await this.copy(filePath, backupPath);
    return backupPath;
  }

  /**
   * Copy file with options
   */
  private async copyFile(
    source: string,
    destination: string,
    options: {
      overwrite?: boolean;
      preserveTimestamps?: boolean;
      filter?: (source: string, dest: string) => boolean;
    }
  ): Promise<void> {
    const { overwrite = false, preserveTimestamps = true, filter } = options;

    // Apply filter
    if (filter && !filter(source, destination)) {
      return;
    }

    // Check if destination exists
    if ((await this.exists(destination)) && !overwrite) {
      throw new Error(`Destination already exists: ${destination}`);
    }

    // Ensure destination directory exists
    await this.ensureDir(path.dirname(destination));

    // Copy file
    await fs.copyFile(source, destination);

    // Preserve timestamps if requested
    if (preserveTimestamps) {
      const sourceStats = await fs.stat(source);
      await fs.utimes(destination, sourceStats.atime, sourceStats.mtime);
    }
  }

  /**
   * Copy directory with options
   */
  private async copyDirectory(
    source: string,
    destination: string,
    options: {
      overwrite?: boolean;
      preserveTimestamps?: boolean;
      filter?: (source: string, dest: string) => boolean;
      concurrency?: number;
    }
  ): Promise<void> {
    const { concurrency = 10 } = options;

    // Ensure destination directory exists
    await this.ensureDir(destination);

    // Get all entries
    const entries = await this.readDir(source, { recursive: true });

    // Process entries in batches
    for (let i = 0; i < entries.length; i += concurrency) {
      const batch = entries.slice(i, i + concurrency);

      await Promise.all(
        batch.map(async (entry) => {
          const relativePath = path.relative(source, entry.path);
          const destPath = path.join(destination, relativePath);

          if (entry.isFile) {
            await this.copyFile(entry.path, destPath, options);
          } else if (entry.isDirectory) {
            await this.ensureDir(destPath);
          }
        })
      );
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    attempts: number,
    delay: number
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (i < attempts - 1) {
          await this.sleep(delay * 2 ** i); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  /**
   * Execute operation with timeout
   */
  private async withTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const asyncFileOps = new AsyncFileOperations();

/**
 * Convenience functions for common operations
 */
export const readFile = (filePath: string, options?: FileOperationOptions) =>
  asyncFileOps.readFile(filePath, options);

export const writeFile = (
  filePath: string,
  content: string | Buffer,
  options?: FileOperationOptions
) => asyncFileOps.writeFile(filePath, content, options);

export const exists = (filePath: string) => asyncFileOps.exists(filePath);

export const ensureDir = (dirPath: string) => asyncFileOps.ensureDir(dirPath);

export const remove = (targetPath: string, options?: { recursive?: boolean; force?: boolean }) =>
  asyncFileOps.remove(targetPath, options);

export const copy = (source: string, destination: string, options?: CopyOptions) =>
  asyncFileOps.copy(source, destination, options);

export const move = (source: string, destination: string, options?: { overwrite?: boolean }) =>
  asyncFileOps.move(source, destination, options);

export const readDir = (dirPath: string, options?: ReadDirOptions) =>
  asyncFileOps.readDir(dirPath, options);
