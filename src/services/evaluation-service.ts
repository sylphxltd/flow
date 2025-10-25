import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { AgentWork, AgentTimings, TimingData } from '../types/benchmark.js';
import { DEFAULT_AGENTS, PERFORMANCE_SCORE_RANGES, EVALUATION_CRITERIA, AGENT_DESCRIPTIONS } from '../constants/benchmark-constants.js';
import { ProcessManager } from '../utils/process-manager.js';
import type { InkMonitor } from '../components/benchmark-monitor.js';

export class EvaluationService {
  static async evaluateResults(
    outputDir: string,
    reportDir: string | undefined,
    monitor?: InkMonitor
  ): Promise<void> {
    // First, collect actual timing information for each agent
    const agentTimings: AgentTimings = {};
    const agentDirs = DEFAULT_AGENTS.map(agent => path.join(outputDir, agent));

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

    const evaluatorPrompt = this.buildEvaluationPrompt(agentTimings);

    // Collect all agent work by reading their created files
    const agentWork: AgentWork = {};

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

    // Add evaluation agent to monitor if available
    if (monitor) {
      monitor.addAgent('evaluator');
      monitor.updateAgentStatus('evaluator', 'running');
    }

    // Run evaluation with Claude
    const evaluationProcess = spawn('claude', [
      '--system-prompt', `@${tempEvalFile}`,
      '--dangerously-skip-permissions',
      '--output-format', 'stream-json',
      '--verbose',
      'Please evaluate the agent work as described in the system prompt.'
    ], {
      cwd: outputDir,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_NO_PROGRESS: '1',
        CI: '1',
        PYTHONUNBUFFERED: '1'
      }
    });

    // Track evaluation process for cleanup
    ProcessManager.getInstance().trackChildProcess(evaluationProcess);

    let evaluationOutput = '';
    let stdoutBuffer = '';

    evaluationProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      stdoutBuffer += output;

      // Process complete lines only - keep incomplete data in buffer
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || ''; // Keep last incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const jsonData = JSON.parse(line);

