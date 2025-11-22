/**
 * CLI Output Utilities
 * Provides structured output for CLI commands with proper logging separation
 */

import { logger } from './logger.js';

/**
 * CLI output levels
 */
export type CLIOutputLevel = 'info' | 'success' | 'warning' | 'error';

/**
 * CLI output interface
 */
export interface ICLIOutput {
  /**
   * Print user-facing message
   */
  print(message: string, level?: CLIOutputLevel): void;

  /**
   * Print success message
   */
  success(message: string): void;

  /**
   * Print warning message
   */
  warning(message: string): void;

  /**
   * Print error message
   */
  error(message: string): void;

  /**
   * Print info message
   */
  info(message: string): void;

  /**
   * Print formatted data
   */
  table(data: Record<string, unknown>[]): void;

  /**
   * Print formatted list
   */
  list(items: string[], options?: { numbered?: boolean; bullet?: string }): void;
}

/**
 * CLI output implementation
 */
export class CLIOutput implements ICLIOutput {
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  };

  private icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  print(message: string, level: CLIOutputLevel = 'info'): void {
    // Log internally for debugging
    logger.debug('CLI output', { message, level });

    // Output to user
    switch (level) {
      case 'success':
        this.success(message);
        break;
      case 'warning':
        this.warning(message);
        break;
      case 'error':
        this.error(message);
        break;
      default:
        this.info(message);
        break;
    }
  }

  success(message: string): void {
    console.log(`${this.icons.success} ${this.colors.green}${message}${this.colors.reset}`);
    logger.info('CLI success output', { message });
  }

  warning(message: string): void {
    console.log(`${this.icons.warning} ${this.colors.yellow}${message}${this.colors.reset}`);
    logger.warn('CLI warning output', { message });
  }

  error(message: string): void {
    console.error(`${this.icons.error} ${this.colors.red}${message}${this.colors.reset}`);
    logger.error('CLI error output', { message });
  }

  info(message: string): void {
    console.log(`${this.icons.info} ${message}`);
    logger.info('CLI info output', { message });
  }

  table(data: Record<string, unknown>[]): void {
    if (data.length === 0) {
      this.info('No data to display');
      return;
    }

    // Simple table formatting
    const headers = Object.keys(data[0]);
    const columnWidths = headers.map((header) =>
      Math.max(header.length, ...data.map((row) => String(row[header] || '').length))
    );

    // Print header
    const headerRow = headers.map((header, i) => header.padEnd(columnWidths[i])).join(' | ');
    console.log(this.colors.bright + headerRow + this.colors.reset);
    console.log('-'.repeat(headerRow.length));

    // Print rows
    data.forEach((row) => {
      const rowStr = headers
        .map((header, i) => String(row[header] || '').padEnd(columnWidths[i]))
        .join(' | ');
      console.log(rowStr);
    });

    logger.debug('CLI table output', {
      headers,
      rowCount: data.length,
      columnWidths,
    });
  }

  list(items: string[], options: { numbered?: boolean; bullet?: string } = {}): void {
    const { numbered = false, bullet = '•' } = options;

    if (items.length === 0) {
      this.info('No items to display');
      return;
    }

    items.forEach((item, index) => {
      const prefix = numbered ? `${index + 1}.` : bullet;
      console.log(`${prefix} ${item}`);
    });

    logger.debug('CLI list output', {
      itemCount: items.length,
      numbered,
      bullet,
    });
  }

  /**
   * Print formatted memory entry
   */
  memoryEntry(
    entry: {
      namespace: string;
      key: string;
      value: unknown;
      updated_at: string;
    },
    index?: number
  ): void {
    const prefix = index !== undefined ? `${index + 1}.` : '•';
    const safeValue = entry.value || '';
    const value =
      typeof safeValue === 'string'
        ? safeValue.substring(0, 50) + (safeValue.length > 50 ? '...' : '')
        : `${JSON.stringify(safeValue).substring(0, 50)}...`;

    console.log(`${prefix} ${entry.namespace}:${entry.key}`);
    console.log(`   Value: ${value}`);
    console.log(`   Updated: ${entry.updated_at}`);
    console.log('');

    logger.debug('CLI memory entry output', {
      namespace: entry.namespace,
      key: entry.key,
      valueLength: String(entry.value || '').length,
    });
  }

  /**
   * Print search results summary
   */
  searchSummary(query: string, results: number, namespace?: string): void {
    console.log(`${this.colors.cyan}🔍 Search results for pattern: ${query}${this.colors.reset}`);

    if (namespace) {
      console.log(`${this.colors.dim}Namespace: ${namespace}${this.colors.reset}`);
    }

    console.log(`${this.colors.bright}Found: ${results} results${this.colors.reset}\n`);

    logger.info('CLI search summary', { query, results, namespace });
  }

  /**
   * Print list summary
   */
  listSummary(namespace: string, count: number, total?: number): void {
    if (namespace && namespace !== 'all') {
      console.log(
        `${this.colors.cyan}📋 Memory entries in namespace: ${namespace}${this.colors.reset}`
      );
      console.log(`${this.colors.bright}Total: ${count} entries${this.colors.reset}\n`);
    } else if (total) {
      console.log(
        `${this.colors.cyan}📋 All memory entries (showing first ${count})${this.colors.reset}`
      );
      console.log(`${this.colors.bright}Total: ${total} entries${this.colors.reset}\n`);
    }

    logger.info('CLI list summary', { namespace, count, total });
  }

  /**
   * Print empty state message
   */
  emptyState(type: 'entries' | 'results' | 'data', context?: string): void {
    const messages = {
      entries: 'No entries found',
      results: 'No matching entries found',
      data: 'No data to display',
    };

    let message = messages[type];
    if (context) {
      message += ` in ${context}`;
    }
    message += '.';

    this.info(message);
    logger.debug('CLI empty state', { type, context, message });
  }
}

// Global CLI output instance
export const cli = new CLIOutput();

/**
 * Convenience functions
 */
export const print = (message: string, level?: CLIOutputLevel) => cli.print(message, level);
export const success = (message: string) => cli.success(message);
export const warning = (message: string) => cli.warning(message);
export const error = (message: string) => cli.error(message);
export const info = (message: string) => cli.info(message);
