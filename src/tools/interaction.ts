/**
 * User Interaction Tools
 * Tools for the AI to ask questions and get user input
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Global user input request handler
 * This will be set by the Chat component to handle user input requests
 */
let userInputHandler: ((request: UserInputRequest) => Promise<string>) | null = null;

export interface UserInputRequest {
  type: 'text' | 'selection';
  question: string;
  options?: Array<{ id: string; name: string }>;
}

/**
 * Set the user input handler
 * Called by the Chat component to register the handler
 */
export function setUserInputHandler(handler: (request: UserInputRequest) => Promise<string>) {
  userInputHandler = handler;
}

/**
 * Clear the user input handler
 */
export function clearUserInputHandler() {
  userInputHandler = null;
}

/**
 * Ask user a question (text input)
 */
export const askUserTextTool = tool({
  description: `Ask the user a question and wait for their text response.

Usage:
- When you need clarification from the user
- When you need additional information to complete a task
- When there are multiple valid approaches and you want user's preference

The user will see your question and can type their answer.

IMPORTANT: Only use this when you truly need user input to proceed. Don't overuse it.`,
  inputSchema: z.object({
    question: z.string().describe('The question to ask the user'),
  }),
  execute: async ({ question }) => {
    if (!userInputHandler) {
      throw new Error('User input handler not available. This tool can only be used in interactive mode.');
    }

    const answer = await userInputHandler({
      type: 'text',
      question,
    });

    return {
      question,
      answer,
    };
  },
});

/**
 * Ask user a multiple choice question
 */
export const askUserSelectionTool = tool({
  description: `Ask the user a multiple choice question and wait for their selection.

Usage:
- When you have a specific set of options for the user to choose from
- When you need user to select between different approaches
- When you need to confirm which file/component/feature to work on

The user will see your question with the options and can select one.

IMPORTANT: Only use this when you truly need user input to proceed. Don't overuse it.`,
  inputSchema: z.object({
    question: z.string().describe('The question to ask the user'),
    options: z.array(z.object({
      id: z.string().describe('Unique identifier for this option'),
      name: z.string().describe('Display name for this option'),
    })).describe('List of options for the user to choose from (2-10 options)'),
  }),
  execute: async ({ question, options }) => {
    if (!userInputHandler) {
      throw new Error('User input handler not available. This tool can only be used in interactive mode.');
    }

    if (options.length < 2) {
      throw new Error('Selection questions must have at least 2 options');
    }

    if (options.length > 10) {
      throw new Error('Selection questions can have at most 10 options');
    }

    const answer = await userInputHandler({
      type: 'selection',
      question,
      options,
    });

    return {
      question,
      selectedOption: answer,
      options,
    };
  },
});

/**
 * Export all interaction tools
 */
export const interactionTools = {
  ask_user_text: askUserTextTool,
  ask_user_selection: askUserSelectionTool,
};
