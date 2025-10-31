/**
 * Composable file installer - shared installation logic
 * Used by targets through composition
 */

import fs from 'node:fs';
import path from 'node:path';
import type { CommonOptions, ProcessResult } from '../../shared/index.js';
import { clearObsoleteFiles, collectFiles, getLocalFileInfo } from '../../shared/index.js';

export interface InstallOptions extends CommonOptions {
  /** Custom file extension */
  extension?: string;
  /** Whether to flatten directory structure */
  flatten?: boolean;
  /** Show progress messages */
  showProgress?: boolean;
}

export type FileTransformFn = (content: string, sourcePath?: string) => Promise<string>;

/**
 * Collect files from source directory
 */
async function collectSourceFiles(sourceDir: string, extension: string): Promise<string[]> {
  if (!fs.existsSync(sourceDir)) {
    return [];
  }

  const allFiles: string[] = [];

  // Collect files directly in root
  const rootFiles = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith(extension))
    .map((dirent) => dirent.name);

  allFiles.push(...rootFiles);

  // Collect files from subdirectories (excluding 'archived')
  const subdirs = fs
    .readdirSync(sourceDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && dirent.name !== 'archived')
    .map((dirent) => dirent.name);

  for (const subdir of subdirs) {
    const subdirPath = path.join(sourceDir, subdir);
    const files = await collectFiles(subdirPath, [extension]);
    allFiles.push(...files.map((file) => path.join(subdir, file)));
  }

  return allFiles;
}

/**
 * Install files from source directory to target directory
 */
export async function installToDirectory(
  sourceDir: string,
  targetDir: string,
  transform: FileTransformFn,
  options: InstallOptions = {}
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  // Collect source files
  const files = await collectSourceFiles(sourceDir, options.extension || '.md');

  if (files.length === 0) {
    return results;
  }

  // Clear obsolete files if requested
  if (options.clear && fs.existsSync(targetDir)) {
    const expectedFiles = new Set(
      files.map((file) => {
        if (options.flatten) {
          const parsed = path.parse(file);
          const baseName = parsed.name;
          const dir = parsed.dir;
          const flatName = dir ? `${dir.replace(/[/\\]/g, '-')}-${baseName}` : baseName;
          return `${flatName}${options.extension || '.md'}`;
        }
        return file;
      })
    );

    clearObsoleteFiles(targetDir, expectedFiles, [options.extension || '.md'], results);
  }

  // Create target directory
  fs.mkdirSync(targetDir, { recursive: true });

  if (options.showProgress && !options.quiet) {
    console.log(
      `Installing ${files.length} file${files.length > 1 ? 's' : ''} to ${targetDir.replace(`${process.cwd()}/`, '')}`
    );
    console.log('');
  }

  if (options.dryRun) {
    if (!options.quiet) {
      console.log('✓ Dry run completed - no files were modified');
    }
    return results;
  }

  // Process files in parallel
  const processPromises = files.map(async (file) => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);

    // Ensure target directory exists
    const targetFileDir = path.dirname(targetPath);
    if (!fs.existsSync(targetFileDir)) {
      fs.mkdirSync(targetFileDir, { recursive: true });
    }

    const localInfo = await getLocalFileInfo(targetPath);

    // Read and transform content
    let content = fs.readFileSync(sourcePath, 'utf8');
    content = await transform(content, file);

    const localProcessed = localInfo ? await transform(localInfo.content, file) : '';
    const contentChanged = !localInfo || localProcessed !== content;

    if (contentChanged) {
      fs.writeFileSync(targetPath, content, 'utf8');
      results.push({
        file,
        status: localInfo ? 'updated' : 'added',
        action: localInfo ? 'Updated' : 'Created',
      });
    } else {
      results.push({
        file,
        status: 'current',
        action: 'Already current',
      });
    }
  });

  await Promise.all(processPromises);

  return results;
}

/**
 * Append files from source directory to a single target file
 */
