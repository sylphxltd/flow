#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { execSync } from 'child_process';

// CLI and UI libraries
import { Command } from 'commander';
import cliProgress from 'cli-progress';
import Table from 'cli-table3';

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Global state
let progressBar: cliProgress.SingleBar<any, any>;
let results: Array<{file: string, status: string, action: string}> = [];

// Agent configurations - Add new agents here for easy extensibility
const AGENT_CONFIGS = {
  cursor: {
    name: 'Cursor',
    dir: '.cursor',
    extension: '.mdc',
    stripYaml: false,
    description: 'Cursor (.cursor/rules/*.mdc with YAML front matter)'
  },
  kilocode: {
    name: 'Kilocode',
    dir: '.kilocode',
    extension: '.md',
    stripYaml: true,
    description: 'Kilocode (.kilocode/rules/*.md without YAML front matter)'
  },
  roocode: {
    name: 'RooCode',
    dir: '.roo',
    extension: '.md',
    stripYaml: true,
    description: 'RooCode (.roo/rules/*.md without YAML front matter)'
  }

  // Example: To add a new agent called "MyAgent":
  // myagent: {
  //   name: 'MyAgent',
  //   dir: '.myagent',
  //   extension: '.rules',
  //   stripYaml: true,
  //   description: 'MyAgent (.myagent/rules/*.rules without YAML front matter)'
  // }
};

type AgentType = keyof typeof AGENT_CONFIGS;

// Get list of supported agents
function getSupportedAgents(): AgentType[] {
  return Object.keys(AGENT_CONFIGS) as AgentType[];
}

// Get agent config
function getAgentConfig(agent: AgentType) {
  return AGENT_CONFIGS[agent];
}

// Detect which agent tool is being used
function detectAgentTool(): AgentType {
  const cwd = process.cwd();

  // First, check for explicit --agent argument (highest priority)
  const agentArg = process.argv.find(arg => arg.startsWith('--agent='));
  if (agentArg) {
    const agent = agentArg.split('=')[1].toLowerCase() as AgentType;
    if (getSupportedAgents().includes(agent)) {
      return agent;
    }
  }

  // Check for existing directories (in order of preference)
  for (const agent of getSupportedAgents()) {
    const config = getAgentConfig(agent);
    if (fs.existsSync(path.join(cwd, config.dir))) {
      return agent;
    }
  }

  // Check for existing rules directories
  for (const agent of getSupportedAgents()) {
    const config = getAgentConfig(agent);
    if (fs.existsSync(path.join(cwd, config.dir, 'rules'))) {
      return agent;
    }
  }

  // Default to Cursor if can't detect
  return 'cursor';
}

// Download file from GitHub
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

// Check if local file exists and get its info
function getLocalFileInfo(filePath: string) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return {
      content: content,
      exists: true
    };
  } catch (error) {
    return null;
  }
}

