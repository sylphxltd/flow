/**
 * Agent Command
 * Switch between agents using component-based UI
 */

import { AgentSelection } from '../../screens/chat/components/AgentSelection.js';
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
        const { getAllAgents } = await import('../../embedded-context.js');
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
    const { getAllAgents, getCurrentAgent, switchAgent, getAgentById } = await import('../../embedded-context.js');

    // If arg provided, switch directly
    if (context.args.length > 0) {
      const agentId = context.args[0];
      const success = switchAgent(agentId);

      if (!success) {
        return `Agent not found: ${agentId}. Use /agent to see available agents.`;
      }

      const selectedAgent = getAgentById(agentId);
      if (!selectedAgent) {
        return 'Failed to get agent details.';
      }

      return `Switched to agent: ${selectedAgent.metadata.name}\n${selectedAgent.metadata.description}`;
    }

    // No args - show agent selection UI
    const agents = getAllAgents();
    const currentAgent = getCurrentAgent();

    if (agents.length === 0) {
      return 'No agents available.';
    }

    const agentsList = agents.map((agent) => ({
      id: agent.id,
      name: agent.metadata.name,
      description: agent.metadata.description,
    }));

    // Use AgentSelection component
    context.setInputComponent(
      <AgentSelection
        agents={agentsList}
        currentAgentId={currentAgent.id}
        onSelect={(agentId) => {
          const success = switchAgent(agentId);

          if (!success) {
            context.addLog(`[agent] Failed to switch to agent: ${agentId}`);
            context.setInputComponent(null);
            return;
          }

          const selectedAgent = getAgentById(agentId);
          if (selectedAgent) {
            context.addLog(`[agent] Switched to agent: ${selectedAgent.metadata.name}`);
          }

          context.setInputComponent(null);
        }}
        onCancel={() => {
          context.setInputComponent(null);
          context.addLog('[agent] Agent selection cancelled');
        }}
      />,
      'Agent Selection'
    );

    context.addLog('[agent] Agent selection opened');
  },
};

export default agentCommand;
