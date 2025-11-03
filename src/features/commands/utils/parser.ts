/**
 * Command Parser - Pure functions for parsing command input
 * @module features/commands/utils/parser
 */

/**
 * Parsed command structure
 */
export interface ParsedCommand {
  /** Command name (e.g., "/help") */
  commandName: string;
  /** Command arguments */
  args: string[];
  /** Full input string */
  input: string;
}

/**
 * Parse command input into name and arguments
 * @pure No side effects
 *
 * @example
 * parseCommand("/help") // { commandName: "/help", args: [], input: "/help" }
 * parseCommand("/model gpt-4") // { commandName: "/model", args: ["gpt-4"], input: "/model gpt-4" }
 * parseCommand("/foo bar baz") // { commandName: "/foo", args: ["bar", "baz"], input: "/foo bar baz" }
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const parts = trimmed.split(' ');
  const commandName = parts[0];
  const args = parts.slice(1).filter(arg => arg.trim() !== '');

  return {
    commandName,
    args,
    input: trimmed,
  };
}

/**
 * Check if input is a command (starts with /)
 * @pure No side effects
 *
 * @example
 * isCommand("/help") // true
 * isCommand("hello") // false
 * isCommand("") // false
 */
export function isCommand(input: string): boolean {
  return input.trim().startsWith('/');
}

/**
 * Get the current argument index being typed
 * @pure No side effects
 *
 * @example
 * getCurrentArgIndex("/model ") // 0 (typing first arg)
 * getCurrentArgIndex("/model gpt-4") // 0 (still on first arg)
 * getCurrentArgIndex("/model gpt-4 ") // 1 (typing second arg)
 */
export function getCurrentArgIndex(input: string): number {
  const parts = input.split(' ');
  const args = parts.slice(1).filter(arg => arg.trim() !== '');
  const lastPart = parts[parts.length - 1];
  const isTypingNewArg = lastPart === '';

  return isTypingNewArg ? args.length : Math.max(0, args.length - 1);
}

/**
 * Check if user is typing a new argument (just pressed space)
 * @pure No side effects
 *
 * @example
 * isTypingNewArg("/model ") // true
 * isTypingNewArg("/model gpt-4") // false
 * isTypingNewArg("/model gpt-4 ") // true
 */
export function isTypingNewArg(input: string): boolean {
  return input.endsWith(' ');
}

/**
 * Get the current argument being typed
 * @pure No side effects
 *
 * @example
 * getCurrentArg("/model gpt") // "gpt"
 * getCurrentArg("/model gpt-4 ") // ""
 * getCurrentArg("/model") // ""
 */
export function getCurrentArg(input: string): string {
  const parts = input.split(' ');
  return parts[parts.length - 1];
}
