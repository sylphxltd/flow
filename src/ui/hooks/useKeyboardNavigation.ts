/**
 * Keyboard Navigation Hook
 * Handles all keyboard input for chat navigation, selection, and command modes
 */

import { useInput } from 'ink';
import type { Command, CommandContext, WaitForInputOptions } from '../commands/types.js';

export interface KeyboardNavigationProps {
  // State
  input: string;
  cursor: number;
  pendingInput: WaitForInputOptions | null;
  pendingCommand: { command: Command; currentInput: string } | null;
  filteredFileInfo: {
    hasAt: boolean;
    files: Array<{ path: string; relativePath: string; size: number }>;
    query: string;
    atIndex: number;
  };
  filteredCommands: Command[];
  multiSelectionPage: number;
  multiSelectionAnswers: Record<string, string | string[]>;
  multiSelectChoices: Set<string>;
  selectionFilter: string;
  isFilterMode: boolean;
  selectedCommandIndex: number;
  selectedFileIndex: number;
  skipNextSubmit: React.MutableRefObject<boolean>;
  lastEscapeTime: React.MutableRefObject<number>;
  inputResolver: React.MutableRefObject<((value: string | Record<string, string | string[]>) => void) | null>;
  commandSessionRef: React.MutableRefObject<string | null>;
  cachedOptions: Map<string, Array<{ id: string; name: string }>>;

  // State setters
  setInput: (value: string) => void;
  setCursor: (value: number) => void;
  setShowEscHint: (value: boolean) => void;
  setMultiSelectionPage: (value: number | ((prev: number) => number)) => void;
  setSelectedCommandIndex: (value: number | ((prev: number) => number)) => void;
  setMultiSelectionAnswers: (value: Record<string, string | string[]> | ((prev: Record<string, string | string[]>) => Record<string, string | string[]>)) => void;
  setMultiSelectChoices: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setSelectionFilter: (value: string | ((prev: string) => string)) => void;
  setIsFilterMode: (value: boolean) => void;
  setSelectedFileIndex: (value: number | ((prev: number) => number)) => void;
  setPendingInput: (value: WaitForInputOptions | null) => void;
  setPendingCommand: (value: { command: Command; currentInput: string } | null) => void;

  // Functions
  addLog: (message: string) => void;
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string) => void;
  addAttachment: (attachment: { path: string; relativePath: string; size?: number }) => void;
  setAttachmentTokenCount: (path: string, count: number) => void;
  createCommandContext: (args: string[]) => CommandContext;

  // Config
  currentSessionId: string | null;
  currentSession: any;
  createSession: (provider: string, model: string) => string;
}

