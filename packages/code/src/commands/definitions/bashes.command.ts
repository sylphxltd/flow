/**
 * Bashes Command
 * Manage background bash processes
 */

import type { Command } from '../types.js';

export const bashesCommand: Command = {
  id: 'bashes',
  label: '/bashes',
  description: 'Manage background bash processes',
  execute: async (context) => {
    const { bashManager } = await import('@sylphx/code-core');
    const processes = bashManager.list();

    if (processes.length === 0) {
      return 'No background bash processes found.';
    }

    // Format process list
    const processOptions = processes.map((proc) => {
      const status = proc.isRunning ? '[*] Running' : '[x] Completed';
      const duration = Math.floor(proc.duration / 1000);
      const durationStr =
        duration > 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`;

      return {
        label: `${status} [${durationStr}] ${proc.command}`,
        value: proc.id,
      };
    });

    await context.sendMessage(
      `Found ${processes.length} background bash process${processes.length !== 1 ? 'es' : ''}:`
    );
    const answers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'action',
          question: 'What do you want to do?',
          options: [
            { label: 'View details', value: 'view' },
            { label: 'Kill a process', value: 'kill' },
            { label: 'Cancel', value: 'cancel' },
          ],
        },
      ],
    });

    const action = typeof answers === 'object' && !Array.isArray(answers) ? answers['action'] : '';

    if (!action || action === 'cancel') {
      return 'Cancelled.';
    }

    // Select process
    await context.sendMessage('Select a process:');
    const processAnswers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'process',
          question: 'Which process?',
          options: processOptions,
        },
      ],
    });

    const selectedId =
      typeof processAnswers === 'object' && !Array.isArray(processAnswers)
        ? processAnswers['process']
        : '';

    if (!selectedId) {
      return 'No process selected.';
    }

    if (action === 'view') {
      const output = bashManager.getOutput(selectedId);
      if (!output) {
        return 'Process not found.';
      }

      const status = output.isRunning ? 'Running' : `Completed (exit code: ${output.exitCode})`;
      const duration = Math.floor(output.duration / 1000);

      let result = `
Process: ${selectedId}
Command: ${output.command}
Status: ${status}
Duration: ${duration}s

=== stdout ===
${output.stdout || '(empty)'}
`;

      if (output.stderr) {
        result += `
=== stderr ===
${output.stderr}`;
      }

      return result.trim();
    }

    if (action === 'kill') {
      const success = bashManager.kill(selectedId);
      if (!success) {
        return 'Failed to kill process (not found).';
      }

      return `Sent termination signal to process ${selectedId}`;
    }

    return 'Unknown action.';
  },
};

export default bashesCommand;
