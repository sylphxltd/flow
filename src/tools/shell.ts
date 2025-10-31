/**
 * Shell Tools
 * Tools for executing shell commands
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { tool } from 'ai';
import { z } from 'zod';

const execAsync = promisify(exec);

/**
 * Execute bash command tool
 */
export const executeBashTool = tool({
  description: `Execute a bash command and return its output.

Usage:
- Run build commands (npm, bun, etc.)
- Execute git commands
- Run tests
- List files (ls, find)
- Search content (grep)
- Any shell command

IMPORTANT:
- Commands are executed in the current working directory
- Use absolute paths when necessary
- Be careful with destructive commands
- Long-running commands may timeout`,
  inputSchema: z.object({
    command: z.string().describe('The bash command to execute'),
    cwd: z.string().optional().describe('Working directory (defaults to current directory)'),
    timeout: z
      .number()
      .default(30000)
      .optional()
      .describe('Command timeout in milliseconds (default: 30000)'),
  }),
  execute: async ({ command, cwd, timeout = 30000 }) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return {
        command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };
    } catch (error: any) {
      // exec throws error on non-zero exit code
      if (error.code !== undefined) {
        return {
          command,
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
          exitCode: error.code,
        };
      }

      throw new Error(`Command execution failed: ${error.message}`);
    }
  },
});

/**
 * Get current working directory tool
 */
export const getCwdTool = tool({
  description: `Get the current working directory.

Usage:
- Check current directory before file operations
- Understand context for relative paths`,
  inputSchema: z.object({}),
  execute: async () => {
    return {
      cwd: process.cwd(),
    };
  },
});

/**
 * All shell tools
 */
export const shellTools = {
  execute_bash: executeBashTool,
  get_cwd: getCwdTool,
};
