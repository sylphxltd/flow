/**
 * Shell Tools
 * Tools for executing shell commands
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { tool } from 'ai';
import { z } from 'zod';
import { bashManager } from './bash-manager.js';

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

Background mode:
- Set run_in_background to true for long-running commands
- Returns a bash_id to check output later with bash-output tool
- Use kill-bash tool to terminate background processes

IMPORTANT:
- Commands are executed in the current working directory
- Use absolute paths when necessary
- Be careful with destructive commands
- Non-background commands timeout after specified duration`,
  inputSchema: z.object({
    command: z.string().describe('The bash command to execute'),
    cwd: z.string().optional().describe('Working directory (defaults to current directory)'),
    timeout: z
      .number()
      .default(30000)
      .optional()
      .describe('Command timeout in milliseconds (default: 30000, only for non-background)'),
    run_in_background: z
      .boolean()
      .default(false)
      .optional()
      .describe('Run command in background and return immediately with bash_id'),
  }),
  execute: async ({ command, cwd, timeout = 30000, run_in_background = false }) => {
    // Background mode - spawn and return immediately
    if (run_in_background) {
      const bashId = bashManager.spawn(command, cwd);
      return {
        bash_id: bashId,
        command,
        mode: 'background',
        message: `Started in background. Use bash-output tool with bash_id: ${bashId}`,
      };
    }

    // Foreground mode - wait for completion
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
 * Get output from background bash process
 */
export const bashOutputTool = tool({
  description: `Get output from a background bash process.

Usage:
- Check output of long-running commands started with run_in_background
- Monitor progress of background processes
- Returns stdout, stderr, exit code, and running status

The output is cumulative - shows all output since process started.`,
  inputSchema: z.object({
    bash_id: z.string().describe('The bash_id returned from a background bash command'),
  }),
  execute: async ({ bash_id }) => {
    const output = bashManager.getOutput(bash_id);

    if (!output) {
      throw new Error(`Bash process not found: ${bash_id}`);
    }

    return {
      bash_id,
      command: output.command,
      stdout: output.stdout,
      stderr: output.stderr,
      exitCode: output.exitCode,
      isRunning: output.isRunning,
      duration: output.duration,
    };
  },
});

/**
 * Kill a background bash process
 */
export const killBashTool = tool({
  description: `Kill a background bash process.

Usage:
- Terminate long-running background processes
- Stop processes that are no longer needed
- Clean up hanging processes

The process will be sent SIGTERM first, then SIGKILL if it doesn't exit within 5 seconds.`,
  inputSchema: z.object({
    bash_id: z.string().describe('The bash_id of the process to kill'),
  }),
  execute: async ({ bash_id }) => {
    const success = bashManager.kill(bash_id);

    if (!success) {
      throw new Error(`Bash process not found: ${bash_id}`);
    }

    return {
      bash_id,
      status: 'killed',
      message: `Sent termination signal to bash process ${bash_id}`,
    };
  },
});

/**
 * List all background bash processes
 */
export const listBashTool = tool({
  description: `List all background bash processes.

Usage:
- See all running and completed background processes
- Monitor background process status
- Get bash_id for processes to check output or kill

Returns list of processes with their ID, command, status, and duration.`,
  inputSchema: z.object({}),
  execute: async () => {
    const processes = bashManager.list();

    return {
      processes,
      count: processes.length,
      running: processes.filter((p) => p.isRunning).length,
      completed: processes.filter((p) => !p.isRunning).length,
    };
  },
});

/**
 * All shell tools
 */
export const shellTools = {
  bash: executeBashTool,
  'bash-output': bashOutputTool,
  'kill-bash': killBashTool,
  'list-bash': listBashTool,
};
