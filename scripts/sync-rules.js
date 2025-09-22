#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');

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
    log(`📝 Detected Cursor - syncing rules to .cursor/rules/`, 'blue');
  } else if (agent === 'kilocode') {
    rulesDir = path.join(cwd, '.kilocode', 'rules');
    fileExtension = '.md';
    processContent = stripYamlFrontMatter; // Strip YAML front matter
    log(`🤖 Detected Kilocode - syncing rules to .kilocode/rules/`, 'blue');
  } else {
    log(`❌ Unknown agent: ${agent}`, 'red');
    process.exit(1);
  }

  // Create rules directory
  fs.mkdirSync(rulesDir, { recursive: true });
  log(`📁 Created rules directory: ${rulesDir}`, 'green');

  // Get rule files
  const ruleFiles = await getRuleFiles();
  log(`📋 Found ${ruleFiles.length} rule files to sync`, 'yellow');

  // Check and download each rule file
  let updatedCount = 0;
  let skippedCount = 0;

  for (const filePath of ruleFiles) {
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

      // Check file status and decide whether to update
      const localInfo = getLocalFileInfo(destPath);

      // Download and process the file
      const url = `${baseUrl}${filePath}`;

      if (!localInfo) {
        log(`🆕 ${relativePath} (downloading new file)`, 'yellow');
      } else {
        log(`🔄 ${relativePath} (checking for updates)`, 'yellow');
      }

      await downloadFile(url, destPath);

      let content = fs.readFileSync(destPath, 'utf8');
      content = processContent(content);

      // Check if content actually changed
      const contentChanged = !localInfo || processContent(localInfo.content) !== content;

      if (contentChanged) {
        fs.writeFileSync(destPath, content, 'utf8');
        if (!localInfo) {
          log(`   ✅ Added ${relativePath}`, 'green');
        } else {
          log(`   ✅ Updated ${relativePath}`, 'green');
        }
        updatedCount++;
      } else {
        // Content didn't change, but we still write it to ensure format consistency
        fs.writeFileSync(destPath, content, 'utf8');
        log(`   ⏭️  ${relativePath} already up to date`, 'blue');
        skippedCount++;
      }
    } catch (error) {
      log(`❌ Failed to process ${filePath}: ${error.message}`, 'red');
    }
  }

  log(`\n🎉 Rules sync completed!`, 'green');
  log(`📍 Rules location: ${rulesDir}`, 'blue');
  log(`📊 Summary: ${updatedCount} updated, ${skippedCount} already current`, 'blue');

  if (agent === 'cursor') {
    log(`💡 Tip: Rules will be automatically loaded by Cursor`, 'yellow');
  } else if (agent === 'kilocode') {
    log(`💡 Tip: Rules will be automatically loaded by Kilocode`, 'yellow');
  }
}

// Main function
async function main() {
  log('🚀 Rules Sync Tool', 'blue');
  log('================', 'blue');
  log('');

  try {
    const agent = detectAgentTool();
    await syncRules(agent);
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('Rules Sync Tool - Sync development rules to your project', 'blue');
  log('');
  log('Usage:');
  log('  npx github:sylphxltd/rules [options]');
  log('');
  log('Options:');
  log('  --agent=cursor     Force sync for Cursor (.cursor/rules/)');
  log('  --agent=kilocode   Force sync for Kilocode (.kilocode/rules/)');
  log('  --help, -h         Show this help message');
  log('');
  log('Auto-detection:');
  log('  - Detects Cursor if .cursor directory exists');
  log('  - Detects Kilocode if .kilocode directory exists');
  log('  - Defaults to Cursor if cannot detect');
  log('');
  process.exit(0);
}

main();
