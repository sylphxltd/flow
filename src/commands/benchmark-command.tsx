import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { render } from 'ink';
import React from 'react';
import { Box, Text, useApp } from 'ink';
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
  timeout?: number;
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
        // Silently handle kill errors
      }
    });

    await Promise.all(killPromises);
    this.childProcesses.clear();
  }
}

// React Ink component for efficient real-time monitoring
const BenchmarkMonitor: React.FC<{
  monitor: InkMonitor;
  onComplete: () => void;
}> = ({ monitor, onComplete }) => {
  const { exit } = useApp();

  // Subscribe to monitor changes using proper React state
  const [updateTrigger, setUpdateTrigger] = React.useState(0);
  const [flashState, setFlashState] = React.useState(true);

  React.useEffect(() => {
    // Subscribe to the monitor's change notifications
    const unsubscribe = monitor.subscribe(() => {
      setUpdateTrigger(prev => prev + 1);
    });

    return unsubscribe;
  }, [monitor]);

  // Flashing effect for running status + force frequent updates for real-time output
  React.useEffect(() => {
    const interval = setInterval(() => {
      setFlashState(prev => !prev);
      setUpdateTrigger(prev => prev + 1); // Force update every 800ms to refresh output display
    }, 800); // Flash every 800ms for slow flashing

    return () => clearInterval(interval);
  }, []);

  // Auto-exit when all agents complete
  React.useEffect(() => {
    const agents = monitor.getAgents();
    const allCompleted = Array.from(agents.values()).every(
      agent => agent.status === 'completed' || agent.status === 'error'
    );

    if (allCompleted && agents.size > 0) {
      setTimeout(() => {
        onComplete();
        exit();
      }, 2000);
    }
  }, [monitor, onComplete, exit]);

  const status = React.useMemo(() => {
    const agents = monitor.getAgents();
    return Array.from(agents.entries()).map(([name, agent]) => {
      let runtime = 0;
      if (agent.startTime) {
        if (agent.endTime) {
          runtime = Math.floor((agent.endTime - agent.startTime) / 1000);
        } else if (agent.status === 'running') {
          // Don't calculate runtime dynamically - store it in the agent data
          runtime = agent.startTime ? Math.floor((Date.now() - agent.startTime) / 1000) : 0;
        }
      }

      // Determine status display with flashing green dot for running
      let statusDisplay = '';
      let statusColor = '';

      if (agent.status === 'running') {
        statusDisplay = flashState ? '●' : ' ';
        statusColor = 'green';
      } else if (agent.status === 'completed') {
        statusDisplay = '✓';
        statusColor = 'green';
      } else if (agent.status === 'error') {
        statusDisplay = '✗';
        statusColor = 'red';
      } else {
        statusDisplay = '◯';
        statusColor = 'gray';
      }

      // Show actual runtime for agents
      let runtimeText = '';
      if (agent.startTime && agent.status === 'running') {
        runtimeText = `${runtime}s`;
      } else if (agent.startTime) {
        runtimeText = `${runtime}s`;
      }

      // Get last output lines (show up to 5 most recent lines)
      let lastOutputLines: string[] = [];
      if (agent.output.length > 0) {
        // Get the last 5 lines - simpler filtering to ensure real-time output shows
        const recentLines = agent.output.slice(-5);
        lastOutputLines = recentLines
          .filter(line => line && line.trim().length > 0)
          .map(line => {
            const cleanLine = line.trim();
            return cleanLine.length > 150 ? cleanLine.substring(0, 150) + '...' : cleanLine;
          });
      }

      // Show placeholder text only if no actual output exists
      if (lastOutputLines.length === 0) {
        if (agent.status === 'running') {
          lastOutputLines.push('(working...)');
        } else if (agent.status === 'idle') {
          lastOutputLines.push('(waiting to start...)');
        }
      }

      return {
        name,
        statusDisplay,
        statusColor,
        status: agent.status.toUpperCase(),
        runtime: runtimeText,
        lastOutput: lastOutputLines
      };
    });
  }, [monitor, updateTrigger, flashState]);
  const workspaceDirs = monitor.getWorkspaceDirs();
  const initialInfo = monitor.getInitialInfo();

  // Create a mapping from agent name to workspace directory
  const agentWorkspaceMap = new Map<string, string>();
  workspaceDirs.forEach(dir => {
    const agentName = path.basename(dir);
    agentWorkspaceMap.set(agentName, dir);
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Initial Information Section */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold>Agent Benchmark Monitor</Text>
        {initialInfo && initialInfo.initialInfo && (
          <>
            <Text color="gray">Output: {initialInfo.initialInfo.outputDir}</Text>
            <Text color="gray">Task: {initialInfo.initialInfo.taskFile ? path.basename(initialInfo.initialInfo.taskFile) : 'Unknown'}</Text>
            <Text color="gray">Agents: {initialInfo.initialInfo.agentCount}</Text>
            <Text color="gray">Concurrency: {initialInfo.initialInfo.concurrency}, Delay: {initialInfo.initialInfo.delay}s</Text>
          </>
        )}
        {(!initialInfo || !initialInfo.initialInfo) && (
          <Text color="gray">Initializing benchmark...</Text>
        )}
      </Box>

      <Box flexDirection="column">
        {status.map((agent) => (
          <Box key={agent.name} marginBottom={1} flexDirection="column">
            <Box>
              <Text bold>
                <Text color={agent.statusColor}>{agent.statusDisplay}</Text> {agent.name}{agent.runtime ? ` ${agent.runtime}` : ''}
              </Text>
            </Box>

            {/* Show workspace directory under each agent */}
            {agentWorkspaceMap.has(agent.name) && (
              <Box paddingLeft={2}>
                <Text color="gray">{agentWorkspaceMap.get(agent.name)}</Text>
              </Box>
            )}

            {agent.lastOutput && agent.lastOutput.length > 0 && (
              <Box paddingLeft={2}>
                {agent.lastOutput.map((line, index) => (
                  <Text key={index} color="gray">{line}</Text>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
};

// Interface for initial info
interface InitialInfo {
  agentCount: number;
  concurrency: number;
  delay: number;
  taskFile: string;
  outputDir: string;
}

// Ink monitor manager
class InkMonitor {
  private agents: Map<string, {
    status: 'idle' | 'running' | 'completed' | 'error';
    output: string[];
    startTime?: number;
    endTime?: number;
  }> = new Map();
  private isRunning = false;
  private workspaceDirs: string[] = [];
  private uiInstance?: any;
  private listeners = new Set<() => void>();
  private initialInfo: InitialInfo;

  constructor(initialInfo: InitialInfo) {
    this.initialInfo = initialInfo;
    this.setupSignalHandlers();
  }

  // Subscribe to changes - proper React pattern
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private triggerUpdate() {
    this.listeners.forEach(listener => listener());
  }


  // Getters for React component
  getAgents() {
    return this.agents;
  }

  getWorkspaceDirs() {
    return this.workspaceDirs;
  }

  getInitialInfo() {
    return this.initialInfo;
  }

  start() {
    this.isRunning = true;

    // Force Ink to work by ensuring proper terminal detection
    const { exit } = process;
    process.stdout.isTTY = true;
    process.stderr.isTTY = true;

    const uiInstance = render(
      <BenchmarkMonitor
        monitor={this}
        onComplete={() => {
          this.stop();
        }}
      />,
      {
        // Enable Ink's full-screen mode with proper terminal control
        debug: false,
        patchConsole: true, // Let Ink control console output
        exitOnCtrlC: false // We'll handle CtrlC ourselves
      }
    );

    this.uiInstance = uiInstance;
  }

  setWorkspaceDirs(dirs: string[]) {
    this.workspaceDirs = dirs;
  }

  addAgent(name: string) {
    this.agents.set(name, {
      status: 'idle',
      output: [],
      startTime: undefined
    });
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
      // Trigger UI update through subscriber pattern
      this.triggerUpdate();
    }
  }

  addAgentOutput(name: string, output: string) {
    const agent = this.agents.get(name);
    if (agent) {
      // Remove ANSI escape sequences that interfere with Ink
      const cleanedOutput = output.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
      const lines = cleanedOutput.split('\n').filter(line => line.trim());
      agent.output = [...agent.output.slice(-20), ...lines]; // Keep last 20 lines instead of 3
      // Trigger UI update through subscriber pattern
      this.triggerUpdate();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.uiInstance) {
      this.uiInstance.unmount();
      this.uiInstance = undefined;
    }
  }

  private setupSignalHandlers() {
    const shutdown = async (signal: string) => {
      if (!this.isRunning) return;

      this.stop();

      await ProcessManager.getInstance().killAllProcesses();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
  }
}


// We only use React+Ink - no fallback needed

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

  // Set default timeout
  if (!options.timeout) {
    options.timeout = 3600; // 1 hour default timeout for complex tasks
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

async function runAgent(agentName: string, outputDir: string, taskFile: string, contextFile: string | undefined, monitor?: AgentMonitor, outputCallback?: (agentName: string, output: string) => void, maxRetries: number = 3, timeout: number = 3600): Promise<void> {
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
        // Silently handle context file errors
      }
    }

    // Add instruction to work in the temp directory
    fullTask += `\n\nIMPORTANT: Please implement your solution in the current working directory: ${agentWorkDir}\nThis is a temporary directory for testing, so you can create files freely without affecting any production codebase.`;

    // Run Claude Code with the agent prompt
    const runSingleAgent = async (): Promise<void> => {
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
          reject(new Error(`Agent ${agentName} timed out after ${timeout} seconds`));
        }, timeout * 1000);

        const claudeProcess = spawn('claude', [
          '--system-prompt', `@${tempPromptFile}`,
          '--dangerously-skip-permissions',
          '--output-format', 'stream-json',
          '--verbose',
          fullTask
        ], {
          cwd: agentWorkDir,
          stdio: ['inherit', 'pipe', 'pipe'],
          env: {
            ...process.env,
            // Disable buffering and progress indicators for real-time output
            FORCE_NO_PROGRESS: '1',
            CI: '1',
            PYTHONUNBUFFERED: '1'
          }
        });

        // Track this child process for cleanup
        ProcessManager.getInstance().trackChildProcess(claudeProcess);

        let stdout = '';
        let stderr = '';
        let processedLines = 0;

        claudeProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          stdout += output;

          // Process each line - Claude stream-json ensures complete JSON objects
          const lines = stdout.split('\n');
          const newLines = lines.slice(processedLines);
          processedLines = lines.length;

          for (const line of newLines) {
            if (!line.trim()) continue;

            try {
              const jsonData = JSON.parse(line);

              if (jsonData.type === 'assistant' && jsonData.message?.content) {
                // Extract text content and tool uses from assistant message
                for (const content of jsonData.message.content) {
                  if (content.type === 'text') {
                    const textContent = content.text.trim();
                    if (textContent) {
                      monitor?.addOutput(agentName, textContent);
                      outputCallback?.(agentName, textContent);
                    }
                  } else if (content.type === 'tool_use') {
                    const toolName = content.name;
                    const params = JSON.stringify(content.input || {}).substring(0, 100);
                    monitor?.addOutput(agentName, `${toolName}(${params})`);
                    outputCallback?.(agentName, `${toolName}(${params})`);
                  }
                }
              }
            } catch (e) {
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
          monitor?.addOutput(agentName, `ERROR: ${output}`);

          // Add error output to console monitor callback (cleaned)
          outputCallback?.(agentName, `ERROR: ${output}`);

          // Don't output directly to console when using React+Ink monitor
          // The monitor will handle displaying relevant output
        });

        claudeProcess.on('close', async (code) => {
          const endTime = Date.now();

          // Clear timeout if process completed normally
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

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
            resolve();
          } else {
            await fs.writeFile(path.join(agentWorkDir, 'execution-error.txt'), stderr);
            reject(new Error(`Agent ${agentName} failed with code ${code}`));
          }
        });

        claudeProcess.on('error', (error) => {
          // Clear timeout on error
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
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

        // Also save to project directory if report option is provided
        if (reportDir) {
          const projectReportPath = path.join(process.cwd(), reportDir, 'evaluation-report.md');
          const projectSummaryPath = path.join(process.cwd(), reportDir, 'summary.txt');

          // Ensure report directory exists
          await fs.mkdir(path.dirname(projectReportPath), { recursive: true });

          await fs.writeFile(projectReportPath, evaluationOutput);
          await fs.writeFile(projectSummaryPath, summary);
        }

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

async function runParallelAgents(agentList: string[], outputDir: string, taskFile: string, contextFile: string | undefined, concurrency: number, delay: number, timeout: number, enableConsoleMonitor: boolean = false): Promise<void> {
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

        await runAgent(agent, outputDir, taskFile, contextFile, undefined, (agentName, output) => {
          monitor?.addAgentOutput(agentName, output);
        }, 3, timeout);

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
        runAgent(agent, outputDir, taskFile, contextFile, undefined, (agentName, output) => {
          monitor?.addAgentOutput(agentName, output);
        }, 3, timeout)
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

  // Stop the monitor
  if (monitor) {
    monitor.stop();
  }
}

// Real-time monitor for agent outputs (interface compatibility)
class AgentMonitor {
  addOutput(agentName: string, output: string) {
    // No-op - this is handled by InkMonitor now
  }
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
    try {
      await validateBenchmarkOptions(options);

      // Create benchmark directory
      await createBenchmarkDirectory(options.output!);

      // Copy task files
      await copyTaskFiles(options.task!, options.context, options.output!);

      // Get agent list
      const agentList = await getAgentList(options.agents!);

      // Run agents with concurrency control and React+Ink monitor (unless quiet mode)
      if (options.quiet) {
        // Quiet mode - run without React+Ink monitor
        await runParallelAgents(agentList, options.output!, options.task!, options.context, options.concurrency!, options.delay!, options.timeout!, false);
      } else {
        // Normal mode - use React+Ink monitor
        await runParallelAgents(agentList, options.output!, options.task!, options.context, options.concurrency!, options.delay!, options.timeout!, true);
      }

      // Evaluate results if requested
      if (options.evaluate) {
        await evaluateResults(options.output!, options.report, options);
      }

      // Only show completion message if monitor was disabled (quiet mode)
      if (options.quiet) {
        // These console.log statements are okay because they only appear in quiet mode
        console.log(`🎉 Benchmark completed!`);
        console.log(`📁 Results saved to: ${options.output}`);
      }

    } catch (error) {
      throw new CLIError(`Benchmark failed: ${error}`);
    }
  }
};