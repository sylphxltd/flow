/**
 * Selection UI Component
 * Handles rendering of selection mode for questions with options
 */

import React from 'react';
import { Box, Text } from 'ink';
import { calculateScrollViewport } from '../utils/scroll-viewport.js';
import type { WaitForInputOptions } from '../commands/types.js';

interface SelectionUIProps {
  pendingInput: WaitForInputOptions;
  multiSelectionPage: number;
  multiSelectionAnswers: Record<string, string | string[]>;
  multiSelectChoices: Set<string>;
  selectionFilter: string;
  isFilterMode: boolean;
  freeTextInput: string;
  isFreeTextMode: boolean;
  selectedCommandIndex: number;
  askQueueLength: number;
}

export function SelectionUI({
  pendingInput,
  multiSelectionPage,
  multiSelectionAnswers,
  multiSelectChoices,
  selectionFilter,
  isFilterMode,
  freeTextInput,
  isFreeTextMode,
  selectedCommandIndex,
  askQueueLength,
}: SelectionUIProps) {
  if (pendingInput.type !== 'selection') {
    return null;
  }

  const questions = pendingInput.questions;
  const isSingleQuestion = questions.length === 1;
  const currentQuestion = questions[multiSelectionPage];

  // Calculate progress
  const answeredCount = Object.keys(multiSelectionAnswers).length;
  const totalQuestions = questions.length;
  const allAnswered = questions.every((q) => multiSelectionAnswers[q.id]);

  return (
    <Box flexDirection="column">
      {pendingInput.prompt && (
        <Box marginBottom={1}>
          <Text dimColor>{pendingInput.prompt}</Text>
        </Box>
      )}

      {/* Queue status */}
      {askQueueLength > 0 && (
        <Box marginBottom={1}>
          <Text color="#FFD700">[+{askQueueLength} pending]</Text>
        </Box>
      )}

      {/* Progress header (only for multi-question) */}
      {!isSingleQuestion && (
        <Box marginBottom={1}>
          <Text color="#00D9FF">Progress: </Text>
          <Text color="#00FF88" bold>
            {answeredCount}/{totalQuestions}
          </Text>
          <Text dimColor> completed</Text>
        </Box>
      )}

      {/* Vertical list - all questions */}
      {questions.map((q, qIdx) => {
        const isCurrentQuestion = qIdx === multiSelectionPage;
        const answer = multiSelectionAnswers[q.id];
        const answerOption = answer ? q.options.find((opt) => (opt.value || opt.label) === answer) : null;

        return (
          <Box key={q.id} marginBottom={1} flexDirection="column">
            {/* Question header */}
            <Box>
              {!isSingleQuestion && (
                <Text color="#00D9FF">Q{qIdx + 1}. </Text>
              )}
              <Text bold={isCurrentQuestion} color={isCurrentQuestion ? '#00D9FF' : 'gray'}>
                {q.question}
              </Text>
              {isCurrentQuestion && !isSingleQuestion && (
                <Text color="#00FF88"> ← </Text>
              )}
            </Box>

            {/* Answer or expanded options */}
            {isCurrentQuestion ? (
              // Current question: show options
              <Box marginLeft={4} flexDirection="column" marginTop={1}>
                {/* Free Text Input */}
                {isFreeTextMode ? (
                  <Box marginBottom={1}>
                    <Text dimColor>✏️  </Text>
                    <Text color="#00FF88">{freeTextInput}</Text>
                    <Text color="#00FF88">▊</Text>
                    <Text dimColor> (Enter to submit, Esc to cancel)</Text>
                  </Box>
                ) : (
                  /* Filter */
                  <Box marginBottom={1}>
                    <Text dimColor>🔍 </Text>
                    {isFilterMode ? (
                      <>
                        <Text color="#00FF88">{selectionFilter}</Text>
                        <Text color="#00FF88">▊</Text>
                        <Text dimColor> (Esc to exit, type to continue)</Text>
                      </>
                    ) : selectionFilter ? (
                      <>
                        <Text color="#00D9FF">{selectionFilter}</Text>
                        <Text dimColor> (/ to edit, Esc to clear)</Text>
                      </>
                    ) : (
                      <Text dimColor>(press / to filter)</Text>
                    )}
                  </Box>
                )}

                {/* Options */}
                {!isFreeTextMode && (() => {
                  // Safety check: ensure options exist
                  if (!q.options || !Array.isArray(q.options)) {
                    return (
                      <Box>
                        <Text color="red">⚠ Error: No options available for this question</Text>
                        <Text dimColor>Question data: {JSON.stringify(q)}</Text>
                      </Box>
                    );
                  }

                  const filteredOptions = q.options.filter(
                    (option) =>
                      option.label.toLowerCase().includes(selectionFilter.toLowerCase()) ||
                      (option.value && option.value.toLowerCase().includes(selectionFilter.toLowerCase()))
                  );

                  if (filteredOptions.length === 0) {
                    return <Text color="yellow">⚠ No matches found</Text>;
                  }

                  // Calculate scroll window to keep selected item visible
                  const viewport = calculateScrollViewport(filteredOptions, selectedCommandIndex);

                  return (
                    <>
                      {viewport.hasItemsAbove && (
                        <Box marginBottom={1}>
                          <Text dimColor>... {viewport.itemsAboveCount} more above</Text>
                        </Box>
                      )}
                      {viewport.visibleItems.map((option, idx) => {
                        const absoluteIdx = viewport.scrollOffset + idx;
                        const optionValue = option.value || option.label;
                        const isChecked = q.multiSelect && multiSelectChoices.has(optionValue);
                        const cursor = absoluteIdx === selectedCommandIndex ? '▶ ' : '  ';
                        const checkbox = q.multiSelect ? (isChecked ? '[✓] ' : '[ ] ') : '';

                        return (
                          <Box key={option.value || option.label} paddingY={0}>
                            <Text
                              color={absoluteIdx === selectedCommandIndex ? '#00FF88' : 'gray'}
                              bold={absoluteIdx === selectedCommandIndex}
                            >
                              {cursor}{checkbox}{option.label}
                            </Text>
                          </Box>
                        );
                      })}
                      {viewport.hasItemsBelow && (
                        <Box marginTop={1}>
                          <Text dimColor>... {viewport.itemsBelowCount} more below</Text>
                        </Box>
                      )}
                    </>
                  );
                })()}
              </Box>
            ) : (
              // Other questions: show answer or not answered
              <Box marginLeft={4}>
                {answer ? (
                  <>
                    <Text color="#00FF88">✓ </Text>
                    <Text color="#00FF88">
                      {Array.isArray(answer)
                        ? answer.join(', ')
                        : (answerOption?.label || answer)}
                    </Text>
                  </>
                ) : (
                  <Text dimColor>(not answered yet)</Text>
                )}
              </Box>
            )}
          </Box>
        );
      })}

      {/* Controls footer */}
      <Box marginTop={1} flexDirection="column">
        <Box>
          {!isSingleQuestion && !isFilterMode && (
            <>
              <Text dimColor>Tab: </Text>
              <Text color="#00D9FF">Next</Text>
              <Text dimColor> · Shift+Tab: </Text>
              <Text color="#00D9FF">Previous</Text>
              <Text dimColor> · </Text>
            </>
          )}
          <Text dimColor>↑↓: </Text>
          <Text color="#00D9FF">Navigate</Text>
          {!isFilterMode && questions[multiSelectionPage]?.multiSelect ? (
            <>
              <Text dimColor> · Space: </Text>
              <Text color="#00FF88">Toggle</Text>
              <Text dimColor> · Enter: </Text>
              <Text color={multiSelectChoices.size > 0 ? '#00FF88' : 'gray'}>
                Confirm{multiSelectChoices.size === 0 && ' (select at least one)'}
              </Text>
              <Text dimColor> · /: </Text>
              <Text color="#00D9FF">Filter</Text>
            </>
          ) : !isFilterMode ? (
            <>
              <Text dimColor> · Enter: </Text>
              <Text color="#00FF88">Select</Text>
              <Text dimColor> · /: </Text>
              <Text color="#00D9FF">Filter</Text>
            </>
          ) : (
            <>
              <Text dimColor> · Enter: </Text>
              <Text color="#00FF88">Select</Text>
            </>
          )}
          {!isSingleQuestion && !isFilterMode && (
            <>
              <Text dimColor> · </Text>
              <Text dimColor>Ctrl+Enter: </Text>
              <Text color={allAnswered ? '#00FF88' : 'gray'}>
                Submit{!allAnswered && ' (answer all first)'}
              </Text>
            </>
          )}
          <Text dimColor> · Esc: </Text>
          <Text color="#FF3366">
            {isFilterMode ? 'Exit filter' : selectionFilter ? 'Clear filter' : 'Cancel'}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
