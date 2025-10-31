/**
 * Functional string utilities
 * Pure string transformation functions
 *
 * DESIGN RATIONALE:
 * - Pure functions for string operations
 * - Composable transformations
 * - Type-safe operations
 * - No side effects
 */

/**
 * Trim whitespace from string
 */
export const trim = (str: string): string => str.trim();

/**
 * Trim start of string
 */
export const trimStart = (str: string): string => str.trimStart();

/**
 * Trim end of string
 */
export const trimEnd = (str: string): string => str.trimEnd();

/**
 * Convert to lowercase
 */
export const toLowerCase = (str: string): string => str.toLowerCase();

/**
 * Convert to uppercase
 */
export const toUpperCase = (str: string): string => str.toUpperCase();

/**
 * Split string by delimiter
 */
export const split =
  (delimiter: string | RegExp) =>
  (str: string): string[] =>
    str.split(delimiter);

/**
 * Join array of strings
 */
export const join =
  (delimiter: string) =>
  (arr: string[]): string =>
    arr.join(delimiter);

/**
 * Replace pattern in string
 */
export const replace =
  (pattern: string | RegExp, replacement: string) =>
  (str: string): string =>
    str.replace(pattern, replacement);

/**
 * Replace all occurrences
 */
export const replaceAll =
  (pattern: string | RegExp, replacement: string) =>
  (str: string): string =>
    str.replaceAll(pattern, replacement);

/**
 * Check if string starts with prefix
 */
export const startsWith =
  (prefix: string) =>
  (str: string): boolean =>
    str.startsWith(prefix);

/**
 * Check if string ends with suffix
 */
export const endsWith =
  (suffix: string) =>
  (str: string): boolean =>
    str.endsWith(suffix);

/**
 * Check if string includes substring
 */
export const includes =
  (substring: string) =>
  (str: string): boolean =>
    str.includes(substring);

/**
 * Test string against regex
 */
export const test =
  (pattern: RegExp) =>
  (str: string): boolean =>
    pattern.test(str);

/**
 * Match string against regex
 */
export const match =
  (pattern: RegExp) =>
  (str: string): RegExpMatchArray | null =>
    str.match(pattern);

/**
 * Slice string
 */
export const slice =
  (start: number, end?: number) =>
  (str: string): string =>
    str.slice(start, end);

/**
 * Substring
 */
export const substring =
  (start: number, end?: number) =>
  (str: string): string =>
    str.substring(start, end);

/**
 * Pad start of string
 */
export const padStart =
  (length: number, fillString = ' ') =>
  (str: string): string =>
    str.padStart(length, fillString);

/**
 * Pad end of string
 */
export const padEnd =
  (length: number, fillString = ' ') =>
  (str: string): string =>
    str.padEnd(length, fillString);

/**
 * Repeat string n times
 */
export const repeat =
  (count: number) =>
  (str: string): string =>
    str.repeat(count);

/**
 * Check if string is empty
 */
export const isEmpty = (str: string): boolean => str.length === 0;

/**
 * Check if string is blank (empty or whitespace)
 */
export const isBlank = (str: string): boolean => str.trim().length === 0;

/**
 * Check if string is not empty
 */
export const isNotEmpty = (str: string): boolean => str.length > 0;

/**
 * Check if string is not blank
 */
export const isNotBlank = (str: string): boolean => str.trim().length > 0;

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
  if (str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Capitalize all words
 */
export const capitalizeWords = (str: string): string => {
  return str
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
};

/**
 * Convert to camelCase
 */
export const toCamelCase = (str: string): string => {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
};

/**
 * Convert to PascalCase
 */
export const toPascalCase = (str: string): string => {
  const camel = toCamelCase(str);
  return capitalize(camel);
};

/**
 * Convert to kebab-case
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

/**
 * Convert to snake_case
 */
export const toSnakeCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
};

/**
 * Truncate string to max length
 */
export const truncate =
  (maxLength: number, suffix = '...') =>
  (str: string): string => {
    if (str.length <= maxLength) {
      return str;
    }
    return str.slice(0, maxLength - suffix.length) + suffix;
  };

/**
 * Extract lines from string
 */
export const lines = (str: string): string[] => str.split(/\r?\n/);

/**
 * Remove empty lines
 */
export const removeEmptyLines = (str: string): string => {
  return lines(str).filter(isNotBlank).join('\n');
};

/**
 * Indent each line
 */
export const indent =
  (spaces: number) =>
  (str: string): string => {
    const indentation = ' '.repeat(spaces);
    return lines(str)
      .map((line) => indentation + line)
      .join('\n');
  };

/**
 * Remove indentation
 */
export const dedent = (str: string): string => {
  const linesArray = lines(str);

  // Find minimum indentation
  const minIndent = linesArray.filter(isNotBlank).reduce((min, line) => {
    const match = line.match(/^(\s*)/);
    const indent = match ? match[1].length : 0;
    return Math.min(min, indent);
  }, Number.POSITIVE_INFINITY);

  if (minIndent === 0 || minIndent === Number.POSITIVE_INFINITY) {
    return str;
  }

  // Remove minimum indentation from each line
  return linesArray.map((line) => line.slice(minIndent)).join('\n');
};
