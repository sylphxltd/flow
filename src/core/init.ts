import fs from 'node:fs';
import path from 'node:path';
import { getAllRuleTypes, getRulesPath, ruleFileExists } from '../config/rules.js';
import {
  type CommonOptions,
  type ProcessResult,
  clearObsoleteFiles,
  collectFiles,
  displayResults,
  getLocalFileInfo,
  log,
} from '../shared.js';
import { getAgentsDir, getOutputStylesDir } from '../utils/paths.js';
import { targetManager } from './target-manager.js';

// ============================================================================
// AGENT FILE FUNCTIONS
// ============================================================================

async function getAgentFiles(): Promise<string[]> {
  const agentsDir = getAgentsDir();

  if (!fs.existsSync(agentsDir)) {
    throw new Error(`Could not find agents directory at: ${agentsDir}`);
  }

  const allFiles: string[] = [];

  // First, collect files directly in the agents root directory
  const rootFiles = fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((dirent: fs.Dirent) => dirent.isFile() && dirent.name.endsWith('.md'))
    .map((dirent) => dirent.name);

  allFiles.push(...rootFiles);

  // Then, collect files from subdirectories (excluding 'archived')
  const subdirs = fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((dirent: fs.Dirent) => dirent.isDirectory() && dirent.name !== 'archived')
    .map((dirent) => dirent.name);

  // Collect files from each subdirectory
  for (const subdir of subdirs) {
    const subdirPath = path.join(agentsDir, subdir);
    const files = await collectFiles(subdirPath, ['.md']);
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
  const target = targetManager.getTarget(targetId);

  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }

  if (options.quiet !== true) {
    console.log(`Using target: ${target.name}`);
  }

  const config = target.config;
  const agentsDir = path.join(cwd, config.agentDir);

  // Use the target to process content
  const processContent = async (content: string, sourcePath?: string) => {
    return await target.transformAgentContent(content, undefined, sourcePath);
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
      `Installing ${agentFiles.length} agents to ${agentsDir.replace(`${process.cwd()}/`, '')}`
    );
    console.log('');
  }

  if (options.dryRun) {
    console.log('✓ Dry run completed - no files were modified');
    return;
  }

  // Process files individually - create both sdd/ and core/ subdirectory structures
  const agentsSourceDir = getAgentsDir();

  // Process files in parallel for better performance
  const processPromises = agentFiles.map(async (agentFile) => {
    const sourcePath = path.join(agentsSourceDir, agentFile);
    const destPath = path.join(agentsDir, agentFile);

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const localInfo = await getLocalFileInfo(destPath);
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

  displayResults(results, agentsDir, target.name, 'Install', options.verbose, options.quiet);
}

// ============================================================================
// OUTPUT STYLES INSTALLATION FUNCTION
// ============================================================================

async function getOutputStyleFiles(): Promise<string[]> {
  const outputStylesDir = getOutputStylesDir();

  if (!fs.existsSync(outputStylesDir)) {
    return []; // No output styles available
  }

  const allFiles: string[] = [];

  // Collect all .md files from the output-styles directory
  const files = await collectFiles(outputStylesDir, ['.md']);
  allFiles.push(...files);

  return allFiles;
}

export async function installOutputStyles(options: CommonOptions): Promise<void> {
  const cwd = process.cwd();
  const results: ProcessResult[] = [];

  // Resolve target using the target manager
  const targetId = await targetManager.resolveTarget({ target: options.target });
  const target = targetManager.getTarget(targetId);

  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }

  // Get output style files
  const outputStyleFiles = await getOutputStyleFiles();

  if (outputStyleFiles.length === 0) {
    if (options.quiet !== true) {
      console.log('No output styles available to install');
    }
    return;
  }

  // Handle targets that don't support output styles as separate files (like OpenCode)
  if (!target.config.installation.supportOutputStyles) {
    // For OpenCode, append output styles to AGENTS.md
    if (target.config.rulesFile) {
      const rulesFilePath = path.join(cwd, target.config.rulesFile);

      if (options.dryRun) {
        console.log(`Dry run: Would append ${outputStyleFiles.length} output style${outputStyleFiles.length > 1 ? 's' : ''} to ${target.config.rulesFile}`);
        return;
      }

      // Read existing rules file content if it exists
      let existingContent = '';
      if (fs.existsSync(rulesFilePath)) {
        existingContent = fs.readFileSync(rulesFilePath, 'utf8');
      }

      // Build output styles section
      const outputStylesSourceDir = getOutputStylesDir();
      let outputStylesContent = '\n\n---\n\n# Output Styles\n\n';

      for (const styleFile of outputStyleFiles) {
        const sourcePath = path.join(outputStylesSourceDir, styleFile);
        let content = fs.readFileSync(sourcePath, 'utf8');

        // Strip YAML front matter for system prompt
        if (target.transformRulesContent) {
          content = await target.transformRulesContent(content);
        }

        outputStylesContent += content + '\n\n';
      }

      // Check if output styles section already exists
      const outputStylesMarker = '# Output Styles';
      if (existingContent.includes(outputStylesMarker)) {
        // Replace existing output styles section
        const startIndex = existingContent.indexOf('---\n\n# Output Styles');
        if (startIndex !== -1) {
          existingContent = existingContent.substring(0, startIndex);
        }
      }

      // Append output styles section
      fs.writeFileSync(rulesFilePath, existingContent + outputStylesContent, 'utf8');

      if (options.quiet !== true) {
        console.log(`Appended ${outputStyleFiles.length} output style${outputStyleFiles.length > 1 ? 's' : ''} to ${target.config.rulesFile}`);
      }
    }
    return;
  }

  // Skip if target doesn't have outputStylesDir configured
  if (!target.config.outputStylesDir) {
    return;
  }

  if (options.quiet !== true) {
    console.log(`Using target: ${target.name}`);
  }

  const config = target.config;
  const outputStylesDir = path.join(cwd, config.outputStylesDir);

  // Use the target to process content
  const processContent = async (content: string, sourcePath?: string) => {
    // Output styles use the same transformation as agents
    return await target.transformAgentContent(content, undefined, sourcePath);
  };

  // Clear obsolete output styles if requested
  if (options.clear && fs.existsSync(outputStylesDir)) {
    const outputStyleFiles = await getOutputStyleFiles();
    const expectedFiles = new Set(
      outputStyleFiles.map((filePath) => {
        const parsedPath = path.parse(filePath);
        const baseName = parsedPath.name;
        return `${baseName}${config.agentExtension}`;
      })
    );

    clearObsoleteFiles(outputStylesDir, expectedFiles, [config.agentExtension], results);
  }

  // Create output styles directory
  fs.mkdirSync(outputStylesDir, { recursive: true });

  // Show output styles setup info
  if (options.quiet !== true) {
    console.log(
      `Installing ${outputStyleFiles.length} output style${outputStyleFiles.length > 1 ? 's' : ''} to ${outputStylesDir.replace(`${process.cwd()}/`, '')}`
    );
    console.log('');
  }

  if (options.dryRun) {
    console.log('✓ Dry run completed - no files were modified');
    return;
  }

  // Process files individually
  const outputStylesSourceDir = getOutputStylesDir();

  // Process files in parallel for better performance
  const processPromises = outputStyleFiles.map(async (styleFile) => {
    const sourcePath = path.join(outputStylesSourceDir, styleFile);
    const destPath = path.join(outputStylesDir, styleFile);

    const localInfo = await getLocalFileInfo(destPath);

    // Read content from source
    let content = fs.readFileSync(sourcePath, 'utf8');
    content = await processContent(content, styleFile);

    const localProcessed = localInfo ? await processContent(localInfo.content, styleFile) : '';
    const contentChanged = !localInfo || localProcessed !== content;

    if (contentChanged) {
      fs.writeFileSync(destPath, content, 'utf8');
      results.push({
        file: styleFile,
        status: localInfo ? 'updated' : 'added',
        action: localInfo ? 'Updated' : 'Created',
      });
    } else {
      results.push({
        file: styleFile,
        status: 'current',
        action: 'Already current',
      });
    }
  });

  await Promise.all(processPromises);

  displayResults(results, outputStylesDir, target.name, 'Install', options.verbose, options.quiet);
}

