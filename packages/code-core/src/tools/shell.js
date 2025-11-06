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
    description: 'Execute a bash command and return its output',
    inputSchema: z.object({
        command: z.string().describe('Bash command to execute'),
        cwd: z.string().optional().describe('Working directory'),
        timeout: z
            .number()
            .default(30000)
            .optional()
            .describe('Timeout in milliseconds (foreground mode only)'),
        run_in_background: z
            .boolean()
            .default(false)
            .optional()
            .describe('Run in background. Returns bash_id for bash-output tool'),
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
        }
        catch (error) {
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
    description: 'Get output from a background bash process',
    inputSchema: z.object({
        bash_id: z.string().describe('bash_id from background bash command'),
        filter: z.string().optional().describe('Regex to filter output lines'),
    }),
    execute: async ({ bash_id, filter }) => {
        const output = bashManager.getOutput(bash_id);
        if (!output) {
            throw new Error(`Bash process not found: ${bash_id}`);
        }
        let stdout = output.stdout;
        let stderr = output.stderr;
        // Apply filter if provided
        if (filter) {
            try {
                const regex = new RegExp(filter);
                stdout = stdout.split('\n').filter(line => regex.test(line)).join('\n');
                stderr = stderr.split('\n').filter(line => regex.test(line)).join('\n');
            }
            catch (error) {
                throw new Error(`Invalid regex filter: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return {
            bash_id,
            command: output.command,
            stdout,
            stderr,
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
    description: 'Kill a background bash process',
    inputSchema: z.object({
        bash_id: z.string().describe('bash_id of process to kill'),
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
 * All shell tools
 */
export const shellTools = {
    bash: executeBashTool,
    'bash-output': bashOutputTool,
    'kill-bash': killBashTool,
};
//# sourceMappingURL=shell.js.map