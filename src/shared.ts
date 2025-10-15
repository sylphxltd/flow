import fs from 'fs';
import path from 'path';
import readline from 'readline';
import cliProgress from 'cli-progress';
import Table from 'cli-table3';

// Types
export interface AgentConfig {
  name: string;
  dir: string;
  extension: string;
  stripYaml: boolean;
  flatten: boolean;
  description: string;
}

export interface ProcessResult {
  file: string;
  status: string;
  action: string;
}

export interface CommonOptions {
  agent?: string;
  verbose?: boolean;
  dryRun?: boolean;
  clear?: boolean;
  merge?: boolean;
}

// Colors for output
export const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
} as const;

// Utility functions
export const log = (message: string, color: keyof typeof COLORS = 'reset'): void => {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
};

export const getSupportedAgents = <T extends string>(configs: Record<T, AgentConfig>): T[] => 
  Object.keys(configs) as T[];

export const getAgentConfig = <T extends string>(configs: Record<T, AgentConfig>, agent: T): AgentConfig => 
  configs[agent];

// ============================================================================
// USER INTERACTION
// ============================================================================

export async function promptForAgent<T extends string>(
  configs: Record<T, AgentConfig>,
  toolName: string
): Promise<T> {
  const agents = getSupportedAgents(configs);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log(`\n🚀 ${toolName}`);
    console.log('='.repeat(toolName.length + 4));
    console.log('Please select your AI agent:');
    console.log('');

    agents.forEach((agent, index) => {
      const config = getAgentConfig(configs, agent);
      console.log(`${index + 1}. ${config.name} - ${config.description}`);
    });

    console.log('');

    const askChoice = () => {
      rl.question(`Enter your choice (1-${agents.length}): `, (answer) => {
        const choice = parseInt(answer.trim());
        if (choice >= 1 && choice <= agents.length) {
          rl.close();
          resolve(agents[choice - 1]);
        } else {
          console.log(`❌ Invalid choice. Please enter a number between 1 and ${agents.length}.`);
          askChoice();
        }
      });
    };

    askChoice();
  });
}

export function detectAgentTool<T extends string>(
  configs: Record<T, AgentConfig>,
  defaultAgent: T
): T {
  const cwd = process.cwd();

  // Check for explicit --agent argument (highest priority)
  const agentArg = process.argv.find(arg => arg.startsWith('--agent='));
  if (agentArg) {
    const agent = agentArg.split('=')[1].toLowerCase() as T;
    if (getSupportedAgents(configs).includes(agent)) {
      return agent;
    }
  }

  // Check for existing directories
  for (const agent of getSupportedAgents(configs)) {
    const config = getAgentConfig(configs, agent);
    if (fs.existsSync(path.join(cwd, config.dir))) {
      return agent;
    }
  }

  return defaultAgent;
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

export function getLocalFileInfo(filePath: string): { content: string; exists: true } | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return { content, exists: true };
  } catch {
    return null;
  }
}

export function collectFiles(
  rootDir: string,
  extensions: string[],
  relativePrefix: string = ''
): string[] {
  const files: string[] = [];

  function collect(dir: string, relativePath: string) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        const itemRelative = path.join(relativePath, item.name);
        if (item.isDirectory()) {
          collect(itemPath, itemRelative);
        } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
          files.push(path.join(relativePrefix, itemRelative));
        }
      }
    } catch {
      // Skip directories/files that can't be read
    }
  }

  try {
    collect(rootDir, '');
  } catch {
    console.warn(`⚠️  Could not read directory ${rootDir}, returning empty list`);
    return [];
  }

  return files;
}

