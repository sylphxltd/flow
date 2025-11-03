/**
 * Attachment Parser - Pure functions for parsing @ file references
 * @module features/attachments/utils/parser
 */

/**
 * Extract @file references from text
 * @pure No side effects
 *
 * @example
 * extractFileReferences("Check @src/index.ts and @README.md")
 * // ["src/index.ts", "README.md"]
 */
export function extractFileReferences(text: string): string[] {
  const refs: string[] = [];
  const regex = /@([^\s]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    refs.push(match[1]);
  }

  return refs;
}

/**
 * Check if text contains a specific @ file reference
 * @pure No side effects
 *
 * @example
 * hasFileReference("Check @src/index.ts", "src/index.ts")
 * // true
 */
export function hasFileReference(text: string, filePath: string): boolean {
  const refs = extractFileReferences(text);
  return refs.includes(filePath);
}

/**
 * Count @ file references in text
 * @pure No side effects
 */
export function countFileReferences(text: string): number {
  return extractFileReferences(text).length;
}

/**
 * Get unique @ file references (removes duplicates)
 * @pure No side effects
 *
 * @example
 * getUniqueFileReferences("Check @src/index.ts and @src/index.ts again")
 * // ["src/index.ts"]
 */
export function getUniqueFileReferences(text: string): string[] {
  const refs = extractFileReferences(text);
  return Array.from(new Set(refs));
}
