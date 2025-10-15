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
} from '../shared.js';

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
  // Get agents directory from current working directory
  const agentsDir = path.join(process.cwd(), 'agents');
  
  // Get all subdirectories in agents/ (excluding archived)
  const subdirs = fs.readdirSync(agentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== 'archived')
    .map(dirent => dirent.name);
  
  const allFiles: string[] = [];
  
  // Collect files from each subdirectory
  for (const subdir of subdirs) {
    const subdirPath = path.join(agentsDir, subdir);
    const files = collectFiles(subdirPath, ['.md']);
    allFiles.push(...files.map(file => path.join(subdir, file)));
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
// PLUGIN INSTALLATION
// ============================================================================

async function installMemoryPlugin(cwd: string): Promise<void> {
  const pluginDir = path.join(cwd, '.opencode', 'plugin');
  const pluginFile = path.join(pluginDir, 'memory-tools.ts');
  
  // Create plugin directory
  fs.mkdirSync(pluginDir, { recursive: true });
  
  // Check if plugin already exists
  if (fs.existsSync(pluginFile)) {
    console.log('📦 Memory plugin already exists, skipping...');
    return;
  }
  
  // Copy plugin file from project
  const sourcePlugin = path.join(process.cwd(), 'src', 'opencode', 'plugins', 'memory-tools.ts');
  
  if (fs.existsSync(sourcePlugin)) {
    fs.copyFileSync(sourcePlugin, pluginFile);
    console.log('📦 Installed memory plugin for agent coordination');
  } else {
    // Create plugin file directly if source doesn't exist
    const pluginContent = `import { type Plugin, tool } from "@opencode-ai/plugin"

// Simple in-memory storage for coordination between agents
const memoryStore = new Map<string, any>()

export const MemoryToolsPlugin: Plugin = async () => {
  return {
    tool: {
      // Store a value in memory
      memory_set: tool({
        description: "Store a value in shared memory for agent coordination",
        args: {
          key: tool.schema.string().describe("Memory key (e.g., 'swarm/coder/status')"),
          value: tool.schema.string().describe("Value to store (will be JSON stringified)"),
          namespace: tool.schema.string().optional().describe("Optional namespace for organization"),
        },
        async execute(args) {
          try {
            const fullKey = args.namespace ? \`\${args.namespace}:\${args.key}\` : args.key
            const parsedValue = JSON.parse(args.value)
            memoryStore.set(fullKey, {
              value: parsedValue,
              timestamp: Date.now(),
              namespace: args.namespace || 'default'
            })
            return \`✅ Stored memory: \${fullKey}\`
          } catch (error: any) {
            return \`❌ Error storing memory: \${error.message}\`
          }
        },
      }),

      // Retrieve a value from memory
      memory_get: tool({
        description: "Retrieve a value from shared memory",
        args: {
          key: tool.schema.string().describe("Memory key to retrieve"),
          namespace: tool.schema.string().optional().describe("Optional namespace"),
        },
        async execute(args) {
          try {
            const fullKey = args.namespace ? \`\${args.namespace}:\${args.key}\` : args.key
            const memory = memoryStore.get(fullKey)
            
            if (!memory) {
              return \`❌ Memory not found: \${fullKey}\`
            }
            
            return JSON.stringify({
              key: fullKey,
              value: memory.value,
              timestamp: memory.timestamp,
              namespace: memory.namespace,
              age: Date.now() - memory.timestamp
            }, null, 2)
          } catch (error: any) {
            return \`❌ Error retrieving memory: \${error.message}\`
          }
        },
      }),

      // Search memory keys by pattern
      memory_search: tool({
        description: "Search memory keys by pattern",
        args: {
          pattern: tool.schema.string().describe("Search pattern (supports wildcards)"),
          namespace: tool.schema.string().optional().describe("Optional namespace to limit search"),
        },
        async execute(args) {
          try {
            const searchPattern = args.namespace ? \`\${args.namespace}:\${args.pattern}\` : args.pattern
            const regex = new RegExp(searchPattern.replace(/\\*/g, '.*'))
            
            const results = Array.from(memoryStore.entries())
              .filter(([key]) => regex.test(key))
              .map(([key, memory]) => ({
                key,
                value: memory.value,
                timestamp: memory.timestamp,
                namespace: memory.namespace,
                age: Date.now() - memory.timestamp
              }))
            
            return JSON.stringify({
              pattern: searchPattern,
              count: results.length,
              results: results
            }, null, 2)
          } catch (error: any) {
            return \`❌ Error searching memory: \${error.message}\`
          }
        },
      }),

      // List all memory keys
      memory_list: tool({
        description: "List all memory keys, optionally filtered by namespace",
        args: {
          namespace: tool.schema.string().optional().describe("Optional namespace to filter"),
        },
        async execute(args) {
          try {
            const entries = Array.from(memoryStore.entries())
              .filter(([, memory]) => !args.namespace || memory.namespace === args.namespace)
            
            return JSON.stringify({
              namespace: args.namespace || 'all',
              count: entries.length,
              keys: entries.map(([key, memory]) => ({
                key,
                namespace: memory.namespace,
                timestamp: memory.timestamp,
                age: Date.now() - memory.timestamp
              }))
            }, null, 2)
          } catch (error: any) {
            return \`❌ Error listing memory: \${error.message}\`
          }
        },
      }),

      // Delete memory
      memory_delete: tool({
        description: "Delete a memory entry",
        args: {
          key: tool.schema.string().describe("Memory key to delete"),
          namespace: tool.schema.string().optional().describe("Optional namespace"),
        },
        async execute(args) {
          try {
            const fullKey = args.namespace ? \`\${args.namespace}:\${args.key}\` : args.key
            const deleted = memoryStore.delete(fullKey)
            
            if (deleted) {
              return \`✅ Deleted memory: \${fullKey}\`
            } else {
              return \`❌ Memory not found: \${fullKey}\`
            }
          } catch (error: any) {
            return \`❌ Error deleting memory: \${error.message}\`
          }
        },
      }),

      // Clear all memory or specific namespace
      memory_clear: tool({
        description: "Clear all memory or specific namespace",
        args: {
          namespace: tool.schema.string().optional().describe("Optional namespace to clear"),
          confirm: tool.schema.boolean().describe("Confirmation required for clearing all memory"),
        },
        async execute(args) {
          try {
            if (!args.namespace && !args.confirm) {
              return \`❌ Confirmation required. Set confirm: true to clear all memory.\`
            }
            
            if (args.namespace) {
              // Clear specific namespace
              const keysToDelete = Array.from(memoryStore.entries())
                .filter(([, memory]) => memory.namespace === args.namespace)
                .map(([key]) => key)
              
              keysToDelete.forEach(key => memoryStore.delete(key))
              return \`✅ Cleared \${keysToDelete.length} memories from namespace: \${args.namespace}\`
            } else {
              // Clear all memory
              const count = memoryStore.size
              memoryStore.clear()
              return \`✅ Cleared all \${count} memory entries\`
            }
          } catch (error: any) {
            return \`❌ Error clearing memory: \${error.message}\`
          }
        },
      }),
    },
  }
}`;
    
    fs.writeFileSync(pluginFile, pluginContent, 'utf8');
    console.log('📦 Created memory plugin for agent coordination');
  }
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
            // Keep the relative path structure (sdd/file.md, core/file.md)
            return filePath;
          }
        })
      );
    }

    clearObsoleteFiles(agentsDir, expectedFiles, [config.extension], results);
  }

  // Create agents directory
  fs.mkdirSync(agentsDir, { recursive: true });

  // Install memory plugin
  await installMemoryPlugin(cwd);

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

    const pathPrefix = 'agents/';
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
    // Process files individually - create both sdd/ and core/ subdirectory structures
    await processBatch(
      agentFiles, // Files with relative paths (sdd/file.md, core/file.md)
      agentsDir, // Target to .opencode/agent/
      config.extension,
      processContent,
      config.flatten,
      results,
      'agents/' // PathPrefix for source file reading
    );

    displayResults(results, agentsDir, config.name, 'Install');
  }
}