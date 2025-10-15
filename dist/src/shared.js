"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentConfig = exports.getSupportedAgents = exports.log = exports.COLORS = void 0;
exports.promptForAgent = promptForAgent;
exports.detectAgentTool = detectAgentTool;
exports.getLocalFileInfo = getLocalFileInfo;
exports.collectFiles = collectFiles;
exports.stripYamlFrontMatter = stripYamlFrontMatter;
exports.getDescriptionForFile = getDescriptionForFile;
exports.processFile = processFile;
exports.createStatusTable = createStatusTable;
exports.displayResults = displayResults;
exports.processBatch = processBatch;
exports.createMergedContent = createMergedContent;
exports.clearObsoleteFiles = clearObsoleteFiles;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const cli_table3_1 = __importDefault(require("cli-table3"));
// Colors for output
exports.COLORS = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};
// Utility functions
const log = (message, color = 'reset') => {
    console.log(`${exports.COLORS[color]}${message}${exports.COLORS.reset}`);
};
exports.log = log;
const getSupportedAgents = (configs) => Object.keys(configs);
exports.getSupportedAgents = getSupportedAgents;
const getAgentConfig = (configs, agent) => configs[agent];
exports.getAgentConfig = getAgentConfig;
// ============================================================================
// USER INTERACTION
// ============================================================================
async function promptForAgent(configs, toolName) {
    const agents = (0, exports.getSupportedAgents)(configs);
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        console.log(`\n🚀 ${toolName}`);
        console.log('='.repeat(toolName.length + 4));
        console.log('Please select your AI agent:');
        console.log('');
        agents.forEach((agent, index) => {
            const config = (0, exports.getAgentConfig)(configs, agent);
            console.log(`${index + 1}. ${config.name} - ${config.description}`);
        });
        console.log('');
        const askChoice = () => {
            rl.question(`Enter your choice (1-${agents.length}): `, (answer) => {
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
function detectAgentTool(configs, defaultAgent) {
    const cwd = process.cwd();
    // Check for explicit --agent argument (highest priority)
    const agentArg = process.argv.find(arg => arg.startsWith('--agent='));
    if (agentArg) {
        const agent = agentArg.split('=')[1].toLowerCase();
        if ((0, exports.getSupportedAgents)(configs).includes(agent)) {
            return agent;
        }
    }
    // Check for existing directories
    for (const agent of (0, exports.getSupportedAgents)(configs)) {
        const config = (0, exports.getAgentConfig)(configs, agent);
        if (fs_1.default.existsSync(path_1.default.join(cwd, config.dir))) {
            return agent;
        }
    }
    return defaultAgent;
}
// ============================================================================
// FILE OPERATIONS
// ============================================================================
function getLocalFileInfo(filePath) {
    try {
        if (!fs_1.default.existsSync(filePath)) {
            return null;
        }
        const content = fs_1.default.readFileSync(filePath, 'utf8');
        return { content, exists: true };
    }
    catch {
        return null;
    }
}
function collectFiles(rootDir, extensions, relativePrefix = '') {
    const files = [];
    function collect(dir, relativePath) {
        try {
            const items = fs_1.default.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const itemPath = path_1.default.join(dir, item.name);
                const itemRelative = path_1.default.join(relativePath, item.name);
                if (item.isDirectory()) {
                    collect(itemPath, itemRelative);
                }
                else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
                    files.push(path_1.default.join(relativePrefix, itemRelative));
                }
            }
        }
        catch {
            // Skip directories/files that can't be read
        }
    }
    try {
        collect(rootDir, '');
    }
    catch {
        console.warn(`⚠️  Could not read directory ${rootDir}, returning empty list`);
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
function getDescriptionForFile(filePath, type = 'rules') {
    const prefix = type === 'rules' ? 'Development rules' : 'Development workflow agent';
    if (!filePath)
        return prefix;
    const baseName = path_1.default.basename(filePath, path_1.default.extname(filePath));
    const suffix = type === 'rules' ? `for ${baseName.replace(/-/g, ' ')}` : `for ${baseName.replace(/-/g, ' ')} workflow`;
    return `${prefix} ${suffix}`;
}
// ============================================================================
// FILE PROCESSING
// ============================================================================
async function processFile(filePath, targetDir, fileExtension, processContent, flatten, results, progressBar, pathPrefix = '') {
    try {
        // Remove path prefix if present
        const relativePath = pathPrefix ? filePath.substring(pathPrefix.length) : filePath;
        const parsedPath = path_1.default.parse(relativePath);
        const baseName = parsedPath.name;
        const dir = parsedPath.dir;
        let finalRelativePath;
        let destPath;
        if (flatten) {
            const flattenedName = dir ? `${dir.replace(/[\/\\]/g, '-')}-${baseName}` : baseName;
            finalRelativePath = `${flattenedName}${fileExtension}`;
            destPath = path_1.default.join(targetDir, finalRelativePath);
        }
        else {
            const targetSubDir = dir ? path_1.default.join(targetDir, dir) : targetDir;
            fs_1.default.mkdirSync(targetSubDir, { recursive: true });
            finalRelativePath = path_1.default.join(dir, `${baseName}${fileExtension}`);
            destPath = path_1.default.join(targetSubDir, `${baseName}${fileExtension}`);
        }
        const localInfo = getLocalFileInfo(destPath);
        const isNew = !localInfo;
        // Read content from source - construct the full path from project root
        const projectRoot = path_1.default.resolve(__dirname, '..', '..');
        const sourcePath = path_1.default.join(projectRoot, 'modes', 'development-orchestrator', 'opencode-agents', path_1.default.basename(filePath));
        let content = fs_1.default.readFileSync(sourcePath, 'utf8');
        content = processContent(content);
        const localProcessed = localInfo ? processContent(localInfo.content) : '';
        const contentChanged = !localInfo || localProcessed !== content;
        fs_1.default.writeFileSync(destPath, content, 'utf8');
        results.push({
            file: finalRelativePath,
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
    const table = new cli_table3_1.default({
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
function displayResults(results, targetDir, agentName, operation) {
    const removed = results.filter(r => r.status === 'removed');
    const added = results.filter(r => r.status === 'added');
    const updated = results.filter(r => r.status === 'updated');
    const current = results.filter(r => r.status === 'current');
    const errors = results.filter(r => r.status === 'error');
    console.log(`\n📊 ${operation} Results:`);
    createStatusTable('🗑️ Removed', removed);
    createStatusTable('🆕 Added', added);
    createStatusTable('🔄 Updated', updated);
    createStatusTable('⏭️ Already Current', current);
    if (errors.length > 0)
        createStatusTable('❌ Errors', errors);
    console.log(`\n🎉 ${operation} completed!`);
    console.log(`📍 Location: ${targetDir}`);
    const summary = [
        removed.length && `${removed.length} removed`,
        added.length && `${added.length} added`,
        updated.length && `${updated.length} updated`,
        current.length && `${current.length} current`,
        errors.length && `${errors.length} errors`
    ].filter(Boolean);
    console.log(`📈 Summary: ${summary.join(', ')}`);
    const itemType = operation === 'Install' ? 'Agents' : 'Rules';
    console.log(`💡 ${itemType} will be automatically loaded by ${agentName}`);
}
// ============================================================================
// BATCH PROCESSING
// ============================================================================
async function processBatch(files, targetDir, fileExtension, processContent, flatten, results, pathPrefix = '', batchSize = 5) {
    const progressBar = new cli_progress_1.default.SingleBar({
        format: '📋 Processing | {bar} | {percentage}% | {value}/{total} files | {file}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });
    progressBar.start(files.length, 0, { file: 'Starting...' });
    // Process files in batches
    const batches = [];
    for (let i = 0; i < files.length; i += batchSize) {
        batches.push(files.slice(i, i + batchSize));
    }
    for (const batch of batches) {
        const promises = batch.map(filePath => processFile(filePath, targetDir, fileExtension, processContent, flatten, results, progressBar, pathPrefix));
        await Promise.all(promises);
    }
    progressBar.stop();
}
// ============================================================================
// MERGE FUNCTIONALITY
// ============================================================================
function createMergedContent(files, processContent, title, pathPrefix = '') {
    let mergedContent = `# ${title}\n\n`;
    mergedContent += `Generated on: ${new Date().toISOString()}\n\n`;
    mergedContent += `---\n\n`;
    for (const filePath of files) {
        try {
            const scriptDir = __dirname;
            const sourcePath = path_1.default.join(scriptDir, '..', filePath);
            let content = fs_1.default.readFileSync(sourcePath, 'utf8');
            content = processContent(content, filePath);
            // Remove path prefix for section title
            const relativePath = pathPrefix ? filePath.substring(pathPrefix.length) : filePath;
            const parsedPath = path_1.default.parse(relativePath);
            const baseName = parsedPath.name;
            const dir = parsedPath.dir;
            const sectionTitle = dir ? `${dir}/${baseName}` : baseName;
            mergedContent += `## ${sectionTitle.replace(/-/g, ' ').toUpperCase()}\n\n`;
            mergedContent += `${content}\n\n`;
            mergedContent += `---\n\n`;
        }
        catch (error) {
            // Error handling should be done by the caller
        }
    }
    return mergedContent;
}
// ============================================================================
// CLEANUP FUNCTIONALITY
// ============================================================================
function clearObsoleteFiles(targetDir, expectedFiles, fileExtensions, results) {
    if (!fs_1.default.existsSync(targetDir))
        return;
    console.log(`🧹 Clearing obsolete files in ${targetDir}...`);
    // Get existing files
    const existingFiles = fs_1.default.readdirSync(targetDir, { recursive: true })
        .filter((file) => typeof file === 'string' && fileExtensions.some(ext => file.endsWith(ext)))
        .map((file) => path_1.default.join(targetDir, file));
    // Only remove files that are not expected
    for (const file of existingFiles) {
        const relativePath = path_1.default.relative(targetDir, file);
        if (!expectedFiles.has(relativePath)) {
            try {
                fs_1.default.unlinkSync(file);
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
