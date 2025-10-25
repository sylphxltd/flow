import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { type CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { getAgentsDir } from '../utils/paths.js';
import BenchmarkUI from '../components/benchmark-ui.js';

interface BenchmarkCommandOptions extends CommandOptions {
  agents?: string;
  task?: string;
  output?: string;
  context?: string;
  evaluate?: boolean;
  report?: string;
  concurrency?: number;
  delay?: number;
  ui?: boolean;
}

interface AgentStatus {
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  output: string[];
  progress: number;
  startTime?: number;
  endTime?: number;
}

interface BenchmarkStatus {
  agents: AgentStatus[];
  totalAgents: number;
  completedAgents: number;
  outputDir: string;
  startTime: Date;
  task: string;
  concurrency: number;
}

class BenchmarkUIMonitor {
  private status: BenchmarkStatus;
  private uiProcess?: any;
  private childProcesses: Set<any> = new Set();
  private isShuttingDown = false;

  constructor(
    totalAgents: number,
    outputDir: string,
    task: string,
    concurrency: number
  ) {
    this.status = {
      agents: [],
      totalAgents,
      completedAgents: 0,
      outputDir,
      startTime: new Date(),
      task,
      concurrency
    };

    // Setup signal handlers for graceful shutdown
    this.setupSignalHandlers();
  }

  async startUI() {
    // Start the React UI in a separate process
    this.uiProcess = spawn('node', ['-e', `
      const { render } = require('ink');
      const React = require('react');
      const { Box, Text, useApp } = require('ink');

      const BenchmarkUI = () => {
        const [status, setStatus] = React.useState(null);
        const { exit } = useApp();

        React.useEffect(() => {
          const handleStdin = (data) => {
            try {
              const message = data.toString().trim();
              if (message.startsWith('BENCHMARK_STATUS:')) {
                const statusData = JSON.parse(message.substring(16));
                setStatus(statusData);
              }
            } catch (error) {
              // Ignore parsing errors
            }
          };

          process.stdin.on('data', handleStdin);
          return () => {
            process.stdin.off('data', handleStdin);
          };
        }, []);

        React.useEffect(() => {
          if (status && status.completedAgents === status.totalAgents) {
            setTimeout(() => exit(), 2000);
          }
        }, [status, exit]);

        if (!status) {
          return React.createElement(Box, { flexDirection: "column", padding: 1 }, [
            React.createElement(Text, { color: "cyan" }, "🤖 Initializing Benchmark Terminal UI..."),
            React.createElement(Text, { color: "gray" }, "Waiting for benchmark to start...")
          ]);
        }

        const elapsed = Date.now() - new Date(status.startTime).getTime();
        const progressPercent = status.totalAgents > 0 ? (status.completedAgents / status.totalAgents) * 100 : 0;
        const progressBar = '█'.repeat(Math.floor(progressPercent / 10)) + '░'.repeat(10 - Math.floor(progressPercent / 10));

        return React.createElement(Box, { flexDirection: "column", padding: 1 }, [
          React.createElement(Box, { borderStyle: "single", padding: 1, marginBottom: 1 }, [
            React.createElement(Text, { color: "cyan", bold: true }, "🎯 Agent Benchmark Monitor"),
            React.createElement(Text, { color: "gray" }, \`Task: \${status.task}\`),
            React.createElement(Text, { color: "gray" }, \`Output: \${status.outputDir}\`),
            React.createElement(Text, { color: "gray" }, \`Time: \${Math.floor(elapsed / 1000)}s\`)
          ]),
          React.createElement(Box, { marginBottom: 1 }, [
            React.createElement(Text, {}, \`Progress: \${progressBar} \${status.completedAgents}/\${status.totalAgents} (\${progressPercent.toFixed(1)}%)\`)
          ]),
          React.createElement(Box, { flexDirection: "column", gap: 1 }, [
            React.createElement(Text, { color: "white", bold: true }, "📊 Agent Status:"),
            ...status.agents.map(agent =>
              React.createElement(Box, { key: agent.name, borderStyle: "round", padding: 1 }, [
                React.createElement(Text, { bold: true },
                  \`\${agent.name} \${agent.status === 'completed' ? '✅' : agent.status === 'running' ? '🔄' : agent.status === 'error' ? '❌' : '⏸️'}\`
                ),
                agent.output.length > 0 && React.createElement(Box, { flexDirection: "column", marginTop: 1 },
                  agent.output.slice(-3).map((line, i) =>
                    React.createElement(Text, { key: i, color: "gray", dimColor: true }, line)
                  )
                )
              ])
            )
          ]),
          React.createElement(Box, { marginTop: 1 }, [
            React.createElement(Text, {
              color: status.completedAgents === status.totalAgents ? "green" : "yellow",
              bold: true
            }, status.completedAgents === status.totalAgents ? "🎉 Benchmark Completed!" : "🔄 Running...")
          ])
        ]);
      };

      render(React.createElement(BenchmarkUI));
    `], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Track UI process for cleanup
    this.trackChildProcess(this.uiProcess);

    // Forward status updates to the UI
    this.sendStatus();
  }

  private sendStatus() {
    if (this.uiProcess && this.uiProcess.stdin) {
      this.uiProcess.stdin.write(`BENCHMARK_STATUS:${JSON.stringify(this.status)}\n`);
    }
  }

  addAgent(name: string) {
    this.status.agents.push({
      name,
      status: 'idle',
      output: [],
      progress: 0
    });
    this.sendStatus();
  }

  updateAgentStatus(name: string, updates: Partial<AgentStatus>) {
    const agent = this.status.agents.find(a => a.name === name);
    if (agent) {
      Object.assign(agent, updates);
      this.sendStatus();
    }
  }

  addAgentOutput(name: string, output: string) {
    const agent = this.status.agents.find(a => a.name === name);
    if (agent) {
      // Split output into lines and keep last 5
      const lines = output.split('\n').filter(line => line.trim());
      agent.output = [...agent.output.slice(-2), ...lines];
      this.sendStatus();
    }
  }

  incrementCompleted() {
    this.status.completedAgents++;
    this.sendStatus();
  }

  private setupSignalHandlers() {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log(`\n🛑 Received ${signal}, shutting down benchmark...`);
      await this.killAllProcesses();
      process.exit(0);
    };

    // Handle termination signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
  }

  trackChildProcess(childProcess: any) {
    this.childProcesses.add(childProcess);

    // Remove from tracking when process exits
    childProcess.on('exit', () => {
      this.childProcesses.delete(childProcess);
    });
  }

  async killAllProcesses() {
    console.log('🔄 Terminating all running processes...');

    // Kill all child processes first
    const killPromises = Array.from(this.childProcesses).map(async (childProcess) => {
      try {
        if (childProcess && !childProcess.killed) {
          // Try graceful shutdown first
          childProcess.kill('SIGTERM');

          // Force kill if it doesn't stop after 2 seconds
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGKILL');
            }
          }, 2000);
        }
      } catch (error) {
        console.warn('⚠️ Error killing child process:', error);
      }
    });

    // Wait for all child processes to be killed
    await Promise.all(killPromises);

    // Kill UI process
    if (this.uiProcess && !this.uiProcess.killed) {
      try {
        this.uiProcess.kill('SIGTERM');

        // Force kill if it doesn't stop after 1 second
        setTimeout(() => {
          if (!this.uiProcess.killed) {
            this.uiProcess.kill('SIGKILL');
          }
        }, 1000);
      } catch (error) {
        console.warn('⚠️ Error killing UI process:', error);
      }
    }

    // Clear the child processes set
    this.childProcesses.clear();
    console.log('✅ All processes terminated');
  }

  async stop() {
    await this.killAllProcesses();
  }
}

