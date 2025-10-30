import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { InkMonitor } from '../components/benchmark-monitor.js';
import {
  AGENT_DESCRIPTIONS,
  DEFAULT_AGENTS,
  EVALUATION_CRITERIA,
  PERFORMANCE_SCORE_RANGES,
} from '../constants/benchmark-constants.js';
import type { AgentTimings, AgentWork, TimingData } from '../types/benchmark.js';
import { ProcessManager } from '../utils/process-manager.js';

export class EvaluationService {
  static async evaluateResults(
    outputDir: string,
    reportDir: string | undefined,
    monitor?: InkMonitor
  ): Promise<void> {
    // First, collect actual timing information for each agent
    const agentTimings: AgentTimings = {};
    const agentDirs = DEFAULT_AGENTS.map((agent) => path.join(outputDir, agent));

    for (const agentDir of agentDirs) {
      const agentName = path.basename(agentDir);
      try {
        // Try to read the execution-time.txt file first
        const timingFile = path.join(agentDir, 'execution-time.txt');
        const timingContent = await fs.readFile(timingFile, 'utf-8');

        // Parse the timing information
        const durationMatch = timingContent.match(/Duration:\s*(\d+)\s*seconds/);
        const duration = durationMatch ? Number.parseInt(durationMatch[1]) : 0;

        agentTimings[agentName] = { duration };
      } catch (_error) {
        // Fallback: try to read from timing.json
        try {
          const timingJsonFile = path.join(agentDir, 'timing.json');
          const timingContent = await fs.readFile(timingJsonFile, 'utf-8');
          const _timingData = JSON.parse(timingContent);

          // If we have timing data but no duration, estimate it
          agentTimings[agentName] = { duration: 0 }; // Unknown duration
        } catch (_fallbackError) {
          agentTimings[agentName] = { duration: 0 }; // No timing data available
        }
      }
    }

    const evaluatorPrompt = await EvaluationService.buildEvaluationPrompt(agentTimings);

    // Collect all agent work by reading their created files
    const agentWork: AgentWork = {};

    for (const agentDir of agentDirs) {
      const agentName = path.basename(agentDir);
      try {
        // Read all files in agent directory
        const files = await fs.readdir(agentDir);

        // FUNCTIONAL: Build file content array instead of string accumulation
        const fileContents: string[] = [];
        for (const file of files) {
          const filePath = path.join(agentDir, file);
          const stat = await fs.stat(filePath);

          if (stat.isFile()) {
            const content = await fs.readFile(filePath, 'utf-8');
            fileContents.push(`\n--- File: ${file} ---\n${content}\n`);
          }
        }

        // Join at the end
        agentWork[agentName] = `=== ${agentName} WORK ===\n\n${fileContents.join('')}`;
      } catch (error) {
        agentWork[agentName] =
          `=== ${agentName} WORK ===\n\nERROR: Could not read files - ${error}`;
      }
    }

    // Combine all agent work into input for evaluator
    const allWork = Object.values(agentWork).join(`\n${'='.repeat(80)}\n`);
    const fullInput = `${evaluatorPrompt}\n\nAGENT WORK TO EVALUATE:\n${allWork}`;

    // Write evaluation prompt to temp file
    const tempEvalFile = path.join(outputDir, '.evaluation-prompt.md');
    await fs.writeFile(tempEvalFile, fullInput);

    // Add evaluation agent to monitor if available
    if (monitor) {
      monitor.addAgent('evaluator');
      monitor.updateAgentStatus('evaluator', 'running');
    }

    // Run evaluation with Claude
    const evaluationProcess = spawn(
      'claude',
      [
        '--system-prompt',
        `@${tempEvalFile}`,
        '--dangerously-skip-permissions',
        '--output-format',
        'stream-json',
        '--verbose',
        'Please evaluate the agent work as described in the system prompt.',
      ],
      {
        cwd: outputDir,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: {
          ...process.env,
          FORCE_NO_PROGRESS: '1',
          CI: '1',
          PYTHONUNBUFFERED: '1',
        },
      }
    );

    // Track evaluation process for cleanup
    ProcessManager.getInstance().trackChildProcess(evaluationProcess);

    // FUNCTIONAL: Use arrays for immutable buffer accumulation
    const evaluationOutputChunks: string[] = [];
    let incompleteStdoutLine = '';

    evaluationProcess.stdout?.on('data', (data) => {
      const output = data.toString();

      // Process complete lines only - keep incomplete data in buffer
      const combined = incompleteStdoutLine + output;
      const lines = combined.split('\n');
      incompleteStdoutLine = lines.pop() || ''; // Keep last incomplete line

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        try {
          const jsonData = JSON.parse(line);

          if (jsonData.type === 'assistant' && jsonData.message?.content) {
            // Extract text content from assistant message
            for (const content of jsonData.message.content) {
              if (content.type === 'text') {
                const textContent = content.text.trim();
                if (textContent) {
                  evaluationOutputChunks.push(`${textContent}\n`);
                  // Add to monitor if available
                  monitor?.addAgentOutput('evaluator', textContent);
                }
              }
            }
          }
        } catch (_e) {
          // Skip invalid JSON (shouldn't happen with stream-json)
          // For non-JSON output, add to evaluation output
          evaluationOutputChunks.push(`${line}\n`);
          monitor?.addAgentOutput('evaluator', line);
        }
      }
    });

