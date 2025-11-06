/**
 * File Scanner
 * Scan project files for @file auto-completion with caching
 */
import { readdir, readFile as fsReadFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
// Default ignore patterns
const DEFAULT_IGNORE = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.vercel',
    '.turbo',
    'coverage',
    '.cache',
    '.sylphx',
    'bun.lock',
    'package-lock.json',
    'yarn.lock',
];
/**
 * Load .gitignore patterns
 */
async function loadGitignore(rootPath) {
    const patterns = new Set(DEFAULT_IGNORE);
    try {
        const gitignorePath = join(rootPath, '.gitignore');
        const content = await readFile(gitignorePath, 'utf8');
        // Parse gitignore file
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            // Skip empty lines and comments
            if (trimmed && !trimmed.startsWith('#')) {
                // Remove trailing slashes
                const pattern = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
                patterns.add(pattern);
            }
        }
    }
    catch {
        // No .gitignore file, use defaults only
    }
    return patterns;
}
/**
 * Check if path should be ignored
 */
function shouldIgnore(relativePath, patterns) {
    // Check if any part of the path matches ignore patterns
    const parts = relativePath.split('/');
    for (const pattern of patterns) {
        // Exact match
        if (relativePath === pattern)
            return true;
        // Directory match
        if (parts.includes(pattern))
            return true;
        // Glob pattern (basic support for *)
        if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            if (regex.test(relativePath))
                return true;
        }
    }
    return false;
}
/**
 * Recursively scan directory for files (parallelized)
 */
async function scanDirectory(dirPath, rootPath, patterns, results = []) {
    try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        // Separate files and directories for parallel processing
        const files = [];
        const directories = [];
        for (const entry of entries) {
            const fullPath = join(dirPath, entry.name);
            const relativePath = relative(rootPath, fullPath);
            // Skip ignored paths
            if (shouldIgnore(relativePath, patterns)) {
                continue;
            }
            if (entry.isDirectory()) {
                directories.push(entry);
            }
            else if (entry.isFile()) {
                files.push(entry);
            }
        }
        // Process files in parallel (no need to stat each one individually)
        // Use entry.isFile() which we already know, skip stat() call for performance
        const fileResults = files.map((entry) => {
            const fullPath = join(dirPath, entry.name);
            const relativePath = relative(rootPath, fullPath);
            return {
                path: fullPath,
                relativePath,
                size: 0, // We skip stat() for performance, size not critical for autocomplete
            };
        });
        results.push(...fileResults);
        // Process subdirectories in parallel
        if (directories.length > 0) {
            const subdirResults = await Promise.all(directories.map((entry) => {
                const fullPath = join(dirPath, entry.name);
                return scanDirectory(fullPath, rootPath, patterns, []);
            }));
            // Flatten results from all subdirectories
            for (const subdirResult of subdirResults) {
                results.push(...subdirResult);
            }
        }
    }
    catch (error) {
        // Skip directories we can't read
    }
    return results;
}
// Cache for scanned files
const CACHE_DIR = join(homedir(), '.sylphx', 'cache');
const CACHE_VERSION = 1;
/**
 * Get cache file path for a project
 */
function getCachePath(rootPath) {
    // Use hash of root path as cache filename
    const hash = Buffer.from(rootPath).toString('base64').replace(/[/+=]/g, '_');
    return join(CACHE_DIR, `filescan-${hash}.json`);
}
/**
 * Load cached file list if valid
 */
async function loadCache(rootPath) {
    try {
        const cachePath = getCachePath(rootPath);
        const content = await fsReadFile(cachePath, 'utf8');
        const cache = JSON.parse(content);
        // Validate cache
        if (cache.version !== CACHE_VERSION || cache.rootPath !== rootPath) {
            return null;
        }
        // Check if cache is still fresh (less than 5 minutes old)
        const age = Date.now() - cache.timestamp;
        const MAX_CACHE_AGE = 5 * 60 * 1000; // 5 minutes
        if (age > MAX_CACHE_AGE) {
            return null;
        }
        return cache.files;
    }
    catch {
        return null;
    }
}
/**
 * Save file list to cache
 */
async function saveCache(rootPath, files) {
    try {
        const cachePath = getCachePath(rootPath);
        const cache = {
            version: CACHE_VERSION,
            rootPath,
            timestamp: Date.now(),
            files,
        };
        // Ensure cache directory exists
        const { mkdir } = await import('node:fs/promises');
        await mkdir(CACHE_DIR, { recursive: true });
        // Write cache file
        await writeFile(cachePath, JSON.stringify(cache), 'utf8');
    }
    catch (error) {
        // Ignore cache write errors
        console.warn('Failed to write file scanner cache:', error);
    }
}
/**
 * Scan project files with caching
 * Returns list of files respecting .gitignore
 */
export async function scanProjectFiles(rootPath) {
    // Try to load from cache first
    const cached = await loadCache(rootPath);
    if (cached) {
        return cached;
    }
    // Cache miss or stale, scan filesystem
    const patterns = await loadGitignore(rootPath);
    const files = await scanDirectory(rootPath, rootPath, patterns);
    // Sort by path for consistent ordering
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    // Save to cache for next time
    saveCache(rootPath, files).catch(() => {
        // Ignore cache save errors
    });
    return files;
}
/**
 * Filter files by query string
 */
export function filterFiles(files, query) {
    if (!query)
        return files;
    const lowerQuery = query.toLowerCase();
    return files.filter((file) => file.relativePath.toLowerCase().includes(lowerQuery));
}
//# sourceMappingURL=file-scanner.js.map