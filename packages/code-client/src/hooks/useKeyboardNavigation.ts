/**
 * Keyboard Navigation Hook
 * Handles all keyboard input for chat navigation, selection, and command modes
 */

import { useInput } from 'ink';
import type { Command, CommandContext, WaitForInputOptions } from '../types/command-types.js';

export interface KeyboardNavigationProps {
  // State
  input: string;
  cursor: number;
  isStreaming: boolean;
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
  freeTextInput: string;
  isFreeTextMode: boolean;
  selectedCommandIndex: number;
  selectedFileIndex: number;
  skipNextSubmit: React.MutableRefObject<boolean>;
  lastEscapeTime: React.MutableRefObject<number>;
  inputResolver: React.MutableRefObject<((value: string | Record<string, string | string[]>) => void) | null>;
  commandSessionRef: React.MutableRefObject<string | null>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
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
  setFreeTextInput: (value: string | ((prev: string) => string)) => void;
  setIsFreeTextMode: (value: boolean) => void;
  setSelectedFileIndex: (value: number | ((prev: number) => number)) => void;
  setPendingInput: (value: WaitForInputOptions | null) => void;
  setPendingCommand: (value: { command: Command; currentInput: string } | null) => void;

  // Functions
  addLog: (message: string) => void;
  addMessage: (
    sessionId: string | null,
    role: 'user' | 'assistant',
    content: string,
    attachments?: any[],
    usage?: any,
    finishReason?: string,
    metadata?: any,
    todoSnapshot?: any[],
    provider?: string,
    model?: string
  ) => Promise<string>;
  addAttachment: (attachment: { path: string; relativePath: string; size?: number }) => void;
  setAttachmentTokenCount: (path: string, count: number) => void;
  createCommandContext: (args: string[]) => CommandContext;
  getAIConfig: () => { defaultProvider?: string; defaultModel?: string } | null;

  // Config
  currentSessionId: string | null;
  currentSession: any;
}

