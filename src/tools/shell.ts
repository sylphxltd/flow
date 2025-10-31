/**
 * Shell Tools
 * Tools for executing shell commands
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import type { ToolDefinition } from './base.js';
import { success, failure } from './base.js';

const execAsync = promisify(exec);

/**
 * Execute bash command tool
 */
export const executeBashTool: ToolDefinition = {
  name: 'execute_bash',
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
  parameters: z.object({
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

      return success({
        command,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      });
    } catch (error: any) {
      // exec throws error on non-zero exit code
      if (error.code !== undefined) {
        return success({
          command,
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || '',
          exitCode: error.code,
        });
      }

      return failure(`Command execution failed: ${error.message}`);
    }
  },
};

/**
 * Get current working directory tool
 */
export const getCwdTool: ToolDefinition = {
  name: 'get_cwd',
  description: `Get the current working directory.

Usage:
- Check current directory before file operations
- Understand context for relative paths`,
  parameters: z.object({}),
  execute: async () => {
    try {
      return success({
        cwd: process.cwd(),
      });
    } catch (error) {
      return failure(`Failed to get cwd: ${(error as Error).message}`);
    }
  },
};

/**
 * All shell tools
 */
export const shellTools = {
  execute_bash: executeBashTool,
  get_cwd: getCwdTool,
};
