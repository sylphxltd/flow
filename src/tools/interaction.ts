/**
 * User Interaction Tools
 * Tools for the AI to ask questions and get user input
 */

import { tool } from 'ai';
import { z } from 'zod';

export interface SelectOption {
  label: string;
  value?: string;
}

/**
 * Global user input request handler
 * This will be set by the Chat component to handle user input requests
 */
let userInputHandler: ((request: UserInputRequest) => Promise<string>) | null = null;

export interface UserInputRequest {
  type: 'selection';
  question: string;
  options: SelectOption[];
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
 * Ask user a multiple choice question
 */
export const askUserSelectionTool = tool({
  description: `Ask the user a multiple choice question and wait for their selection.

Usage:
- When you have a specific set of options for the user to choose from
- When you need user to select between different approaches
- When you need to confirm which file/component/feature to work on

The user will see your question with the options and can select one.

Note: For free-form text questions, just respond normally in your message and wait for the user's next input. Only use this tool when you have specific options to present.`,
  inputSchema: z.object({
    question: z.string().describe('The question to ask the user'),
    options: z.array(z.object({
      label: z.string().describe('Display text for this option (what user sees)'),
      value: z.string().optional().describe('Optional value to return (defaults to label if not provided)'),
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
  ask: askUserSelectionTool,
};
