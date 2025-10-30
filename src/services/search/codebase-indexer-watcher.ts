/**
 * File watching functionality for the codebase indexer
 */

import chokidar from 'chokidar';
import { IndexingStatus } from './codebase-indexer-types.js';

export class IndexerWatcher {
  private watcher?: chokidar.FSWatcher;
  private reindexTimer?: NodeJS.Timeout;
  private onReindexNeeded?: () => void;

  constructor(onReindexNeeded: () => void) {
    this.onReindexNeeded = onReindexNeeded;
  }

  /**
   * Start watching files for changes
   */
  startWatching(codebaseRoot: string): void {
    if (this.watcher) {
      this.stopWatching();
    }

    // Watch all files except node_modules and .git
    this.watcher = chokidar.watch(['**/*'], {
      cwd: codebaseRoot,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('all', () => {
      this.scheduleReindex();
    });
  }

  /**
   * Stop watching files
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
    }

    if (this.reindexTimer) {
      clearTimeout(this.reindexTimer);
      this.reindexTimer = undefined;
    }
  }

  /**
   * Schedule a reindex with debouncing (5 seconds)
   */
  private scheduleReindex(): void {
    if (this.reindexTimer) {
      clearTimeout(this.reindexTimer);
    }

    this.reindexTimer = setTimeout(() => {
      if (this.onReindexNeeded) {
        this.onReindexNeeded();
      }
    }, 5000);
  }

  /**
   * Check if watcher is active
   */
  isWatching(): boolean {
    return this.watcher !== undefined;
  }
}