// ============================================================================
// RULES INSTALLATION FUNCTION
// ============================================================================

export async function installRules(options: CommonOptions): Promise<void> {
  const cwd = process.cwd();

  // Resolve target using the target manager
  const targetId = await targetManager.resolveTarget({ target: options.target });
  const target = targetManager.getTarget(targetId);

  if (!target) {
    throw new Error(`Target not found: ${targetId}`);
  }

  // Only install rules if the target has a rulesFile configured
  if (!target.config.rulesFile) {
    return;
  }

  // Read the core rules file
  if (!ruleFileExists('core')) {
    console.warn('⚠️ Core rules file not found');
    return;
  }

  const rulePath = getRulesPath('core');
  let ruleContent = fs.readFileSync(rulePath, 'utf8');

  // Transform rules content if the target provides a transformation method
  if (target.transformRulesContent) {
    ruleContent = await target.transformRulesContent(ruleContent);
  }

  const mergedContent = ruleContent;

  // Rules files are installed in the project root
  const rulesDestPath = path.join(cwd, target.config.rulesFile);

  // Check if rules file already exists and is up to date
  const localInfo = await getLocalFileInfo(rulesDestPath);
  const templateContent = mergedContent;

  if (options.dryRun) {
    console.log(`Dry run: Would install rules file to ${rulesDestPath.replace(`${cwd}/`, '')}`);
    return;
  }

  if (localInfo && localInfo.content === templateContent) {
    if (options.quiet !== true) {
      console.log(`Rules file already current: ${target.config.rulesFile}`);
    }
    return;
  }

  // Write the rules file
  fs.writeFileSync(rulesDestPath, templateContent, 'utf8');

  if (options.quiet !== true) {
    const action = localInfo ? 'Updated' : 'Created';
    console.log(`${action} rules file: ${target.config.rulesFile}`);
  }
}
