/**
 * File Attachment Service
 * Handles reading file attachments with intelligent caching
 *
 * Features:
 * - LRU cache with mtime validation (prevents stale data)
 * - Automatic cache eviction when memory limit reached
 * - O(1) cache operations
 * - Skips caching for files > 10MB
 */

import { readFile, stat } from 'node:fs/promises';

interface CacheEntry {
  content: string;
  size: number;
  mtime: number;
}

interface FileAttachment {
  path: string;
  relativePath: string;
}

export class FileAttachmentService {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Set<string>(); // Track LRU order
  private maxCacheSize: number;
  private currentCacheSize = 0;
  private maxFileSize: number;

  /**
   * Create FileAttachmentService
   * @param maxCacheSize - Maximum total cache size in bytes (default: 50MB)
   * @param maxFileSize - Maximum file size to cache in bytes (default: 10MB)
   */
  constructor(
    maxCacheSize: number = 50 * 1024 * 1024, // 50MB
    maxFileSize: number = 10 * 1024 * 1024   // 10MB
  ) {
    this.maxCacheSize = maxCacheSize;
    this.maxFileSize = maxFileSize;
  }

  /**
   * Get file content from cache
   * Returns null if not cached or if file was modified
   */
  private async getFromCache(path: string): Promise<string | null> {
    const entry = this.cache.get(path);
    if (!entry) {
      return null;
    }

    // Validate cache: check if file was modified since cached
    try {
      const stats = await stat(path);
      const currentMtime = stats.mtimeMs;

      if (currentMtime !== entry.mtime) {
        // File was modified, invalidate cache entry
        this.cache.delete(path);
        this.accessOrder.delete(path);
        this.currentCacheSize -= entry.size;
        return null;
      }

      // Cache valid, update access order for LRU (O(1) operation)
      this.accessOrder.delete(path); // Remove from current position
      this.accessOrder.add(path); // Add to end (most recently used)
      return entry.content;
    } catch {
      // File doesn't exist or can't be read, invalidate cache
      this.cache.delete(path);
      this.accessOrder.delete(path);
      this.currentCacheSize -= entry.size;
      return null;
    }
  }

  /**
   * Add file content to cache
   */
  private async addToCache(path: string, content: string): Promise<void> {
    const size = content.length;

    // Don't cache files larger than maxFileSize
    if (size > this.maxFileSize) {
      return;
    }

    // Get file mtime for validation
    let mtime: number;
    try {
      const stats = await stat(path);
      mtime = stats.mtimeMs;
    } catch {
      // Can't get mtime, don't cache
      return;
    }

    // Evict oldest entries if cache is full (O(1) operation)
    while (this.currentCacheSize + size > this.maxCacheSize && this.cache.size > 0) {
      // Get first item from accessOrder (least recently used)
      const oldestKey = this.accessOrder.values().next().value;

      if (oldestKey) {
        const removed = this.cache.get(oldestKey);
        if (removed) {
          this.currentCacheSize -= removed.size;
        }
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
      } else {
        break;
      }
    }

    this.cache.set(path, { content, size, mtime });
    this.accessOrder.add(path); // Add to end (most recently used)
    this.currentCacheSize += size;
  }

  /**
   * Read file content with caching
   * @param path - Absolute file path
   * @returns File content or error message
   */
  async readFile(path: string): Promise<string> {
    // Check cache first (validates mtime)
    let content = await this.getFromCache(path);

    if (content === null) {
      // Not in cache or stale, read from disk
      try {
        content = await readFile(path, 'utf8');
        // Add to cache for future use
        await this.addToCache(path, content);
      } catch {
        return '[Error reading file]';
      }
    }

    return content;
  }

  /**
   * Read multiple file attachments and format as XML
   * @param attachments - Array of file attachments
   * @returns Array of formatted file content parts
   */
  async readAttachments(attachments: FileAttachment[]): Promise<Array<{ type: 'text'; text: string }>> {
    const startTime = Date.now();

    const fileContents = await Promise.all(
      attachments.map(async (att) => {
        const content = await this.readFile(att.path);
        return {
          type: 'text' as const,
          text: `\n\n<file path="${att.relativePath}">\n${content}\n</file>`,
        };
      })
    );

    const duration = Date.now() - startTime;

    // Log performance metrics (can be disabled in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[FileAttachmentService] Read ${attachments.length} files in ${duration}ms`);
    }

    return fileContents;
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentCacheSize = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      totalSize: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      hitRate: 0, // TODO: Implement hit rate tracking if needed
    };
  }
}

/**
 * Default singleton instance
 * Use this for simple use cases
 */
export const defaultFileAttachmentService = new FileAttachmentService();
