#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installAgents = installAgents;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("./src/shared");
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
// ============================================================================
// AGENT-SPECIFIC FUNCTIONS
// ============================================================================
async function getAgentFiles() {
    // When running from compiled dist folder, we need to resolve from the project root
    const scriptDir = __dirname;
    const projectRoot = path_1.default.resolve(scriptDir, '..');
    const agentsDir = path_1.default.join(projectRoot, 'agents', 'sdd');
    return (0, shared_1.collectFiles)(agentsDir, ['.md']);
}
async function promptForAgent() {
    const result = await (0, shared_1.promptForAgent)(AGENT_CONFIGS, 'Workflow Install Tool');
    return result;
}
function detectAgentTool() {
    const result = (0, shared_1.detectAgentTool)(AGENT_CONFIGS, 'opencode');
    return result;
}
// ============================================================================
// MAIN INSTALL FUNCTION
// ============================================================================
async function installAgents(options) {
    const cwd = process.cwd();
    const results = [];
    // Determine agent
    let agent;
    if (options.agent) {
        agent = options.agent.toLowerCase();
        if (!(0, shared_1.getSupportedAgents)(AGENT_CONFIGS).includes(agent)) {
            (0, shared_1.log)(`❌ Unknown agent: ${agent}`, 'red');
            (0, shared_1.log)(`Supported agents: ${(0, shared_1.getSupportedAgents)(AGENT_CONFIGS).join(', ')}`, 'yellow');
            throw new Error(`Unknown agent: ${agent}`);
        }
    }
    else {
        const detectedAgent = detectAgentTool();
        if (detectedAgent !== 'opencode') {
            agent = detectedAgent;
            console.log(`📝 Detected agent: ${(0, shared_1.getAgentConfig)(AGENT_CONFIGS, agent).name}`);
        }
        else {
            console.log('📝 No agent detected or defaulting to OpenCode.');
            agent = await promptForAgent();
        }
    }
    const config = (0, shared_1.getAgentConfig)(AGENT_CONFIGS, agent);
    const agentsDir = path_1.default.join(cwd, config.dir);
    const processContent = (content) => {
        // For OpenCode agents, preserve YAML front matter - no processing
        return content;
    };
    // Clear obsolete agents if requested
    if (options.clear && fs_1.default.existsSync(agentsDir)) {
        let expectedFiles;
        if (options.merge) {
            // In merge mode, only expect the merged file
            expectedFiles = new Set([`all-agents${config.extension}`]);
        }
        else {
            // Get source files for normal mode
            const agentFiles = await getAgentFiles();
            expectedFiles = new Set(agentFiles.map(filePath => {
                const parsedPath = path_1.default.parse(filePath);
                const baseName = parsedPath.name;
                const dir = parsedPath.dir;
                if (config.flatten) {
                    const flattenedName = dir ? `${dir.replace(/[\/\\]/g, '-')}-${baseName}` : baseName;
                    return `${flattenedName}${config.extension}`;
                }
                else {
                    // Add sdd/ prefix for target directory structure
                    return path_1.default.join('sdd', `${baseName}${config.extension}`);
                }
            }));
        }
        (0, shared_1.clearObsoleteFiles)(agentsDir, expectedFiles, [config.extension], results);
    }
    // Create agents directory
    fs_1.default.mkdirSync(agentsDir, { recursive: true });
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
        const mergedFilePath = path_1.default.join(agentsDir, mergedFileName);
        console.log(`📋 Merging ${agentFiles.length} files into ${mergedFileName}...`);
        const pathPrefix = 'agents/sdd/';
        const mergedContent = (0, shared_1.createMergedContent)(agentFiles.map(f => pathPrefix + f), processContent, 'Development Workflow Agents - Complete Collection', pathPrefix);
        // Check if file needs updating
        const localInfo = (0, shared_1.getLocalFileInfo)(mergedFilePath);
        const localProcessed = localInfo ? processContent(localInfo.content) : '';
        const contentChanged = !localInfo || localProcessed !== mergedContent;
        if (contentChanged) {
            fs_1.default.writeFileSync(mergedFilePath, mergedContent, 'utf8');
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
        (0, shared_1.displayResults)(results, agentsDir, config.name, 'Install');
    }
    else {
        // Process files individually - create sdd/ subdirectory structure
        const sddTargetDir = path_1.default.join(agentsDir, 'sdd');
        await (0, shared_1.processBatch)(agentFiles, // Just the filenames
        sddTargetDir, // Target to sdd/ subdirectory
        config.extension, processContent, config.flatten, results, 'agents/sdd/' // Keep pathPrefix for source file reading
        );
        (0, shared_1.displayResults)(results, agentsDir, config.name, 'Install');
    }
}
