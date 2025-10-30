/**
 * Cache management for the codebase indexer
 */

import fs from 'node:fs';
import path from 'node:path';
import type { IndexCache } from './codebase-indexer-types.js';

export class IndexerCache {
  private cacheDir: string;
  private cachePath: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.cachePath = path.join(cacheDir, 'codebase-index.json');
  }

  /**
   * Load cache from disk
   */
  load(): IndexCache | null {
    try {
      if (!fs.existsSync(this.cachePath)) {
        return null;
      }

      const data = fs.readFileSync(this.cachePath, 'utf-8');
      const parsed = JSON.parse(data) as IndexCache;

      // Convert files object back to Map
      parsed.files = new Map(Object.entries(parsed.files));

      return parsed;
    } catch (error) {
      console.warn('Failed to load codebase index cache:', error);
      return null;
    }
  }

  /**
   * Save cache to disk
   */
  save(cache: IndexCache): void {
    try {
      // Ensure cache directory exists
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }

      // Convert Map to object for JSON serialization
      const serializable = {
        ...cache,
        files: Object.fromEntries(cache.files),
      };

      fs.writeFileSync(this.cachePath, JSON.stringify(serializable, null, 2));
    } catch (error) {
      console.warn('Failed to save codebase index cache:', error);
    }
  }

  /**
   * Clear cache
   */
  clear(): void {
    try {
      if (fs.existsSync(this.cachePath)) {
        fs.unlinkSync(this.cachePath);
      }
    } catch (error) {
      console.warn('Failed to clear codebase index cache:', error);
    }
  }
}