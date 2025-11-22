/**
 * File processing and batch operation utilities
 */

import path from 'node:path';
import { ensureDirectory, readFileSafe, writeFileSafe } from '../../utils/files/file-operations.js';
import { getLocalFileInfo } from '../files/index.js';
import { log } from '../logging/index.js';
import type { ProcessResult } from '../types/index.js';

/**
 * Process a batch of files with content transformation
 * @param filePaths - Array of file paths to process
 * @param targetDir - Target directory
 * @param extension - Target file extension
 * @param processContent - Function to transform content
 * @param flatten - Whether to flatten directory structure
 * @param results - Array to store process results
 * @param pathPrefix - Prefix for source file paths
 */
export async function processBatch(
  filePaths: string[],
  targetDir: string,
  extension: string,
  processContent: (content: string) => string,
  flatten: boolean,
  results: ProcessResult[],
  pathPrefix = ''
): Promise<void> {
  for (const filePath of filePaths) {
    // filePath is now just the filename (e.g., "sdd-constitution.md")
    // not the full path with prefix
    const destPath = flatten
      ? path.join(targetDir, `${path.basename(filePath, path.extname(filePath))}${extension}`)
      : path.join(targetDir, filePath);

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    await ensureDirectory(destDir);

    const localInfo = await getLocalFileInfo(destPath);
    const isNew = !localInfo;

    // Read content from source - construct the full path from project root
    const projectRoot = process.cwd();
    const sourcePath = path.join(projectRoot, pathPrefix, filePath);
    const fileContent = await readFileSafe(sourcePath);
    if (fileContent === null) {
      continue; // Skip if source file doesn't exist
    }
    let content = fileContent;
    content = processContent(content);

    const localProcessed = localInfo ? processContent(localInfo.content) : '';
    const contentChanged = !localInfo || localProcessed !== content;

    if (contentChanged) {
      await writeFileSafe(destPath, content);
      results.push({
        file: path.relative(targetDir, destPath),
        status: isNew ? 'added' : 'updated',
        action: isNew ? 'Created' : 'Updated',
      });
    } else {
      results.push({
        file: path.relative(targetDir, destPath),
        status: 'current',
        action: 'Already current',
      });
    }
  }
}

/**
 * Display processing results with optional verbose output
 * @param results - Array of process results
 * @param targetDir - Target directory
 * @param agentName - Name of agent
 * @param operation - Operation description
 * @param verbose - Whether to show verbose output
 * @param quiet - Whether to suppress all output
 */
export async function displayResults(
  results: ProcessResult[],
  targetDir: string,
  agentName: string,
  operation: string,
  verbose = false,
  quiet = false
): Promise<void> {
  // If quiet mode, don't display anything
  if (quiet) {
    return;
  }

  if (!verbose) {
    // Simple summary for non-verbose mode
    const total = results.length;
    const changed = results.filter((r) => r.status === 'added' || r.status === 'updated').length;

    if (changed > 0) {
      console.log(`✓ ${changed} files updated`);
    } else {
      console.log(`✓ All ${total} files already current`);
    }
    return;
  }

  console.log(`\n📊 ${operation} Results for ${agentName}`);
  console.log('=====================================');

  const grouped = results.reduce(
    (acc, result) => {
      if (!acc[result.status]) {
        acc[result.status] = [];
      }
      acc[result.status].push(result);
      return acc;
    },
    {} as Record<string, ProcessResult[]>
  );

  const statusOrder = ['added', 'updated', 'current', 'skipped'];
  const statusColors = {
    added: 'green',
    updated: 'yellow',
    current: 'blue',
    skipped: 'magenta',
  };

  for (const status of statusOrder) {
    const items = grouped[status];
    if (items && items.length > 0) {
      const color = statusColors[status as keyof typeof statusColors];
      log(`${status.toUpperCase()} (${items.length}):`, color);
      for (const item of items) {
        log(`  ${item.file} - ${item.action}`, color);
      }
      console.log('');
    }
  }

  const total = results.length;
  const changed = results.filter((r) => r.status === 'added' || r.status === 'updated').length;

  if (changed > 0) {
    log(`✓ ${operation} complete: ${changed}/${total} files modified`, 'green');
  } else {
    log(`✓ ${operation} complete: All ${total} files already current`, 'blue');
  }

  console.log(`📁 Target directory: ${targetDir}`);
}