// Enhanced AgentMonitor that works with UI
class AgentMonitorWithUI {
  private outputs: Map<string, string[]> = new Map();
  private maxLines = 5;
  private uiMonitor?: BenchmarkUIMonitor;

  constructor(uiMonitor?: BenchmarkUIMonitor) {
    this.uiMonitor = uiMonitor;
  }

  addOutput(agentName: string, output: string) {
    if (!this.outputs.has(agentName)) {
      this.outputs.set(agentName, []);
    }

    const lines = this.outputs.get(agentName)!;
    lines.push(...output.split('\n').filter(line => line.trim()));

    // Keep only last maxLines
    if (lines.length > this.maxLines) {
      lines.splice(0, lines.length - this.maxLines);
    }

    // Also update UI if available
    this.uiMonitor?.addAgentOutput(agentName, output);
  }

  display() {
    // UI handles display now
    // This method is kept for backward compatibility
  }
}

async function validateBenchmarkOptions(options: BenchmarkCommandOptions): Promise<void> {
  // Use default task if not provided
  if (!options.task) {
    options.task = 'examples/benchmark-tasks/simple-hello.md';
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
    options.concurrency = 1;
  }

  // Set default delay between agents
  if (!options.delay) {
    options.delay = 2; // 2 seconds between agents
  }

  // Default to UI mode
  if (options.ui === undefined) {
    options.ui = true;
  }
}

