/**
 * Cache management for codebase indexer
 */

import fs from 'node:fs';
import path from 'node:path';
import { simpleHash } from '../../utils/codebase-helpers.js';
import type { IndexCache } from './codebase-indexer.types.js';

export class IndexCacheManager {
  private cacheDir: string;
  private cachePath: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.cachePath = path.join(cacheDir, 'codebase-index-cache.json');
    this.ensureCacheDir();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Load index cache from disk
   */
  loadCache(): IndexCache | null {
    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, 'utf-8');
        const cache = JSON.parse(data) as IndexCache;

        // Convert files object back to Map
        if (cache.files) {
          cache.files = new Map(Object.entries(cache.files));
        }

        return cache;
      }
    } catch (error) {
      console.warn('Failed to load index cache:', error);
    }
    return null;
  }

  /**
   * Save index cache to disk
   */
  saveCache(cache: IndexCache): void {
    try {
      this.ensureCacheDir();

      // Convert Map to object for JSON serialization
      const serializableCache = {
        ...cache,
        files: Object.fromEntries(cache.files),
      };

      fs.writeFileSync(this.cachePath, JSON.stringify(serializableCache, null, 2));
    } catch (error) {
      console.warn('Failed to save index cache:', error);
    }
  }

  /**
   * Check if a file needs re-indexing
   */
  needsReindex(filePath: string, mtime: number, cache: IndexCache): boolean {
    const cachedFile = cache.files.get(filePath);
    if (!cachedFile) {
      return true;
    }

    if (cachedFile.mtime !== mtime) {
      return true;
    }

    return false;
  }

  /**
   * Update file in cache
   */
  updateFileInCache(filePath: string, mtime: number, content: string, cache: IndexCache): void {
    const hash = simpleHash(content);
    cache.files.set(filePath, { mtime, hash });
  }

  /**
   * Create new cache instance
   */
  createCache(codebaseRoot: string): IndexCache {
    return {
      version: '1.0.0',
      codebaseRoot,
      indexedAt: new Date().toISOString(),
      fileCount: 0,
      files: new Map(),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    try {
      if (fs.existsSync(this.cachePath)) {
        fs.unlinkSync(this.cachePath);
      }
    } catch (error) {
      console.warn('Failed to clear index cache:', error);
    }
  }
}
