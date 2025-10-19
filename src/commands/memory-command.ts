#!/usr/bin/env node
import { targetManager } from '../core/target-manager.js';
import type { CommandConfig, CommandHandler } from '../types.js';
import { LibSQLMemoryStorage } from '../utils/libsql-storage.js';

// Memory list handler
const memoryListHandler: CommandHandler = async (options) => {
  const memory = new LibSQLMemoryStorage();
  const entries = await memory.getAll();

  if (options.namespace && options.namespace !== 'all') {
    const filtered = entries.filter((entry) => entry.namespace === options.namespace);
    console.log(`📋 Memory entries in namespace: ${options.namespace}`);
    console.log(`Total: ${filtered.length} entries\n`);

    if (filtered.length === 0) {
      console.log('No entries found in this namespace.');
      return;
    }

    const limit = options.limit || 50;
    const display = filtered.slice(0, limit);

    display.forEach((entry, index) => {
      const safeValue = entry.value || '';
      const value =
        typeof safeValue === 'string'
          ? safeValue.substring(0, 50) + (safeValue.length > 50 ? '...' : '')
          : `${JSON.stringify(safeValue).substring(0, 50)}...`;

      console.log(`${index + 1}. ${entry.namespace}:${entry.key}`);
      console.log(`   Value: ${value}`);
      console.log(`   Updated: ${entry.updated_at}`);
      console.log('');
    });
  } else {
    console.log(`📋 All memory entries (showing first ${options.limit || 50}):`);
    console.log(`Total: ${entries.length} entries\n`);

    if (entries.length === 0) {
      console.log('No memory entries found.');
      return;
    }

    const limit = options.limit || 50;
    const display = entries.slice(0, limit);

    display.forEach((entry, index) => {
      const safeValue = entry.value || '';
      const value =
        typeof safeValue === 'string'
          ? safeValue.substring(0, 50) + (safeValue.length > 50 ? '...' : '')
          : `${JSON.stringify(safeValue).substring(0, 50)}...`;

      console.log(`${index + 1}. ${entry.namespace}:${entry.key}`);
      console.log(`   Value: ${value}`);
      console.log(`   Updated: ${entry.updated_at}`);
      console.log('');
    });
  }
};

// Memory search handler
const memorySearchHandler: CommandHandler = async (options) => {
  if (!options.pattern) {
    console.error('❌ Search pattern is required. Use --pattern <pattern>');
    process.exit(1);
  }

  const memory = new LibSQLMemoryStorage();
  const results = await memory.search(options.pattern, options.namespace);

  console.log(`🔍 Search results for pattern: ${options.pattern}`);
  if (options.namespace && options.namespace !== 'all') {
    console.log(`Namespace: ${options.namespace}`);
  }
  console.log(`Found: ${results.length} results\n`);

  if (results.length === 0) {
    console.log('No matching entries found.');
    return;
  }

  results.forEach((entry, index) => {
    const safeValue = entry.value || '';
    const value =
      typeof safeValue === 'string'
        ? safeValue.substring(0, 50) + (safeValue.length > 50 ? '...' : '')
        : `${JSON.stringify(safeValue).substring(0, 50)}...`;

    console.log(`${index + 1}. ${entry.namespace}:${entry.key}`);
    console.log(`   Value: ${value}`);
    console.log(`   Updated: ${entry.updated_at}`);
    console.log('');
  });
};

// Memory delete handler
const memoryDeleteHandler: CommandHandler = async (options) => {
  if (!options.key) {
    console.error('❌ Key is required. Use --key <key>');
    process.exit(1);
  }

  const memory = new LibSQLMemoryStorage();
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
    console.error('❌ Confirmation required. Use --confirm to clear memory entries');
    process.exit(1);
  }

  const memory = new LibSQLMemoryStorage();

  if (options.namespace) {
    await memory.clear(options.namespace);
    console.log(`✅ Cleared all memory entries in namespace: ${options.namespace}`);
  } else {
    await memory.clear();
    console.log('✅ Cleared all memory entries');
  }
};

