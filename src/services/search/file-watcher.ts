/**
 * File watching functionality for codebase indexer
 */

import path from 'node:path';
import chokidar from 'chokidar';
import { loadGitignore } from '../../utils/codebase-helpers.js';
import type { CodebaseIndexerOptions } from './codebase-indexer.types.js';

export class FileWatcher {
  private watcher?: chokidar.FSWatcher;
  private reindexTimer?: NodeJS.Timeout;
  private ig: any;
  private codebaseRoot: string;
  private onReindexCallback: () => void;

  constructor(options: CodebaseIndexerOptions, onReindexCallback: () => void) {
    this.codebaseRoot = options.codebaseRoot || process.cwd();
    this.ig = loadGitignore(this.codebaseRoot);
    this.onReindexCallback = onReindexCallback;
  }

  /**
   * Start watching for file changes
   */
  startWatching(): void {
    if (this.watcher) {
      return;
    }

    this.watcher = chokidar.watch(this.codebaseRoot, {
      ignored: (filePath: string) => {
        const relativePath = path.relative(this.codebaseRoot, filePath);
        return this.ig.ignores(relativePath);
      },
      ignoreInitial: true,
      persistent: true,
    });

    this.watcher.on('all', (event, filePath) => {
      if (event === 'add' || event === 'change' || event === 'unlink') {
        this.scheduleReindex();
      }
    });
  }

  /**
   * Stop watching for file changes
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
   * Schedule reindexing with debouncing
   */
  private scheduleReindex(): void {
    if (this.reindexTimer) {
      clearTimeout(this.reindexTimer);
    }

    this.reindexTimer = setTimeout(() => {
      this.onReindexCallback();
    }, 5000); // 5 seconds debounce
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopWatching();
  }
}
