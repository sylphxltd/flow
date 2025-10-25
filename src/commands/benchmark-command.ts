import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { type CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { getAgentsDir } from '../utils/paths.js';

interface BenchmarkCommandOptions extends CommandOptions {
  agents?: string;
  task?: string;
  output?: string;
  context?: string;
  evaluate?: boolean;
  report?: string;
  concurrency?: number;
  delay?: number;
  quiet?: boolean;
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

// Simple process manager for cleanup
class ProcessManager {
  private static instance: ProcessManager;
  private childProcesses: Set<any> = new Set();
  private isShuttingDown = false;

  static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
      ProcessManager.instance.setupSignalHandlers();
    }
    return ProcessManager.instance;
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

    const killPromises = Array.from(this.childProcesses).map(async (childProcess) => {
      try {
        if (childProcess && !childProcess.killed) {
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

    await Promise.all(killPromises);
    this.childProcesses.clear();
    console.log('✅ All processes terminated');
  }
}

// Efficient console-based monitor with minimal updates
class EfficientMonitor {
  private agents: Map<string, {
    status: 'idle' | 'running' | 'completed' | 'error';
    output: string[];
    startTime?: number;
    endTime?: number;
  }> = new Map();
  private updateInterval?: NodeJS.Timeout;
  private isRunning = false;
  private lastDisplay = '';
  private workspaceDirs: string[] = [];

  constructor() {
    this.setupSignalHandlers();
  }

  start() {
    this.isRunning = true;
    this.showHeader();

    // Update display every second (reduced frequency for better performance)
    this.updateInterval = setInterval(() => {
      this.displayIfNeeded();
    }, 1000);
  }

  setWorkspaceDirs(dirs: string[]) {
    this.workspaceDirs = dirs;
  }

  private showHeader() {
    console.log('🎯 Agent Benchmark Monitor - Real-time Output');
    console.log('💡 Workspaces: Each agent runs in its own temp directory');
    if (this.workspaceDirs.length > 0) {
      console.log('📁 Recent workspace dirs:');
      this.workspaceDirs.slice(-3).forEach(dir => {
        console.log(`   ${dir}`);
      });
    }
    console.log('💡 Tip: You can open these directories in another terminal to see files in real-time');
    console.log('');
  }

  addAgent(name: string) {
    this.agents.set(name, {
      status: 'idle',
      output: [],
      startTime: undefined
    });
    this.displayIfNeeded(); // Immediate update
  }

  updateAgentStatus(name: string, status: 'idle' | 'running' | 'completed' | 'error') {
    const agent = this.agents.get(name);
    if (agent) {
      agent.status = status;
      if (status === 'running' && !agent.startTime) {
        agent.startTime = Date.now();
      } else if (status === 'completed' || status === 'error') {
        agent.endTime = Date.now();
      }
      this.displayIfNeeded(); // Immediate update
    }
  }

  addAgentOutput(name: string, output: string) {
    const agent = this.agents.get(name);
    if (agent) {
      const lines = output.split('\n').filter(line => line.trim());
      agent.output = [...agent.output.slice(-2), ...lines];
      this.displayIfNeeded(); // Immediate update for new output
    }
  }

  private displayIfNeeded() {
    const currentDisplay = this.buildDisplayString();

    // Only update if the display actually changed (performance optimization)
    if (currentDisplay !== this.lastDisplay) {
      // Clear lines efficiently
      if (this.lastDisplay) {
        const lineCount = this.lastDisplay.split('\n').length;
        process.stdout.write(`\x1b[${lineCount}A\x1b[0J`);
      }

      process.stdout.write(currentDisplay);
      this.lastDisplay = currentDisplay;
    }
  }

  private buildDisplayString(): string {
    const lines: string[] = [];

    for (const [name, agent] of this.agents) {
      let runtime = 0;
      if (agent.startTime) {
        if (agent.endTime) {
          runtime = Math.floor((agent.endTime - agent.startTime) / 1000);
        } else if (agent.status === 'running') {
          runtime = Math.floor((Date.now() - agent.startTime) / 1000);
        }
      }

      const statusIcon = agent.status === 'completed' ? '✅' :
                        agent.status === 'running' ? '🔄' :
                        agent.status === 'error' ? '❌' : '⏸️';

      const runtimeText = agent.startTime ? `${runtime}s` : 'pending';

      // Main status line
      lines.push(`${statusIcon} ${name} - ${agent.status.toUpperCase()} - Runtime: ${runtimeText}`);

      // Show last 3 outputs only (reduced for better performance)
      if (agent.output.length > 0) {
        const recentOutputs = agent.output.slice(-3);
        recentOutputs.forEach(line => {
          const cleanLine = line.trim();
          if (cleanLine && !cleanLine.startsWith('[') && cleanLine.length > 8) {
            lines.push(`    ${cleanLine.substring(0, 80)}${cleanLine.length > 80 ? '...' : ''}`);
          }
        });
      } else if (agent.status === 'running') {
        lines.push('    (working...)');
      } else if (agent.status === 'idle') {
        lines.push('    (waiting to start...)');
      }

      lines.push(''); // Empty line between agents
    }

    return lines.join('\n');
  }

  stop() {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    console.log('\n✅ Monitor stopped');
  }

  private setupSignalHandlers() {
    const shutdown = async (signal: string) => {
      if (!this.isRunning) return;

      console.log(`\n🛑 Received ${signal}, shutting down benchmark...`);
      this.stop();

      await ProcessManager.getInstance().killAllProcesses();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
  }
}

// Real-time monitor for agent outputs
class AgentMonitor {
  private outputs: Map<string, string[]> = new Map();
  private maxLines = 5;

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
  }

  display() {
    // Clear screen and show latest outputs
    console.clear();
    console.log('🤖 Agent Monitor - Real-time Output\n');

    for (const [agentName, lines] of this.outputs) {
      if (lines.length > 0) {
        console.log(`📋 ${agentName}:`);
        lines.forEach(line => console.log(`   ${line}`));
        console.log('');
      }
    }
  }
}

const agents = ['craftsman', 'practitioner', 'craftsman-reflective', 'practitioner-reflective'];

async function validateBenchmarkOptions(options: BenchmarkCommandOptions): Promise<void> {
  // Use default task if not provided
  if (!options.task) {
    options.task = 'examples/benchmark-tasks/user-management-system.md';
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

async function runAgent(agentName: string, outputDir: string, taskFile: string, contextFile: string | undefined, monitor?: AgentMonitor, outputCallback?: (agentName: string, output: string) => void, maxRetries: number = 3): Promise<void> {
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
    console.log(`📝 Claude command: claude --system-prompt [${agentPrompt.length} chars] --dangerously-skip-permissions --print [${fullTask.length} chars]`);

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
        ProcessManager.getInstance().trackChildProcess(claudeProcess);

        let stdout = '';
        let stderr = '';

        claudeProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          stdout += output;

          // Add output to monitor for real-time display
          monitor?.addOutput(agentName, output);

          // Add output to console monitor callback
          outputCallback?.(agentName, output);

          // Also output to console for immediate feedback (if not using console monitor)
          if (!outputCallback) {
            process.stdout.write(`[${agentName}] ${output}`);
          }
        });

        claudeProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          stderr += output;

          // Add error output to monitor
          monitor?.addOutput(agentName, `ERROR: ${output}`);

          // Add error output to console monitor callback
          outputCallback?.(agentName, `ERROR: ${output}`);

          // Also output error to console (if not using console monitor)
          if (!outputCallback) {
            process.stderr.write(`[${agentName} ERROR] ${output}`);
          }
        });

        claudeProcess.on('close', async (code) => {
          const endTime = Date.now();

          // Clean up temp prompt file
          try {
            await fs.unlink(tempPromptFile);
          } catch (error) {
            // Ignore cleanup errors
          }

          // Write execution log with timing information
          const executionLog = `Execution completed at: ${new Date(endTime).toISOString()}\nExit code: ${code}\n\n=== STDOUT ===\n${stdout}\n\n=== STDERR ===\n${stderr}\n`;
          await fs.writeFile(path.join(agentWorkDir, 'execution-log.txt'), executionLog);

          // Write timing metadata
          const timingData = {
            endTime,
            exitCode: code,
            stdoutLength: stdout.length,
            stderrLength: stderr.length
          };
          await fs.writeFile(path.join(agentWorkDir, 'timing.json'), JSON.stringify(timingData, null, 2));

          if (code === 0) {
            console.log(`✅ Agent ${agentName} completed successfully`);
            resolve();
          } else {
            await fs.writeFile(path.join(agentWorkDir, 'execution-error.txt'), stderr);
            reject(new Error(`Agent ${agentName} failed with code ${code}`));
          }
        });

        claudeProcess.on('error', (error) => {
          reject(error);
        });
      });
    };

    // Run agent without timeout - let it complete naturally
    await runSingleAgent();

  } catch (error) {
    throw new CLIError(`Failed to load agent ${agentName}: ${error}`);
  }
}

