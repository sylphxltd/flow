import fs from 'node:fs';
import path from 'node:path';
import {
  type CommonOptions,
  type ProcessResult,
  clearObsoleteFiles,
  collectFiles,
  createMergedContent,
  displayResults,
  getAgentConfig,
  getLocalFileInfo,
  getSupportedAgents,
  log,
  processBatch,
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
  // Try to get agents from current working directory first
  const localAgentsDir = path.join(process.cwd(), 'agents');

  // If local agents directory exists, use it
  if (fs.existsSync(localAgentsDir)) {
    try {
      const subdirs = fs
        .readdirSync(localAgentsDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && dirent.name !== 'archived')
        .map((dirent) => dirent.name);

      const allFiles: string[] = [];

      // Collect files from each subdirectory
      for (const subdir of subdirs) {
        const subdirPath = path.join(localAgentsDir, subdir);
        const files = collectFiles(subdirPath, ['.md']);
        allFiles.push(...files.map((file) => path.join(subdir, file)));
      }

      if (allFiles.length > 0) {
        return allFiles;
      }
    } catch (error) {
      // Fall through to use bundled agents
    }
  }

  // Fall back to bundled agents from Sylphx Flow installation
  // Use a more reliable approach to find the agents directory
  // Try multiple possible locations where agents might be installed
  const possiblePaths = [
    // When running from node_modules in a user project
    path.join(process.cwd(), 'node_modules/@sylphxltd/flow/agents'),
    // When running from the source directory
    path.join(process.cwd(), 'agents'),
    // When running globally
    path.join(__dirname, '../../agents'),
  ];

  let bundledAgentsDir: string | undefined;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      bundledAgentsDir = possiblePath;
      break;
    }
  }

  if (!bundledAgentsDir) {
    // Last resort: try to find agents relative to this file
    bundledAgentsDir = path.join(__dirname, '../../agents');
  }

  if (fs.existsSync(bundledAgentsDir)) {
    const subdirs = fs
      .readdirSync(bundledAgentsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && dirent.name !== 'archived')
      .map((dirent) => dirent.name);

    const allFiles: string[] = [];

    // Collect files from each subdirectory
    for (const subdir of subdirs) {
      const subdirPath = path.join(bundledAgentsDir, subdir);
      const files = collectFiles(subdirPath, ['.md']);
      allFiles.push(...files.map((file) => path.join(subdir, file)));
    }

    return allFiles;
  }

  // If no agents found anywhere, return empty array
  return [];
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

    if (options.merge) {
      // In merge mode, only expect the merged file
      expectedFiles = new Set([`all-agents${config.extension}`]);
    } else {
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
    }

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
    if (options.merge) {
      console.log('🔗 Mode: Merge all agents into single file');
    }
    console.log('');
  }

  if (options.dryRun) {
    console.log('✅ Dry run completed - no files were modified');
    return;
  }

  if (options.merge) {
    // Merge all agents into a single file
    const mergedFileName = `all-agents${config.extension}`;
    const mergedFilePath = path.join(agentsDir, mergedFileName);

    console.log(`📋 Merging ${agentFiles.length} files into ${mergedFileName}...`);

    const pathPrefix = 'agents/';
    const mergedContent = createMergedContent(
      agentFiles.map((f) => pathPrefix + f),
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
        action: localInfo ? 'Updated' : 'Created',
      });
    } else {
      results.push({
        file: mergedFileName,
        status: 'current',
        action: 'Already current',
      });
    }

    displayResults(results, agentsDir, config.name, 'Install', options.verbose);
  } else {
    // Process files individually - create both sdd/ and core/ subdirectory structures
    processBatch(
      agentFiles, // Files with relative paths (sdd/file.md, core/file.md)
      agentsDir, // Target to .opencode/agent/
      config.extension,
      processContent,
      config.flatten,
      results,
      'agents/' // PathPrefix for source file reading
    );

    displayResults(results, agentsDir, config.name, 'Install', options.verbose);
  }
}
