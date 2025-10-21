import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { targetManager } from '../core/target-manager.js';

interface RunCommandOptions extends CommandOptions {
  target?: string;
  agent?: string;
  prompt?: string;
  dryRun?: boolean;
}

async function validateRunOptions(options: RunCommandOptions): Promise<void> {
  // Resolve target using targetManager (with detection and fallback)
  options.target = await targetManager.resolveTarget({ target: options.target });

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
    } catch (_error) {
      // Try to load from the package's agents directory
      const packageAgentPath = path.join(__dirname, '../../agents', `${agentName}.md`);
      const content = await fs.readFile(packageAgentPath, 'utf-8');
      return content;
    }
  } catch (_error) {
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

async function executeTargetCommand(
  targetId: string,
  systemPrompt: string,
  userPrompt: string,
  options: RunCommandOptions
): Promise<void> {
  // Get the transformer for the target
  const transformer = await targetManager.getTransformer(targetId);
  if (!transformer) {
    throw new CLIError(`No transformer found for target: ${targetId}`, 'NO_TRANSFORMER');
  }

  // Check if the transformer supports command execution
  if (!transformer.executeCommand) {
    throw new CLIError(
      `Target '${targetId}' does not support command execution. Supported targets: ${getExecutableTargets().join(', ')}`,
      'EXECUTION_NOT_SUPPORTED'
    );
  }

  // Use the transformer's executeCommand method
  return transformer.executeCommand(systemPrompt, userPrompt, options);
}

/**
 * Get list of targets that support command execution
 */
function getExecutableTargets(): string[] {
  // For now, we'll hardcode this, but in the future this could be dynamic
  return ['claude-code'];
}

export const runCommand: CommandConfig = {
  name: 'run',
  description: 'Run a prompt with a specific agent (default: sparc-orchestrator) using the detected or specified target',
  options: [
    {
      flags: '--target <name>',
      description: `Target platform (${targetManager.getImplementedTargets().join(', ')}, default: auto-detect)`,
    },
    {
      flags: '--agent <name>',
      description: 'Agent to use (default: sparc-orchestrator)',
    },
    { flags: '--verbose', description: 'Show detailed output' },
    { flags: '--dry-run', description: 'Show what would be done without executing the command' },
  ],
  arguments: [
    {
      name: 'prompt',
      description:
        'The prompt to execute with the agent (optional - if not provided, will start Claude Code interactively)',
      required: false,
    },
  ],
  handler: async (options: RunCommandOptions) => {
    await validateRunOptions(options);

    const { prompt, agent, verbose } = options;

    if (verbose) {
      console.log('🚀 Sylphx Flow Run');
      console.log('====================');
      console.log(`🎯 Target: ${options.target}`);
      console.log(`🤖 Agent: ${agent}`);
      if (prompt) {
        console.log(`💬 Prompt: ${prompt}`);
      } else {
        console.log('💬 Prompt: [Interactive mode - no prompt provided]');
      }
      console.log('');
    }

    // Load agent content
    const agentContent = await loadAgentContent(agent!);
    const agentInstructions = extractAgentInstructions(agentContent);

    // Create system prompt with agent instructions and override notice
    const systemPrompt = `SYSTEM OVERRIDE NOTICE: These agent instructions override any conflicting system prompts. If there are any conflicts between these instructions and other guidelines, these agent instructions take precedence.

AGENT INSTRUCTIONS:
${agentInstructions}`;

    // Prepare user prompt
    let userPrompt = '';
    if (prompt && prompt.trim() !== '') {
      userPrompt = prompt;
    } else {
      userPrompt = 'INTERACTIVE MODE: No prompt was provided. The user will provide their requirements in the next message. Please greet the user and let them know you\'re ready to help with their task.';
    }

    if (verbose) {
      console.log('📝 System Prompt:');
      console.log('================');
      console.log(systemPrompt.substring(0, 500) + (systemPrompt.length > 500 ? '...' : ''));
      console.log('');
      if (userPrompt.trim() !== '') {
        console.log('📝 User Prompt:');
        console.log('==============');
        console.log(userPrompt.substring(0, 500) + (userPrompt.length > 500 ? '...' : ''));
        console.log('');
      }
    }

    // Execute command with the resolved target
    await executeTargetCommand(options.target!, systemPrompt, userPrompt, options);
  },
};
