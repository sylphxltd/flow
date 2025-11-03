/**
 * File Autocomplete - Pure functions for @ file autocomplete
 * @module features/autocomplete/utils/file-autocomplete
 */

/**
 * File autocomplete result
 */
export interface FileAutocompleteResult {
  /** Filtered files matching query */
  files: Array<{ path: string; relativePath: string; size: number }>;
  /** Query string after @ */
  query: string;
  /** Whether @ tag is active */
  hasAt: boolean;
  /** Position of @ symbol */
  atIndex: number;
}

/**
 * Check if character is whitespace
 * @pure No side effects
 */
function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

/**
 * Detect @ tag and extract query for file autocomplete
 * @pure No side effects
 *
 * Returns { hasAt: false } if:
 * - No @ found before cursor
 * - @ is part of email (preceded by non-whitespace)
 * - Query contains space (moved past this @)
 *
 * @example
 * detectFileTag("hello @src/", 11)
 * // { files: [], query: "src/", hasAt: true, atIndex: 6 }
 *
 * detectFileTag("email@example.com", 17)
 * // { files: [], query: "", hasAt: false, atIndex: 5 }
 *
 * detectFileTag("@file test", 10)
 * // { files: [], query: "", hasAt: false, atIndex: 0 } (space in query)
 */
export function detectFileTag(
  input: string,
  cursor: number
): { query: string; hasAt: boolean; atIndex: number } {
  // Find @ symbol before cursor position
  const textBeforeCursor = input.slice(0, cursor);
  const atIndex = textBeforeCursor.lastIndexOf('@');

  if (atIndex === -1) {
    return { query: '', hasAt: false, atIndex: -1 };
  }

  // Check character before @ to avoid triggering on emails (user@example.com)
  // Only trigger if @ is at start OR preceded by whitespace/newline
  if (atIndex > 0) {
    const charBeforeAt = textBeforeCursor[atIndex - 1];
    if (!isWhitespace(charBeforeAt)) {
      // @ is preceded by non-whitespace (likely email), don't trigger
      return { query: '', hasAt: false, atIndex };
    }
  }

  // Extract query after @ up to cursor
  const query = textBeforeCursor.slice(atIndex + 1);

  // Don't show suggestions if there's a space in the query
  // (user has moved past this @ token)
  if (query.includes(' ')) {
    return { query: '', hasAt: false, atIndex };
  }

  return { query, hasAt: true, atIndex };
}

/**
 * Get file autocomplete suggestions
 * @pure No side effects
 *
 * @example
 * getFileAutocomplete(files, "hello @src/", 11)
 * // Files matching "src/"
 *
 * getFileAutocomplete(files, "@", 1, 10)
 * // First 10 files
 */
export function getFileAutocomplete(
  files: Array<{ path: string; relativePath: string; size: number }>,
  input: string,
  cursor: number,
  limit: number = 10
): FileAutocompleteResult {
  const { query, hasAt, atIndex } = detectFileTag(input, cursor);

  if (!hasAt) {
    return { files: [], query: '', hasAt: false, atIndex };
  }

  // Filter files based on query (case-insensitive)
  const lowerQuery = query.toLowerCase();
  const filtered = files.filter(file =>
    file.relativePath.toLowerCase().includes(lowerQuery)
  );

  return {
    files: filtered.slice(0, limit),
    query,
    hasAt: true,
    atIndex,
  };
}

/**
 * Replace @ tag with selected file path
 * @pure No side effects
 *
 * @example
 * replaceFileTag("hello @src/", 11, 6, "src/index.ts")
 * // { text: "hello @src/index.ts", cursor: 19 }
 */
export function replaceFileTag(
  input: string,
  cursor: number,
  atIndex: number,
  selectedPath: string
): { text: string; cursor: number } {
  // Replace from @ to cursor with @selectedPath
  const before = input.slice(0, atIndex);
  const after = input.slice(cursor);
  const newText = `${before}@${selectedPath}${after}`;
  const newCursor = atIndex + 1 + selectedPath.length;

  return {
    text: newText,
    cursor: newCursor,
  };
}
