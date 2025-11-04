/**
 * Agent Command
 * Switch between agents
 */

import type { Command } from '../types.js';

export const agentCommand: Command = {
  id: 'agent',
  label: '/agent',
  description: 'Switch between AI agents with different system prompts',
  args: [
    {
      name: 'agent-name',
      description: 'Agent to switch to (coder, planner, etc.)',
      required: false,
      loadOptions: async (previousArgs) => {
        const { getAllAgents } = await import('@sylphx/code-core');
        const agents = getAllAgents();
        return agents.map((agent) => ({
          id: agent.id,
          label: `${agent.metadata.name} - ${agent.metadata.description}`,
          value: agent.id,
        }));
      },
    },
  ],
  execute: async (context) => {
    const { getAllAgents, getCurrentAgent, switchAgent } = await import('@sylphx/code-core');

    let agentId: string;

    // If no args provided, ask user to select
    if (context.args.length === 0) {
      const agents = getAllAgents();
      const currentAgent = getCurrentAgent();

      if (agents.length === 0) {
        return 'No agents available.';
      }

      // Create options with current agent indicator
      const agentOptions = agents.map((agent) => {
        const isCurrent = agent.id === currentAgent.id;
        const label = isCurrent
          ? `${agent.metadata.name} (current) - ${agent.metadata.description}`
          : `${agent.metadata.name} - ${agent.metadata.description}`;

        return {
          label,
          value: agent.id,
        };
      });

      context.sendMessage('Which agent do you want to use?');
      const answers = await context.waitForInput({
        type: 'selection',
        questions: [
          {
            id: 'agent',
            question: 'Select agent:',
            options: agentOptions,
          },
        ],
      });

      agentId = typeof answers === 'object' && !Array.isArray(answers) ? answers['agent'] : '';

      if (!agentId) {
        return 'Agent selection cancelled.';
      }
    } else {
      agentId = context.args[0];
    }

    // Switch to selected agent
    const success = switchAgent(agentId);

    if (!success) {
      return `Agent not found: ${agentId}. Use /agent to see available agents.`;
    }

    const { getAgentById } = await import('@sylphx/code-core');
    const selectedAgent = getAgentById(agentId);

    if (!selectedAgent) {
      return 'Failed to get agent details.';
    }

    return `Switched to agent: ${selectedAgent.metadata.name}\n${selectedAgent.metadata.description}`;
  },
};

export default agentCommand;
