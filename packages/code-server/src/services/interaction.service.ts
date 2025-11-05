/**
 * Interaction Service
 * Manages user interaction for AI tools (ask tool)
 *
 * This service replaces the global state pattern previously used in code-core.
 * Instead of module-level variables, we use class instances managed by AppContext.
 *
 * Benefits:
 * - Testable (can create multiple instances for testing)
 * - No global state pollution
 * - Proper dependency injection
 * - Thread-safe (each server instance has its own service)
 */

import type { Question, SelectOption } from '@sylphx/code-core';

/**
 * User input request - matches WaitForInputOptions from command system
 * This allows the ask tool to use the same selection UI as commands
 */
export type UserInputRequest = {
  type: 'selection';
  questions: Question[];
};

/**
 * Ask call in the queue
 */
interface AskCall {
  id: string;
  question: string;
  options: SelectOption[];
  multiSelect?: boolean;
  preSelected?: string[];
  resolve: (answer: string) => void;
}

export class InteractionService {
  private userInputHandler: ((request: UserInputRequest) => Promise<string | Record<string, string | string[]>>) | null = null;
  private askQueue: AskCall[] = [];
  private isProcessingAsk = false;
  private queueUpdateCallback: ((count: number) => void) | null = null;

  /**
   * Notify queue update
   */
  private notifyQueueUpdate() {
    if (this.queueUpdateCallback) {
      this.queueUpdateCallback(this.askQueue.length);
    }
  }

  /**
   * Set queue update callback
   * Called by Chat component to receive queue length updates
   */
  setQueueUpdateCallback(callback: (count: number) => void) {
    this.queueUpdateCallback = callback;
  }

  /**
   * Check if user input handler is available
   * Returns true if interactive mode is enabled (handler is set)
   */
  hasUserInputHandler(): boolean {
    return this.userInputHandler !== null;
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.askQueue.length;
  }

  /**
   * Set the user input handler
   * Called by the Chat component to register the handler
   */
  setUserInputHandler(handler: (request: UserInputRequest) => Promise<string | Record<string, string | string[]>>) {
    this.userInputHandler = handler;
  }

  /**
   * Clear the user input handler
   */
  clearUserInputHandler() {
    this.userInputHandler = null;
    this.askQueue = [];
    this.isProcessingAsk = false;
    this.queueUpdateCallback = null;
  }

  /**
   * Process next ask in queue
   */
  private async processNextAsk() {
    // If already processing or queue empty, do nothing
    if (this.isProcessingAsk || this.askQueue.length === 0 || !this.userInputHandler) {
      return;
    }

    this.isProcessingAsk = true;
    const ask = this.askQueue.shift()!; // Take first from queue
    this.notifyQueueUpdate(); // Notify queue changed

    try {
      // Show single question to user
      const result = await this.userInputHandler({
        type: 'selection',
        questions: [{
          id: ask.id,
          question: ask.question,
          options: ask.options,
          multiSelect: ask.multiSelect,
          preSelected: ask.preSelected,
        }],
      });

      // Extract answer (handle both string and string[] for multi-select)
      const rawAnswer = typeof result === 'string' ? result : result[ask.id];
      const answer = Array.isArray(rawAnswer) ? rawAnswer.join(', ') : (rawAnswer || '');

      // Resolve this ask's promise
      ask.resolve(answer);
    } catch (error) {
      console.error('[InteractionService] Error:', error);
      ask.resolve(''); // Resolve with empty on error
    } finally {
      this.isProcessingAsk = false;

      // Process next ask in queue if any
      if (this.askQueue.length > 0) {
        this.processNextAsk();
      }
    }
  }

  /**
   * Queue an ask call
   * Returns a promise that will be resolved when the user answers
   */
  async ask(
    question: string,
    options: SelectOption[],
    multiSelect?: boolean,
    preSelected?: string[]
  ): Promise<string> {
    if (!this.userInputHandler) {
      throw new Error('User input handler not available. This tool can only be used in interactive mode.');
    }

    // Create a promise that will be resolved when this ask is processed
    return new Promise<string>((resolve) => {
      const callId = `ask_${Date.now()}_${Math.random()}`;

      // Add to queue
      this.askQueue.push({
        id: callId,
        question,
        options,
        multiSelect,
        preSelected,
        resolve,
      });

      // Notify queue changed
      this.notifyQueueUpdate();

      // Start processing if not already processing
      if (!this.isProcessingAsk) {
        this.processNextAsk();
      }
    });
  }
}