export function useKeyboardNavigation(props: KeyboardNavigationProps) {
  const {
    input,
    cursor,
    isStreaming,
    pendingInput,
    pendingCommand,
    filteredFileInfo,
    filteredCommands,
    multiSelectionPage,
    multiSelectionAnswers,
    multiSelectChoices,
    selectionFilter,
    isFilterMode,
    freeTextInput,
    isFreeTextMode,
    selectedCommandIndex,
    selectedFileIndex,
    skipNextSubmit,
    lastEscapeTime,
    inputResolver,
    commandSessionRef,
    abortControllerRef,
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
    setFreeTextInput,
    setIsFreeTextMode,
    setSelectedFileIndex,
    setPendingInput,
    setPendingCommand,
    addLog,
    addMessage,
    addAttachment,
    setAttachmentTokenCount,
    createCommandContext,
    getAIConfig,
    currentSessionId,
    currentSession,
  } = props;

  useInput(
    async (char, key) => {
      // ESC to abort streaming AI response (takes priority over other ESC actions)
      if (key.escape && isStreaming) {
        if (abortControllerRef.current) {
          addLog('[abort] Cancelling AI response...');
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        return;
      }

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

          // Guard: currentQuestion should always exist
          if (!currentQuestion) return;

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

          // Escape - exit free text mode, filter mode, or clear filter
          if (key.escape) {
            if (isFreeTextMode) {
              // Exit free text mode without saving
              setIsFreeTextMode(false);
              setFreeTextInput('');
              addLog('[freetext] Cancelled free text input');
              return;
            } else if (isFilterMode) {
              // Exit filter mode but keep filter text
              setIsFilterMode(false);
              addLog('[filter] Exited filter mode, filter text preserved');
              return;
            } else if (selectionFilter.length > 0) {
              // Clear filter text
              setSelectionFilter('');
              setSelectedCommandIndex(0);
              addLog('[filter] Cleared filter text');
              return;
            }
          }

          // Free text mode - handle text input
          if (isFreeTextMode) {
            // Enter - submit free text
            if (key.return) {
              const selectedOption = filteredOptions[selectedCommandIndex];
              if (!selectedOption || !freeTextInput.trim()) {
                addLog('[freetext] Cannot submit empty free text');
                return;
              }

              const customValue = freeTextInput.trim();
              addLog(`[freetext] Submitted: ${customValue}`);

              // Add user's answer to chat history (lazy create session if needed)
              const aiConfig = getAIConfig();
              const provider = aiConfig?.defaultProvider || 'openrouter';
              const model = aiConfig?.defaultModel || 'anthropic/claude-3.5-sonnet';

              const sessionIdToUse = commandSessionRef.current || currentSessionId;
              const resultSessionId = await addMessage(
                sessionIdToUse,
                'user',
                customValue,
                undefined, undefined, undefined, undefined, undefined,
                provider,
                model
              );

              if (!commandSessionRef.current) {
                commandSessionRef.current = resultSessionId;
              }

              if (isSingleQuestion) {
                // Single question: submit immediately
                inputResolver.current({ [currentQuestion.id]: customValue });
                inputResolver.current = null;
                setPendingInput(null);
                setMultiSelectionPage(0);
                setMultiSelectionAnswers({});
                setIsFreeTextMode(false);
                setFreeTextInput('');
                setSelectionFilter('');
                setIsFilterMode(false);
              } else {
                // Multi-question: save answer and move to next
                const newAnswers = {
                  ...multiSelectionAnswers,
                  [currentQuestion.id]: customValue,
                };
                setMultiSelectionAnswers(newAnswers);
                setIsFreeTextMode(false);
                setFreeTextInput('');

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
              return;
            }

            // Backspace - delete character
            if (key.backspace || key.delete) {
              setFreeTextInput((prev) => prev.slice(0, -1));
              return;
            }

            // Character - add to input
            if (char && !key.ctrl) {
              setFreeTextInput((prev) => prev + char);
              return;
            }
            return;
          }

          // "/" - Enter filter mode
          if (char === '/' && !isFilterMode) {
            setIsFilterMode(true);
            addLog('[filter] Entered filter mode (press / to filter)');
            return;
          }

          // Handle text input for filtering (only when in filter mode)
          if (char && !key.return && !key.escape && !key.tab && !key.ctrl && isFilterMode) {
            setSelectionFilter((prev) => prev + char);
            setSelectedCommandIndex(0);
            return;
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
            // Let event propagate to text input when filter is empty
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
              if (!nextQuestion) return;
              if (nextQuestion.multiSelect) {
                // If question was already answered, restore the answer
                if (multiSelectionAnswers[nextQuestion.id]) {
                  const savedAnswer = multiSelectionAnswers[nextQuestion.id];
                  setMultiSelectChoices(new Set(Array.isArray(savedAnswer) ? savedAnswer : []));
                }
                // Otherwise, initialize with defaults
                else {
                  // Priority 1: option.checked
                  const checkedOptions = nextQuestion.options
                    .filter(opt => opt.checked)
                    .map(opt => opt.value || opt.label);

                  if (checkedOptions.length > 0) {
                    setMultiSelectChoices(new Set(checkedOptions));
                  }
                  // Priority 2: question.preSelected
                  else if (nextQuestion.preSelected) {
                    setMultiSelectChoices(new Set(nextQuestion.preSelected));
                  } else {
                    setMultiSelectChoices(new Set());
                  }
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
              if (!prevQuestion) return;
              if (prevQuestion.multiSelect) {
                // If question was already answered, restore the answer
                if (multiSelectionAnswers[prevQuestion.id]) {
                  const savedAnswer = multiSelectionAnswers[prevQuestion.id];
                  setMultiSelectChoices(new Set(Array.isArray(savedAnswer) ? savedAnswer : []));
                }
                // Otherwise, initialize with defaults
                else {
                  // Priority 1: option.checked
                  const checkedOptions = prevQuestion.options
                    .filter(opt => opt.checked)
                    .map(opt => opt.value || opt.label);

                  if (checkedOptions.length > 0) {
                    setMultiSelectChoices(new Set(checkedOptions));
                  }
                  // Priority 2: question.preSelected
                  else if (prevQuestion.preSelected) {
                    setMultiSelectChoices(new Set(prevQuestion.preSelected));
                  } else {
                    setMultiSelectChoices(new Set());
                  }
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
          if (char === ' ' && currentQuestion?.multiSelect && !isFilterMode) {
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

          // Enter - select option / confirm multi-select / enter free text mode
          if (key.return) {
            const selectedOption = filteredOptions[selectedCommandIndex];

            // Check if selected option is a free text option
            if (selectedOption?.freeText) {
              // Enter free text mode
              setIsFreeTextMode(true);
              setFreeTextInput('');
              addLog('[freetext] Entered free text mode');
              return;
            }

            // Multi-select mode: confirm current choices
            if (currentQuestion?.multiSelect) {
              if (multiSelectChoices.size === 0) {
                addLog(`[multi-select] No choices selected, skipping`);
                return;
              }

              const choicesArray = Array.from(multiSelectChoices);
              addLog(`[multi-select] Q${multiSelectionPage + 1}: ${choicesArray.join(', ')}`);

              // Add user's answer to chat history (lazy create session if needed)
              const aiConfig = getAIConfig();
              const provider = aiConfig?.defaultProvider || 'openrouter';
              const model = aiConfig?.defaultModel || 'anthropic/claude-3.5-sonnet';

              const sessionIdToUse = commandSessionRef.current || currentSessionId;
              const resultSessionId = await addMessage(
                sessionIdToUse,
                'user',
                choicesArray.join(', '),
                undefined, undefined, undefined, undefined, undefined,
                provider,
                model
              );

              if (!commandSessionRef.current) {
                commandSessionRef.current = resultSessionId;
              }

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

                // Add user's answer to chat history (lazy create session if needed)
                const aiConfig = getAIConfig();
                const provider = aiConfig?.defaultProvider || 'openrouter';
                const model = aiConfig?.defaultModel || 'anthropic/claude-3.5-sonnet';

                const sessionIdToUse = commandSessionRef.current || currentSessionId;
                const resultSessionId = await addMessage(
                  sessionIdToUse,
                  'user',
                  selectedOption.label,
                  undefined, undefined, undefined, undefined, undefined,
                  provider,
                  model
                );

                if (!commandSessionRef.current) {
                  commandSessionRef.current = resultSessionId;
                }

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
            if (currentSessionId && response) {
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
                const { getTRPCClient } = await import('../trpc-provider.js');
                const content = await readFile(selected.path, 'utf8');
                const client = getTRPCClient();
                const result = await client.config.countTokens.query({
                  text: content,
                  model: currentSession?.model
                });
                setAttachmentTokenCount(selected.path, result.count);
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
            const hasArgs = selected.args && selected.args.length > 0;
            const completedText = hasArgs ? `${selected.label} ` : selected.label;

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

            // Add user message to conversation (lazy create session if needed)
            const aiConfig = getAIConfig();
            const provider = aiConfig?.defaultProvider || 'openrouter';
            const model = aiConfig?.defaultModel || 'anthropic/claude-3.5-sonnet';

            const sessionIdToUse = commandSessionRef.current || currentSessionId;
            const resultSessionId = await addMessage(
              sessionIdToUse,
              'user',
              selected.label,
              undefined, undefined, undefined, undefined, undefined,
              provider,
              model
            );

            if (!commandSessionRef.current) {
              commandSessionRef.current = resultSessionId;
            }

            // Execute command - it will use waitForInput if needed
            const response = await selected.execute(createCommandContext([]));

            // Add final response if any
            if (response) {
              await addMessage(
                commandSessionRef.current,
                'assistant',
                response,
                undefined, undefined, undefined, undefined, undefined,
                provider,
                model
              );
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
