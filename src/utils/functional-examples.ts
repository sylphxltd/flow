/**
 * Functional Programming Usage Examples
 * Real-world examples showing how to use functional utilities
 */

import {
  filter,
  map,
  pipe,
  reduce,
  sortBy,
  take,
  tap,
  tryCatch,
  mapResult,
  flow,
  groupBy,
  uniqueBy,
  flatMap,
} from './functional.js';

// ============================================================================
// EXAMPLE 1: Data Processing Pipeline
// ============================================================================

interface User {
  id: number;
  name: string;
  age: number;
  email: string;
  active: boolean;
}

/**
 * Process users: filter active, normalize emails, sort by age, take top 5
 */
export const processUsers = (users: User[]) =>
  pipe(
    users,
    filter((u: User) => u.active),
    map((u: User) => ({ ...u, email: u.email.toLowerCase() })),
    sortBy('age'),
    take(5)
  );

// ============================================================================
// EXAMPLE 2: Search Results Processing
// ============================================================================

interface SearchResult {
  path: string;
  score: number;
  content: string;
}

/**
 * Process search results: filter by score, deduplicate, sort, limit
 */
export const processSearchResults = (results: SearchResult[], minScore = 0.5, limit = 10) =>
  pipe(
    results,
    filter((r: SearchResult) => r.score >= minScore),
    uniqueBy('path'),
    sortBy('score'),
    take(limit)
  );

// ============================================================================
// EXAMPLE 3: Error-Safe JSON Parsing
// ============================================================================

/**
 * Safe JSON parse with transformation
 */
export const parseAndExtractName = (jsonString: string) =>
  pipe(
    jsonString,
    (str) => tryCatch(() => JSON.parse(str)),
    mapResult((obj: any) => obj.name || 'Unknown')
  );

// Usage:
// const result = parseAndExtractName('{"name":"Alice"}');
// if (result.ok) console.log(result.value); // "Alice"
// else console.error(result.error);

// ============================================================================
// EXAMPLE 4: File System Processing
// ============================================================================

interface FileInfo {
  path: string;
  size: number;
  mtime: number;
  extension: string;
}

/**
 * Process files: filter by extension, group by extension, get stats
 */
export const analyzeFiles = (files: FileInfo[]) => {
  const validExtensions = ['.ts', '.tsx', '.js', '.jsx'];

  return pipe(
    files,
    filter((f: FileInfo) => validExtensions.includes(f.extension)),
    tap((files) => console.log(`Processing ${files.length} files`)),
    groupBy('extension')
  );
};

/**
 * Get total size per extension
 */
export const getTotalSizeByExtension = (files: FileInfo[]) =>
  pipe(
    files,
    groupBy('extension'),
    (grouped) => Object.entries(grouped),
    map(([ext, files]) => ({
      extension: ext,
      totalSize: pipe(
        files,
        reduce((acc: number, f: FileInfo) => acc + f.size, 0)
      ),
      count: files.length,
    })),
    sortBy('totalSize')
  );

// ============================================================================
// EXAMPLE 5: Composable Transformations
// ============================================================================

/**
 * Create reusable transformation functions
 */
export const filterActive = filter((u: User) => u.active);
export const normalizeEmail = map((u: User) => ({
  ...u,
  email: u.email.toLowerCase()
}));
export const sortByAge = sortBy('age');
export const takeTop5 = take(5);

/**
 * Compose transformations
 */
export const getTopActiveUsers = flow(
  filterActive,
  normalizeEmail,
  sortByAge,
  takeTop5
);

// Usage:
// const topUsers = getTopActiveUsers(allUsers);

// ============================================================================
// EXAMPLE 6: Search Index Building (Real Use Case)
// ============================================================================

interface Document {
  uri: string;
  content: string;
}

interface IndexedDocument {
  uri: string;
  terms: Map<string, number>;
  magnitude: number;
}

/**
 * Build search index using functional pipeline
 */
