/**
 * User Interaction Tools
 * Tools for the AI to ask questions and get user input
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { Question } from '../ui/commands/types.js';

export interface SelectOption {
  label: string;
  value?: string;
}

/**
 * User input request - matches WaitForInputOptions from command system
 * This allows the ask tool to use the same selection UI as commands
 */
export type UserInputRequest = {
  type: 'selection';
  questions: Question[];
};

/**
 * Global user input request handler
 * This will be set by the Chat component to handle user input requests
 * Returns: string for single question, Record<questionId, answer | answer[]> for multiple questions
 *   - Single-select: answer is string
 *   - Multi-select: answer is string[]
 */
let userInputHandler: ((request: UserInputRequest) => Promise<string | Record<string, string | string[]>>) | null = null;

/**
 * Ask call queue
 */
interface AskCall {
  id: string;
  question: string;
  options: SelectOption[];
  multiSelect?: boolean;
  resolve: (answer: string) => void;
}

let askQueue: AskCall[] = [];
let isProcessingAsk = false;
let queueUpdateCallback: ((count: number) => void) | null = null;

/**
 * Notify queue update
 */
function notifyQueueUpdate() {
  if (queueUpdateCallback) {
    queueUpdateCallback(askQueue.length);
  }
}

/**
 * Set queue update callback
 * Called by Chat component to receive queue length updates
 */
export function setQueueUpdateCallback(callback: (count: number) => void) {
  queueUpdateCallback = callback;
}

/**
 * Get current queue length
 */
export function getQueueLength() {
  return askQueue.length;
}

/**
 * Set the user input handler
 * Called by the Chat component to register the handler
 */
export function setUserInputHandler(handler: (request: UserInputRequest) => Promise<string | Record<string, string | string[]>>) {
  userInputHandler = handler;
}

/**
 * Clear the user input handler
 */
export function clearUserInputHandler() {
  userInputHandler = null;
  askQueue = [];
  isProcessingAsk = false;
  queueUpdateCallback = null;
}

/**
 * Process next ask in queue
 */
async function processNextAsk() {
  // If already processing or queue empty, do nothing
  if (isProcessingAsk || askQueue.length === 0 || !userInputHandler) {
    return;
  }

  isProcessingAsk = true;
  const ask = askQueue.shift()!; // Take first from queue
  notifyQueueUpdate(); // Notify queue changed

  console.error('[processAsk] Processing:', {
    id: ask.id,
    question: ask.question.substring(0, 50),
    queueRemaining: askQueue.length,
  });

  try {
    // Show single question to user
    const result = await userInputHandler({
      type: 'selection',
      questions: [{
        id: ask.id,
        question: ask.question,
        options: ask.options,
        multiSelect: ask.multiSelect,
      }],
    });

    // Extract answer (handle both string and string[] for multi-select)
    const rawAnswer = typeof result === 'string' ? result : result[ask.id];
    const answer = Array.isArray(rawAnswer) ? rawAnswer.join(', ') : (rawAnswer || '');
    console.error('[processAsk] Got answer:', answer);

    // Resolve this ask's promise
    ask.resolve(answer);
  } catch (error) {
    console.error('[processAsk] Error:', error);
    ask.resolve(''); // Resolve with empty on error
  } finally {
    isProcessingAsk = false;

    // Process next ask in queue if any
    if (askQueue.length > 0) {
      console.error('[processAsk] Processing next in queue...');
      processNextAsk();
    }
  }
}

/**
 * Ask user a multiple choice question
 */
export const askUserSelectionTool = tool({
  description: `Ask the user a multiple choice question and wait for their selection.

You can call this tool multiple times in the same response to ask multiple questions at once - they will be presented together for better user experience.

When to use:
- You have specific options for the user to choose from
- You need user to select between different approaches
- You need to confirm which file/component/feature to work on
- You want to gather multiple pieces of information

How to use:
1. Call this tool (can call multiple times in same message)
2. Wait for the user's answer (returned as a string)
3. Continue your task with the gathered information

Example - multiple questions in one response:
- Call ask() for "which file?"
- Call ask() for "which function?"
- Call ask() for "which approach?"
→ User sees all 3 questions together and answers them all at once

Note: For free-form text questions, just respond normally in your message and wait for the user's next input. Only use this tool when you have specific options to present.`,
  inputSchema: z.object({
    question: z.string().describe('The question to ask the user'),
    options: z.array(z.object({
      label: z.string().describe('Display text for this option (what user sees)'),
      value: z.string().optional().describe('Optional value to return (defaults to label if not provided)'),
    })).min(2).max(10).describe('List of options for the user to choose from (2-10 options)'),
    multiSelect: z.boolean().optional().describe('Allow user to select multiple options (default: false). When true, user can select multiple options with Space and confirm with Enter. Returns array of selected values.'),
  }),
  execute: async ({ question, options, multiSelect }) => {
    if (!userInputHandler) {
      throw new Error('User input handler not available. This tool can only be used in interactive mode.');
    }

    // Create a promise that will be resolved when this ask is processed
    return new Promise<string>((resolve) => {
      const callId = `ask_${Date.now()}_${Math.random()}`;

      console.error('[ask execute] Adding to queue:', {
        id: callId,
        question: question.substring(0, 50),
        optionsCount: options?.length || 0,
        multiSelect: multiSelect || false,
        queueLength: askQueue.length,
        isProcessing: isProcessingAsk,
      });

      // Add to queue
      askQueue.push({
        id: callId,
        question,
        options,
        multiSelect,
        resolve,
      });

      // Notify queue changed
      notifyQueueUpdate();

      // Start processing if not already processing
      if (!isProcessingAsk) {
        console.error('[ask execute] Starting queue processing...');
        processNextAsk();
      } else {
        console.error('[ask execute] Already processing, will queue');
      }
    });
  },
});

/**
 * Export all interaction tools
 */
export const interactionTools = {
  ask: askUserSelectionTool,
};