// Get list of rule files from local docs directory
async function getRuleFiles(): Promise<string[]> {
  const docsRulesDir = path.join(process.cwd(), 'docs', 'rules');
  const files: string[] = [];

  try {
    // Read all category directories
    const categories = fs.readdirSync(docsRulesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // Read all .mdc files from each category
    for (const category of categories) {
      const categoryDir = path.join(docsRulesDir, category);

      try {
        const categoryFiles = fs.readdirSync(categoryDir)
          .filter(file => file.endsWith('.mdc'))
          .map(file => `rules/${category}/${file}`);

        files.push(...categoryFiles);
      } catch (error) {
        // Skip directories that can't be read
        continue;
      }
    }
  } catch (error) {
    // If local directory reading fails, fall back to hardcoded list
    console.warn('⚠️  Could not read local rules directory, using fallback list');
    return getFallbackRuleFiles();
  }

  return files;
}

// Fallback hardcoded list (in case local directory reading fails)
function getFallbackRuleFiles(): string[] {
  const ruleCategories = [
    'ai', 'backend', 'core', 'data', 'devops', 'framework', 'misc', 'security', 'ui'
  ];

  const files: string[] = [];

  // Add README
  files.push('README.md');

  // Add known files from each category
  const knownFiles: Record<string, string[]> = {
    ai: ['ai-sdk-integration.mdc'],
    backend: ['serverless.mdc', 'trpc.mdc'],
    core: ['functional.mdc', 'general.mdc', 'perfect-execution.mdc', 'planning-first.mdc', 'serena-integration.mdc', 'testing.mdc', 'typescript.mdc'],
    data: ['drizzle.mdc', 'id-generation.mdc', 'redis.mdc'],
    devops: ['biome.mdc', 'observability.mdc'],
    framework: ['flutter.mdc', 'nextjs.mdc', 'react.mdc', 'sveltekit.mdc', 'zustand.mdc'],
    misc: ['response-language.mdc', 'tool-usage.mdc'],
    security: ['security-auth.mdc'],
    ui: ['pandacss.mdc']
  };

  for (const category of ruleCategories) {
    if (knownFiles[category]) {
      for (const file of knownFiles[category]) {
        files.push(`rules/${category}/${file}`);
      }
    }
  }

  return files;
}

// Strip YAML front matter from content
function stripYamlFrontMatter(content: string): string {
  const lines = content.split('\n');
  if (lines.length > 0 && lines[0].trim() === '---') {
    // Find the closing ---
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        // Return content after the front matter
        return lines.slice(i + 1).join('\n').trim();
      }
    }
  }
  return content;
}

// Process a single file
async function processFile(
  filePath: string,
  rulesDir: string,
  fileExtension: string,
  processContent: (content: string) => string,
  baseUrl: string
): Promise<boolean> {
  try {
    // rules/category/file.mdc -> category/file.mdc or category/file.md
    const pathParts = filePath.split('/');
    const category = pathParts[1]; // e.g., 'ai', 'backend', etc.
    const baseFileName = path.basename(filePath, '.mdc');
    const relativePath = path.join(category, baseFileName + fileExtension);
    const destPath = path.join(rulesDir, relativePath);

    // Ensure the directory exists
    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });

    // Check file status
    const localInfo = getLocalFileInfo(destPath);
    const isNew = !localInfo;

    // Download and process the file
    const url = `${baseUrl}${filePath}`;
    await downloadFile(url, destPath);

    let content = fs.readFileSync(destPath, 'utf8');
    content = processContent(content);

    // Check if content actually changed
    const contentChanged = !localInfo || processContent(localInfo.content) !== content;

    if (contentChanged) {
      fs.writeFileSync(destPath, content, 'utf8');
      results.push({
        file: relativePath,
        status: isNew ? 'added' : 'updated',
        action: isNew ? 'Added' : 'Updated'
      });
    } else {
      // Content didn't change, but we still write it to ensure format consistency
      fs.writeFileSync(destPath, content, 'utf8');
      results.push({
        file: relativePath,
        status: 'current',
        action: 'Already current'
      });
    }

    progressBar.increment();
    return contentChanged;
  } catch (error: any) {
    results.push({
      file: filePath,
      status: 'error',
      action: `Error: ${error.message}`
    });
    progressBar.increment();
    return false;
  }
}

