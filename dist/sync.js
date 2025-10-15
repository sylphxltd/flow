#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as cliProgress from 'cli-progress';
import Table from 'cli-table3';
// Constants
const COLORS = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};
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
};
const BATCH_SIZE = 5;
const RULES_DIR_NAME = 'rules';
// Global state
let results = [];
// Utility functions
const log = (message, color = 'reset') => {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
};
const getSupportedAgents = () => Object.keys(AGENT_CONFIGS);
const getAgentConfig = (agent) => AGENT_CONFIGS[agent];
// ============================================================================
// USER INTERACTION
// ============================================================================
async function promptForAgent() {
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
                }
                else {
                    console.log(`❌ Invalid choice. Please enter a number between 1 and ${agents.length}.`);
                    askChoice();
                }
            });
        };
        askChoice();
    });
}
function detectAgentTool() {
    const cwd = process.cwd();
    // Check for explicit --agent argument (highest priority)
    const agentArg = process.argv.find(arg => arg.startsWith('--agent='));
    if (agentArg) {
        const agent = agentArg.split('=')[1].toLowerCase();
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
        if (fs.existsSync(path.join(cwd, config.dir, RULES_DIR_NAME))) {
            return agent;
        }
    }
    // Default to Cursor if can't detect
    return 'cursor';
}
// ============================================================================
// FILE OPERATIONS
// ============================================================================
function getLocalFileInfo(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return { content, exists: true };
    }
    catch {
        return null;
    }
}
async function getRuleFiles() {
    const scriptDir = __dirname;
    const projectRoot = path.resolve(scriptDir, '..');
    const docsRulesDir = path.join(projectRoot, 'docs', RULES_DIR_NAME);
    const files = [];
    const collectFiles = (dir, relativePath) => {
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const itemPath = path.join(dir, item.name);
                const itemRelative = path.join(relativePath, item.name);
                if (item.isDirectory()) {
                    collectFiles(itemPath, itemRelative);
                }
                else if (item.isFile() && (item.name.endsWith('.mdc') || item.name.endsWith('.md'))) {
                    files.push(itemRelative);
                }
            }
        }
        catch {
            // Skip directories/files that can't be read
        }
    };
    try {
        collectFiles(docsRulesDir, RULES_DIR_NAME);
    }
    catch {
        console.warn('⚠️  Could not read local rules directory, returning empty list');
        return [];
    }
    return files;
}
function stripYamlFrontMatter(content) {
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
function getDescriptionForFile(filePath) {
    if (!filePath)
        return 'Development rules';
    const baseName = path.basename(filePath, path.extname(filePath));
    return `Development rules for ${baseName.replace(/-/g, ' ')}`;
}
function createContentProcessor(config) {
    return (content, filePath) => {
        if (config.stripYaml) {
            return stripYamlFrontMatter(content);
        }
        else {
            // For Cursor, add YAML front matter
            const yamlFrontMatter = `---
description: ${getDescriptionForFile(filePath)}
globs: ["**/*"]
alwaysApply: true
---

`;
            return yamlFrontMatter + content;
        }
    };
}
function getDestinationPath(filePath, rulesDir, config) {
    const relativeToRules = filePath.substring(`${RULES_DIR_NAME}/`.length);
    const parsedPath = path.parse(relativeToRules);
    const { name: baseName, dir } = parsedPath;
    if (config.flatten) {
        const flattenedName = dir ? `${dir.replace(/[\/\\]/g, '-')}-${baseName}` : baseName;
        const relativePath = `${flattenedName}${config.extension}`;
        return { relativePath, destPath: path.join(rulesDir, relativePath) };
    }
    else {
        const targetDir = dir ? path.join(rulesDir, dir) : rulesDir;
        const relativePath = path.join(dir, `${baseName}${config.extension}`);
        return { relativePath, destPath: path.join(targetDir, `${baseName}${config.extension}`), targetDir };
    }
}
// ============================================================================
// FILE PROCESSING
// ============================================================================
async function processFile(filePath, rulesDir, config, processContent, progressBar) {
    try {
        const { relativePath, destPath, targetDir } = getDestinationPath(filePath, rulesDir, config);
        // Create directory if needed for non-flattened structure
        if (targetDir && !fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const localInfo = getLocalFileInfo(destPath);
        const isNew = !localInfo;
        // Read content from local package files
        const projectRoot = path.resolve(__dirname, '..');
        const sourcePath = path.join(projectRoot, 'docs', filePath);
        let content = fs.readFileSync(sourcePath, 'utf8');
        content = processContent(content, filePath);
        const localProcessed = localInfo ? processContent(localInfo.content, filePath) : '';
        const contentChanged = !localInfo || localProcessed !== content;
        if (contentChanged) {
            fs.writeFileSync(destPath, content, 'utf8');
        }
        results.push({
            file: relativePath,
            status: contentChanged ? (isNew ? 'added' : 'updated') : 'current',
            action: contentChanged ? (isNew ? 'Added' : 'Updated') : 'Already current'
        });
        progressBar.increment();
        return contentChanged;
    }
    catch (error) {
        results.push({
            file: filePath,
            status: 'error',
            action: `Error: ${error.message}`
        });
        progressBar.increment();
        return false;
    }
}
async function processBatch(batch, rulesDir, config, processContent, progressBar) {
    const promises = batch.map(filePath => processFile(filePath, rulesDir, config, processContent, progressBar));
    await Promise.all(promises);
}
// ============================================================================
// OUTPUT DISPLAY
// ============================================================================
function createStatusTable(title, items) {
    if (items.length === 0)
        return;
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
function displayResults(results, rulesDir, agentName) {
    const statusGroups = {
        removed: results.filter(r => r.status === 'removed'),
        added: results.filter(r => r.status === 'added'),
        updated: results.filter(r => r.status === 'updated'),
        current: results.filter(r => r.status === 'current'),
        errors: results.filter(r => r.status === 'error')
    };
    console.log('\n📊 Sync Results:');
    createStatusTable('🗑️ Removed', statusGroups.removed);
    createStatusTable('🆕 Added', statusGroups.added);
    createStatusTable('🔄 Updated', statusGroups.updated);
    createStatusTable('⏭️ Already Current', statusGroups.current);
    if (statusGroups.errors.length > 0)
        createStatusTable('❌ Errors', statusGroups.errors);
    console.log(`\n🎉 Sync completed!`);
    console.log(`📍 Location: ${rulesDir}`);
    const summary = [
        statusGroups.removed.length && `${statusGroups.removed.length} removed`,
        statusGroups.added.length && `${statusGroups.added.length} added`,
        statusGroups.updated.length && `${statusGroups.updated.length} updated`,
        statusGroups.current.length && `${statusGroups.current.length} current`,
        statusGroups.errors.length && `${statusGroups.errors.length} errors`
    ].filter(Boolean);
    console.log(`📈 Summary: ${summary.join(', ')}`);
    console.log(`💡 Rules will be automatically loaded by ${agentName}`);
}
// ============================================================================
// CLEAR OBSOLETE FILES
// ============================================================================
async function clearObsoleteFiles(rulesDir, config, merge) {
    if (!fs.existsSync(rulesDir))
        return;
    console.log(`🧹 Clearing obsolete rules in ${rulesDir}...`);
    let expectedFiles;
    if (merge) {
        expectedFiles = new Set([`all-rules${config.extension}`]);
    }
    else {
        const ruleFiles = await getRuleFiles();
        expectedFiles = new Set(ruleFiles.map(filePath => {
            const { relativePath } = getDestinationPath(filePath, rulesDir, config);
            return relativePath;
        }));
    }
    const existingFiles = fs.readdirSync(rulesDir, { recursive: true })
        .filter((file) => typeof file === 'string' && (file.endsWith('.mdc') || file.endsWith('.md')))
        .map((file) => path.join(rulesDir, file));
    for (const file of existingFiles) {
        const relativePath = path.relative(rulesDir, file);
        if (!expectedFiles.has(relativePath)) {
            try {
                fs.unlinkSync(file);
                results.push({
                    file: relativePath,
                    status: 'removed',
                    action: 'Removed'
                });
            }
            catch (error) {
                results.push({
                    file: relativePath,
                    status: 'error',
                    action: `Error removing: ${error.message}`
                });
            }
        }
    }
}
// ============================================================================
// MERGE FUNCTIONALITY
// ============================================================================
async function mergeAllRules(ruleFiles, rulesDir, config, processContent) {
    const mergedFileName = `all-rules${config.extension}`;
    const mergedFilePath = path.join(rulesDir, mergedFileName);
    console.log(`📋 Merging ${ruleFiles.length} files into ${mergedFileName}...`);
    let mergedContent = `# Development Rules - Complete Collection\n\n`;
    mergedContent += `Generated on: ${new Date().toISOString()}\n\n`;
    mergedContent += `---\n\n`;
    for (const filePath of ruleFiles) {
        try {
            const projectRoot = path.resolve(__dirname, '..');
            const sourcePath = path.join(projectRoot, 'docs', filePath);
            let content = fs.readFileSync(sourcePath, 'utf8');
            content = processContent(content, filePath);
            const relativeToRules = filePath.substring(`${RULES_DIR_NAME}/`.length);
            const parsedPath = path.parse(relativeToRules);
            const { name: baseName, dir } = parsedPath;
            const sectionTitle = dir ? `${dir}/${baseName}` : baseName;
            mergedContent += `## ${sectionTitle.replace(/-/g, ' ').toUpperCase()}\n\n`;
            mergedContent += `${content}\n\n`;
            mergedContent += `---\n\n`;
        }
        catch (error) {
            results.push({
                file: filePath,
                status: 'error',
                action: `Error reading: ${error.message}`
            });
        }
    }
    const localInfo = getLocalFileInfo(mergedFilePath);
    const localProcessed = localInfo ? processContent(localInfo.content, 'all-rules') : '';
    const contentChanged = !localInfo || localProcessed !== mergedContent;
    if (contentChanged) {
        fs.writeFileSync(mergedFilePath, mergedContent, 'utf8');
        results.push({
            file: mergedFileName,
            status: localInfo ? 'updated' : 'added',
            action: localInfo ? 'Updated' : 'Created'
        });
    }
    else {
        results.push({
            file: mergedFileName,
            status: 'current',
            action: 'Already current'
        });
    }
}
// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================
export async function syncRules(options) {
    const cwd = process.cwd();
    results = [];
    // Determine agent
    let agent;
    if (options.agent) {
        agent = options.agent.toLowerCase();
        if (!getSupportedAgents().includes(agent)) {
            log(`❌ Unknown agent: ${agent}`, 'red');
            log(`Supported agents: ${getSupportedAgents().join(', ')}`, 'yellow');
            throw new Error(`Unknown agent: ${agent}`);
        }
    }
    else {
        const detectedAgent = detectAgentTool();
        if (detectedAgent !== 'cursor') {
            agent = detectedAgent;
            console.log(`📝 Detected agent: ${getAgentConfig(agent).name}`);
        }
        else {
            console.log('📝 No agent detected or defaulting to Cursor.');
            agent = await promptForAgent();
        }
    }
    const config = getAgentConfig(agent);
    const rulesDir = path.join(cwd, config.dir, RULES_DIR_NAME);
    const processContent = createContentProcessor(config);
    // Clear obsolete rules if requested
    if (options.clear) {
        await clearObsoleteFiles(rulesDir, config, !!options.merge);
    }
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
    if (options.merge) {
        console.log(`🔗 Mode: Merge all rules into single file`);
    }
    console.log('');
    if (options.dryRun) {
        console.log('✅ Dry run completed - no files were modified');
        return;
    }
    if (options.merge) {
        await mergeAllRules(ruleFiles, rulesDir, config, processContent);
    }
    else {
        // Setup progress bar
        const progressBar = new cliProgress.SingleBar({
            format: '📋 Processing | {bar} | {percentage}% | {value}/{total} files | {file}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });
        progressBar.start(ruleFiles.length, 0, { file: 'Starting...' });
        // Process files in batches
        for (let i = 0; i < ruleFiles.length; i += BATCH_SIZE) {
            const batch = ruleFiles.slice(i, i + BATCH_SIZE);
            await processBatch(batch, rulesDir, config, processContent, progressBar);
        }
        progressBar.stop();
    }
    displayResults(results, rulesDir, config.name);
}
