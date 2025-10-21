import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type CommonOptions,
  type ProcessResult,
  clearObsoleteFiles,
  collectFiles,
  displayResults,
  getLocalFileInfo,
  log,
} from '../shared.js';
import { targetManager } from './target-manager.js';

// ============================================================================
// AGENT FILE FUNCTIONS
// ============================================================================

async function getAgentFiles(): Promise<string[]> {
  // Get script directory and resolve agents path using import.meta.url
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const agentsDir = path.join(__dirname, '..', 'agents');

  if (!fs.existsSync(agentsDir)) {
    throw new Error(`Could not find agents directory at: ${agentsDir}`);
  }

  const allFiles: string[] = [];

  // First, collect files directly in the agents root directory
  const rootFiles = fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.md'))
    .map((dirent) => dirent.name);

  allFiles.push(...rootFiles);

  // Then, collect files from subdirectories (excluding 'archived')
  const subdirs = fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && dirent.name !== 'archived')
    .map((dirent) => dirent.name);

  // Collect files from each subdirectory
  for (const subdir of subdirs) {
    const subdirPath = path.join(agentsDir, subdir);
    const files = collectFiles(subdirPath, ['.md']);
    allFiles.push(...files.map((file) => path.join(subdir, file)));
  }

  return allFiles;
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

  // Resolve target using the target manager
  const targetId = await targetManager.resolveTarget({ target: options.target });
  const target = targetManager.getTargetDefinition(targetId);
  const transformer = await targetManager.getTransformer(targetId);

  if (!transformer) {
    throw new Error(`No transformer available for target: ${targetId}`);
  }

  console.log(`📝 Using target: ${target.name}`);

  const config = target.config;
  const agentsDir = path.join(cwd, config.agentDir);

  // Use the transformer to process content
  const processContent = async (content: string, sourcePath?: string) => {
    return await transformer.transformAgentContent(content, undefined, sourcePath);
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
          return `${flattenedName}${config.agentExtension}`;
        }
        // Keep the relative path structure (sdd/file.md, core/file.md)
        return filePath;
      })
    );

    clearObsoleteFiles(agentsDir, expectedFiles, [config.agentExtension], results);
  }

  // Create agents directory
  fs.mkdirSync(agentsDir, { recursive: true });

  // Get agent files
  const agentFiles = await getAgentFiles();

  // Show agent setup info
  if (options.quiet !== true) {
    console.log(
      `📁 Installing ${agentFiles.length} agents to ${agentsDir.replace(`${process.cwd()}/`, '')}`
    );
    console.log('');
  }

  if (options.dryRun) {
    console.log('✅ Dry run completed - no files were modified');
    return;
  }

  // Process files individually - create both sdd/ and core/ subdirectory structures
  // Use same logic as getAgentFiles() - simple path resolution
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const agentsSourceDir = path.join(__dirname, '..', 'agents');

  // Process files in parallel for better performance
  const processPromises = agentFiles.map(async (agentFile) => {
    const sourcePath = path.join(agentsSourceDir, agentFile);
    const destPath = path.join(agentsDir, agentFile);

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const localInfo = getLocalFileInfo(destPath);
    const _isNew = !localInfo;

    // Read content from source
    let content = fs.readFileSync(sourcePath, 'utf8');
    content = await processContent(content, agentFile);

    const localProcessed = localInfo ? await processContent(localInfo.content, agentFile) : '';
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
  });

  await Promise.all(processPromises);

  displayResults(results, agentsDir, target.name, 'Install', options.verbose);
}

// ============================================================================
// RULES INSTALLATION FUNCTION
// ============================================================================

export async function installRules(options: CommonOptions): Promise<void> {
  const cwd = process.cwd();

  // Resolve target using the target manager
  const targetId = await targetManager.resolveTarget({ target: options.target });
  const target = targetManager.getTargetDefinition(targetId);

  // Only install rules if the target has a rulesFile configured
  if (!target.config.rulesFile) {
    return;
  }

  // Get script directory and resolve templates path (use unified rules.md template)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templatePath = path.join(__dirname, '..', 'templates', 'rules', 'rules.md');

  if (!fs.existsSync(templatePath)) {
    console.warn(`⚠️ Rules template not found: ${templatePath}`);
    return;
  }

  // Rules files are installed in the target-specific directory (same level as agents)
  const agentsDir = path.join(cwd, target.config.agentDir);
  const targetDir = path.dirname(agentsDir); // Get parent directory (.claude or .opencode)
  const rulesDestPath = path.join(targetDir, target.config.rulesFile!);

  // Create the directory if it doesn't exist
  fs.mkdirSync(targetDir, { recursive: true });

  // Check if rules file already exists and is up to date
  const localInfo = getLocalFileInfo(rulesDestPath);
  const templateContent = fs.readFileSync(templatePath, 'utf8');

  if (options.dryRun) {
    console.log(`🔍 Dry run: Would install rules file to ${rulesDestPath.replace(`${cwd}/`, '')}`);
    return;
  }

  if (localInfo && localInfo.content === templateContent) {
    if (options.quiet !== true) {
      console.log(`📋 Rules file already current: ${target.config.rulesFile}`);
    }
    return;
  }

  // Write the rules file
  fs.writeFileSync(rulesDestPath, templateContent, 'utf8');

  if (options.quiet !== true) {
    const action = localInfo ? 'Updated' : 'Created';
    console.log(`📋 ${action} rules file: ${target.config.rulesFile}`);
  }
}
