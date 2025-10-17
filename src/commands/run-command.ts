import { spawn } from 'child_process';
import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import fs from 'fs/promises';
import path from 'path';

interface RunCommandOptions extends CommandOptions {
  target?: string;
  agent?: string;
  prompt?: string;
  dryRun?: boolean;
}

async function validateRunOptions(options: RunCommandOptions): Promise<void> {
  if (!options.prompt || options.prompt.trim() === '') {
    throw new CLIError('Prompt is required for run command', 'MISSING_PROMPT');
  }

  // For run command, we always use claude-code as target
  options.target = 'claude-code';

  // Set default agent ONLY if no agent is specified
  if (!options.agent) {
    options.agent = 'sparc-orchestrator';
  }
}

async function loadAgentContent(agentName: string): Promise<string> {
  try {
    // Try to load from agents directory
    const agentPath = path.join(process.cwd(), 'agents', `${agentName}.md`);

    try {
      const content = await fs.readFile(agentPath, 'utf-8');
      return content;
    } catch (error) {
      // Try to load from the package's agents directory
      const packageAgentPath = path.join(__dirname, '../../agents', `${agentName}.md`);
      const content = await fs.readFile(packageAgentPath, 'utf-8');
      return content;
    }
  } catch (error) {
    throw new CLIError(`Agent '${agentName}' not found`, 'AGENT_NOT_FOUND');
  }
}

function extractAgentInstructions(agentContent: string): string {
  // Extract content after YAML front matter
  const yamlFrontMatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
  const match = agentContent.match(yamlFrontMatterRegex);

  if (match) {
    return agentContent.substring(match[0].length).trim();
  }

  // If no front matter, return the full content
  return agentContent.trim();
}

async function executeClaudeCode(combinedPrompt: string, options: RunCommandOptions): Promise<void> {
  if (options.dryRun) {
    console.log('🔍 Dry run: Would execute Claude Code with combined prompt');
    console.log('📝 Combined prompt length:', combinedPrompt.length, 'characters');
    console.log('📝 Combined prompt preview:');
    console.log('---');
    console.log(combinedPrompt.substring(0, 300) + (combinedPrompt.length > 300 ? '...' : ''));
    console.log('---');
    console.log('✅ Dry run completed successfully');
    return;
  }

  return new Promise((resolve, reject) => {
    // Use interactive mode (no --print flag)
    const args = [combinedPrompt, '--dangerously-skip-permissions'];

    if (options.verbose) {
      console.log(`🚀 Executing: claude "${combinedPrompt.substring(0, 100)}..." --dangerously-skip-permissions`);
      console.log(`📝 Prompt length: ${combinedPrompt.length} characters`);
    }

    const child = spawn('claude', args, {
      stdio: 'inherit',
      shell: false
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new CLIError(`Claude Code exited with code ${code}`, 'CLAUDE_ERROR'));
      }
    });

    child.on('error', (error) => {
      reject(new CLIError(`Failed to execute Claude Code: ${error.message}`, 'CLAUDE_NOT_FOUND'));
    });
  });
}

export const runCommand: CommandConfig = {
  name: 'run',
  description: 'Run a prompt with a specific agent (default: sparc-orchestrator) using Claude Code',
  options: [
    {
      flags: '--agent <name>',
      description: 'Agent to use (default: sparc-orchestrator)',
    },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without executing Claude Code' },
  ],
  arguments: [
    {
      name: 'prompt',
      description: 'The prompt to execute with the agent',
      required: true,
    },
  ],
  handler: async (options: RunCommandOptions) => {
    await validateRunOptions(options);

    const { prompt, agent, verbose } = options;

    if (verbose) {
      console.log('🚀 Sylphx Flow Run');
      console.log('====================');
      console.log(`🤖 Agent: ${agent}`);
      console.log(`💬 Prompt: ${prompt}`);
      console.log('');
    }

    // Load agent content
    const agentContent = await loadAgentContent(agent!);
    const agentInstructions = extractAgentInstructions(agentContent);

    // Combine user prompt with agent instructions
    const combinedPrompt = `AGENT INSTRUCTIONS:\n${agentInstructions}\n\nUSER PROMPT:\n${prompt}`;

    if (verbose) {
      console.log('📝 Combined Prompt:');
      console.log('==================');
      console.log(combinedPrompt.substring(0, 500) + (combinedPrompt.length > 500 ? '...' : ''));
      console.log('');
    }

    // Execute Claude Code with the combined prompt
    await executeClaudeCode(combinedPrompt, options);
  },
};