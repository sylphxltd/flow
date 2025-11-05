/**
 * Model Selection Component
 * Uses InlineSelection composition pattern for consistent UI
 */

import { InlineSelection } from '../../../components/selection/index.js';
import type { SelectionOption } from '../../../hooks/useSelection.js';

interface ModelSelectionProps {
  models: Array<{ id: string; name: string }>;
  currentProvider: string;
  onSelect: (modelId: string) => void | Promise<void>;
  onCancel: () => void;
}

export function ModelSelection({
  models,
  currentProvider,
  onSelect,
  onCancel,
}: ModelSelectionProps) {
  const modelOptions: SelectionOption[] = models.map((model) => ({
    label: model.name,
    value: model.id,
  }));

  return (
    <InlineSelection
      options={modelOptions}
      subtitle={`Select a model for ${currentProvider}`}
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
