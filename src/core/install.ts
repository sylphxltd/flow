import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type CommonOptions,
  type ProcessResult,
  clearObsoleteFiles,
  collectFiles,
  displayResults,
  getAgentConfig,
  getLocalFileInfo,
  getSupportedAgents,
  log,
  detectAgentTool as sharedDetectAgentTool,
  promptForAgent as sharedPromptForAgent,
} from '../shared.js';

// Agent configurations - Currently only opencode
const AGENT_CONFIGS = {
  opencode: {
    name: 'OpenCode',
    dir: '.opencode/agent',
    extension: '.md',
    stripYaml: false,
    flatten: false,
    description: 'OpenCode (.opencode/agent/*.md with YAML front matter for agents)',
  },
} as const;

type AgentType = keyof typeof AGENT_CONFIGS;

// ============================================================================
// AGENT-SPECIFIC FUNCTIONS
// ============================================================================

async function getAgentFiles(): Promise<string[]> {
  // Get script directory and resolve agents path
  const scriptPath = path.resolve(process.argv[1]);
  const scriptDir = path.dirname(scriptPath);
  const agentsDir = path.join(scriptDir, '..', 'agents');

  if (!fs.existsSync(agentsDir)) {
    throw new Error(`Could not find agents directory at: ${agentsDir}`);
  }

  const subdirs = fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && dirent.name !== 'archived')
    .map((dirent) => dirent.name);

  const allFiles: string[] = [];

  // Collect files from each subdirectory
  for (const subdir of subdirs) {
    const subdirPath = path.join(agentsDir, subdir);
    const files = collectFiles(subdirPath, ['.md']);
    allFiles.push(...files.map((file) => path.join(subdir, file)));
  }

  return allFiles;
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

    // Get source files for normal mode
    const agentFiles = await getAgentFiles();
    expectedFiles = new Set(
      agentFiles.map((filePath) => {
        const parsedPath = path.parse(filePath);
        const baseName = parsedPath.name;
        const dir = parsedPath.dir;

        if (config.flatten) {
          const flattenedName = dir ? `${dir.replace(/[\/\\]/g, '-')}-${baseName}` : baseName;
          return `${flattenedName}${config.extension}`;
        }
        // Keep the relative path structure (sdd/file.md, core/file.md)
        return filePath;
      })
    );

    clearObsoleteFiles(agentsDir, expectedFiles, [config.extension], results);
  }

  // Create agents directory
  fs.mkdirSync(agentsDir, { recursive: true });

  // Get agent files
  const agentFiles = await getAgentFiles();

  // Show agent setup info
  if (!options.quiet) {
    console.log(
      `📁 Installing ${agentFiles.length} agents to ${agentsDir.replace(process.cwd() + '/', '')}`
    );
    console.log('');
  }

  if (options.dryRun) {
    console.log('✅ Dry run completed - no files were modified');
    return;
  }

  // Process files individually - create both sdd/ and core/ subdirectory structures
  // Use same logic as getAgentFiles() - simple path resolution
  const scriptPath = path.resolve(process.argv[1]);
  const scriptDir = path.dirname(scriptPath);
  const agentsSourceDir = path.join(scriptDir, 'agents');

  for (const agentFile of agentFiles) {
    const sourcePath = path.join(agentsSourceDir, agentFile);
    const destPath = path.join(agentsDir, agentFile);

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const localInfo = getLocalFileInfo(destPath);
    const isNew = !localInfo;

    // Read content from source
    let content = fs.readFileSync(sourcePath, 'utf8');
    content = processContent(content);

    const localProcessed = localInfo ? processContent(localInfo.content) : '';
    const contentChanged = !localInfo || localProcessed !== content;

    if (contentChanged) {
      fs.writeFileSync(destPath, content, 'utf8');
      results.push({
        file: agentFile,
        status: localInfo ? 'updated' : 'added',
        action: localInfo ? 'Updated' : 'Created',
      });
    } else {
      results.push({
        file: agentFile,
        status: 'current',
        action: 'Already current',
      });
    }
  }

  displayResults(results, agentsDir, config.name, 'Install', options.verbose);
}
