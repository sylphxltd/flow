import fs from 'node:fs/promises';
import path from 'node:path';
import { render } from 'ink';
import React from 'react';
import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import type { BenchmarkCommandOptions, AgentData, InitialInfo } from '../types/benchmark.js';
import { DEFAULT_TASK, DEFAULT_CONCURRENCY, DEFAULT_DELAY, DEFAULT_TIMEOUT, DEFAULT_REPORT_DIR } from '../constants/benchmark-constants.js';
import { InkMonitor, type InkMonitorProps } from '../components/benchmark-monitor.js';
import { AgentService } from '../services/agent-service.js';
import { EvaluationService } from '../services/evaluation-service.js';
import { ProcessManager } from '../utils/process-manager.js';

// Legacy compatibility interface
interface BenchmarkStatus {
  agents: AgentData[];
  totalAgents: number;
  completedAgents: number;
  outputDir: string;
  startTime: Date;
  task: string;
  concurrency: number;
}

// Real-time monitor for agent outputs (interface compatibility)
class AgentMonitor {
  addOutput(agentName: string, output: string) {
    // No-op - this is handled by InkMonitor now
  }
}

async function validateBenchmarkOptions(options: BenchmarkCommandOptions): Promise<void> {
  // Use default task if not provided
  if (!options.task) {
    options.task = DEFAULT_TASK;
  }

  // Validate task file exists
  try {
    await fs.access(options.task);
  } catch {
    throw new CLIError(`Task file not found: ${options.task}`);
  }

  // Set default output directory with timestamp
  if (!options.output) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    options.output = `/tmp/agent-benchmark-${timestamp}`;
  }

  // Set default agents
  if (!options.agents) {
    options.agents = 'all';
  }

  // Set default context
  if (!options.context) {
    options.context = '';
  }

  // Set default evaluate flag (true unless --no-evaluate is used)
  if (options.evaluate === undefined) {
    options.evaluate = true;
  }

  // Set default concurrency
  if (!options.concurrency) {
    options.concurrency = DEFAULT_CONCURRENCY;
  }

  // Set default delay between agents
  if (!options.delay) {
    options.delay = DEFAULT_DELAY; // 2 seconds between agents
  }

  // Set default timeout
  if (!options.timeout) {
    options.timeout = DEFAULT_TIMEOUT; // 1 hour default timeout for complex tasks
  }
}

async function createBenchmarkDirectory(outputDir: string): Promise<void> {
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    throw new CLIError(`Failed to create benchmark directory: ${error}`);
  }
}

async function copyTaskFiles(taskFile: string, contextFile: string | undefined, outputDir: string): Promise<void> {
  // Copy task definition
  const taskContent = await fs.readFile(taskFile, 'utf-8');
  await fs.writeFile(path.join(outputDir, 'task-definition.txt'), taskContent);

  // Copy context file if provided
  if (contextFile) {
    try {
      const contextContent = await fs.readFile(contextFile, 'utf-8');
      await fs.writeFile(path.join(outputDir, 'context-info.txt'), contextContent);
    } catch (error) {
      // Silently handle context file errors
    }
  }
}