export function useKeyboardNavigation(props: KeyboardNavigationProps) {
  const {
    input,
    cursor,
    pendingInput,
    pendingCommand,
    filteredFileInfo,
    filteredCommands,
    multiSelectionPage,
    multiSelectionAnswers,
    multiSelectChoices,
    selectionFilter,
    isFilterMode,
    selectedCommandIndex,
    selectedFileIndex,
    skipNextSubmit,
    lastEscapeTime,
    inputResolver,
    commandSessionRef,
    cachedOptions,
    setInput,
    setCursor,
    setShowEscHint,
    setMultiSelectionPage,
    setSelectedCommandIndex,
    setMultiSelectionAnswers,
    setMultiSelectChoices,
    setSelectionFilter,
    setIsFilterMode,
    setSelectedFileIndex,
    setPendingInput,
    setPendingCommand,
    addLog,
    addMessage,
    addAttachment,
    setAttachmentTokenCount,
    createCommandContext,
    currentSessionId,
    currentSession,
    createSession,
  } = props;

  useInput(
    async (char, key) => {
      // Double ESC to clear input (works in any mode)
      if (key.escape) {
        const now = Date.now();
        const timeSinceLastEscape = now - lastEscapeTime.current;

        if (timeSinceLastEscape < 500 && lastEscapeTime.current > 0) {
          // Double ESC detected - clear input
          setInput('');
          setCursor(0);
          lastEscapeTime.current = 0;
          setShowEscHint(false);
          return;
        }

        // Single ESC - show hint and update timestamp
        if (input.length > 0) {
          setShowEscHint(true);
          // Auto-hide hint after 2 seconds
          setTimeout(() => {
            setShowEscHint(false);
          }, 2000);
        }
        lastEscapeTime.current = now;
      }

      // Handle pendingInput (when command calls waitForInput)
      if (pendingInput && inputResolver.current) {
        // Selection mode (unified for single and multi-question)
        if (pendingInput.type === 'selection') {
          const questions = pendingInput.questions;
          const isSingleQuestion = questions.length === 1;
          const currentQuestion = questions[multiSelectionPage];
          const totalQuestions = questions.length;

          // Calculate filtered options first (needed for arrow key navigation)
          const filteredOptions = currentQuestion.options.filter(
            (option) =>
              option.label.toLowerCase().includes(selectionFilter.toLowerCase()) ||
              (option.value && option.value.toLowerCase().includes(selectionFilter.toLowerCase()))
          );
          const maxIndex = filteredOptions.length - 1;

          // Arrow down - next option (works in both modes)
          if (key.downArrow) {
            setSelectedCommandIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
            return;
          }
          // Arrow up - previous option (works in both modes)
          if (key.upArrow) {
            setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
            return;
          }

          // Escape - exit filter mode (keep filter text) or clear filter
          if (key.escape && (isFilterMode || selectionFilter.length > 0)) {
            if (isFilterMode) {
              // First Esc: exit filter mode but keep filter text
              setIsFilterMode(false);
              addLog('[filter] Exited filter mode, filter text preserved');
            } else if (selectionFilter.length > 0) {
              // Second Esc: clear filter text
              setSelectionFilter('');
              setSelectedCommandIndex(0);
              addLog('[filter] Cleared filter text');
            }
            return;
          }

          // Handle text input for filtering
          if (char && !key.return && !key.escape && !key.tab && !key.ctrl) {
            // In filter mode or any alphanumeric char: enter/stay in filter mode
            if (isFilterMode || char !== ' ') {
              setSelectionFilter((prev) => prev + char);
              setIsFilterMode(true);
              setSelectedCommandIndex(0);
              return;
            }
            // Not in filter mode and char is space: don't filter (will be handled by space toggle below)
          }

          // Handle backspace for filtering
          if (key.backspace || key.delete) {
            if (selectionFilter.length > 0) {
              setSelectionFilter((prev) => prev.slice(0, -1));
              // Exit filter mode if filter becomes empty
              if (selectionFilter.length === 1) {
                setIsFilterMode(false);
              }
              setSelectedCommandIndex(0);
              return;
            }
          }

          // Multi-question: Tab navigation between questions
          if (!isSingleQuestion) {
            if (key.tab && !key.shift) {
              setMultiSelectionPage((prev) => (prev + 1) % totalQuestions);
              setSelectedCommandIndex(0);
              setSelectionFilter('');
              setIsFilterMode(false);
              // Restore choices for the new question if it's multi-select
              const nextPage = (multiSelectionPage + 1) % totalQuestions;
              const nextQuestion = questions[nextPage];
              if (nextQuestion.multiSelect) {
                // If question was already answered, restore the answer
                if (multiSelectionAnswers[nextQuestion.id]) {
                  const savedAnswer = multiSelectionAnswers[nextQuestion.id];
                  setMultiSelectChoices(new Set(Array.isArray(savedAnswer) ? savedAnswer : []));
                }
                // Otherwise, use preSelected if available
                else if (nextQuestion.preSelected) {
                  setMultiSelectChoices(new Set(nextQuestion.preSelected));
                } else {
                  setMultiSelectChoices(new Set());
                }
              } else {
                setMultiSelectChoices(new Set());
              }
              return;
            }
            if (key.shift && key.tab) {
              setMultiSelectionPage((prev) => (prev - 1 + totalQuestions) % totalQuestions);
              setSelectedCommandIndex(0);
              setSelectionFilter('');
              setIsFilterMode(false);
              // Restore choices for the new question if it's multi-select
              const prevPage = (multiSelectionPage - 1 + totalQuestions) % totalQuestions;
              const prevQuestion = questions[prevPage];
              if (prevQuestion.multiSelect) {
                // If question was already answered, restore the answer
                if (multiSelectionAnswers[prevQuestion.id]) {
                  const savedAnswer = multiSelectionAnswers[prevQuestion.id];
                  setMultiSelectChoices(new Set(Array.isArray(savedAnswer) ? savedAnswer : []));
                }
                // Otherwise, use preSelected if available
                else if (prevQuestion.preSelected) {
                  setMultiSelectChoices(new Set(prevQuestion.preSelected));
                } else {
                  setMultiSelectChoices(new Set());
                }
              } else {
                setMultiSelectChoices(new Set());
              }
              return;
            }
          }

          // Ctrl+Enter - submit all answers (only for multi-question)
          if (!isSingleQuestion && key.ctrl && key.return) {
            // Check if all questions are answered
            const allAnswered = questions.every((q) => multiSelectionAnswers[q.id]);
            if (allAnswered) {
              addLog(`[selection] Submitting answers: ${JSON.stringify(multiSelectionAnswers)}`);

              inputResolver.current(multiSelectionAnswers);
              inputResolver.current = null;
              setPendingInput(null);
              setMultiSelectionPage(0);
              setMultiSelectionAnswers({});
              setMultiSelectChoices(new Set());
              setSelectionFilter('');
              setIsFilterMode(false);
            } else {
              addLog(`[selection] Cannot submit: not all questions answered`);
            }
            return;
          }

          // Space - toggle multi-select choice (only for multi-select questions and NOT in filter mode)
          if (char === ' ' && currentQuestion.multiSelect && !isFilterMode) {
            const selectedOption = filteredOptions[selectedCommandIndex];
            if (selectedOption) {
              const selectedValue = selectedOption.value || selectedOption.label;
              setMultiSelectChoices((prev) => {
                const newChoices = new Set(prev);
                if (newChoices.has(selectedValue)) {
                  newChoices.delete(selectedValue);
                  addLog(`[multi-select] Unchecked: ${selectedValue}`);
                } else {
                  newChoices.add(selectedValue);
                  addLog(`[multi-select] Checked: ${selectedValue}`);
                }
                return newChoices;
              });
            }
            return;
          }

          // Enter - select option / confirm multi-select
          if (key.return) {
            // Multi-select mode: confirm current choices
            if (currentQuestion.multiSelect) {
              if (multiSelectChoices.size === 0) {
                addLog(`[multi-select] No choices selected, skipping`);
                return;
              }

              const choicesArray = Array.from(multiSelectChoices);
              addLog(`[multi-select] Q${multiSelectionPage + 1}: ${choicesArray.join(', ')}`);

              // Add user's answer to chat history
              if (!commandSessionRef.current) {
                commandSessionRef.current = currentSessionId || createSession('openrouter', 'anthropic/claude-3.5-sonnet');
              }
              addMessage(commandSessionRef.current, 'user', choicesArray.join(', '));

              if (isSingleQuestion) {
                // Single question: submit immediately
                inputResolver.current({ [currentQuestion.id]: choicesArray });
                inputResolver.current = null;
                setPendingInput(null);
                setMultiSelectionPage(0);
                setMultiSelectionAnswers({});
                setMultiSelectChoices(new Set());
                setSelectionFilter('');
                setIsFilterMode(false);
              } else {
                // Multi-question: save answer
                const newAnswers = {
                  ...multiSelectionAnswers,
                  [currentQuestion.id]: choicesArray,
                };
                setMultiSelectionAnswers(newAnswers);
                setMultiSelectChoices(new Set()); // Clear choices for next question

                // Check if all questions are answered
                const allAnswered = questions.every((q) => newAnswers[q.id]);

                if (allAnswered) {
                  // All answered: auto-submit
                  addLog(`[selection] All answered, auto-submitting: ${JSON.stringify(newAnswers)}`);

                  inputResolver.current(newAnswers);
                  inputResolver.current = null;
                  setPendingInput(null);
                  setMultiSelectionPage(0);
                  setMultiSelectionAnswers({});
                  setSelectionFilter('');
                  setIsFilterMode(false);
                } else {
                  // Move to next unanswered question
                  const nextUnanswered = questions.findIndex(
                    (q, idx) => idx > multiSelectionPage && !newAnswers[q.id]
                  );
                  if (nextUnanswered !== -1) {
                    setMultiSelectionPage(nextUnanswered);
                  }
                  setSelectedCommandIndex(0);
                  setSelectionFilter('');
                }
              }
            } else {
              // Single-select mode: select one option
              const selectedOption = filteredOptions[selectedCommandIndex];
              if (selectedOption) {
                const selectedValue = selectedOption.value || selectedOption.label;
                addLog(`[selection] Q${multiSelectionPage + 1}: ${selectedValue}`);

                // Add user's answer to chat history immediately (like shell)
                if (!commandSessionRef.current) {
                  commandSessionRef.current = currentSessionId || createSession('openrouter', 'anthropic/claude-3.5-sonnet');
                }
                addMessage(commandSessionRef.current, 'user', selectedOption.label);

                if (isSingleQuestion) {
                  // Single question: submit immediately
                  inputResolver.current({ [currentQuestion.id]: selectedValue });
                  inputResolver.current = null;
                  setPendingInput(null);
                  setMultiSelectionPage(0);
                  setMultiSelectionAnswers({});
                  setSelectionFilter('');
                  setIsFilterMode(false);
                } else {
                  // Multi-question: save answer
                  const newAnswers = {
                    ...multiSelectionAnswers,
                    [currentQuestion.id]: selectedValue,
                  };
                  setMultiSelectionAnswers(newAnswers);

                  // Check if all questions are answered
                  const allAnswered = questions.every((q) => newAnswers[q.id]);

                  if (allAnswered) {
                    // All answered: auto-submit
                    addLog(`[selection] All answered, auto-submitting: ${JSON.stringify(newAnswers)}`);

                    inputResolver.current(newAnswers);
                    inputResolver.current = null;
                    setPendingInput(null);
                    setMultiSelectionPage(0);
                    setMultiSelectionAnswers({});
                    setSelectionFilter('');
                    setIsFilterMode(false);
                  } else {
                    // Move to next unanswered question
                    const nextUnanswered = questions.findIndex(
                      (q, idx) => idx > multiSelectionPage && !newAnswers[q.id]
                    );
                    if (nextUnanswered !== -1) {
                      setMultiSelectionPage(nextUnanswered);
                    }
                    setSelectedCommandIndex(0);
                    setSelectionFilter('');
                  }
                }
              }
            }
            return;
          }
          // Escape - cancel (only if not in filter mode, which was handled earlier)
          if (key.escape) {
            addLog(`[selection] Cancelled`);
            inputResolver.current({});
            inputResolver.current = null;
            setPendingInput(null);
            setMultiSelectionPage(0);
            setMultiSelectionAnswers({});
            setMultiSelectChoices(new Set());
            setSelectionFilter('');
            setIsFilterMode(false);
            return;
          }
          // For other keys (text input), let TextInput handle it via onChange
          // Don't return here - allow text input to work
        }
        // Text input mode - no special handling here, let TextInput handle it
        // Note: We don't return here for pendingInput text mode
        // This allows TextInput to handle the input normally
      }

      // Handle pending command selection (e.g., model selection, provider selection)
      if (pendingCommand && !pendingInput) {
        // Get options for the pending command's first arg
        const firstArg = pendingCommand.command.args?.[0];
        const cacheKey = firstArg ? `${pendingCommand.command.id}:${firstArg.name}` : '';
        const options = cacheKey ? (cachedOptions.get(cacheKey) || []) : [];
        const maxIndex = options.length - 1;

        // Arrow down - next option
        if (key.downArrow) {
          setSelectedCommandIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
          return;
        }
        // Arrow up - previous option
        if (key.upArrow) {
          setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
          return;
        }
        // Enter - select option
        if (key.return) {
          const selectedOption = options[selectedCommandIndex];
          if (selectedOption) {
            const response = await pendingCommand.command.execute(createCommandContext([selectedOption.id]));
            if (currentSessionId) {
              addMessage(currentSessionId, 'assistant', response);
            }
            setPendingCommand(null);
            setSelectedCommandIndex(0);
          }
          return;
        }
        // Escape - cancel
        if (key.escape) {
          if (currentSessionId) {
            addMessage(currentSessionId, 'assistant', 'Command cancelled');
          }
          setPendingCommand(null);
          setSelectedCommandIndex(0);
          return;
        }
      }

      // Handle file autocomplete navigation
      if (filteredFileInfo.hasAt && filteredFileInfo.files.length > 0 && !pendingInput) {
        // Arrow down - next file
        if (key.downArrow) {
          setSelectedFileIndex((prev) =>
            prev < filteredFileInfo.files.length - 1 ? prev + 1 : prev
          );
          return;
        }
        // Arrow up - previous file
        if (key.upArrow) {
          setSelectedFileIndex((prev) => (prev > 0 ? prev - 1 : 0));
          return;
        }
        // Tab or Enter - select file and add to attachments
        if (key.tab || key.return) {
          const selected = filteredFileInfo.files[selectedFileIndex];
          if (selected) {
            // Add to pending attachments
            addAttachment({
              path: selected.path,
              relativePath: selected.relativePath,
              size: selected.size,
            });

            // Calculate token count for this file using model-aware BPE tokenizer
            (async () => {
              try {
                const { readFile } = await import('node:fs/promises');
                const { countTokens } = await import('../../utils/token-counter.js');
                const content = await readFile(selected.path, 'utf8');
                const tokenCount = await countTokens(content, currentSession?.model);
                setAttachmentTokenCount(selected.path, tokenCount);
              } catch (error) {
                console.error('Failed to count tokens:', error);
              }
            })();

            // Replace @query with the file name, preserving text after the query
            const beforeAt = input.slice(0, filteredFileInfo.atIndex);
            const afterQuery = input.slice(filteredFileInfo.atIndex + 1 + filteredFileInfo.query.length);
            const newInput = `${beforeAt}@${selected.relativePath} ${afterQuery}`;
            const newCursorPos = beforeAt.length + selected.relativePath.length + 2; // +2 for @ and space
            setInput(newInput);
            setCursor(newCursorPos); // Position cursor right after the inserted file name + space
            setSelectedFileIndex(0);
          }
          return;
        }
      }

      // Handle command autocomplete navigation
      else if (filteredCommands.length > 0 && !pendingInput) {
        // Arrow down - next command
        if (key.downArrow) {
          setSelectedCommandIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          return;
        }
        // Arrow up - previous command
        if (key.upArrow) {
          setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
          return;
        }
        // Tab - fill in autocomplete text only
        if (key.tab) {
          const selected = filteredCommands[selectedCommandIndex];
          if (selected) {
            const commands = await import('../commands/registry.js').then(m => m.commands);
            const isCommand = commands.some(cmd => cmd.label === selected.label);
            const hasArgs = selected.args && selected.args.length > 0;
            const completedText = (isCommand && hasArgs) ? `${selected.label} ` : selected.label;

            addLog(`[useInput] Tab autocomplete fill: ${completedText}`);
            setInput(completedText);
            setCursor(completedText.length); // Move cursor to end
            setSelectedCommandIndex(0);
          }
          return;
        }

        // Enter - execute autocomplete selection
        if (key.return) {
          const selected = filteredCommands[selectedCommandIndex];
          if (selected) {
            skipNextSubmit.current = true; // Prevent TextInput's onSubmit from also executing

            // Clear input immediately before execution
            setInput('');
            setSelectedCommandIndex(0);

            // Execute command directly - let command handle interaction via CommandContext
            addLog(`[useInput] Enter autocomplete execute: ${selected.label}`);

            // Add user message to conversation
            if (!commandSessionRef.current) {
              commandSessionRef.current = currentSessionId || createSession('openrouter', 'anthropic/claude-3.5-sonnet');
            }
            addMessage(commandSessionRef.current, 'user', selected.label);

            // Execute command - it will use waitForInput if needed
            const response = await selected.execute(createCommandContext([]));

            // Add final response if any
            if (response) {
              addMessage(commandSessionRef.current, 'assistant', response);
            }
          }
          return;
        }
        // Escape - cancel command mode
        if (key.escape) {
          setInput('');
          setSelectedCommandIndex(0);
          return;
        }
      }
    },
    { isActive: true }
  );
}
