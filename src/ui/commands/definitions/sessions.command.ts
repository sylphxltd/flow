/**
 * Sessions Command
 * Switch between chat sessions
 */

import type { Command } from '../types.js';

export const sessionsCommand: Command = {
  id: 'sessions',
  label: '/sessions',
  description: 'View and switch between chat sessions',
  execute: async (context) => {
    const { formatSessionDisplay } = await import('../../../utils/session-title.js');
    const sessions = context.getSessions();

    if (sessions.length === 0) {
      return 'No sessions available. Start chatting to create a session.';
    }

    const currentSessionId = context.getCurrentSessionId();

    // Ask user to select a session
    const sessionOptions = sessions.map((session) => {
      const isCurrent = session.id === currentSessionId;
      const displayText = formatSessionDisplay(session.title, session.created);
      const label = isCurrent ? `${displayText} (current)` : displayText;

      return {
        label,
        value: session.id,
      };
    });

    context.sendMessage('Select a session to switch to:');
    const answers = await context.waitForInput({
      type: 'selection',
      questions: [
        {
          id: 'session',
          question: 'Which session do you want to switch to?',
          options: sessionOptions,
        },
      ],
    });

    const selectedSessionId = typeof answers === 'object' && !Array.isArray(answers) ? answers['session'] : '';

    if (!selectedSessionId) {
      return 'Session selection cancelled.';
    }

    // Switch to selected session
    context.setCurrentSession(selectedSessionId);

    const selectedSession = sessions.find((s) => s.id === selectedSessionId);
    const displayName = selectedSession
      ? formatSessionDisplay(selectedSession.title, selectedSession.created)
      : 'Unknown session';

    return `Switched to session: ${displayName}`;
  },
};

export default sessionsCommand;
