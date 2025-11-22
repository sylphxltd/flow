/**
 * JSONC (JSON with Comments) utilities
 * Simple parser for JSON files that support comments
 */

import fs from 'node:fs/promises';

/**
 * Remove comments from JSONC content
 */
function stripComments(content: string): string {
  // Remove single-line comments (// ...)
  let result = content.replace(/\/\/.*$/gm, '');

  // Remove multi-line comments (/* ... */)
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  return result;
}

/**
 * Read and parse JSONC file
 */
export async function readJSONCFile(filePath: string): Promise<any> {
  const content = await fs.readFile(filePath, 'utf-8');
  const stripped = stripComments(content);
  return JSON.parse(stripped);
}

/**
 * Write JSONC file (writes as regular JSON)
 */
export async function writeJSONCFile(filePath: string, data: any): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
}
