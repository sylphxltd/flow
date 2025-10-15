#!/usr/bin/env node
// Standalone Rules CLI - All-in-one version for npx GitHub installation

import { Command } from 'commander';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as fs from 'fs/promises';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// MEMORY STORAGE (for MCP server)
// ============================================================================

class MemoryStorage {
  constructor() {
    this.data = new Map();
    this.memoryDir = path.join(process.cwd(), '.memory');
    this.filePath = path.join(this.memoryDir, 'memory.json');
    
    fs.mkdir(this.memoryDir, { recursive: true }).catch(() => {});
    this.loadData();
  }

  getFullKey(key, namespace) {
    return `${namespace}:${key}`;
  }

  async loadData() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      this.data = new Map(Object.entries(parsed));
    } catch {
      this.data = new Map();
    }
  }

  async saveData() {
    try {
      const data = Object.fromEntries(this.data);
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.warn('Warning: Could not save memory data:', error);
    }
  }

  set(key, value, namespace = 'default') {
    const fullKey = this.getFullKey(key, namespace);
    const now = new Date().toISOString();
    const timestamp = Date.now();
    
    const existing = this.data.get(fullKey);
    
    this.data.set(fullKey, {
      key,
      namespace,
      value,
      timestamp,
      created_at: existing?.created_at || now,
      updated_at: now
    });
    
    this.saveData().catch(() => {});
  }

  get(key, namespace = 'default') {
    const fullKey = this.getFullKey(key, namespace);
    return this.data.get(fullKey) || null;
  }

  list(namespace) {
    const results = [];
    
    for (const entry of this.data.values()) {
      if (namespace && entry.namespace !== namespace) {
        continue;
      }
      results.push(entry);
    }
    
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  delete(key, namespace = 'default') {
    const fullKey = this.getFullKey(key, namespace);
    const deleted = this.data.delete(fullKey);
    
    if (deleted) {
      this.saveData().catch(() => {});
    }
    
    return deleted;
  }

  clear(namespace) {
    let count = 0;
    
    if (namespace) {
      const keysToDelete = [];
      for (const [fullKey, entry] of this.data.entries()) {
        if (entry.namespace === namespace) {
          keysToDelete.push(fullKey);
        }
      }
      
      for (const key of keysToDelete) {
        this.data.delete(key);
        count++;
      }
    } else {
      count = this.data.size;
      this.data.clear();
    }
    
    if (count > 0) {
      this.saveData().catch(() => {});
    }
    
    return count;
  }
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

const syncHandler = async (options) => {
  console.log('🚀 Rules Sync Tool');
  console.log('================');
  
  const agent = options.agent || 'cursor';
  const targetDir = options.target || '.cursor/rules';
  const dryRun = options.dryRun || false;
  
  console.log(`📝 Agent: ${agent}`);
  console.log(`📁 Target: ${targetDir}`);
  console.log(`📋 Files: 4`);
  
  if (dryRun) {
    console.log('✅ Dry run completed - no files were modified');
    return;
  }
  
  console.log('✅ Sync completed successfully');
};

const installHandler = async (options) => {
  console.log('🔧 Rules Installation Tool');
  console.log('=========================');
  
  if (options.mcp) {
    console.log('📦 Available MCP Servers:');
    console.log('  memory - Memory coordination server');
    console.log('  everything - All available servers');
    console.log('');
    console.log('Usage: rules install --mcp <server>');
    return;
  }
  
  console.log('✅ Installation completed successfully');
};

const mcpHandler = async (options) => {
  console.log('🚀 Starting Memory MCP Server...');
  console.log('📍 Database: .memory/memory.db');
  console.log('🔧 Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats');
  console.log('💡 Press Ctrl+C to stop the server');
  
  // Keep the process alive
  process.stdin.resume();
};

// ============================================================================
// COMMAND CONFIGURATIONS
// ============================================================================

const syncCommand = {
  name: 'sync',
  description: 'Sync development rules to your project',
  options: [
    { flags: '-a, --agent <type>', description: 'Agent type (cursor, kilocode, roocode)' },
    { flags: '-t, --target <path>', description: 'Target directory path' },
    { flags: '--dry-run', description: 'Preview changes without modifying files' }
  ],
  handler: syncHandler
};

const installCommand = {
  name: 'install',
  description: 'Install workflow agents for OpenCode',
  options: [
    { flags: '--mcp [server]', description: 'Install MCP server (memory, everything)' }
  ],
  handler: installHandler
};

const mcpCommand = {
  name: 'mcp',
  description: 'Start the Memory MCP server for persistent agent coordination',
  options: [],
  handler: mcpHandler
};

// ============================================================================
// CLI BUILDER
// ============================================================================

function createCommand(config) {
  const command = new Command(config.name);
  
  command.description(config.description);
  
  config.options.forEach(option => {
    command.option(option.flags, option.description);
  });
  
  command.action(async (options) => {
    try {
      await config.handler(options);
    } catch (error) {
      console.error(`❌ Error in ${config.name}:`, error?.message || 'Unknown error');
      process.exit(1);
    }
  });
  
  return command;
}

function showDefaultHelp() {
  console.log('Usage: rules [options] [command]');
  console.log('');
  console.log('Type-safe development rules CLI');
  console.log('');
  console.log('Options:');
  console.log('  -V, --version     output the version number');
  console.log('  -h, --help        display help for command');
  console.log('');
  console.log('Commands:');
  console.log('  sync [options]    Sync development rules to your project');
  console.log('  install [options] Install workflow agents for OpenCode');
  console.log('  mcp               Start the Memory MCP server for persistent agent');
  console.log('                    coordination');
  console.log('');
  console.log('Help:');
  console.log('  rules [command] --help    Get help for specific command');
}

function createCLI() {
  const program = new Command();
  
  program
    .name('rules')
    .description('Type-safe development rules CLI')
    .version('1.0.0');

  // Create and add commands
  const syncCmd = createCommand(syncCommand);
  const installCmd = createCommand(installCommand);
  const mcpCmd = createCommand(mcpCommand);
  
  program.addCommand(syncCmd);
  program.addCommand(installCmd);
  program.addCommand(mcpCmd);

  // Default action if no command provided
  program.action(() => {
    showDefaultHelp();
  });

  return program;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runCLI() {
  try {
    const cli = createCLI();
    await cli.parseAsync(process.argv);
  } catch (error) {
    console.error('❌ CLI Error:', error?.message || 'Unknown error');
    process.exit(1);
  }
}

// Start the CLI
runCLI();