// Sync rules for the detected agent
export async function syncRules(options: { agent?: string, verbose?: boolean, dryRun?: boolean }) {
  const cwd = process.cwd();
  const baseUrl = 'https://raw.githubusercontent.com/sylphxltd/rules/main/docs/';

  // Get agent configuration
  let agent: AgentType;
  if (options.agent) {
    agent = options.agent.toLowerCase() as AgentType;
    if (!getSupportedAgents().includes(agent)) {
      log(`❌ Unknown agent: ${agent}`, 'red');
      log(`Supported agents: ${getSupportedAgents().join(', ')}`, 'yellow');
      throw new Error(`Unknown agent: ${agent}`);
    }
  } else {
    agent = detectAgentTool();
  }

  const config = getAgentConfig(agent);
  if (!config) {
    log(`❌ Unknown agent: ${agent}`, 'red');
    log(`Supported agents: ${getSupportedAgents().join(', ')}`, 'yellow');
    throw new Error(`Unknown agent: ${agent}`);
  }

  const rulesDir = path.join(cwd, config.dir, 'rules');
  const fileExtension = config.extension;
  const processContent = config.stripYaml ? stripYamlFrontMatter : (content: string) => content;

  // Create rules directory
  fs.mkdirSync(rulesDir, { recursive: true });

  // Get rule files
  const ruleFiles = await getRuleFiles();

  // Show initial info
  console.log(`🚀 Rules Sync Tool`);
  console.log(`================`);
  console.log(`📝 Agent: ${config.name}`);
  console.log(`📁 Target: ${rulesDir}`);
  console.log(`📋 Files: ${ruleFiles.length}`);
  console.log('');

  if (options.dryRun) {
    console.log('✅ Dry run completed - no files were modified');
    return;
  }

  // Setup progress bar
  progressBar = new cliProgress.SingleBar({
    format: '📥 Downloading | {bar} | {percentage}% | {value}/{total} files | {file}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  progressBar.start(ruleFiles.length, 0, { file: 'Starting...' });
  results = [];

  // Process files asynchronously in batches
  const batchSize = 5; // Process 5 files at a time
  const batches: string[][] = [];
  for (let i = 0; i < ruleFiles.length; i += batchSize) {
    batches.push(ruleFiles.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const promises = batch.map(filePath =>
      processFile(filePath, rulesDir, fileExtension, processContent, baseUrl)
    );
    await Promise.all(promises);
  }

  progressBar.stop();

  // Group results by status
  const added = results.filter(r => r.status === 'added');
  const updated = results.filter(r => r.status === 'updated');
  const current = results.filter(r => r.status === 'current');
  const errors = results.filter(r => r.status === 'error');

  console.log('\n📊 Sync Results:');

  // Function to create and display a table for a specific status
  const showStatusTable = (title: string, items: typeof results, status: string) => {
    if (items.length === 0) return;

    console.log(`\n${title} (${items.length}):`);

    const statusTable = new Table({
      head: ['File', 'Action'],
      colWidths: [50, 20],
      style: {
        head: ['cyan'],
        border: ['gray']
      },
      chars: {
        'top': '═',
        'top-mid': '╤',
        'top-left': '╔',
        'top-right': '╗',
        'bottom': '═',
        'bottom-mid': '╧',
        'bottom-left': '╚',
        'bottom-right': '╝',
        'left': '║',
        'left-mid': '',  // Remove row separators
        'mid': '',       // Remove row separators
        'mid-mid': '',
        'right': '║',
        'right-mid': '',
        'middle': '│'   // Keep column separator
      }
    });

    items.forEach(result => {
      statusTable.push([
        result.file.length > 47 ? result.file.substring(0, 47) + '...' : result.file,
        { content: result.action, vAlign: 'center' }
      ]);
    });

    console.log(statusTable.toString());
  };

  // Show tables for each status type
  showStatusTable('🆕 Added', added, 'added');
  showStatusTable('🔄 Updated', updated, 'updated');
  showStatusTable('⏭️ Already Current', current, 'current');

  if (errors.length > 0) {
    showStatusTable('❌ Errors', errors, 'error');
  }

  // Summary
  console.log(`\n🎉 Sync completed!`);
  console.log(`📍 Location: ${rulesDir}`);

  const summary: string[] = [];
  if (added.length > 0) summary.push(`${added.length} added`);
  if (updated.length > 0) summary.push(`${updated.length} updated`);
  if (current.length > 0) summary.push(`${current.length} current`);
  if (errors.length > 0) summary.push(`${errors.length} errors`);

  console.log(`📈 Summary: ${summary.join(', ')}`);

  console.log(`💡 Rules will be automatically loaded by ${config.name}`);
}