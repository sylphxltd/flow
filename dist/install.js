#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
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
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}
// Global state
let progressBar;
let results = [];
// Agent configurations - Currently only opencode
const AGENT_CONFIGS = {
    opencode: {
        name: 'OpenCode',
        dir: '.opencode/agent',
        extension: '.md',
        stripYaml: false,
        flatten: false,
        description: 'OpenCode (.opencode/agent/*.md with YAML front matter for agents)'
    }
};
function getSupportedAgents() {
    return Object.keys(AGENT_CONFIGS);
}
function getAgentConfig(agent) {
    return AGENT_CONFIGS[agent];
}
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
        console.log('\n🚀 Workflow Install Tool');
        console.log('=====================');
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
    // Check for existing directories
    for (const agent of getSupportedAgents()) {
        const config = getAgentConfig(agent);
        if (fs.existsSync(path.join(cwd, config.dir))) {
            return agent;
        }
    }
    // Default to opencode
    return 'opencode';
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
async function getAgentFiles() {
    // In bundled CJS, __dirname is the directory of the executing script
    const scriptDir = __dirname;
    const agentsDir = path.join(scriptDir, '..', 'modes', 'development-orchestrator', 'opencode-agents');
    const files = [];
    function collectFiles(dir, relativePath) {
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const itemPath = path.join(dir, item.name);
                const itemRelative = path.join(relativePath, item.name);
                if (item.isDirectory()) {
                    collectFiles(itemPath, itemRelative);
                }
                else if (item.isFile() && item.name.endsWith('.md')) {
                    files.push(itemRelative);
                }
            }
        }
        catch {
            // Skip directories/files that can't be read
        }
    }
    try {
        collectFiles(agentsDir, '');
    }
    catch {
        console.warn('⚠️  Could not read local agents directory, returning empty list');
        return [];
    }
    return files;
}
function getDescriptionForFile(filePath) {
    if (!filePath)
        return 'Development workflow agent';
    const baseName = path.basename(filePath, path.extname(filePath));
    return `Agent for ${baseName.replace(/-/g, ' ')} workflow`;
}
// ============================================================================
// FILE PROCESSING
// ============================================================================
async function processFile(filePath, agentsDir, fileExtension, processContent, flatten, results, progressBar) {
    try {
        // filePath is like 'sdd-analyze.md'
        const parsedPath = path.parse(filePath);
        const baseName = parsedPath.name;
        const ext = parsedPath.ext;
        const dir = parsedPath.dir;
        let relativePath;
        let destPath;
        if (flatten) {
            const flattenedName = dir ? `${dir.replace(/[\/\\]/g, '-')}-${baseName}` : baseName;
            relativePath = `${flattenedName}${fileExtension}`;
            destPath = path.join(agentsDir, relativePath);
        }
        else {
            const targetDir = dir ? path.join(agentsDir, dir) : agentsDir;
            fs.mkdirSync(targetDir, { recursive: true });
            relativePath = path.join(dir, `${baseName}${fileExtension}`);
            destPath = path.join(targetDir, `${baseName}${fileExtension}`);
        }
        const localInfo = getLocalFileInfo(destPath);
        const isNew = !localInfo;
        // Read content from local package files
        const scriptDir = __dirname;
        const sourcePath = path.join(scriptDir, '..', 'modes', 'development-orchestrator', 'opencode-agents', filePath);
        let content = fs.readFileSync(sourcePath, 'utf8');
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
function displayResults(results, agentsDir, agentName) {
    const removed = results.filter(r => r.status === 'removed');
    const added = results.filter(r => r.status === 'added');
    const updated = results.filter(r => r.status === 'updated');
    const current = results.filter(r => r.status === 'current');
    const errors = results.filter(r => r.status === 'error');
    console.log('\n📊 Install Results:');
    createStatusTable('🗑️ Removed', removed);
    createStatusTable('🆕 Added', added);
    createStatusTable('🔄 Updated', updated);
    createStatusTable('⏭️ Already Current', current);
    if (errors.length > 0)
        createStatusTable('❌ Errors', errors);
    console.log(`\n🎉 Install completed!`);
    console.log(`📍 Location: ${agentsDir}`);
    const summary = [
        removed.length && `${removed.length} removed`,
        added.length && `${added.length} added`,
        updated.length && `${updated.length} updated`,
        current.length && `${current.length} current`,
        errors.length && `${errors.length} errors`
    ].filter(Boolean);
    console.log(`📈 Summary: ${summary.join(', ')}`);
    console.log(`💡 Agents will be automatically loaded by ${agentName}`);
}
// ============================================================================
// MAIN INSTALL FUNCTION
// ============================================================================
export async function installAgents(options) {
    const cwd = process.cwd();
    // Initialize results array
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
        if (detectedAgent !== 'opencode') {
            agent = detectedAgent;
            console.log(`📝 Detected agent: ${getAgentConfig(agent).name}`);
        }
        else {
            console.log('📝 No agent detected or defaulting to OpenCode.');
            agent = await promptForAgent();
        }
    }
    const config = getAgentConfig(agent);
    const agentsDir = path.join(cwd, config.dir);
    const processContent = (content) => {
        // For OpenCode agents, preserve YAML front matter - no processing
        return content;
    };
    // Clear obsolete agents if requested
    if (options.clear && fs.existsSync(agentsDir)) {
        console.log(`🧹 Clearing obsolete agents in ${agentsDir}...`);
        let expectedFiles;
        if (options.merge) {
            // In merge mode, only expect the merged file
            expectedFiles = new Set([`all-agents${config.extension}`]);
        }
        else {
            // Get source files for normal mode
            const agentFiles = await getAgentFiles();
            expectedFiles = new Set(agentFiles.map(filePath => {
                const parsedPath = path.parse(filePath);
                const baseName = parsedPath.name;
                const dir = parsedPath.dir;
                if (config.flatten) {
                    const flattenedName = dir ? `${dir.replace(/[\/\\]/g, '-')}-${baseName}` : baseName;
                    return `${flattenedName}${config.extension}`;
                }
                else {
                    return path.join(dir, `${baseName}${config.extension}`);
                }
            }));
        }
        // Get existing files
        const existingFiles = fs.readdirSync(agentsDir, { recursive: true })
            .filter((file) => typeof file === 'string' && file.endsWith('.md'))
            .map((file) => path.join(agentsDir, file));
        // Only remove files that are not expected
        for (const file of existingFiles) {
            const relativePath = path.relative(agentsDir, file);
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
    // Create agents directory
    fs.mkdirSync(agentsDir, { recursive: true });
    // Get agent files
    const agentFiles = await getAgentFiles();
    // Show initial info
    console.log(`🚀 Workflow Install Tool`);
    console.log(`=====================`);
    console.log(`📝 Agent: ${config.name}`);
    console.log(`📁 Target: ${agentsDir}`);
    console.log(`📋 Files: ${agentFiles.length}`);
    if (options.merge) {
        console.log(`🔗 Mode: Merge all agents into single file`);
    }
    console.log('');
    if (options.dryRun) {
        console.log('✅ Dry run completed - no files were modified');
        return;
    }
    if (options.merge) {
        // Merge all agents into a single file
        const mergedFileName = `all-agents${config.extension}`;
        const mergedFilePath = path.join(agentsDir, mergedFileName);
        console.log(`📋 Merging ${agentFiles.length} files into ${mergedFileName}...`);
        let mergedContent = `# Development Workflow Agents - Complete Collection\n\n`;
        mergedContent += `Generated on: ${new Date().toISOString()}\n\n`;
        mergedContent += `---\n\n`;
        for (const filePath of agentFiles) {
            try {
                const scriptDir = __dirname;
                const sourcePath = path.join(scriptDir, '..', 'modes', 'development-orchestrator', 'opencode-agents', filePath);
                let content = fs.readFileSync(sourcePath, 'utf8');
                content = processContent(content);
                const parsedPath = path.parse(filePath);
                const baseName = parsedPath.name;
                const dir = parsedPath.dir;
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
        // Check if file needs updating
        const localInfo = getLocalFileInfo(mergedFilePath);
        const contentChanged = !localInfo || localInfo.content !== mergedContent;
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
        displayResults(results, agentsDir, config.name);
    }
    else {
        // Original file-by-file processing
        // Setup progress bar
        const progressBar = new cliProgress.SingleBar({
            format: '📋 Installing | {bar} | {percentage}% | {value}/{total} files | {file}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });
        progressBar.start(agentFiles.length, 0, { file: 'Starting...' });
        // Process files in batches
        const batchSize = 5;
        const batches = [];
        for (let i = 0; i < agentFiles.length; i += batchSize) {
            batches.push(agentFiles.slice(i, i + batchSize));
        }
        for (const batch of batches) {
            const promises = batch.map(filePath => processFile(filePath, agentsDir, config.extension, processContent, config.flatten, results, progressBar));
            await Promise.all(promises);
        }
        progressBar.stop();
        displayResults(results, agentsDir, config.name);
    }
}
