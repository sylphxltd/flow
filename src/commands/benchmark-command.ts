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

async function runAgent(agentName: string, outputDir: string, taskFile: string, contextFile: string | undefined, monitor?: AgentMonitor, maxRetries: number = 3): Promise<void> {
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

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.log(`⏱️ Timeout reached for ${agentName}, terminating process...`);
          claudeProcess.kill('SIGTERM');
          reject(new Error(`Agent ${agentName} timed out after 60 seconds`));
        }, 60000); // 60 second timeout

        let stdout = '';
        let stderr = '';

        claudeProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          stdout += output;

          // Temporary disable monitor for debugging
          process.stdout.write(`[${agentName}] ${output}`);
        });

        claudeProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          stderr += output;

          // Temporary disable monitor for debugging
          process.stderr.write(`[${agentName} ERROR] ${output}`);
        });

        claudeProcess.on('close', async (code) => {
          clearTimeout(timeout); // Clear timeout when process completes

          // Clean up temp prompt file
          try {
            await fs.unlink(tempPromptFile);
          } catch (error) {
            // Ignore cleanup errors
          }

          if (code === 0) {
            await fs.writeFile(path.join(agentWorkDir, 'execution-log.txt'), stdout);
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

    // Implement retry logic
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await runSingleAgent();
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️  Agent ${agentName} attempt ${attempt} failed: ${error}`);

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 2000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Waiting ${delayMs / 1000}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed
    throw lastError || new Error(`Agent ${agentName} failed after ${maxRetries} attempts`);

  } catch (error) {
    throw new CLIError(`Failed to load agent ${agentName}: ${error}`);
  }
}

async function evaluateResults(outputDir: string, reportDir?: string, options?: BenchmarkCommandOptions): Promise<void> {
  console.log('🔍 Evaluating code created by agents...');

  const evaluatorPrompt = `
Please evaluate the code and solutions created by these four software engineering agents. For each agent, analyze their work by examining the files they created in their respective directories.

For each agent, evaluate:

1. **Code Quality** (1-10): Readability, structure, naming conventions, code organization
2. **Architecture Design** (1-10): Modularity, scalability, separation of concerns, best practices
3. **Functionality** (1-10): Requirements satisfaction, error handling, feature completeness
4. **Testing Coverage** (1-10): Test quality, coverage, testing strategies used
5. **Documentation** (1-10): Code comments, README files, API documentation, setup instructions
6. **Business Value** (1-10): Practicality, maintainability, innovation, solution effectiveness

Agents to evaluate:
- craftsman: Idealistic craftsman with principles-based approach
- practitioner: Pragmatic practitioner with business-focused approach
- craftsman-reflective: Idealistic craftsman with reflective questioning
- practitioner-reflective: Pragmatic practitioner with contextual decision-making

For each agent, please:
1. Examine all files they created in their directory
2. Analyze the code quality and architecture
3. Check if requirements were met
4. Evaluate the overall solution quality
5. Compare approaches between agents

Please provide:
1. Detailed scoring for each agent (1-10 scale)
2. Analysis of differences between approaches
3. What each agent excels at
4. Recommendations for different use cases
5. Overall comparison and insights

Format your response as a structured evaluation report with clear sections for each agent.
`;

  // Collect all agent work by reading their created files
  const agentDirs = agents.map(agent => path.join(outputDir, agent));
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

async function runParallelAgents(agentList: string[], outputDir: string, taskFile: string, contextFile: string | undefined, concurrency: number, delay: number): Promise<void> {
  console.log(`🔄 Running ${agentList.length} agents with concurrency: ${concurrency}, delay: ${delay}s`);

  // Create monitor for real-time output
  const monitor = new AgentMonitor();

  if (concurrency <= 1) {
    // Sequential execution
    console.log('📝 Running agents sequentially...');
    for (const agent of agentList) {
      try {
        await runAgent(agent, outputDir, taskFile, contextFile, monitor);

        // Add delay between agents (except last one)
        if (agent !== agentList[agentList.length - 1]) {
          monitor.display();
          console.log(`⏳ Waiting ${delay}s before next agent...`);
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
      } catch (error) {
        monitor.addOutput(agent, `❌ ERROR: ${error}`);
        monitor.display();
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
        runAgent(agent, outputDir, taskFile, contextFile, monitor)
      );

      try {
        await Promise.all(promises);
        monitor.display();
        console.log(`✅ Chunk ${i + 1} completed`);
      } catch (error) {
        monitor.addOutput(`Chunk ${i + 1}`, `❌ ERROR: ${error}`);
        monitor.display();
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

  monitor.display();
  console.log('✅ All agent executions completed');
}

export const benchmarkCommand: CommandConfig = {
  name: 'benchmark',
  description: 'Run benchmark tests comparing multiple agent designs',
  options: [
    {
      flags: '--agents <agents>',
      description: 'Agents to test (comma-separated or "all", default: all)',
      defaultValue: 'all'
    },
    {
      flags: '--task <file>',
      description: 'Path to task definition file (default: examples/benchmark-tasks/user-management-system.md)',
      defaultValue: 'examples/benchmark-tasks/user-management-system.md'
    },
    {
      flags: '--output <dir>',
      description: 'Output directory for results (default: /tmp/agent-benchmark-TIMESTAMP)'
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
      description: 'Directory to save evaluation reports (default: benchmark-results)',
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

      // Run agents with concurrency control
      await runParallelAgents(agentList, options.output!, options.task!, options.context, options.concurrency!, options.delay!);

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