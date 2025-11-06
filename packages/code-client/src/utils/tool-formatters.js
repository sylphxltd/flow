/**
 * Tool Formatters
 * Generic utility functions and types for tool display formatting
 * Does not contain tool-specific logic - tools define their own formatters
 */
/**
 * Utility functions
 */
export const truncateString = (str, maxLength = 60) => str.length <= maxLength ? str : str.slice(0, maxLength) + '...';
export const getRelativePath = (filePath) => {
    const cwd = process.cwd();
    return filePath.startsWith(cwd) ? '.' + filePath.slice(cwd.length) : filePath;
};
export const isDefaultCwd = (dir) => !dir || dir === process.cwd();
export const pluralize = (count, singular, plural) => count === 1 ? singular : (plural || `${singular}s`);
//# sourceMappingURL=tool-formatters.js.map