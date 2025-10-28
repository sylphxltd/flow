#!/usr/bin/env node
import { Command } from 'commander';
import { targetManager } from '../core/target-manager.js';
import type { CommandOptions } from '../types.js';
import { cli } from '../utils/cli-output.js';
import { CLIError } from '../utils/error-handler.js';
import { SeparatedMemoryStorage } from '../utils/separated-storage.js';

// Create the main memory command
export const memoryCommand = new Command('memory')
  .description('Manage memory storage (set, get, search, list, delete, clear)')
  .option('--target <type>', 'Target platform (claude-code, opencode, default: auto-detect)');

// Memory list subcommand
memoryCommand
  .command('list')
  .description('List memory entries')
  .option('--namespace <name>', 'Filter by namespace', 'all')
  .option('--limit <number>', 'Limit number of entries', '50')
  .action(async (options) => {
    const memory = new SeparatedMemoryStorage();
    const entries = await memory.getAll();

    if (options.namespace && options.namespace !== 'all') {
      const filtered = entries.filter((entry) => entry.namespace === options.namespace);
      cli.listSummary(options.namespace, filtered.length);

      if (filtered.length === 0) {
        cli.emptyState('entries', `namespace ${options.namespace}`);
        return;
      }

      const limit = Number.parseInt(options.limit) || 50;
      const display = filtered.slice(0, limit);

      display.forEach((entry, index) => {
        cli.memoryEntry(entry, index);
      });
    } else {
      const limit = Number.parseInt(options.limit) || 50;
      cli.listSummary('all', Math.min(limit, entries.length), entries.length);

      if (entries.length === 0) {
        cli.emptyState('entries');
        return;
      }

      const display = entries.slice(0, limit);

      display.forEach((entry, index) => {
        cli.memoryEntry(entry, index);
      });
    }
  });

// Memory search subcommand
memoryCommand
  .command('search')
  .description('Search memory entries')
  .argument('<pattern>', 'Search pattern')
  .option('--namespace <name>', 'Filter by namespace', 'all')
  .action(async (pattern, options) => {
    const memory = new SeparatedMemoryStorage();
    const results = await memory.search(pattern, options.namespace);

    cli.searchSummary(
      pattern,
      results.length,
      options.namespace !== 'all' ? options.namespace : undefined
    );

    if (results.length === 0) {
      cli.emptyState('results');
      return;
    }

    results.forEach((entry, index) => {
      cli.memoryEntry(entry, index);
    });
  });

// Memory delete subcommand
memoryCommand
  .command('delete')
  .description('Delete memory entry')
  .argument('<key>', 'Memory key to delete')
  .option('--namespace <name>', 'Namespace', 'default')
  .action(async (key, options) => {
    const memory = new SeparatedMemoryStorage();
    const deleted = await memory.delete(key, options.namespace);

    if (deleted) {
      cli.success(`Deleted memory entry: ${options.namespace}:${key}`);
    } else {
      cli.error(`Memory entry not found: ${options.namespace}:${key}`);
    }
  });

// Memory clear subcommand
memoryCommand
  .command('clear')
  .description('Clear memory entries')
  .option('--namespace <name>', 'Clear specific namespace')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    if (!options.confirm) {
      throw new CLIError('Confirmation required. Use --confirm to clear memory entries');
    }

    const memory = new SeparatedMemoryStorage();

    if (options.namespace) {
      await memory.clear(options.namespace);
      cli.success(`Cleared all memory entries in namespace: ${options.namespace}`);
    } else {
      await memory.clear();
      cli.success('Cleared all memory entries');
    }
  });

// Memory stats subcommand
memoryCommand
  .command('stats')
  .description('Show memory statistics')
  .option('--namespace <name>', 'Filter by namespace')
  .action(async (options) => {
    const memory = new SeparatedMemoryStorage();
    const stats = await memory.getStats();

    cli.info('📊 Memory Statistics');
    console.log('==================');
    cli.info(`Total Entries: ${stats.totalEntries}`);
    cli.info(`Namespaces: ${stats.namespaces.length}`);
    console.log('');

    if (stats.namespaces.length > 0) {
      cli.info('Namespaces:');
      cli.list(stats.namespaces, { bullet: '  •' });
      console.log('');
    }

    cli.info('📍 Database: .sylphx-flow/memory.db');
  });

// Memory get subcommand
memoryCommand
  .command('get')
  .description('Get memory entry')
  .argument('<key>', 'Memory key to retrieve')
  .option('--namespace <name>', 'Namespace', 'default')
  .action(async (key, options) => {
    const memory = new SeparatedMemoryStorage();
    const entry = await memory.get(key, options.namespace);

    if (entry) {
      console.log(`📄 Memory entry: ${options.namespace}:${key}`);
      console.log(`Value: ${JSON.stringify(entry.value, null, 2)}`);
      console.log(`Created: ${entry.created_at}`);
      console.log(`Updated: ${entry.updated_at}`);
    } else {
      console.log(`✗ Memory entry not found: ${options.namespace}:${key}`);
    }
  });

// Memory set subcommand (for testing)
memoryCommand
  .command('set')
  .description('Set memory entry')
  .argument('<key>', 'Memory key')
  .argument('<value>', 'Memory value')
  .option('--namespace <name>', 'Namespace', 'default')
  .action(async (key, value, options) => {
    const memory = new SeparatedMemoryStorage();
    await memory.set(key, value, options.namespace);

    console.log(`✓ Set memory entry: ${options.namespace}:${key} = "${value}"`);
  });
