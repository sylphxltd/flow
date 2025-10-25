import fs from 'node:fs/promises';
import path from 'node:path';
import { targetManager } from '../core/target-manager.js';
import type { CommandConfig, CommandOptions } from '../types.js';
import { CLIError } from '../utils/error-handler.js';
import { getAgentsDir } from '../utils/paths.js';

interface RunCommandOptions extends CommandOptions {
  target?: string;
  agent?: string;
  prompt?: string;
  dryRun?: boolean;
}

async function validateRunOptions(options: RunCommandOptions): Promise<void> {
  // Resolve target using targetManager (with detection, fallback, and selection)
  options.target = await targetManager.resolveTarget({
    target: options.target,
    allowSelection: true,
  });

  // Set default agent ONLY if no agent is specified
  if (!options.agent) {
    options.agent = 'craftsman';
  }
}

async function loadAgentContent(agentName: string): Promise<string> {
  try {
    // First try to load from local agents directory (for user-defined agents)
    const localAgentPath = path.join(process.cwd(), 'agents', `${agentName}.md`);

    try {
      const content = await fs.readFile(localAgentPath, 'utf-8');
      return content;
    } catch (_error) {
      // Try to load from the package's agents directory
      const packageAgentsDir = getAgentsDir();
      const packageAgentPath = path.join(packageAgentsDir, `${agentName}.md`);

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

function executeTargetCommand(
  targetId: string,
  systemPrompt: string,
  userPrompt: string,
  options: RunCommandOptions
): Promise<void> {
  // Get the target object
  const target = targetManager.getTarget(targetId);
  if (!target) {
    throw new CLIError(`Target not found: ${targetId}`, 'TARGET_NOT_FOUND');
  }

  // Check if the target is implemented
  if (!target.isImplemented) {
    throw new CLIError(
      `Target '${targetId}' is not implemented. Supported targets: ${getExecutableTargets().join(', ')}`,
      'TARGET_NOT_IMPLEMENTED'
    );
  }

  // Check if the target supports command execution
  if (!target.executeCommand) {
    throw new CLIError(
      `Target '${targetId}' does not support command execution. Supported targets: ${getExecutableTargets().join(', ')}`,
      'EXECUTION_NOT_SUPPORTED'
    );
  }

  // Use the target's executeCommand method
  return target.executeCommand(systemPrompt, userPrompt, options);
}

/**
 * Get list of targets that support command execution
 */
function getExecutableTargets(): string[] {
  return targetManager.getImplementedTargetIDs().filter((targetId) => {
    const target = targetManager.getTarget(targetId);
    return target?.executeCommand !== undefined;
  });
}

export const runCommand: CommandConfig = {
  name: 'run',
  description:
    'Run a prompt with a specific agent (default: craftsman) using the detected or specified target',
  options: [
    {
      flags: '--target <name>',
      description: `Target platform (${targetManager.getImplementedTargetIDs().join(', ')}, default: auto-detect)`,
    },
    {
      flags: '--agent <name>',
      description: 'Agent to use (default: craftsman)',
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
        console.log('💬 Prompt: [Interactive mode]');
      }
      console.log('');
    }

    // Load agent content
    const agentContent = await loadAgentContent(agent);
    const agentInstructions = extractAgentInstructions(agentContent);

    // Create system prompt with agent instructions (no override notice - let target handle it)
    const systemPrompt = `AGENT INSTRUCTIONS:
${agentInstructions}`;

    // Prepare user prompt
    let userPrompt = '';
    if (prompt && prompt.trim() !== '') {
      userPrompt = prompt;
    }
    // If no prompt provided, leave userPrompt empty for true interactive mode
    // Don't add "INTERACTIVE MODE:" message - let Claude handle it naturally

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
      } else {
        console.log('📝 User Prompt: [Interactive mode - Claude will greet the user]');
        console.log('');
      }
    }

    // Execute command with the resolved target
    await executeTargetCommand(options.target, systemPrompt, userPrompt, options);
  },
};
