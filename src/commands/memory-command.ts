#!/usr/bin/env node
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CommandConfig, CommandHandler } from '../types.js';
import { CLIError } from '../utils/error-handler.js';

// Memory data interface
interface MemoryEntry {
  key: string;
  namespace: string;
  value: any;
  timestamp: number;
  created_at: string;
  updated_at: string;
}

// Simple memory storage class for CLI operations
class MemoryStorage {
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), '.sylphx-flow', 'memory.db');
  }

  private async loadData(): Promise<Map<string, MemoryEntry>> {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    } catch {
      return new Map();
    }
  }

  private async saveData(data: Map<string, MemoryEntry>): Promise<void> {
    try {
      const obj = Object.fromEntries(data);
      await fs.writeFile(this.filePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (error) {
      console.warn('Warning: Could not save memory data:', error);
    }
  }

  async getAll(): Promise<MemoryEntry[]> {
    const data = await this.loadData();
    return Array.from(data.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  async search(pattern: string, namespace?: string): Promise<MemoryEntry[]> {
    const data = await this.loadData();
    const searchPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(searchPattern);

    return Array.from(data.values())
      .filter((entry) => {
        if (namespace && entry.namespace !== namespace) return false;
        return regex.test(entry.key);
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async delete(key: string, namespace = 'default'): Promise<boolean> {
    const data = await this.loadData();
    const fullKey = `${namespace}:${key}`;
    const deleted = data.delete(fullKey);

    if (deleted) {
      await this.saveData(data);
    }

    return deleted;
  }

  async clear(namespace?: string): Promise<number> {
    const data = await this.loadData();
    let count = 0;

    if (namespace) {
      const keysToDelete: string[] = [];
      for (const [fullKey, entry] of data.entries()) {
        if (entry.namespace === namespace) {
          keysToDelete.push(fullKey);
        }
      }

      for (const key of keysToDelete) {
        data.delete(key);
        count++;
      }
    } else {
      count = data.size;
      data.clear();
    }

    if (count > 0) {
      await this.saveData(data);
    }

    return count;
  }

  async getStats(): Promise<{
    total_entries: number;
    namespaces: { namespace: string; count: number }[];
    oldest_entry: number;
    newest_entry: number;
  }> {
    const data = await this.loadData();
    const entries = Array.from(data.values());
    const namespaces = [...new Set(entries.map((entry) => entry.namespace))];
    const namespaceStats = namespaces.map((ns) => ({
      namespace: ns,
      count: entries.filter((entry) => entry.namespace === ns).length,
    }));

    const timestamps = entries.map((entry) => entry.timestamp);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      total_entries: entries.length,
      namespaces: namespaceStats,
      oldest_entry: oldestEntry,
      newest_entry: newestEntry,
    };
  }
}

import chalk from 'chalk';
// Import Table for display
import Table from 'cli-table3';

// Memory list handler
const memoryListHandler: CommandHandler = async (options) => {
  const memory = new MemoryStorage();
  const entries = await memory.getAll();

  if (options.namespace) {
    const filtered = entries.filter((entry) => entry.namespace === options.namespace);
    console.log(`📋 Memory entries in namespace '${options.namespace}':`);
    console.log(`Total: ${filtered.length} entries\n`);

    const table = new Table({
      head: ['Key', 'Value', 'Updated'],
      colWidths: [20, 40, 20],
    });

    filtered.slice(0, options.limit || 50).forEach((entry) => {
      const value =
        typeof entry.value === 'string'
          ? entry.value.substring(0, 50) + (entry.value.length > 50 ? '...' : '')
          : JSON.stringify(entry.value).substring(0, 50) + '...';

      table.push([entry.key, value, new Date(entry.updated_at).toLocaleString()]);
    });

    console.log(table.toString());
  } else {
    console.log(`📋 All memory entries (showing first ${options.limit || 50}):`);
    console.log(`Total: ${entries.length} entries\n`);

    const table = new Table({
      head: ['Namespace', 'Key', 'Value', 'Updated'],
      colWidths: [15, 20, 35, 20],
    });

    entries.slice(0, options.limit || 50).forEach((entry) => {
      const value =
        typeof entry.value === 'string'
          ? entry.value.substring(0, 50) + (entry.value.length > 50 ? '...' : '')
          : JSON.stringify(entry.value).substring(0, 50) + '...';

      table.push([entry.namespace, entry.key, value, new Date(entry.updated_at).toLocaleString()]);
    });

    console.log(table.toString());
  }
};

// Memory search handler
const memorySearchHandler: CommandHandler = async (options) => {
  if (!options.pattern) {
    console.log('❌ Please provide a search pattern');
    console.log('   Usage: sylphx-flow memory search <pattern>');
    return;
  }

  const memory = new MemoryStorage();
  const entries = await memory.search(options.pattern, options.namespace);

  console.log(`🔍 Search results for pattern "${options.pattern}"`);
  if (options.namespace) {
    console.log(`Namespace: ${options.namespace}`);
  }
  console.log(`Found: ${entries.length} entries\n`);

  if (entries.length === 0) {
    console.log('No entries found.');
    return;
  }

  const table = new Table({
    head: ['Namespace', 'Key', 'Value', 'Updated'],
    colWidths: [15, 20, 35, 20],
  });

  entries.forEach((entry) => {
    const value =
      typeof entry.value === 'string'
        ? entry.value.substring(0, 50) + (entry.value.length > 50 ? '...' : '')
        : JSON.stringify(entry.value).substring(0, 50) + '...';

    table.push([entry.namespace, entry.key, value, new Date(entry.updated_at).toLocaleString()]);
  });

  console.log(table.toString());
};

// Memory delete handler
const memoryDeleteHandler: CommandHandler = async (options) => {
  const memory = new MemoryStorage();
  const deleted = await memory.delete(options.key, options.namespace || 'default');

  if (deleted) {
    console.log(`✅ Deleted memory entry: ${options.namespace || 'default'}:${options.key}`);
  } else {
    console.log(`❌ Memory entry not found: ${options.namespace || 'default'}:${options.key}`);
  }
};

// Memory clear handler
const memoryClearHandler: CommandHandler = async (options) => {
  if (!options.confirm) {
    console.log('❌ Please use --confirm to clear memory entries');
    console.log('   This action cannot be undone!');
    return;
  }

  const memory = new MemoryStorage();
  const count = await memory.clear(options.namespace);

  if (options.namespace) {
    console.log(`✅ Cleared ${count} entries from namespace: ${options.namespace}`);
  } else {
    console.log(`✅ Cleared all ${count} memory entries`);
  }
};

// Memory stats handler
const memoryStatsHandler: CommandHandler = async () => {
  const memory = new MemoryStorage();
  const stats = await memory.getStats();

  console.log('📊 Memory Statistics');
  console.log('==================');
  console.log(`Total Entries: ${stats.total_entries}`);
  console.log(`Namespaces: ${stats.namespaces.length}`);
  console.log('');

  if (stats.namespaces.length > 0) {
    console.log('Namespaces:');
    stats.namespaces.forEach((ns) => {
      console.log(`  • ${ns.namespace}: ${ns.count} entries`);
    });
  }

  if (stats.oldest_entry > 0) {
    const oldestDate = new Date(stats.oldest_entry).toLocaleString();
    const newestDate = new Date(stats.newest_entry).toLocaleString();
    console.log('');
    console.log(`Oldest Entry: ${oldestDate}`);
    console.log(`Newest Entry: ${newestDate}`);
  }

  console.log('');
  console.log(`📍 Database: .sylphx-flow/memory.db`);
};

// Interactive TUI handler
const memoryTUIHandler: CommandHandler = async () => {
  console.log('🚀 Starting Memory Manager TUI...');
  console.log('📍 Database: .sylphx-flow/memory.db');
  console.log('');
  console.log('📋 Available Commands:');
  console.log('  • npx github:sylphxltd/flow memory list');
  console.log('  • npx github:sylphxltd/flow memory search <pattern>');
  console.log('  • npx github:sylphxltd/flow memory delete <key>');
  console.log('  • npx github:sylphxltd/flow memory clear --confirm');
  console.log('  • npx github:sylphxltd/flow memory stats');
  console.log('');
  console.log('💡 Use the subcommands above for memory management.');
  console.log('   Full TUI interface coming soon!');
};

export const memoryCommand: CommandConfig = {
  name: 'memory',
  description: 'Manage Sylphx Flow memory database',
  options: [],
  subcommands: [
    {
      name: 'tui',
      description: 'Launch interactive Terminal User Interface (coming soon)',
      options: [],
      handler: memoryTUIHandler,
    },
    {
      name: 'list',
      description: 'List memory entries',
      options: [
        { flags: '--namespace <name>', description: 'Filter by namespace' },
        { flags: '--limit <number>', description: 'Limit number of entries (default: 50)' },
      ],
      handler: memoryListHandler,
    },
    {
      name: 'search',
      description: 'Search memory entries by pattern',
      options: [
        { flags: '--pattern <pattern>', description: 'Search pattern (supports * wildcards)' },
        { flags: '--namespace <name>', description: 'Filter by namespace' },
      ],
      handler: memorySearchHandler,
    },
    {
      name: 'delete',
      description: 'Delete a specific memory entry',
      options: [
        { flags: '--key <key>', description: 'Memory key to delete' },
        { flags: '--namespace <name>', description: 'Namespace (default: default)' },
      ],
      handler: memoryDeleteHandler,
    },
    {
      name: 'clear',
      description: 'Clear memory entries',
      options: [
        { flags: '--namespace <name>', description: 'Clear specific namespace (optional)' },
        { flags: '--confirm', description: 'Confirm the clear operation' },
      ],
      handler: memoryClearHandler,
    },
    {
      name: 'stats',
      description: 'Show memory statistics',
      options: [],
      handler: memoryStatsHandler,
    },
  ],
  handler: memoryTUIHandler, // Default to TUI
};
