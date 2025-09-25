#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { execSync } from 'child_process';
import readline from 'readline';

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
let progressBar: InstanceType<typeof cliProgress.SingleBar>;
let results: Array<{file: string, status: string, action: string}> = [];

// Agent configurations - Add new agents here for easy extensibility
const AGENT_CONFIGS = {
  cursor: {
    name: 'Cursor',
    dir: '.cursor',
    extension: '.mdc',
    stripYaml: false,
    flatten: false,
    description: 'Cursor (.cursor/rules/*.mdc with YAML front matter)'
  },
  kilocode: {
    name: 'Kilocode',
    dir: '.kilocode',
    extension: '.md',
    stripYaml: true,
    flatten: true,
    description: 'Kilocode (.kilocode/rules/*.md without YAML front matter, flattened with category prefix)'
  },
  roocode: {
    name: 'RooCode',
    dir: '.roo',
    extension: '.md',
    stripYaml: true,
    flatten: true,
    description: 'RooCode (.roo/rules/*.md without YAML front matter, flattened with category prefix)'
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

// ============================================================================
// USER INTERACTION
// ============================================================================

async function promptForAgent(): Promise<AgentType> {
  const agents = getSupportedAgents();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n🚀 Rules Sync Tool');
    console.log('================');
    console.log('Please select your AI agent:');
    console.log('');

    agents.forEach((agent, index) => {
      const config = getAgentConfig(agent);
      console.log(`${index + 1}. ${config.name} - ${config.description}`);
    });

    console.log('');

    const askChoice = () => {
      rl.question('Enter your choice (1-' + agents.length + '): ', (answer) => {
        const choice = parseInt(answer.trim());
        if (choice >= 1 && choice <= agents.length) {
          rl.close();
          resolve(agents[choice - 1]);
        } else {
          console.log(`❌ Invalid choice. Please enter a number between 1 and ${agents.length}.`);
          askChoice();
        }
      });
    };

    askChoice();
  });
}

function detectAgentTool(): AgentType {
  const cwd = process.cwd();

  // Check for explicit --agent argument (highest priority)
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

// ============================================================================
// FILE OPERATIONS
// ============================================================================

async function downloadFile(url: string, destPath: string): Promise<void> {
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

function getLocalFileInfo(filePath: string): { content: string; exists: true } | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return { content, exists: true };
  } catch {
    return null;
  }
}

