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

This tool can be called multiple times to ask multiple questions sequentially.

When to use:
- You have specific options for the user to choose from
- You need user to select between different approaches
- You need to confirm which file/component/feature to work on
- You want to gather multiple pieces of information step by step

How to use:
1. Call this tool with your question and options
2. Wait for the user's answer (returned as a string)
3. You can call this tool again to ask another question
4. Continue your task with the gathered information

Example workflow:
- Ask which file to modify → get answer → Ask which function → get answer → Proceed with changes

Note: For free-form text questions, just respond normally in your message and wait for the user's next input. Only use this tool when you have specific options to present.`,
  inputSchema: z.object({
    question: z.string().describe('The question to ask the user'),
    options: z.array(z.object({
      label: z.string().describe('Display text for this option (what user sees)'),
      value: z.string().optional().describe('Optional value to return (defaults to label if not provided)'),
    })).min(2).max(10).describe('List of options for the user to choose from (2-10 options)'),
  }),
  execute: async ({ question, options }) => {
    if (!userInputHandler) {
      throw new Error('User input handler not available. This tool can only be used in interactive mode.');
    }

    const answer = await userInputHandler({
      type: 'selection',
      question,
      options,
    });

    // Return simple string answer - LLM can easily understand and use this
    return answer;
  },
});

/**
 * Export all interaction tools
 */
export const interactionTools = {
  ask: askUserSelectionTool,
};
