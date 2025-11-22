/**
 * Prompt Resolution Utilities
 * Handle file input (@file.txt) and prompt loading
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import chalk from 'chalk';

/**
 * Resolve prompt - handle file input if needed
 * Supports @filename syntax: @prompt.txt or @/path/to/prompt.txt
 */
export async function resolvePrompt(prompt: string | undefined): Promise<string | undefined> {
  if (!prompt) return prompt;

  // Check for file input syntax: @filename
  if (prompt.startsWith('@')) {
    const filePath = prompt.slice(1); // Remove @ prefix

    try {
      const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      const content = await fs.readFile(resolvedPath, 'utf-8');
      console.log(chalk.dim(`  ✓ Loaded prompt from: ${filePath}\n`));
      return content.trim();
    } catch (error) {
      throw new Error(`Failed to read prompt file: ${filePath}`);
    }
  }

  return prompt;
}