          if (jsonData.type === 'assistant' && jsonData.message?.content) {
            // Extract text content from assistant message
            for (const content of jsonData.message.content) {
              if (content.type === 'text') {
                const textContent = content.text.trim();
                if (textContent) {
                  evaluationOutput += textContent + '\n';
                  // Add to monitor if available
                  monitor?.addAgentOutput('evaluator', textContent);
                }
              }
            }
          }
        } catch (e) {
          // Skip invalid JSON (shouldn't happen with stream-json)
          // For non-JSON output, add to evaluation output
          evaluationOutput += line + '\n';
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
          const tempReportPath = path.join(outputDir, 'evaluation-report.md');
          await fs.writeFile(tempReportPath, evaluationOutput);

          // Save summary of what each agent created
          const summary = Object.entries(agentWork).map(([agent, content]) => {
            const fileCount = (content.match(/--- File: /g) || []).length;
            return `${agent}: ${fileCount} files created`;
          }).join('\n');

          const tempSummaryPath = path.join(outputDir, 'summary.txt');
          await fs.writeFile(tempSummaryPath, summary);

          // Show completion message and report preview in monitor
          if (monitor) {
            monitor?.addAgentOutput('evaluator', '📊 Evaluation completed successfully!');
            monitor?.addAgentOutput('evaluator', `📁 Report saved to: ${tempReportPath}`);

            // Show report preview (first few lines)
            const reportLines = evaluationOutput.split('\n').slice(0, 10);
            monitor?.addAgentOutput('evaluator', '📋 Report Preview:');
            reportLines.forEach((line, index) => {
              if (line.trim()) {
                monitor?.addAgentOutput('evaluator', `${index + 1}. ${line}`);
              }
            });

            if (evaluationOutput.split('\n').length > 10) {
              monitor?.addAgentOutput('evaluator', '... (full report available in file)');
            }
          }

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

            if (monitor) {
              monitor?.addAgentOutput('evaluator', `📁 Project report saved to: ${projectReportPath}`);
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

  private static buildEvaluationPrompt(agentTimings: AgentTimings): string {
    return `
You are conducting a comprehensive technical evaluation of software engineering agents. You must analyze the actual code and implementations they created, not give generic assessments.

**CRITICAL REQUIREMENTS:**
1. **EXAMINE ACTUAL CODE**: Read and analyze every file created by each agent
2. **SPECIFIC ANALYSIS**: Reference actual implementations, files, and code patterns
3. **CONCRETE EXAMPLES**: Quote actual code snippets and file contents in your analysis
4. **NO GENERIC STATEMENTS**: Avoid vague praise like "comprehensive system" - be specific

**PERFORMANCE SCORING (CRITICAL):**
${Object.entries(agentTimings).map(([agent, timing]) => {
  const duration = timing.duration || 0;
  const scoreRange = PERFORMANCE_SCORE_RANGES.find(range => duration <= range.max)!;
  return `- ${agent}: ${duration}s (Performance Score: ${scoreRange.score}/10 - ${scoreRange.description})`;
}).join('\n')}

**DETAILED EVALUATION CRITERIA:**

For each agent, provide:

1. **Code Implementation Analysis** (1-10):
   - Actual file structure and organization
   - Code quality and readability (show examples)
   - Error handling implementation
   - Security measures implemented
   - Database design and queries
   - API endpoint implementations

2. **Feature Completeness** (1-10):
   - Which specific requirements were met
   - Missing features or incomplete implementations
   - User management features implemented
   - Authentication and authorization
   - Database migrations and seeding

3. **Testing Quality** (1-10):
   - Actual test files created
   - Test coverage areas
   - Testing frameworks used
   - Integration tests vs unit tests

4. **Documentation Quality** (1-10):
   - README content and setup instructions
   - API documentation
   - Code comments and inline documentation
   - Installation and deployment guides

5. **Architecture & Design** (1-10):
   - Project structure and modularity
   - Separation of concerns
   - Design patterns used
   - Scalability considerations

**MANDATORY OUTPUT FORMAT:**

# Agent Evaluation Report

## Executive Summary
[Brief overview of results, naming the winner and key performance insights]

## Individual Agent Analysis

### 1. [Agent Name] - Total Score: XX/50
**Execution Time:** XXX seconds
**Performance Score:** X/10

#### Implementation Details:
- **Files Created:** [List actual files]
- **Key Features Implemented:** [Specific features with examples]
- **Code Quality Examples:** [Show actual code snippets]
- **Architecture Assessment:** [Specific analysis of structure]

#### Scoring Breakdown:
- Performance & Speed: X/10 - [Specific reasoning with time comparison]
- Code Implementation: X/10 - [Specific code examples]
- Feature Completeness: X/10 - [Which requirements met/missed]
- Testing Quality: X/10 - [Actual test files analyzed]
- Documentation: X/10 - [Documentation quality assessment]
- Architecture Design: X/10 - [Design pattern analysis]

#### Strengths:
[List specific strengths with examples]

#### Weaknesses:
[List specific weaknesses with examples]

[Repeat for all agents]

## Comparative Analysis
- **Performance Ranking:** [Order by speed]
- **Quality Ranking:** [Order by implementation quality]
- **Best for Speed:** [Agent name] with reasoning
- **Best for Quality:** [Agent name] with reasoning
- **Best Overall Value:** [Agent name] with reasoning

## Final Recommendations
- **Winner:** [Agent name] with score and reasoning
- **Use Case Recommendations:** [When to use each agent]
- **Key Insights:** [What we learned about each agent's approach]

**REMEMBER: Base your analysis on ACTUAL CODE AND FILES, not generic statements. Be specific, detailed, and reference actual implementations.**
`;
  }
}