async function createBenchmarkDirectory(outputDir: string): Promise<void> {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`📁 Created benchmark directory: ${outputDir}`);
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
      console.log(`📄 Copied context file: ${contextFile}`);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not read context file: ${error}`);
    }
  }

  console.log(`📋 Task definition copied from: ${taskFile}`);
}

async function getAgentList(agentsOption: string): Promise<string[]> {
  const agents = ['craftsman', 'practitioner', 'craftsman-reflective', 'practitioner-reflective'];

  if (agentsOption === 'all') {
    return agents;
  }

  const selectedAgents = agentsOption.split(',').map(a => a.trim());

  // Validate selected agents
  for (const agent of selectedAgents) {
    if (!agents.includes(agent)) {
      throw new CLIError(`Invalid agent: ${agent}. Available agents: ${agents.join(', ')}`);
    }
  }

  return selectedAgents;
}

async function runAgent(agentName: string, outputDir: string, taskFile: string, contextFile: string | undefined, uiMonitor?: BenchmarkUIMonitor): Promise<void> {
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
      } catch (error) {
        console.warn(`⚠️  Warning: Could not read context file: ${error}`);
      }
    }

    // Add instruction to work in the temp directory
    fullTask += `\n\nIMPORTANT: Please implement your solution in the current working directory: ${agentWorkDir}\nThis is a temporary directory for testing, so you can create files freely without affecting any production codebase.`;

    console.log(`🚀 Running agent: ${agentName} in ${agentWorkDir}`);

    // Update UI status
    uiMonitor?.addAgent(agentName);
    uiMonitor?.updateAgentStatus(agentName, { status: 'running', startTime: Date.now() });

    // Run Claude Code with the agent prompt
    const runSingleAgent = async (): Promise<void> => {
      // Write agent prompt to a temp file to avoid command line length limits
      const tempPromptFile = path.join(agentWorkDir, '.agent-prompt.md');
      await fs.writeFile(tempPromptFile, agentPrompt);

      return new Promise((resolve, reject) => {
        const claudeProcess = spawn('claude', [
          '--system-prompt', `@${tempPromptFile}`,
          '--dangerously-skip-permissions',
          '--print',
          fullTask
        ], {
          cwd: agentWorkDir,
          stdio: ['inherit', 'pipe', 'pipe']
        });

        // Track this child process for cleanup
        uiMonitor?.trackChildProcess(claudeProcess);

        let stdout = '';
        let stderr = '';

        claudeProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          stdout += output;

          // Add output to UI monitor
          uiMonitor?.addAgentOutput(agentName, output);

          // Also output to console for immediate feedback
          process.stdout.write(`[${agentName}] ${output}`);
        });

        claudeProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          stderr += output;

          // Add error output to UI
          uiMonitor?.addAgentOutput(agentName, `ERROR: ${output}`);

          // Also output error to console
          process.stderr.write(`[${agentName} ERROR] ${output}`);
        });

        claudeProcess.on('close', async (code) => {
          // Clean up temp prompt file
          try {
            await fs.unlink(tempPromptFile);
          } catch (error) {
            // Ignore cleanup errors
          }

          if (code === 0) {
            await fs.writeFile(path.join(agentWorkDir, 'execution-log.txt'), stdout);
            console.log(`✅ Agent ${agentName} completed successfully`);
            uiMonitor?.updateAgentStatus(agentName, {
              status: 'completed',
              endTime: Date.now(),
              progress: 100
            });
            uiMonitor?.incrementCompleted();
            resolve();
          } else {
            await fs.writeFile(path.join(agentWorkDir, 'execution-error.txt'), stderr);
            uiMonitor?.updateAgentStatus(agentName, {
              status: 'error',
              endTime: Date.now(),
              progress: 0
            });
            reject(new Error(`Agent ${agentName} failed with code ${code}`));
          }
        });

        claudeProcess.on('error', (error) => {
          uiMonitor?.updateAgentStatus(agentName, {
            status: 'error',
            endTime: Date.now(),
            progress: 0
          });
          reject(error);
        });
      });
    };

    // Run agent without timeout - let it complete naturally
    await runSingleAgent();

  } catch (error) {
    uiMonitor?.updateAgentStatus(agentName, {
      status: 'error',
      endTime: Date.now(),
      progress: 0
    });
    throw new CLIError(`Failed to load agent ${agentName}: ${error}`);
  }
}

async function runParallelAgents(
  agentList: string[],
  outputDir: string,
  taskFile: string,
  contextFile: string | undefined,
  concurrency: number,
  delay: number,
  uiMonitor: BenchmarkUIMonitor
): Promise<void> {
  console.log(`🔄 Running ${agentList.length} agents with concurrency: ${concurrency}, delay: ${delay}s`);

  if (concurrency <= 1) {
    // Sequential execution
    console.log('📝 Running agents sequentially...');
    for (const agent of agentList) {
      try {
        await runAgent(agent, outputDir, taskFile, contextFile, uiMonitor);

        // Add delay between agents (except last one)
        if (agent !== agentList[agentList.length - 1]) {
          console.log(`⏳ Waiting ${delay}s before next agent...`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
      } catch (error) {
        console.error(`❌ Agent ${agent} failed:`, error);
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
      console.log(`🔄 Running chunk ${i + 1}/${chunks.length} (${chunks[i].length} agents)...`);

      const promises = chunks[i].map(agent =>
        runAgent(agent, outputDir, taskFile, contextFile, uiMonitor)
      );

      try {
        await Promise.all(promises);
        console.log(`✅ Chunk ${i + 1} completed`);
      } catch (error) {
        console.error(`❌ Chunk ${i + 1} had failures:`, error);
        // Continue with next chunk
      }

      // Add delay between chunks (except last one)
      if (i < chunks.length - 1) {
        console.log(`⏳ Waiting ${delay}s before next chunk...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    }
  }

  console.log('✅ All agent executions completed');
}

