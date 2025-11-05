/**
 * Agent Selection Component
 * Uses InlineSelection composition pattern for consistent UI
 */

import { InlineSelection } from '../../../components/selection/index.js';
import type { SelectionOption } from '../../../hooks/useSelection.js';

interface AgentSelectionProps {
  agents: Array<{ id: string; name: string; description: string }>;
  currentAgentId: string;
  onSelect: (agentId: string) => void | Promise<void>;
  onCancel: () => void;
}

export function AgentSelection({
  agents,
  currentAgentId,
  onSelect,
  onCancel,
}: AgentSelectionProps) {
  const agentOptions: SelectionOption[] = agents.map((agent) => ({
    label: `${agent.name} - ${agent.description}`,
    value: agent.id,
    ...(agent.id === currentAgentId && {
      badge: {
        text: '✓',
        color: 'green',
      },
    }),
  }));

  return (
    <InlineSelection
      options={agentOptions}
      subtitle="Switch between AI agents with different system prompts"
      filter={true}
      onSelect={(value) => {
        Promise.resolve(onSelect(value as string)).then(() => {
          // Selection complete
        });
      }}
      onCancel={onCancel}
    />
  );
}
