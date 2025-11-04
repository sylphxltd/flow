/**
 * Survey Command
 * Test multi-selection feature
 */

import type { Command } from '../types.js';

export const surveyCommand: Command = {
  id: 'survey',
  label: '/survey',
  description: 'Test multi-question selection (demo)',
  execute: async (context) => {
    context.sendMessage('Let me ask you a few questions...');

    const answers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'language',
          question: 'What is your favorite programming language?',
          options: [
            { label: 'TypeScript' },
            { label: 'JavaScript' },
            { label: 'Python' },
            { label: 'Rust' },
            { label: 'Go' },
          ],
        },
        {
          id: 'framework',
          question: 'Which framework do you prefer?',
          options: [
            { label: 'React' },
            { label: 'Vue' },
            { label: 'Angular' },
            { label: 'Svelte' },
            { label: 'Solid' },
          ],
        },
        {
          id: 'editor',
          question: 'What is your favorite code editor?',
          options: [
            { label: 'Visual Studio Code' },
            { label: 'Vim/Neovim' },
            { label: 'Emacs' },
            { label: 'Sublime Text' },
            { label: 'Atom' },
          ],
        },
      ],
    });

    if (typeof answers === 'object' && !Array.isArray(answers)) {
      const summary = Object.entries(answers)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return `Survey completed! Your answers: ${summary}`;
    }

    return 'Survey cancelled.';
  },
};

export default surveyCommand;
