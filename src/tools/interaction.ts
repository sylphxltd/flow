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
 * Check if user input handler is available
 * Returns true if interactive mode is enabled (handler is set)
 */
export function hasUserInputHandler(): boolean {
  return userInputHandler !== null;
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

    // Resolve this ask's promise
    ask.resolve(answer);
  } catch (error) {
    console.error('[processAsk] Error:', error);
    ask.resolve(''); // Resolve with empty on error
  } finally {
    isProcessingAsk = false;

    // Process next ask in queue if any
    if (askQueue.length > 0) {
      processNextAsk();
    }
  }
}

/**
 * Ask user a multiple choice question
 */
export const askUserSelectionTool = tool({
  description: 'Ask the user a multiple choice question and wait for their selection',
  inputSchema: z.object({
    question: z.string().describe('Question to ask. Use only when you have specific options, not for free-form text'),
    options: z.array(z.object({
      label: z.string().describe('Display text'),
      value: z.string().optional().describe('Return value'),
    })).min(2).describe('Options to choose from'),
    multiSelect: z.boolean().optional().describe('Allow multiple selections. Returns comma-separated. Call multiple times in same response to batch questions'),
  }),
  execute: async ({ question, options, multiSelect }) => {
    if (!userInputHandler) {
      throw new Error('User input handler not available. This tool can only be used in interactive mode.');
    }

    // Create a promise that will be resolved when this ask is processed
    return new Promise<string>((resolve) => {
      const callId = `ask_${Date.now()}_${Math.random()}`;

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
        processNextAsk();
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