    return new Promise((resolve, reject) => {
      evaluationProcess.on('close', async (code) => {
        // Update evaluator status
        monitor?.updateAgentStatus('evaluator', code === 0 ? 'completed' : 'error');

        if (code === 0) {
          // Save report to both temp directory and optionally to project directory
          // FUNCTIONAL: Join output chunks at the end
          const evaluationOutput = evaluationOutputChunks.join('');
          const tempReportPath = path.join(outputDir, 'evaluation-report.md');
          await fs.writeFile(tempReportPath, evaluationOutput);

          // Save summary of what each agent created
          const summary = Object.entries(agentWork)
            .map(([agent, content]) => {
              const fileCount = (content.match(/--- File: /g) || []).length;
              return `${agent}: ${fileCount} files created`;
            })
            .join('\n');

          const tempSummaryPath = path.join(outputDir, 'summary.txt');
          await fs.writeFile(tempSummaryPath, summary);

          // Show completion message and display the full LLM output
          if (monitor) {
            monitor?.addAgentOutput('evaluator', '📊 Evaluation completed!');
            monitor?.addAgentOutput('evaluator', `📁 Report saved to: ${tempReportPath}`);
            monitor?.addAgentOutput('evaluator', '');
            monitor?.addAgentOutput('evaluator', '🏆 EVALUATION RESULTS:');
            monitor?.addAgentOutput('evaluator', '');

            // Display the complete LLM evaluation output directly
            const lines = evaluationOutput.split('\n');
            lines.forEach((line, _index) => {
              if (line.trim()) {
                monitor?.addAgentOutput('evaluator', line);
              }
            });

            monitor?.addAgentOutput('evaluator', '');
            monitor?.addAgentOutput('evaluator', '✅ End of evaluation report');
          }

          // Clean up evaluation temp file
          try {
            await fs.unlink(tempEvalFile);
          } catch (_error) {
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

            if (monitor) {
              monitor?.addAgentOutput(
                'evaluator',
                `📁 Project report saved to: ${projectReportPath}`
              );
            }
          }

          resolve();
        } else {
          monitor?.addAgentOutput('evaluator', `❌ Evaluation failed with exit code ${code}`);
          reject(new Error(`Evaluation failed with code ${code}`));
        }
      });

      evaluationProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  private static async buildEvaluationPrompt(agentTimings: AgentTimings): Promise<string> {
    // Load template from file - required file, no fallback
    const templatePath = path.join(process.cwd(), 'templates', 'evaluation-prompt.md');

    try {
      const template = await fs.readFile(templatePath, 'utf-8');

      // Generate agent performance data section
      const performanceData = Object.entries(agentTimings)
        .map(([agent, timing]) => {
          const duration = timing.duration || 0;
          const scoreRange = PERFORMANCE_SCORE_RANGES.find((range) => duration <= range.max)!;
          return `- ${agent}: ${duration}s execution time (Performance: ${scoreRange.score}/10)`;
        })
        .join('\n');

      // Replace template variables
      return template.replace('{{AGENT_PERFORMANCE_DATA}}', performanceData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load evaluation template from ${templatePath}. Error: ${errorMessage}\n\nPlease ensure:\n1. The file exists at: ${templatePath}\n2. The file is readable (check permissions)\n3. The file contains valid markdown content`
      );
    }
  }
}
