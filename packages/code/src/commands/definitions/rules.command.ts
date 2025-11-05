/**
 * Rules Command
 * Select enabled shared system prompt rules
 */

import type { Command } from '../types.js';

export const rulesCommand: Command = {
  id: 'rules',
  label: '/rules',
  description: 'Select enabled shared system prompt rules',
  execute: async (context) => {
    const { getAllRules, getEnabledRuleIds, setEnabledRules } = await import('../../embedded-context.js');

    const allRules = getAllRules();
    const enabledIds = getEnabledRuleIds();

    if (allRules.length === 0) {
      return 'No rules available.';
    }

    // Create options without status indicators (checkboxes will show selection)
    const ruleOptions = allRules.map((rule) => ({
      label: `${rule.metadata.name} - ${rule.metadata.description}`,
      value: rule.id,
    }));

    context.sendMessage(`Select rules to enable (currently ${enabledIds.length} enabled):`);
    const answers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'rules',
          question: 'Select all rules you want to enable:',
          options: ruleOptions,
          multiSelect: true,
          preSelected: enabledIds, // Pre-select currently enabled rules
        },
      ],
    });

    // Extract selected rule IDs
    const selectedRuleIds =
      typeof answers === 'object' && !Array.isArray(answers)
        ? Array.isArray(answers['rules'])
          ? answers['rules']
          : []
        : [];

    if (!Array.isArray(selectedRuleIds)) {
      return 'Rule selection cancelled.';
    }

    // Update enabled rules
    const success = setEnabledRules(selectedRuleIds);

    if (!success) {
      return 'Failed to update rules.';
    }

    // Build summary message
    const enabledCount = selectedRuleIds.length;
    const disabledCount = allRules.length - enabledCount;

    const enabledRules = allRules.filter((r) => selectedRuleIds.includes(r.id));
    const enabledNames = enabledRules.map((r) => `  • ${r.metadata.name}`).join('\n');

    return `Updated rules configuration:
${enabledCount} enabled, ${disabledCount} disabled

Enabled rules:
${enabledNames || '  (none)'}`;
  },
};

export default rulesCommand;