export const buildSearchIndex = (documents: Document[]) =>
  pipe(
    documents,
    // Tokenize and count terms
    map((doc: Document) => {
      const terms = new Map<string, number>();
      const tokens = doc.content.toLowerCase().split(/\s+/);
      for (const token of tokens) {
        terms.set(token, (terms.get(token) || 0) + 1);
      }
      return { uri: doc.uri, terms };
    }),
    // Calculate magnitude
    map((doc) => {
      const magnitude = Math.sqrt(
        Array.from(doc.terms.values()).reduce((acc, val) => acc + val * val, 0)
      );
      return { ...doc, magnitude };
    }),
    // Filter out empty documents
    filter((doc: IndexedDocument) => doc.magnitude > 0)
  );

// ============================================================================
// EXAMPLE 7: Nested Array Processing
// ============================================================================

interface Category {
  name: string;
  items: Array<{ id: number; name: string }>;
}

/**
 * Flatten categories and get all item names
 */
export const getAllItemNames = (categories: Category[]) =>
  pipe(
    categories,
    flatMap((cat: Category) => cat.items),
    map((item) => item.name),
    uniqueBy((name) => name as any)
  );

// ============================================================================
// EXAMPLE 8: Conditional Processing
// ============================================================================

/**
 * Apply transformation only if condition is met
 */
export const when =
  <T>(predicate: (value: T) => boolean, fn: (value: T) => T) =>
  (value: T): T =>
    predicate(value) ? fn(value) : value;

/**
 * Process users with conditional transformations
 */
export const processUsersConditionally = (users: User[], includeInactive = false) =>
  pipe(
    users,
    when(
      () => !includeInactive,
      filter((u: User) => u.active)
    ),
    normalizeEmail,
    sortByAge
  );

// ============================================================================
// EXAMPLE 9: Debugging Pipelines
// ============================================================================

/**
 * Debug pipeline with tap at each step
 */
export const debugProcessUsers = (users: User[]) =>
  pipe(
    users,
    tap((u) => console.log('Initial:', u.length)),
    filter((u: User) => u.active),
    tap((u) => console.log('After filter:', u.length)),
    map((u: User) => ({ ...u, email: u.email.toLowerCase() })),
    tap((u) => console.log('After normalize:', u.length)),
    sortBy('age'),
    tap((u) => console.log('After sort:', u.length)),
    take(5),
    tap((u) => console.log('Final:', u.length))
  );

// ============================================================================
// EXAMPLE 10: Type-Safe Property Access
// ============================================================================

/**
 * Extract specific properties from objects
 */
export const extractUserEmails = (users: User[]) =>
  pipe(
    users,
    filter((u: User) => u.active),
    map((u) => u.email)
  );

/**
 * Transform to specific shape
 */
export const toUserSummary = (users: User[]) =>
  pipe(
    users,
    map((u: User) => ({
      id: u.id,
      displayName: u.name,
      emailDomain: u.email.split('@')[1],
    }))
  );

// ============================================================================
// USAGE IN REAL CODE
// ============================================================================

/**
 * Example: Search service using functional pipeline
 */
export const searchFiles = (
  files: FileInfo[],
  query: string,
  options: { minSize?: number; extensions?: string[]; limit?: number } = {}
) => {
  const { minSize = 0, extensions = [], limit = 10 } = options;

  return pipe(
    files,
    // Apply filters
    filter((f: FileInfo) => f.size >= minSize),
    filter((f: FileInfo) =>
      extensions.length === 0 || extensions.includes(f.extension)
    ),
    filter((f: FileInfo) =>
      f.path.toLowerCase().includes(query.toLowerCase())
    ),
    // Sort by most recently modified
    sortBy('mtime'),
    // Limit results
    take(limit),
    // Log final count
    tap((files) => console.log(`Found ${files.length} files`))
  );
};

/**
 * Example: Process API response
 */
export const processAPIResponse = <T>(response: unknown) =>
  pipe(
    response,
    // Safe parse
    (data) => tryCatch(() => data as T),
    // Transform if successful
    mapResult((data: T) => {
      console.log('Successfully parsed response');
      return data;
    })
  );