// Memory stats handler
const memoryStatsHandler: CommandHandler = async () => {
  const memory = new LibSQLMemoryStorage();
  const stats = await memory.getStats();

  console.log('📊 Memory Statistics');
  console.log('==================');
  console.log(`Total Entries: ${stats.totalEntries}`);
  console.log(`Namespaces: ${stats.namespaces.length}`);
  console.log('');

  if (stats.namespaces.length > 0) {
    console.log('Namespaces:');
    stats.namespaces.forEach((ns) => {
      const count = stats.namespaceCounts[ns] || 0;
      console.log(`  • ${ns}: ${count} entries`);
    });
    console.log('');
  }

  console.log(`Oldest Entry: ${stats.oldestEntry || 'N/A'}`);
  console.log(`Newest Entry: ${stats.newestEntry || 'N/A'}`);
  console.log('');
  console.log('📍 Database: .sylphx-flow/memory.db');
};

// Memory set handler (for testing)
const memorySetHandler: CommandHandler = async (options) => {
  const args = process.argv.slice(2);
  const keyIndex = args.indexOf('set') + 1;
  const valueIndex = keyIndex + 1;

  if (keyIndex >= args.length || valueIndex >= args.length) {
    console.error('❌ Usage: flow memory set <key> <value> [--namespace <namespace>]');
    process.exit(1);
  }

  const key = args[keyIndex];
  const value = args[valueIndex];
  const namespace = options.namespace || 'default';

  const memory = new LibSQLMemoryStorage();
  await memory.set(key, value, namespace);

  console.log(`✅ Set memory entry: ${namespace}:${key} = "${value}"`);
};

// Export commands
export const memoryCommand: CommandConfig = {
  name: 'memory',
  description: 'Manage memory storage (set, get, search, list, delete, clear)',
  options: [
    {
      flags: '--target <type>',
      description: `Target platform (${targetManager.getImplementedTargets().join(', ')}, default: auto-detect)`,
    },
  ],
  subcommands: [
    {
      name: 'list',
      description: 'List memory entries',
      options: [
        { flags: '--namespace <name>', description: 'Filter by namespace (default: all)' },
        { flags: '--limit <number>', description: 'Limit number of entries (default: 50)' },
      ],
      handler: memoryListHandler,
    },
    {
      name: 'search',
      description: 'Search memory entries',
      options: [
        { flags: '<pattern>', description: 'Search pattern' },
        { flags: '--namespace <name>', description: 'Filter by namespace (default: all)' },
      ],
      handler: memorySearchHandler,
    },
    {
      name: 'delete',
      description: 'Delete memory entry',
      options: [
        { flags: '<key>', description: 'Memory key to delete' },
        { flags: '--namespace <name>', description: 'Namespace (default: default)' },
        { flags: '--confirm', description: 'Skip confirmation prompt' },
      ],
      handler: memoryDeleteHandler,
    },
    {
      name: 'clear',
      description: 'Clear memory entries',
      options: [
        { flags: '--namespace <name>', description: 'Clear specific namespace (default: all)' },
        { flags: '--confirm', description: 'Skip confirmation prompt' },
      ],
      handler: memoryClearHandler,
    },
    {
      name: 'stats',
      description: 'Show memory statistics',
      options: [{ flags: '--namespace <name>', description: 'Filter by namespace (default: all)' }],
      handler: memoryStatsHandler,
    },
    {
      name: 'set',
      description: 'Set memory entry',
      arguments: [
        { name: 'key', description: 'Memory key', required: true },
        { name: 'value', description: 'Memory value', required: true },
      ],
      options: [{ flags: '--namespace <name>', description: 'Namespace (default: default)' }],
      handler: memorySetHandler,
    },
  ],
};
