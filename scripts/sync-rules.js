#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');

// CLI and UI libraries
const { Command } = require('commander');
const cliProgress = require('cli-progress');
const Table = require('cli-table3');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Global state
let progressBar;
let results = [];

// Detect which agent tool is being used
function detectAgentTool() {
  const cwd = process.cwd();

  // First, check for explicit --agent argument (highest priority)
  const agentArg = process.argv.find(arg => arg.startsWith('--agent='));
  if (agentArg) {
    const agent = agentArg.split('=')[1].toLowerCase();
    if (['cursor', 'kilocode'].includes(agent)) {
      return agent;
    }
  }

  // Check for existing directories
  if (fs.existsSync(path.join(cwd, '.cursor'))) {
    return 'cursor';
  }

  if (fs.existsSync(path.join(cwd, '.kilocode'))) {
    return 'kilocode';
  }

  // Check for existing rules directories
  if (fs.existsSync(path.join(cwd, '.cursor', 'rules'))) {
    return 'cursor';
  }

  if (fs.existsSync(path.join(cwd, '.kilocode', 'rules'))) {
    return 'kilocode';
  }

  // Default to Cursor if can't detect
  return 'cursor';
}

// Download file from GitHub
function downloadFile(url, destPath) {
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
function getLocalFileInfo(filePath) {
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

// Get list of rule files from GitHub
async function getRuleFiles() {
  // For simplicity, we'll hardcode the known rule files
  // In a real implementation, you might want to fetch the directory listing
  const ruleCategories = [
    'ai',
    'backend',
    'core',
    'data',
    'devops',
    'framework',
    'misc',
    'security',
    'ui'
  ];

  const files = [];

  // Add README
  files.push('README.md');

  // Add all .mdc files from subdirectories
  for (const category of ruleCategories) {
    const categoryFiles = [
      `${category}/ai-sdk-integration.mdc`,
      `${category}/serverless.mdc`,
      `${category}/trpc.mdc`,
      `${category}/functional.mdc`,
      `${category}/general.mdc`,
      `${category}/perfect-execution.mdc`,
      `${category}/planning-first.mdc`,
      `${category}/serena-integration.mdc`,
      `${category}/testing.mdc`,
      `${category}/typescript.mdc`,
      `${category}/drizzle.mdc`,
      `${category}/id-generation.mdc`,
      `${category}/redis.mdc`,
      `${category}/biome.mdc`,
      `${category}/observability.mdc`,
      `${category}/flutter.mdc`,
      `${category}/nextjs.mdc`,
      `${category}/react.mdc`,
      `${category}/sveltekit.mdc`,
      `${category}/zustand.mdc`,
      `${category}/response-language.mdc`,
      `${category}/tool-usage.mdc`,
      `${category}/security-auth.mdc`,
      `${category}/pandacss.mdc`
    ];

    for (const file of categoryFiles) {
      files.push(`rules/${file}`);
    }
  }

  return files.filter(file => {
    // Filter out files that don't exist (this is a simplified approach)
    // In production, you'd want to check against the actual GitHub API
    const knownFiles = [
      'README.md',
      'rules/ai/ai-sdk-integration.mdc',
      'rules/backend/serverless.mdc',
      'rules/backend/trpc.mdc',
      'rules/core/functional.mdc',
      'rules/core/general.mdc',
      'rules/core/perfect-execution.mdc',
      'rules/core/planning-first.mdc',
      'rules/core/serena-integration.mdc',
      'rules/core/testing.mdc',
      'rules/core/typescript.mdc',
      'rules/data/drizzle.mdc',
      'rules/data/id-generation.mdc',
      'rules/data/redis.mdc',
      'rules/devops/biome.mdc',
      'rules/devops/observability.mdc',
      'rules/framework/flutter.mdc',
      'rules/framework/nextjs.mdc',
      'rules/framework/react.mdc',
      'rules/framework/sveltekit.mdc',
      'rules/framework/zustand.mdc',
      'rules/misc/response-language.mdc',
      'rules/misc/tool-usage.mdc',
      'rules/security/security-auth.mdc',
      'rules/ui/pandacss.mdc'
    ];
    return knownFiles.includes(file);
  });
}

// Strip YAML front matter from content
function stripYamlFrontMatter(content) {
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
async function processFile(filePath, rulesDir, fileExtension, processContent, baseUrl) {
  try {
    let relativePath;
    if (filePath === 'README.md') {
      // README.md -> README.mdc or README.md (in root)
      relativePath = 'README' + fileExtension;
    } else {
      // rules/category/file.mdc -> category/file.mdc or category/file.md
      const pathParts = filePath.split('/');
      const category = pathParts[1]; // e.g., 'ai', 'backend', etc.
      const baseFileName = path.basename(filePath, '.mdc');
      relativePath = path.join(category, baseFileName + fileExtension);
    }
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
  } catch (error) {
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
async function syncRules(agent) {
  const cwd = process.cwd();
  const baseUrl = 'https://raw.githubusercontent.com/sylphxltd/rules/main/docs/';

  let rulesDir;
  let fileExtension;
  let processContent;

  if (agent === 'cursor') {
    rulesDir = path.join(cwd, '.cursor', 'rules');
    fileExtension = '.mdc';
    processContent = (content) => content; // Keep YAML front matter
  } else if (agent === 'kilocode') {
    rulesDir = path.join(cwd, '.kilocode', 'rules');
    fileExtension = '.md';
    processContent = stripYamlFrontMatter; // Strip YAML front matter
  } else {
    log(`❌ Unknown agent: ${agent}`, 'red');
    process.exit(1);
  }

  // Create rules directory
  fs.mkdirSync(rulesDir, { recursive: true });

  // Get rule files
  const ruleFiles = await getRuleFiles();

  // Show initial info
  console.log(`🚀 Rules Sync Tool`);
  console.log(`================`);
  console.log(`📝 Agent: ${agent === 'cursor' ? 'Cursor' : 'Kilocode'}`);
  console.log(`📁 Target: ${rulesDir}`);
  console.log(`📋 Files: ${ruleFiles.length}`);
  console.log('');

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
  const batches = [];
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
  const showStatusTable = (title, items, status) => {
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
        'middle': ' '    // Use space instead of │ for cleaner look
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

  const summary = [];
  if (added.length > 0) summary.push(`${added.length} added`);
  if (updated.length > 0) summary.push(`${updated.length} updated`);
  if (current.length > 0) summary.push(`${current.length} current`);
  if (errors.length > 0) summary.push(`${errors.length} errors`);

  console.log(`📈 Summary: ${summary.join(', ')}`);

  if (agent === 'cursor') {
    console.log(`💡 Rules will be automatically loaded by Cursor`);
  } else if (agent === 'kilocode') {
    console.log(`💡 Rules will be automatically loaded by Kilocode`);
  }
}

// Main function
async function main() {
  const program = new Command();

  program
    .name('rules')
    .description('Sync development rules to your project')
    .version('1.0.0')
    .option('--agent <type>', 'Force specific agent (cursor or kilocode)')
    .option('--verbose', 'Show detailed output')
    .option('--dry-run', 'Show what would be done without making changes')
    .action(async (options) => {
      try {
        let agent = options.agent;

        if (!agent) {
          agent = detectAgentTool();
        } else {
          // Validate agent option
          if (!['cursor', 'kilocode'].includes(agent.toLowerCase())) {
            console.error('❌ Invalid agent. Must be "cursor" or "kilocode"');
            process.exit(1);
          }
          agent = agent.toLowerCase();
        }

        if (options.dryRun) {
          console.log('🚀 Rules Sync Tool (Dry Run)');
          console.log('===========================');
          console.log(`📝 Agent: ${agent === 'cursor' ? 'Cursor' : 'Kilocode'}`);
          console.log(`📁 Target: ${agent === 'cursor' ? '.cursor/rules' : '.kilocode/rules'}`);
          console.log('✅ Dry run completed - no files were modified');
          return;
        }

        await syncRules(agent);
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
      }
    });

  // Custom help text
  program.on('--help', () => {
    console.log('\nAuto-detection:');
    console.log('  - Detects Cursor if .cursor directory exists');
    console.log('  - Detects Kilocode if .kilocode directory exists');
    console.log('  - Defaults to Cursor if cannot detect');
    console.log('\nExamples:');
    console.log('  $ npx github:sylphxltd/rules');
    console.log('  $ npx github:sylphxltd/rules --agent kilocode');
    console.log('  $ npx github:sylphxltd/rules --dry-run');
  });

  program.parse();
}

// Run the program
main();
