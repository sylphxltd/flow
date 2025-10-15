#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { 
  ProcessResult, 
  CommonOptions,
  log,
  getSupportedAgents,
  getAgentConfig,
  promptForAgent as sharedPromptForAgent,
  detectAgentTool as sharedDetectAgentTool,
  getLocalFileInfo,
  collectFiles,
  displayResults,
  processBatch,
  createMergedContent,
  clearObsoleteFiles
} from './src/shared';

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
} as const;

type AgentType = keyof typeof AGENT_CONFIGS;

// ============================================================================
// AGENT-SPECIFIC FUNCTIONS
// ============================================================================

async function getAgentFiles(): Promise<string[]> {
  // When running from compiled dist folder, we need to resolve from the project root
  const scriptDir = __dirname;
  const projectRoot = path.resolve(scriptDir, '..');
  const agentsDir = path.join(projectRoot, 'agents', 'sdd');
  return collectFiles(agentsDir, ['.md']);
}

async function promptForAgent(): Promise<AgentType> {
  const result = await sharedPromptForAgent(AGENT_CONFIGS, 'Workflow Install Tool');
  return result as AgentType;
}

function detectAgentTool(): AgentType {
  const result = sharedDetectAgentTool(AGENT_CONFIGS, 'opencode');
  return result as AgentType;
}

// ============================================================================
// MAIN INSTALL FUNCTION
// ============================================================================

export async function installAgents(options: CommonOptions): Promise<void> {
  const cwd = process.cwd();
  const results: ProcessResult[] = [];

  // Determine agent
  let agent: AgentType;
  if (options.agent) {
    agent = options.agent.toLowerCase() as AgentType;
    if (!getSupportedAgents(AGENT_CONFIGS).includes(agent)) {
      log(`❌ Unknown agent: ${agent}`, 'red');
      log(`Supported agents: ${getSupportedAgents(AGENT_CONFIGS).join(', ')}`, 'yellow');
      throw new Error(`Unknown agent: ${agent}`);
    }
  } else {
    const detectedAgent = detectAgentTool();
    if (detectedAgent !== 'opencode') {
      agent = detectedAgent;
      console.log(`📝 Detected agent: ${getAgentConfig(AGENT_CONFIGS, agent).name}`);
    } else {
      console.log('📝 No agent detected or defaulting to OpenCode.');
      agent = await promptForAgent();
    }
  }

  const config = getAgentConfig(AGENT_CONFIGS, agent);
  const agentsDir = path.join(cwd, config.dir);
  const processContent = (content: string) => {
    // For OpenCode agents, preserve YAML front matter - no processing
    return content;
  };

  // Clear obsolete agents if requested
  if (options.clear && fs.existsSync(agentsDir)) {
    let expectedFiles: Set<string>;

    if (options.merge) {
      // In merge mode, only expect the merged file
      expectedFiles = new Set([`all-agents${config.extension}`]);
    } else {
      // Get source files for normal mode
      const agentFiles = await getAgentFiles();
      expectedFiles = new Set(
        agentFiles.map(filePath => {
          const parsedPath = path.parse(filePath);
          const baseName = parsedPath.name;
          const dir = parsedPath.dir;

          if (config.flatten) {
            const flattenedName = dir ? `${dir.replace(/[\/\\]/g, '-')}-${baseName}` : baseName;
            return `${flattenedName}${config.extension}`;
          } else {
            return path.join(dir, `${baseName}${config.extension}`);
          }
        })
      );
    }

    clearObsoleteFiles(agentsDir, expectedFiles, [config.extension], results);
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

    const pathPrefix = 'agents/sdd/';
    const mergedContent = createMergedContent(
      agentFiles.map(f => pathPrefix + f),
      processContent,
      'Development Workflow Agents - Complete Collection',
      pathPrefix
    );

    // Check if file needs updating
    const localInfo = getLocalFileInfo(mergedFilePath);
    const localProcessed = localInfo ? processContent(localInfo.content) : '';
    const contentChanged = !localInfo || localProcessed !== mergedContent;

    if (contentChanged) {
      fs.writeFileSync(mergedFilePath, mergedContent, 'utf8');
      results.push({
        file: mergedFileName,
        status: localInfo ? 'updated' : 'added',
        action: localInfo ? 'Updated' : 'Created'
      });
    } else {
      results.push({
        file: mergedFileName,
        status: 'current',
        action: 'Already current'
      });
    }

    displayResults(results, agentsDir, config.name, 'Install');
  } else {
    // Process files individually - pass just the filenames, not full paths
    await processBatch(
      agentFiles, // Just the filenames, not pathPrefix + f
      agentsDir,
      config.extension,
      processContent,
      config.flatten,
      results,
      'agents/sdd/' // Keep pathPrefix for source file reading
    );

    displayResults(results, agentsDir, config.name, 'Install');
  }
}