async function getRuleFiles(): Promise<string[]> {
  // In bundled CJS, __dirname is the directory of the executing script
  const scriptDir = __dirname;
  const docsRulesDir = path.join(scriptDir, '..', 'docs', 'rules');
  const files: string[] = [];

  console.log('Debug: process.cwd():', process.cwd());
  console.log('Debug: process.argv[1]:', process.argv[1]);
  console.log('Debug: __dirname:', __dirname);
  console.log('Debug: scriptDir:', scriptDir);
  console.log('Debug: docsRulesDir:', docsRulesDir);
  console.log('Debug: docsRulesDir exists:', fs.existsSync(docsRulesDir));

  try {
    const categories = fs.readdirSync(docsRulesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log('Debug: categories found:', categories);

    for (const category of categories) {
      const categoryDir = path.join(docsRulesDir, category);

      try {
        const categoryFiles = fs.readdirSync(categoryDir)
          .filter(file => file.endsWith('.mdc'))
          .map(file => `rules/${category}/${file}`);

        files.push(...categoryFiles);
      } catch {
        // Skip directories that can't be read
        continue;
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not read local rules directory, returning empty list');
    console.warn('Debug: error:', error);
    return [];
  }

  console.log('Debug: total files found:', files.length);
  return files;
}

function stripYamlFrontMatter(content: string): string {
  const lines = content.split('\n');
  if (lines.length > 0 && lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        return lines.slice(i + 1).join('\n').trim();
      }
    }
  }
  return content;
}

// ============================================================================
// FILE PROCESSING
// ============================================================================

async function processFile(
  filePath: string,
  rulesDir: string,
  fileExtension: string,
  processContent: (content: string) => string,
  baseUrl: string,
  flatten: boolean,
  results: Array<{file: string, status: string, action: string}>,
  progressBar: InstanceType<typeof cliProgress.SingleBar>
): Promise<boolean> {
  try {
    const pathParts = filePath.split('/');
    const category = pathParts[1];
    const baseFileName = path.basename(filePath, '.mdc');

    let relativePath: string;
    let destPath: string;

    if (flatten) {
      relativePath = `${category}-${baseFileName}${fileExtension}`;
      destPath = path.join(rulesDir, relativePath);
    } else {
      relativePath = path.join(category, `${baseFileName}${fileExtension}`);
      destPath = path.join(rulesDir, relativePath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
    }

    const localInfo = getLocalFileInfo(destPath);
    const isNew = !localInfo;

    await downloadFile(`${baseUrl}${filePath}`, destPath);

    let content = fs.readFileSync(destPath, 'utf8');
    content = processContent(content);

    const contentChanged = !localInfo || processContent(localInfo.content) !== content;

    fs.writeFileSync(destPath, content, 'utf8');

    results.push({
      file: relativePath,
      status: contentChanged ? (isNew ? 'added' : 'updated') : 'current',
      action: contentChanged ? (isNew ? 'Added' : 'Updated') : 'Already current'
    });

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

// ============================================================================
// OUTPUT DISPLAY
// ============================================================================

function createStatusTable(title: string, items: Array<{file: string, status: string, action: string}>): void {
  if (items.length === 0) return;

  console.log(`\n${title} (${items.length}):`);

  const table = new Table({
    head: ['File', 'Action'],
    colWidths: [50, 20],
    style: { head: ['cyan'], border: ['gray'] },
    chars: {
      'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
      'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
      'left': '║', 'left-mid': '', 'mid': '', 'mid-mid': '',
      'right': '║', 'right-mid': '', 'middle': '│'
    }
  });

  items.forEach(result => {
    table.push([
      result.file.length > 47 ? result.file.substring(0, 47) + '...' : result.file,
      { content: result.action, vAlign: 'center' }
    ]);
  });

  console.log(table.toString());
}

function displayResults(results: Array<{file: string, status: string, action: string}>, rulesDir: string, agentName: string): void {
  const added = results.filter(r => r.status === 'added');
  const updated = results.filter(r => r.status === 'updated');
  const current = results.filter(r => r.status === 'current');
  const errors = results.filter(r => r.status === 'error');

  console.log('\n📊 Sync Results:');

  createStatusTable('🆕 Added', added);
  createStatusTable('🔄 Updated', updated);
  createStatusTable('⏭️ Already Current', current);
  if (errors.length > 0) createStatusTable('❌ Errors', errors);

  console.log(`\n🎉 Sync completed!`);
  console.log(`📍 Location: ${rulesDir}`);

  const summary = [
    added.length && `${added.length} added`,
    updated.length && `${updated.length} updated`,
    current.length && `${current.length} current`,
    errors.length && `${errors.length} errors`
  ].filter(Boolean);

  console.log(`📈 Summary: ${summary.join(', ')}`);
  console.log(`💡 Rules will be automatically loaded by ${agentName}`);
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

export async function syncRules(options: { agent?: string; verbose?: boolean; dryRun?: boolean }): Promise<void> {
  const cwd = process.cwd();
  const baseUrl = 'https://raw.githubusercontent.com/sylphxltd/rules/main/docs/';

  // Determine agent
  let agent: AgentType;
  if (options.agent) {
    agent = options.agent.toLowerCase() as AgentType;
    if (!getSupportedAgents().includes(agent)) {
      log(`❌ Unknown agent: ${agent}`, 'red');
      log(`Supported agents: ${getSupportedAgents().join(', ')}`, 'yellow');
      throw new Error(`Unknown agent: ${agent}`);
    }
  } else {
    const detectedAgent = detectAgentTool();
    if (detectedAgent !== 'cursor') {
      agent = detectedAgent;
      console.log(`📝 Detected agent: ${getAgentConfig(agent).name}`);
    } else {
      console.log('📝 No agent detected or defaulting to Cursor.');
      agent = await promptForAgent();
    }
  }

  const config = getAgentConfig(agent);
  const rulesDir = path.join(cwd, config.dir, 'rules');
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
  const progressBar = new cliProgress.SingleBar({
    format: '📥 Downloading | {bar} | {percentage}% | {value}/{total} files | {file}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  progressBar.start(ruleFiles.length, 0, { file: 'Starting...' });
  const results: Array<{file: string, status: string, action: string}> = [];

  // Process files in batches
  const batchSize = 5;
  const batches: string[][] = [];
  for (let i = 0; i < ruleFiles.length; i += batchSize) {
    batches.push(ruleFiles.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const promises = batch.map(filePath =>
      processFile(filePath, rulesDir, config.extension, processContent, baseUrl, config.flatten, results, progressBar)
    );
    await Promise.all(promises);
  }

  progressBar.stop();
  displayResults(results, rulesDir, config.name);
}