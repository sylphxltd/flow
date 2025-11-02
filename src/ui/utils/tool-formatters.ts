/**
 * Tool Formatters
 * Generic utility functions and types for tool display formatting
 * Does not contain tool-specific logic - tools define their own formatters
 */

/**
 * Utility functions
 */
export const truncateString = (str: string, maxLength: number = 60): string =>
  str.length <= maxLength ? str : str.slice(0, maxLength) + '...';

export const getRelativePath = (filePath: string): string => {
  const cwd = process.cwd();
  return filePath.startsWith(cwd) ? '.' + filePath.slice(cwd.length) : filePath;
};

export const isDefaultCwd = (dir: string | undefined): boolean =>
  !dir || dir === process.cwd();

export const pluralize = (count: number, singular: string, plural?: string): string =>
  count === 1 ? singular : (plural || `${singular}s`);

/**
 * Tool formatter types
 */
export type ArgsFormatter = (args: Record<string, unknown>) => string;
export type FormattedResult = { lines: string[]; summary?: string };
export type ResultFormatter = (result: unknown) => FormattedResult;
