/**
 * Centralized path resolution for all static assets
 *
 * Structure:
 *   assets/ (at project root) - single source of truth
 *
 * Path resolution:
 * - Development: src/utils/paths.ts reads ../assets
 * - Production: dist/xxx.js reads ../assets
 * - No copying needed, both read same location
 */
/**
 * Find package root by walking up directory tree
 * Pure function - finds package.json location
 *
 * @param context - Optional context for error message (e.g., 'assets', 'migrations')
 * @returns Absolute path to package root directory
 * @throws Error if package.json cannot be found within 10 levels
 *
 * @example
 * const root = findPackageRoot(); // 'Cannot find package.json'
 * const root = findPackageRoot('drizzle migrations'); // 'Cannot find package.json - drizzle migrations location unknown'
 */
export declare function findPackageRoot(context?: string): string;
/**
 * Get path to agents directory
 */
export declare function getAgentsDir(): string;
/**
 * Get path to templates directory
 */
export declare function getTemplatesDir(): string;
/**
 * Get path to rules directory
 */
export declare function getRulesDir(): string;
/**
 * Get path to knowledge directory
 */
export declare function getKnowledgeDir(): string;
/**
 * Get path to output styles directory
 */
export declare function getOutputStylesDir(): string;
/**
 * Get path to slash commands directory
 */
export declare function getSlashCommandsDir(): string;
/**
 * Get path to a specific rule file with path traversal protection
 */
export declare function getRuleFile(filename: string): string;
/**
 * Debug info - shows where assets are resolved from
 */
export declare function getPathsInfo(): {
    assetsRoot: string;
    agents: string;
    templates: string;
    rules: string;
    outputStyles: string;
    slashCommands: string;
};
//# sourceMappingURL=paths.d.ts.map