async function evaluateResults(outputDir: string, reportDir?: string, options?: BenchmarkCommandOptions): Promise<void> {
  console.log('🔍 Evaluating code created by agents...');

  // First, collect actual timing information for each agent
  const agentTimings: { [key: string]: { startTime?: number; endTime?: number; duration?: number } } = {};

  const agentDirs = agents.map(agent => path.join(outputDir, agent));
  for (const agentDir of agentDirs) {
    const agentName = path.basename(agentDir);
    try {
      // Try to read the execution-time.txt file first
      const timingFile = path.join(agentDir, 'execution-time.txt');
      const timingContent = await fs.readFile(timingFile, 'utf-8');

      // Parse the timing information
      const durationMatch = timingContent.match(/Duration:\s*(\d+)\s*seconds/);
      const duration = durationMatch ? parseInt(durationMatch[1]) : 0;

      agentTimings[agentName] = { duration };
    } catch (error) {
      // Fallback: try to read from timing.json
      try {
        const timingJsonFile = path.join(agentDir, 'timing.json');
        const timingContent = await fs.readFile(timingJsonFile, 'utf-8');
        const timingData = JSON.parse(timingContent);

        // If we have timing data but no duration, estimate it
        agentTimings[agentName] = { duration: 0 }; // Unknown duration
      } catch (fallbackError) {
        agentTimings[agentName] = { duration: 0 }; // No timing data available
      }
    }
  }

  const evaluatorPrompt = `
Please evaluate the code and solutions created by these software engineering agents. For each agent, analyze their work by examining the files they created in their respective directories.

**IMPORTANT: Performance and timing are critical evaluation factors.** Faster execution times that maintain quality are highly valued.

For each agent, evaluate:

1. **Performance & Speed** (1-10): Execution time, efficiency, how quickly they completed the task
2. **Code Quality** (1-10): Readability, structure, naming conventions, code organization
3. **Architecture Design** (1-10): Modularity, scalability, separation of concerns, best practices
4. **Functionality** (1-10): Requirements satisfaction, error handling, feature completeness
5. **Testing Coverage** (1-10): Test quality, coverage, testing strategies used
6. **Documentation** (1-10): Code comments, README files, API documentation, setup instructions
7. **Business Value** (1-10): Practicality, maintainability, innovation, solution effectiveness

**Scoring Guidelines for Performance:**
- 9-10: Extremely fast (under 5 seconds), excellent efficiency
- 7-8: Fast (5-10 seconds), good optimization
- 5-6: Average (10-20 seconds), acceptable speed
- 3-4: Slow (20-30 seconds), needs optimization
- 1-2: Very slow (30+ seconds), significant performance issues

**Approximate Timing Data:**
${Object.entries(agentTimings).map(([agent, timing]) =>
  `- ${agent}: ${timing.duration || 'unknown'} seconds`
).join('\n')}

Agents to evaluate:
- craftsman: Idealistic craftsman with principles-based approach
- practitioner: Pragmatic practitioner with business-focused approach
- craftsman-reflective: Idealistic craftsman with reflective questioning
- practitioner-reflective: Pragmatic practitioner with contextual decision-making

For each agent, please:
1. Examine all files they created in their directory
2. Analyze the code quality and architecture
3. Check if requirements were met
4. **CRITICAL: Consider their execution speed and efficiency**
5. Evaluate the overall solution quality
6. Compare approaches between agents

Please provide:
1. Detailed scoring for each agent (1-10 scale) with special attention to performance
2. Analysis of differences between approaches, including speed vs quality tradeoffs
3. What each agent excels at (including speed advantages)
4. Recommendations for different use cases (when speed matters vs when quality matters more)
5. Overall comparison and insights with performance as a key factor

Format your response as a structured evaluation report with clear sections for each agent.
`;

  // Collect all agent work by reading their created files
  const agentWork: { [key: string]: string } = {};

  for (const agentDir of agentDirs) {
    const agentName = path.basename(agentDir);
    try {
      // Read all files in agent directory
      const files = await fs.readdir(agentDir);
      let agentContent = `=== ${agentName} WORK ===\n\n`;

      for (const file of files) {
        const filePath = path.join(agentDir, file);
        const stat = await fs.stat(filePath);

        if (stat.isFile()) {
          const content = await fs.readFile(filePath, 'utf-8');
          agentContent += `\n--- File: ${file} ---\n${content}\n`;
        }
      }

      agentWork[agentName] = agentContent;
    } catch (error) {
      agentWork[agentName] = `=== ${agentName} WORK ===\n\nERROR: Could not read files - ${error}`;
    }
  }

  // Combine all agent work into input for evaluator
  const allWork = Object.values(agentWork).join('\n' + '='.repeat(80) + '\n');
  const fullInput = evaluatorPrompt + '\n\nAGENT WORK TO EVALUATE:\n' + allWork;

  // Write evaluation prompt to temp file
  const tempEvalFile = path.join(outputDir, '.evaluation-prompt.md');
  await fs.writeFile(tempEvalFile, fullInput);

  // Run evaluation with Claude
  const evaluationProcess = spawn('claude', [
    '--system-prompt', `@${tempEvalFile}`,
    '--dangerously-skip-permissions',
    '--print',
    'Please evaluate the agent work as described in the system prompt.'
  ], {
      cwd: outputDir,
      stdio: ['inherit', 'pipe', 'pipe']
  });

  // Track evaluation process for cleanup
  ProcessManager.getInstance().trackChildProcess(evaluationProcess);

  let evaluationOutput = '';

  evaluationProcess.stdout?.on('data', (data) => {
    evaluationOutput += data.toString();
  });

  return new Promise((resolve, reject) => {
    evaluationProcess.on('close', async (code) => {
      if (code === 0) {
        // Save report to both temp directory and optionally to project directory
        const tempReportPath = path.join(outputDir, 'evaluation-report.md');
        await fs.writeFile(tempReportPath, evaluationOutput);

        // Save summary of what each agent created
        const summary = Object.entries(agentWork).map(([agent, content]) => {
          const fileCount = (content.match(/--- File: /g) || []).length;
          return `${agent}: ${fileCount} files created`;
        }).join('\n');

        const tempSummaryPath = path.join(outputDir, 'summary.txt');
        await fs.writeFile(tempSummaryPath, summary);

        // Clean up evaluation temp file
        try {
          await fs.unlink(tempEvalFile);
        } catch (error) {
          // Ignore cleanup errors
        }

        console.log('📊 Evaluation completed');
        console.log(`📄 Report saved to: ${tempReportPath}`);

        // Also save to project directory if report option is provided
        if (reportDir) {
          const projectReportPath = path.join(process.cwd(), reportDir, 'evaluation-report.md');
          const projectSummaryPath = path.join(process.cwd(), reportDir, 'summary.txt');

          // Ensure report directory exists
          await fs.mkdir(path.dirname(projectReportPath), { recursive: true });

          await fs.writeFile(projectReportPath, evaluationOutput);
          await fs.writeFile(projectSummaryPath, summary);

          console.log(`📄 Report also saved to: ${projectReportPath}`);
        }

        console.log('📋 Summary of created files saved');

        resolve();
      } else {
        reject(new Error(`Evaluation failed with code ${code}`));
      }
    });

    evaluationProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function runParallelAgents(agentList: string[], outputDir: string, taskFile: string, contextFile: string | undefined, concurrency: number, delay: number, enableConsoleMonitor: boolean = false): Promise<void> {
  console.log(`🔄 Running ${agentList.length} agents with concurrency: ${concurrency}, delay: ${delay}s`);

  // Create efficient monitor for real-time output if enabled (optimised for performance)
  let efficientMonitor: EfficientMonitor | undefined;
  if (enableConsoleMonitor) {
    efficientMonitor = new EfficientMonitor();
    efficientMonitor.start();

    // Track workspace directories
    const workspaceDirs = agentList.map(agent => path.join(outputDir, agent));
    efficientMonitor.setWorkspaceDirs(workspaceDirs);

    // Add all agents to the monitor
    agentList.forEach(agent => {
      efficientMonitor!.addAgent(agent);
    });
  }

  if (concurrency <= 1) {
    // Sequential execution
    console.log('📝 Running agents sequentially...');
    for (const agent of agentList) {
      try {
        const startTime = Date.now();
        efficientMonitor?.updateAgentStatus(agent, 'running');

        await runAgent(agent, outputDir, taskFile, contextFile, undefined, (agentName, output) => {
          efficientMonitor?.addAgentOutput(agentName, output);
        });

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

        efficientMonitor?.updateAgentStatus(agent, 'completed');

        // Add delay between agents (except last one)
        if (agent !== agentList[agentList.length - 1]) {
          console.log(`⏳ Waiting ${delay}s before next agent...`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
      } catch (error) {
        efficientMonitor?.updateAgentStatus(agent, 'error');
        efficientMonitor?.addAgentOutput(agent, `❌ ERROR: ${error}`);
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

      // Update status for all agents in this chunk and track start times
      const chunkStartTimes: { [agent: string]: number } = {};
      chunks[i].forEach(agent => {
        chunkStartTimes[agent] = Date.now();
        efficientMonitor?.updateAgentStatus(agent, 'running');
      });

      const promises = chunks[i].map(agent =>
        runAgent(agent, outputDir, taskFile, contextFile, undefined, (agentName, output) => {
          efficientMonitor?.addAgentOutput(agentName, output);
        })
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

          efficientMonitor?.updateAgentStatus(agent, 'completed');
        });

        console.log(`✅ Chunk ${i + 1} completed`);
      } catch (error) {
        // Mark all agents in this chunk as having errors
        chunks[i].forEach(agent => {
          efficientMonitor?.updateAgentStatus(agent, 'error');
          efficientMonitor?.addAgentOutput(agent, `❌ ERROR: ${error}`);
        });

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

  // Stop the efficient monitor
  if (efficientMonitor) {
    efficientMonitor.stop();
  }

  console.log('✅ All agent executions completed');
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
      defaultValue: 'examples/benchmark-tasks/user-management-system.md'
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
      description: 'Number of agents to run concurrently',
      defaultValue: '1'
    },
    {
      flags: '--delay <seconds>',
      description: 'Delay in seconds between agent executions',
      defaultValue: '2'
    },
    {
      flags: '--quiet',
      description: 'Disable real-time monitoring, show minimal output'
    }
  ],
  handler: async (options: BenchmarkCommandOptions) => {
    try {
      await validateBenchmarkOptions(options);

      console.log('🎯 Starting agent benchmark test');
      console.log(`📁 Output directory: ${options.output}`);

      // Create benchmark directory
      await createBenchmarkDirectory(options.output!);

      // Copy task files
      await copyTaskFiles(options.task!, options.context, options.output!);

      // Get agent list
      const agentList = await getAgentList(options.agents!);
      console.log(`🤖 Testing agents: ${agentList.join(', ')}`);

      // Run agents with concurrency control and console monitor (unless quiet mode)
      await runParallelAgents(agentList, options.output!, options.task!, options.context, options.concurrency!, options.delay!, options.quiet !== true);

      // Evaluate results if requested
      if (options.evaluate) {
        await evaluateResults(options.output!, options.report, options);
      }

      console.log(`🎉 Benchmark completed!`);
      console.log(`📁 Results saved to: ${options.output}`);

    } catch (error) {
      throw new CLIError(`Benchmark failed: ${error}`);
    }
  }
};