async function runParallelAgents(
  agentList: string[],
  outputDir: string,
  taskFile: string,
  contextFile: string | undefined,
  concurrency: number,
  delay: number,
  timeout: number,
  enableConsoleMonitor: boolean = false
): Promise<InkMonitor> {
  // We only use React+Ink InkMonitor - no fallback needed
  const monitor = new InkMonitor({
    initialInfo: {
      agentCount: agentList.length,
      concurrency: parseInt(String(concurrency), 10),
      delay: parseInt(String(delay), 10),
      taskFile,
      outputDir
    }
  });

  monitor.start();

  // Track workspace directories
  const workspaceDirs = agentList.map(agent => path.join(outputDir, agent));
  monitor.setWorkspaceDirs(workspaceDirs);

  // Add all agents to the monitor
  agentList.forEach(agent => {
    monitor!.addAgent(agent);
  });

  if (concurrency <= 1) {
    // Sequential execution
    for (const agent of agentList) {
      try {
        const startTime = Date.now();
        monitor?.updateAgentStatus(agent, 'running');

        await AgentService.runAgent(agent, outputDir, taskFile, contextFile, monitor, 3, timeout);

        // Record the actual execution time
        const endTime = Date.now();
        const duration = Math.floor((endTime - startTime) / 1000);

        // Write timing info to agent directory
        try {
          await fs.writeFile(
            path.join(outputDir, agent, 'execution-time.txt'),
            `Started: ${new Date(startTime).toISOString()}\nCompleted: ${new Date(endTime).toISOString()}\nDuration: ${duration} seconds\n`
          );
        } catch (error) {
          // Ignore timing write errors
        }

        monitor?.updateAgentStatus(agent, 'completed');

        // Add delay between agents (except last one)
        if (agent !== agentList[agentList.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
      } catch (error) {
        monitor?.updateAgentStatus(agent, 'error');
        monitor?.addAgentOutput(agent, `❌ ERROR: ${error}`);
        // Continue with other agents even if one fails
      }
    }
  } else {
    // Parallel execution with concurrency limit
    const chunks = [];
    for (let i = 0; i < agentList.length; i += concurrency) {
      chunks.push(agentList.slice(i, i + concurrency));
    }

    for (let i = 0; i < chunks.length; i++) {
      // Update status for all agents in this chunk and track start times
      const chunkStartTimes: { [agent: string]: number } = {};
      chunks[i].forEach(agent => {
        chunkStartTimes[agent] = Date.now();
        monitor?.updateAgentStatus(agent, 'running');
      });

      const promises = chunks[i].map(agent =>
        AgentService.runAgent(agent, outputDir, taskFile, contextFile, monitor, 3, timeout)
      );

      try {
        await Promise.all(promises);

        // Mark all agents in this chunk as completed and record times
        const chunkEndTime = Date.now();
        chunks[i].forEach(agent => {
          const startTime = chunkStartTimes[agent];
          const duration = Math.floor((chunkEndTime - startTime) / 1000);

          // Write timing info to agent directory
          try {
            fs.writeFile(
              path.join(outputDir, agent, 'execution-time.txt'),
              `Started: ${new Date(startTime).toISOString()}\nCompleted: ${new Date(chunkEndTime).toISOString()}\nDuration: ${duration} seconds (parallel execution)\n`
            ).catch(() => {}); // Ignore errors
          } catch (error) {
            // Ignore timing write errors
          }

          monitor?.updateAgentStatus(agent, 'completed');
        });

      } catch (error) {
        // Mark all agents in this chunk as having errors
        chunks[i].forEach(agent => {
          monitor?.updateAgentStatus(agent, 'error');
          monitor?.addAgentOutput(agent, `❌ ERROR: ${error}`);
        });

        // Continue with next chunk
      }

      // Add delay between chunks (except last one)
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    }
  }

  // Note: Don't stop monitor here - caller will handle stopping
  // This allows evaluation to run with the same monitor
  return monitor;
}

export const benchmarkCommand: CommandConfig = {
  name: 'benchmark',
  description: 'Run benchmark tests comparing multiple agent designs',
  options: [
    {
      flags: '--agents <agents>',
      description: 'Agents to test (comma-separated or "all")',
      defaultValue: 'all'
    },
    {
      flags: '--task <file>',
      description: 'Path to task definition file',
      defaultValue: DEFAULT_TASK
    },
    {
      flags: '--output <dir>',
      description: 'Output directory for results'
    },
    {
      flags: '--context <file>',
      description: 'Path to context information file (optional)'
    },
    {
      flags: '--no-evaluate',
      description: 'Skip LLM evaluation after agents complete'
    },
    {
      flags: '--report <dir>',
      description: 'Directory to save evaluation reports',
      defaultValue: DEFAULT_REPORT_DIR
    },
    {
      flags: '--concurrency <number>',
      description: 'Number of agents to run concurrently',
      defaultValue: '1'
    },
    {
      flags: '--delay <seconds>',
      description: 'Delay in seconds between agent executions',
      defaultValue: '2'
    },
    {
      flags: '--timeout <seconds>',
      description: 'Timeout in seconds for each agent (default: 3600)',
      defaultValue: '3600'
    },
    {
      flags: '--quiet',
      description: 'Disable real-time monitoring, show minimal output'
    }
  ],
  handler: async (options: BenchmarkCommandOptions) => {
    let monitor: InkMonitor | undefined;

    try {
      await validateBenchmarkOptions(options);

      // Create benchmark directory
      await createBenchmarkDirectory(options.output!);

      // Copy task files
      await copyTaskFiles(options.task!, options.context, options.output!);

      // Get agent list
      const agentList = await AgentService.getAgentList(options.agents!);

      // Run agents with concurrency control and React+Ink monitor (unless quiet mode)
      if (options.quiet) {
        // Quiet mode - run without React+Ink monitor
        monitor = await runParallelAgents(agentList, options.output!, options.task!, options.context, options.concurrency!, options.delay!, options.timeout!, false);
      } else {
        // Normal mode - use React+Ink monitor
        monitor = await runParallelAgents(agentList, options.output!, options.task!, options.context, options.concurrency!, options.delay!, options.timeout!, true);
      }

      // Evaluate results if requested
      if (options.evaluate) {
        await EvaluationService.evaluateResults(options.output!, options.report, monitor);
      }

      // Stop the monitor after all agents and evaluation are complete
      if (monitor) {
        monitor.stop();
      }

      // Only show completion message if monitor was disabled (quiet mode)
      if (options.quiet) {
        // These console.log statements are okay because they only appear in quiet mode
        console.log(`🎉 Benchmark completed!`);
        console.log(`📁 Results saved to: ${options.output}`);
      }

    } catch (error) {
      // Clean up monitor on error
      if (monitor) {
        monitor.stop();
      }
      throw new CLIError(`Benchmark failed: ${error}`);
    }
  }
};