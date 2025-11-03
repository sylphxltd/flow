/**
 * Project Detection Utilities
 * Pure functions for detecting project type and package manager
 */

// ===== Types =====

export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface ProjectInfo {
  type: string;
  packageManager: string;
  name?: string;
  version?: string;
  description?: string;
}

// ===== Project Type Detection =====

/**
 * Detect if project has TypeScript
 * Pure - checks package.json fields
 */
export function hasTypeScript(packageJson: PackageJson): boolean {
  return !!(
    packageJson.devDependencies?.typescript ||
    packageJson.dependencies?.typescript ||
    packageJson.devDependencies?.['@types/node'] ||
    packageJson.scripts?.build?.includes('tsc') ||
    packageJson.scripts?.dev?.includes('ts-node')
  );
}

/**
 * Detect if project has React
 * Pure - checks package.json fields
 */
export function hasReact(packageJson: PackageJson): boolean {
  return !!(
    packageJson.dependencies?.react ||
    packageJson.devDependencies?.react ||
    packageJson.scripts?.dev?.includes('vite') ||
    packageJson.scripts?.build?.includes('vite')
  );
}

/**
 * Detect if project has Next.js
 * Pure - checks package.json fields
 */
export function hasNext(packageJson: PackageJson): boolean {
  return !!(
    packageJson.dependencies?.next ||
    packageJson.devDependencies?.next ||
    packageJson.scripts?.dev === 'next dev' ||
    packageJson.scripts?.build === 'next build'
  );
}

/**
 * Detect project type from package.json
 * Pure - based on dependencies and scripts
 */
export function detectProjectType(packageJson: PackageJson): string {
  if (hasNext(packageJson)) {
    return 'next.js';
  }

  if (hasReact(packageJson)) {
    return 'react';
  }

  if (hasTypeScript(packageJson)) {
    return 'typescript';
  }

  return 'javascript';
}

// ===== Package Manager Detection =====

/**
 * Extract package manager from packageManager field
 * Pure - string parsing
 */
export function extractPackageManager(packageManagerField: string): string | null {
  if (!packageManagerField) {
    return null;
  }

  // Extract manager name from "bun@1.3.1" format
  const managerName = packageManagerField.split('@')[0];

  if (['npm', 'yarn', 'pnpm', 'bun'].includes(managerName)) {
    return managerName;
  }

  return null;
}

/**
 * Detect package manager from files present in directory
 * Pure - based on file list
 */
export function detectPackageManagerFromFiles(files: string[]): string {
  const lockFiles = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'yarn.lock', manager: 'yarn' },
    { file: 'package-lock.json', manager: 'npm' },
    { file: 'bun.lockb', manager: 'bun' },
  ];

  for (const { file, manager } of lockFiles) {
    if (files.includes(file)) {
      return manager;
    }
  }

  return 'npm'; // Default
}

/**
 * Determine package manager with priority
 * Pure - combines multiple detection methods
 */
export function determinePackageManager(
  packageJson: PackageJson | null,
  files: string[]
): string {
  // First priority: explicit packageManager field
  if (packageJson?.packageManager) {
    const extracted = extractPackageManager(packageJson.packageManager);
    if (extracted) {
      return extracted;
    }
  }

  // Second priority: lock files
  return detectPackageManagerFromFiles(files);
}

// ===== Project Info Building =====

/**
 * Build project info from package.json and files
 * Pure - combines detection results
 */
export function buildProjectInfo(
  packageJson: PackageJson | null,
  files: string[]
): ProjectInfo {
  if (!packageJson) {
    return {
      type: 'unknown',
      packageManager: 'none',
      description: 'No package.json found',
    };
  }

  return {
    type: detectProjectType(packageJson),
    packageManager: determinePackageManager(packageJson, files),
    name: packageJson.name || 'unnamed',
    version: packageJson.version || '0.0.0',
    description: packageJson.description || '',
  };
}
