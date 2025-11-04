import { useMemo } from 'react';
import { filterFiles, type FileInfo } from '@sylphx/code-core';

export interface FileFilterResult {
  files: FileInfo[];
  query: string;
  hasAt: boolean;
  atIndex: number;
}

/**
 * Hook to handle file autocomplete when @ is typed
 *
 * PERFORMANCE: Memoized to avoid recalculating on every render
 *
 * @param input - Current input text
 * @param cursor - Current cursor position
 * @param projectFiles - Available project files
 * @returns Filtered file result with autocomplete suggestions
 */
export function useFileAutocomplete(
  input: string,
  cursor: number,
  projectFiles: FileInfo[]
): FileFilterResult {
  return useMemo(() => {
    // Find @ symbol before cursor position
    const textBeforeCursor = input.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex === -1) return { files: [], query: '', hasAt: false, atIndex: -1 };

    // Only trigger if cursor is AFTER the @ symbol
    // This prevents autocomplete when cursor is before @ (e.g., |@ should not trigger)
    if (cursor <= atIndex) {
      return { files: [], query: '', hasAt: false, atIndex };
    }

    // Check character before @ to avoid triggering on emails (user@example.com)
    // Only trigger if @ is at start OR preceded by whitespace/newline
    if (atIndex > 0) {
      const charBeforeAt = textBeforeCursor[atIndex - 1];
      if (!charBeforeAt) {
        return { files: [], query: '', hasAt: false, atIndex };
      }
      const isWhitespace = /\s/.test(charBeforeAt); // space, tab, newline, etc.
      if (!isWhitespace) {
        // @ is preceded by non-whitespace (likely email), don't trigger
        return { files: [], query: '', hasAt: false, atIndex };
      }
    }

    // Extract query after @ up to cursor
    const query = textBeforeCursor.slice(atIndex + 1);

    // Don't show suggestions if there's a space in the query
    // (user has moved past this @ token)
    if (query.includes(' ')) return { files: [], query: '', hasAt: false, atIndex };

    // Filter files based on query (filterFiles expects string query)
    const filtered = filterFiles(projectFiles, query || '');

    return { files: filtered.slice(0, 10), query, hasAt: true, atIndex }; // Limit to 10 results
  }, [input, cursor, projectFiles]); // Only recompute when these change
}
