import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { TimingData } from '../types/benchmark.js';
import { DEFAULT_AGENTS } from '../constants/benchmark-constants.js';
import { ProcessManager } from '../utils/process-manager.js';
import { formatToolDisplay } from '../utils/tool-display.js';
import type { InkMonitor } from '../components/benchmark-monitor.js';
import { getAgentsDir } from '../utils/paths.js';

export class AgentService {
  static async getAgentList(agentsOption: string): Promise<string[]> {
    if (agentsOption === 'all') {
      return DEFAULT_AGENTS;
    }

    const selectedAgents = agentsOption.split(',').map((a) => a.trim());

    // Validate selected agents
    for (const agent of selectedAgents) {
      if (!DEFAULT_AGENTS.includes(agent)) {
        throw new Error(`Invalid agent: ${agent}. Available agents: ${DEFAULT_AGENTS.join(', ')}`);
      }
    }

    return selectedAgents;
  }

  static async runAgent(
    agentName: string,
    outputDir: string,
    taskFile: string,
    contextFile: string | undefined,
    monitor?: InkMonitor,
    _maxRetries = 3,
    timeout = 3600
  ): Promise<void> {
    const agentWorkDir = path.join(outputDir, agentName);
    await fs.mkdir(agentWorkDir, { recursive: true });

    // Load agent prompt
    const agentsDir = getAgentsDir();
    const agentFile = path.join(agentsDir, `${agentName}.md`);

    try {
      const agentPrompt = await fs.readFile(agentFile, 'utf-8');

      // Prepare task content - instruct agent to work in the temp directory
      const taskContent = await fs.readFile(taskFile, 'utf-8');
      let fullTask = taskContent;

      if (contextFile) {
        try {
          const contextContent = await fs.readFile(contextFile, 'utf-8');
          fullTask = `CONTEXT:\n${contextContent}\n\nTASK:\n${taskContent}`;
        } catch (_error) {
          // Silently handle context file errors
        }
      }

      // Add instruction to work in the temp directory
      fullTask += `\n\nIMPORTANT: Please implement your solution in the current working directory: ${agentWorkDir}\nThis is a temporary directory for testing, so you can create files freely without affecting any production codebase.`;

      // Run Claude Code with the agent prompt
      await AgentService.runSingleAgent(agentName, agentPrompt, fullTask, agentWorkDir, monitor, timeout);
    } catch (error) {
      throw new Error(`Failed to load agent ${agentName}: ${error}`);
    }
  }

  private static async runSingleAgent(
    agentName: string,
    agentPrompt: string,
    fullTask: string,
    agentWorkDir: string,
    monitor?: InkMonitor,
    timeout = 3600
  ): Promise<void> {
    // Write agent prompt to a temp file to avoid command line length limits
    const tempPromptFile = path.join(agentWorkDir, '.agent-prompt.md');
    await fs.writeFile(tempPromptFile, agentPrompt);

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;
      // Set up timeout
      timeoutId = setTimeout(() => {
        if (claudeProcess && !claudeProcess.killed) {
          claudeProcess.kill('SIGTERM');
          // Force kill if it doesn't stop after 5 seconds
          setTimeout(() => {
            if (!claudeProcess.killed) {
              claudeProcess.kill('SIGKILL');
            }
          }, 5000);
        }
        // Update agent status to error due to timeout
        monitor?.updateAgentStatus(agentName, 'error');
        reject(new Error(`Agent ${agentName} timed out after ${timeout} seconds`));
      }, timeout * 1000);

      const claudeProcess = spawn(
        'claude',
        [
          '--system-prompt',
          `@${tempPromptFile}`,
          '--dangerously-skip-permissions',
          '--output-format',
          'stream-json',
          '--verbose',
          fullTask,
        ],
        {
          cwd: agentWorkDir,
          stdio: ['inherit', 'pipe', 'pipe'],
          env: {
            ...process.env,
            // Disable buffering and progress indicators for real-time output
            FORCE_NO_PROGRESS: '1',
            CI: '1',
            PYTHONUNBUFFERED: '1',
          },
        }
      );

      // Set the process PID for debugging
      if (claudeProcess.pid) {
        monitor?.setAgentPid(agentName, claudeProcess.pid);
      }

      // Track this child process for cleanup
      ProcessManager.getInstance().trackChildProcess(claudeProcess);

      let stdoutBuffer = '';
      let stderr = '';

      claudeProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        stdoutBuffer += output;

        // Process complete lines only - keep incomplete data in buffer
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || ''; // Keep last incomplete line

        for (const line of lines) {
          if (!line.trim()) { continue; }

          try {
            const jsonData = JSON.parse(line);

            if (jsonData.type === 'assistant' && jsonData.message?.content) {
              // Extract text content and tool uses from assistant message
              for (const content of jsonData.message.content) {
                if (content.type === 'text') {
                  const textContent = content.text.trim();
                  if (textContent) {
                    monitor?.addAgentOutput(agentName, textContent);
                  }
                } else if (content.type === 'tool_use') {
                  const toolName = content.name;
                  const params = content.input || {};
                  const toolDisplay = formatToolDisplay(toolName, params);

                  monitor?.addAgentOutput(agentName, toolDisplay);
                }
              }
            }
          } catch (_e) {
            // Skip invalid JSON (shouldn't happen with stream-json)
          }
        }

        // Don't output directly to console when using React+Ink monitor
        // The monitor will handle displaying relevant output
      });

      claudeProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;

        // Add error output to monitor (with ANSI cleaning)
        monitor?.addAgentOutput(agentName, `ERROR: ${output}`);

        // Don't output directly to console when using React+Ink monitor
        // The monitor will handle displaying relevant output
      });

      claudeProcess.on('close', async (code) => {
        const endTime = Date.now();

        // Update agent end time
        const agent = monitor?.getAgents().get(agentName);
        if (agent) {
          agent.endTime = endTime;
        }

        // Clear timeout if process completed normally
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // All data should already be processed in stdout event handler

        // Clean up temp prompt file
        try {
          await fs.unlink(tempPromptFile);
        } catch (_error) {
          // Ignore cleanup errors
        }

        // Write execution log with timing information
        const executionLog = `Execution completed at: ${new Date(endTime).toISOString()}\nExit code: ${code}\n\n=== STDOUT ===\n${stdoutBuffer}\n\n=== STDERR ===\n${stderr}\n`;
        await fs.writeFile(path.join(agentWorkDir, 'execution-log.txt'), executionLog);

        // Write timing metadata
        const timingData: TimingData = {
          endTime,
          exitCode: code,
          stdoutLength: stdoutBuffer.length,
          stderrLength: stderr.length,
        };
        await fs.writeFile(
          path.join(agentWorkDir, 'timing.json'),
          JSON.stringify(timingData, null, 2)
        );

        // Update agent status based on exit code
        if (code === 0) {
          monitor?.updateAgentStatus(agentName, 'completed');
          resolve();
        } else {
          monitor?.updateAgentStatus(agentName, 'error');
          await fs.writeFile(path.join(agentWorkDir, 'execution-error.txt'), stderr);

          reject(new Error(`Agent ${agentName} failed with code ${code}`));
        }
      });

      claudeProcess.on('error', (error) => {
        // Clear timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Update agent status to error
        monitor?.updateAgentStatus(agentName, 'error');

        reject(error);
      });
    });
  }
}