export async function appendToFile(
  sourceDir: string,
  targetFile: string,
  transform: FileTransformFn,
  options: InstallOptions = {}
): Promise<void> {
  // Collect source files
  const files = await collectSourceFiles(sourceDir, options.extension || '.md');

  if (files.length === 0) {
    return;
  }

  if (options.dryRun) {
    if (!options.quiet) {
      console.log(
        `Dry run: Would append ${files.length} file${files.length > 1 ? 's' : ''} to ${targetFile.replace(`${process.cwd()}/`, '')}`
      );
    }
    return;
  }

  // Read existing file content
  let existingContent = '';
  if (fs.existsSync(targetFile)) {
    existingContent = fs.readFileSync(targetFile, 'utf8');
  }

  // Build appended content
  let appendContent = '';
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    let content = fs.readFileSync(sourcePath, 'utf8');
    content = await transform(content, file);
    appendContent += `${content}\n\n`;
  }

  // Write combined content
  fs.writeFileSync(targetFile, existingContent + appendContent, 'utf8');

  if (options.showProgress && !options.quiet) {
    console.log(
      `Appended ${files.length} file${files.length > 1 ? 's' : ''} to ${targetFile.replace(`${process.cwd()}/`, '')}`
    );
  }
}

/**
 * Install a single file from source to target
 */
export async function installFile(
  sourceFile: string,
  targetFile: string,
  transform: FileTransformFn,
  options: InstallOptions = {}
): Promise<void> {
  if (options.dryRun) {
    if (!options.quiet) {
      console.log(`Dry run: Would install file to ${targetFile.replace(`${process.cwd()}/`, '')}`);
    }
    return;
  }

  if (!fs.existsSync(sourceFile)) {
    if (!options.quiet) {
      console.warn(`Source file not found: ${sourceFile}`);
    }
    return;
  }

  // Ensure target directory exists
  const targetDir = path.dirname(targetFile);
  fs.mkdirSync(targetDir, { recursive: true });

  // Check if file already exists and is up to date
  const localInfo = await getLocalFileInfo(targetFile);
  let content = fs.readFileSync(sourceFile, 'utf8');
  content = await transform(content);

  if (localInfo && localInfo.content === content) {
    if (!options.quiet) {
      console.log(`File already current: ${targetFile.replace(`${process.cwd()}/`, '')}`);
    }
    return;
  }

  // Write file
  fs.writeFileSync(targetFile, content, 'utf8');

  if (options.showProgress && !options.quiet) {
    const action = localInfo ? 'Updated' : 'Created';
    console.log(`${action} file: ${targetFile.replace(`${process.cwd()}/`, '')}`);
  }
}

/**
 * File installer interface for backward compatibility
 */
export interface FileInstaller {
  installToDirectory(
    sourceDir: string,
    targetDir: string,
    transform: FileTransformFn,
    options?: InstallOptions
  ): Promise<ProcessResult[]>;
  appendToFile(
    sourceDir: string,
    targetFile: string,
    transform: FileTransformFn,
    options?: InstallOptions
  ): Promise<void>;
  installFile(
    sourceFile: string,
    targetFile: string,
    transform: FileTransformFn,
    options?: InstallOptions
  ): Promise<void>;
}

/**
 * Composable file installer
 * Handles copying files from source to destination with optional transformation
 * @deprecated Use standalone functions (installToDirectory, appendToFile, installFile) for new code
 */
export class FileInstaller {
  async installToDirectory(
    sourceDir: string,
    targetDir: string,
    transform: FileTransformFn,
    options: InstallOptions = {}
  ): Promise<ProcessResult[]> {
    return installToDirectory(sourceDir, targetDir, transform, options);
  }

  async appendToFile(
    sourceDir: string,
    targetFile: string,
    transform: FileTransformFn,
    options: InstallOptions = {}
  ): Promise<void> {
    return appendToFile(sourceDir, targetFile, transform, options);
  }

  async installFile(
    sourceFile: string,
    targetFile: string,
    transform: FileTransformFn,
    options: InstallOptions = {}
  ): Promise<void> {
    return installFile(sourceFile, targetFile, transform, options);
  }
}