export const benchmarkUICommand: CommandConfig = {
  name: 'benchmark-ui',
  description: 'Run benchmark tests with enhanced terminal UI',
  options: [
    {
      flags: '--agents <agents>',
      description: 'Agents to test (comma-separated or "all", default: all)',
      defaultValue: 'all'
    },
    {
      flags: '--task <file>',
      description: 'Path to task definition file',
      defaultValue: 'examples/benchmark-tasks/simple-hello.md'
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
      defaultValue: 'benchmark-results'
    },
    {
      flags: '--concurrency <number>',
      description: 'Number of agents to run concurrently (default: 1)',
      defaultValue: '1'
    },
    {
      flags: '--delay <seconds>',
      description: 'Delay in seconds between agent executions (default: 2)',
      defaultValue: '2'
    },
    {
      flags: '--no-ui',
      description: 'Disable enhanced terminal UI'
    }
  ],
  handler: async (options: BenchmarkCommandOptions) => {
    try {
      await validateBenchmarkOptions(options);

      console.log('🎯 Starting agent benchmark test with enhanced UI');
      console.log(`📁 Output directory: ${options.output}`);

      // Create benchmark directory
      await createBenchmarkDirectory(options.output!);

      // Copy task files
      await copyTaskFiles(options.task!, options.context, options.output!);

      // Get agent list
      const agentList = await getAgentList(options.agents!);
      console.log(`🤖 Testing agents: ${agentList.join(', ')}`);

      // Start UI if enabled
      let uiMonitor: BenchmarkUIMonitor | undefined;
      if (options.ui !== false) {
        uiMonitor = new BenchmarkUIMonitor(
          agentList.length,
          options.output!,
          options.task!,
          options.concurrency!
        );
        await uiMonitor.startUI();
        console.log('🖥️ Terminal UI started');
      }

      // Run agents with UI monitoring
      await runParallelAgents(
        agentList,
        options.output!,
        options.task!,
        options.context,
        options.concurrency!,
        options.delay!,
        uiMonitor
      );

      // Evaluate results if requested
      if (options.evaluate) {
        console.log('🔍 Skipping evaluation in UI mode - evaluation will be available in a future update');
      }

      // Wait a bit before stopping UI to show final results
      if (uiMonitor) {
        console.log('⏳ Waiting 3 seconds before UI shutdown...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        await uiMonitor.stop();
      }

      console.log(`🎉 Benchmark completed!`);
      console.log(`📁 Results saved to: ${options.output}`);

    } catch (error) {
      throw new CLIError(`Benchmark failed: ${error}`);
    }
  }
};