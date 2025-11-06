/**
 * User Interaction Tools
 * Tools for the AI to ask questions and get user input
 */
import type { Question } from '../types/interaction.types.js';
/**
 * User input request - matches WaitForInputOptions from command system
 * This allows the ask tool to use the same selection UI as commands
 */
export type UserInputRequest = {
    type: 'selection';
    questions: Question[];
};
/**
 * Set queue update callback
 * Called by Chat component to receive queue length updates
 */
export declare function setQueueUpdateCallback(callback: (count: number) => void): void;
/**
 * Check if user input handler is available
 * Returns true if interactive mode is enabled (handler is set)
 */
export declare function hasUserInputHandler(): boolean;
/**
 * Get current queue length
 */
export declare function getQueueLength(): number;
/**
 * Set the user input handler
 * Called by the Chat component to register the handler
 */
export declare function setUserInputHandler(handler: (request: UserInputRequest) => Promise<string | Record<string, string | string[]>>): void;
/**
 * Clear the user input handler
 */
export declare function clearUserInputHandler(): void;
/**
 * Ask user a multiple choice question
 */
export declare const askUserSelectionTool: import("ai").Tool<{
    question: string;
    options: {
        label: string;
        value?: string | undefined;
        freeText?: boolean | undefined;
        placeholder?: string | undefined;
        checked?: boolean | undefined;
    }[];
    multiSelect?: boolean | undefined;
    preSelected?: string[] | undefined;
}, string>;
/**
 * Export all interaction tools
 */
export declare const interactionTools: {
    ask: import("ai").Tool<{
        question: string;
        options: {
            label: string;
            value?: string | undefined;
            freeText?: boolean | undefined;
            placeholder?: string | undefined;
            checked?: boolean | undefined;
        }[];
        multiSelect?: boolean | undefined;
        preSelected?: string[] | undefined;
    }, string>;
};
//# sourceMappingURL=interaction.d.ts.map