export function stripYamlFrontMatter(content: string): string {
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

export function getDescriptionForFile(filePath?: string, type: 'rules' | 'agents' = 'rules'): string {
  const prefix = type === 'rules' ? 'Development rules' : 'Development workflow agent';
  if (!filePath) return prefix;
  const baseName = path.basename(filePath, path.extname(filePath));
  const suffix = type === 'rules' ? `for ${baseName.replace(/-/g, ' ')}` : `for ${baseName.replace(/-/g, ' ')} workflow`;
  return `${prefix} ${suffix}`;
}

// ============================================================================
// FILE PROCESSING
// ============================================================================

export async function processFile(
  filePath: string,
  targetDir: string,
  fileExtension: string,
  processContent: (content: string) => string,
  flatten: boolean,
  results: ProcessResult[],
  progressBar: InstanceType<typeof cliProgress.SingleBar>,
  pathPrefix: string = ''
): Promise<boolean> {
  try {
    // Remove path prefix if present
    const relativePath = pathPrefix ? filePath.substring(pathPrefix.length) : filePath;
    const parsedPath = path.parse(relativePath);
    const baseName = parsedPath.name;
    const dir = parsedPath.dir;

    let finalRelativePath: string;
    let destPath: string;

    if (flatten) {
      const flattenedName = dir ? `${dir.replace(/[\/\\]/g, '-')}-${baseName}` : baseName;
      finalRelativePath = `${flattenedName}${fileExtension}`;
      destPath = path.join(targetDir, finalRelativePath);
    } else {
      const targetSubDir = dir ? path.join(targetDir, dir) : targetDir;
      fs.mkdirSync(targetSubDir, { recursive: true });
      finalRelativePath = path.join(dir, `${baseName}${fileExtension}`);
      destPath = path.join(targetSubDir, `${baseName}${fileExtension}`);
    }

    const localInfo = getLocalFileInfo(destPath);
    const isNew = !localInfo;

    // Read content from source - construct the full path from project root
    const projectRoot = path.resolve(__dirname, '..', '..');
    const sourcePath = path.join(projectRoot, 'modes', 'development-orchestrator', 'opencode-agents', path.basename(filePath));
    let content = fs.readFileSync(sourcePath, 'utf8');
    content = processContent(content);

    const localProcessed = localInfo ? processContent(localInfo.content) : '';
    const contentChanged = !localInfo || localProcessed !== content;

    fs.writeFileSync(destPath, content, 'utf8');

    results.push({
      file: finalRelativePath,
      status: contentChanged ? (isNew ? 'added' : 'updated') : 'current',
      action: contentChanged ? (isNew ? 'Added' : 'Updated') : 'Already current'
    });

    progressBar.increment();
    return contentChanged;
  } catch (error: any) {
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

export function createStatusTable(title: string, items: ProcessResult[]): void {
  if (items.length === 0) return;

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

export function displayResults(
  results: ProcessResult[], 
  targetDir: string, 
  agentName: string,
  operation: 'Sync' | 'Install'
): void {
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
  if (errors.length > 0) createStatusTable('❌ Errors', errors);

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

export async function processBatch<T extends string>(
  files: string[],
  targetDir: string,
  fileExtension: string,
  processContent: (content: string) => string,
  flatten: boolean,
  results: ProcessResult[],
  pathPrefix: string = '',
  batchSize: number = 5
): Promise<void> {
  const progressBar = new cliProgress.SingleBar({
    format: '📋 Processing | {bar} | {percentage}% | {value}/{total} files | {file}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  progressBar.start(files.length, 0, { file: 'Starting...' });

  // Process files in batches
  const batches: string[][] = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const promises = batch.map(filePath =>
      processFile(filePath, targetDir, fileExtension, processContent, flatten, results, progressBar, pathPrefix)
    );
    await Promise.all(promises);
  }

  progressBar.stop();
}

// ============================================================================
// MERGE FUNCTIONALITY
// ============================================================================

export function createMergedContent(
  files: string[],
  processContent: (content: string, filePath?: string) => string,
  title: string,
  pathPrefix: string = ''
): string {
  let mergedContent = `# ${title}\n\n`;
  mergedContent += `Generated on: ${new Date().toISOString()}\n\n`;
  mergedContent += `---\n\n`;

  for (const filePath of files) {
    try {
      const scriptDir = __dirname;
      const sourcePath = path.join(scriptDir, '..', filePath);
      let content = fs.readFileSync(sourcePath, 'utf8');
      content = processContent(content, filePath);

      // Remove path prefix for section title
      const relativePath = pathPrefix ? filePath.substring(pathPrefix.length) : filePath;
      const parsedPath = path.parse(relativePath);
      const baseName = parsedPath.name;
      const dir = parsedPath.dir;

      const sectionTitle = dir ? `${dir}/${baseName}` : baseName;
      mergedContent += `## ${sectionTitle.replace(/-/g, ' ').toUpperCase()}\n\n`;
      mergedContent += `${content}\n\n`;
      mergedContent += `---\n\n`;
    } catch (error: any) {
      // Error handling should be done by the caller
    }
  }

  return mergedContent;
}

// ============================================================================
// CLEANUP FUNCTIONALITY
// ============================================================================

export function clearObsoleteFiles<T extends string>(
  targetDir: string,
  expectedFiles: Set<string>,
  fileExtensions: string[],
  results: ProcessResult[]
): void {
  if (!fs.existsSync(targetDir)) return;

  console.log(`🧹 Clearing obsolete files in ${targetDir}...`);

  // Get existing files
  const existingFiles = fs.readdirSync(targetDir, { recursive: true })
    .filter((file) => typeof file === 'string' && fileExtensions.some(ext => file.endsWith(ext)))
    .map((file) => path.join(targetDir, file as string));

  // Only remove files that are not expected
  for (const file of existingFiles) {
    const relativePath = path.relative(targetDir, file);
    if (!expectedFiles.has(relativePath)) {
      try {
        fs.unlinkSync(file);
        results.push({
          file: relativePath,
          status: 'removed',
          action: 'Removed'
        });
      } catch (error: any) {
        results.push({
          file: relativePath,
          status: 'error',
          action: `Error removing: ${error.message}`
        });
      }
    }
  }
}