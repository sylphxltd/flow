/**
 * SelectionInput Component
 * Self-contained component for command selection/question prompts
 * Replaces the old pendingInput pattern
 */

import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import TextInputWithHint from '../../../components/TextInputWithHint.js';
import type { Question, SelectOption } from '../../../commands/types.js';

interface SelectionInputProps {
  // Questions to ask
  questions: Question[];
  // On complete callback (returns answers)
  onComplete: (answers: Record<string, string | string[]>) => void;
  // On cancel callback
  onCancel: () => void;
}

export function SelectionInput({ questions, onComplete, onCancel }: SelectionInputProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [multiSelectChoices, setMultiSelectChoices] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [isFilterMode, setIsFilterMode] = useState(false);
  const [freeTextInput, setFreeTextInput] = useState('');
  const [isFreeTextMode, setIsFreeTextMode] = useState(false);

  const currentQuestion = questions[currentPage];
  const isLastQuestion = currentPage === questions.length - 1;

  // Initialize multi-select choices for first question
  useEffect(() => {
    if (currentQuestion?.multiSelect) {
      const checkedOptions = currentQuestion.options
        .filter((opt) => opt.checked)
        .map((opt) => opt.value || opt.label);

      if (checkedOptions.length > 0) {
        setMultiSelectChoices(new Set(checkedOptions));
      } else if (currentQuestion.preSelected) {
        setMultiSelectChoices(new Set(currentQuestion.preSelected));
      } else {
        setMultiSelectChoices(new Set());
      }
    }
  }, [currentQuestion]);

  // Filter options
  const filteredOptions = filter
    ? currentQuestion.options.filter((opt) =>
        opt.label.toLowerCase().includes(filter.toLowerCase())
      )
    : currentQuestion.options;

  // Handle selection
  const handleSelect = (option: SelectOption) => {
    if (currentQuestion.multiSelect) {
      // Multi-select: toggle selection
      const newChoices = new Set(multiSelectChoices);
      const value = option.value || option.label;
      if (newChoices.has(value)) {
        newChoices.delete(value);
      } else {
        newChoices.add(value);
      }
      setMultiSelectChoices(newChoices);
    } else {
      // Single select: record answer and move to next question
      const newAnswers = { ...answers, [currentQuestion.id]: option.value || option.label };
      setAnswers(newAnswers);

      if (isLastQuestion) {
        onComplete(newAnswers);
      } else {
        setCurrentPage(currentPage + 1);
        setSelectedIndex(0);
        setFilter('');
        setIsFilterMode(false);
      }
    }
  };

  // Handle multi-select confirm
  const handleMultiSelectConfirm = () => {
    const selectedValues = Array.from(multiSelectChoices);
    const newAnswers = { ...answers, [currentQuestion.id]: selectedValues };
    setAnswers(newAnswers);

    if (isLastQuestion) {
      onComplete(newAnswers);
    } else {
      setCurrentPage(currentPage + 1);
      setSelectedIndex(0);
      setMultiSelectChoices(new Set());
      setFilter('');
      setIsFilterMode(false);
    }
  };

  // Keyboard navigation
  useInput((char, key) => {
    // ESC to cancel
    if (key.escape) {
      onCancel();
      return;
    }

    // Filter mode
    if (isFilterMode) {
      if (key.return) {
        setIsFilterMode(false);
        setSelectedIndex(0);
        return;
      }
      return; // Let TextInputWithHint handle input
    }

    // Free text mode
    if (isFreeTextMode) {
      if (key.return) {
        const option = filteredOptions[selectedIndex];
        if (option) {
          const newAnswers = { ...answers, [currentQuestion.id]: freeTextInput };
          setAnswers(newAnswers);

          if (isLastQuestion) {
            onComplete(newAnswers);
          } else {
            setCurrentPage(currentPage + 1);
            setSelectedIndex(0);
            setFreeTextInput('');
            setIsFreeTextMode(false);
          }
        }
        return;
      }
      return; // Let TextInputWithHint handle input
    }

    // Navigate options
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      return;
    }

    // Select option
    if (key.return) {
      if (currentQuestion.multiSelect) {
        handleMultiSelectConfirm();
      } else {
        const option = filteredOptions[selectedIndex];
        if (option) {
          if (option.freeText) {
            setIsFreeTextMode(true);
          } else {
            handleSelect(option);
          }
        }
      }
      return;
    }

    // Toggle multi-select (space)
    if (char === ' ' && currentQuestion.multiSelect) {
      const option = filteredOptions[selectedIndex];
      if (option && !option.freeText) {
        const value = option.value || option.label;
        const newChoices = new Set(multiSelectChoices);
        if (newChoices.has(value)) {
          newChoices.delete(value);
        } else {
          newChoices.add(value);
        }
        setMultiSelectChoices(newChoices);
      }
      return;
    }

    // Start filter mode (/)
    if (char === '/' && !isFilterMode) {
      setIsFilterMode(true);
      return;
    }
  });

  // Render
  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Question header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {currentQuestion.question}
        </Text>
        {questions.length > 1 && (
          <Text dimColor>
            {' '}
            ({currentPage + 1}/{questions.length})
          </Text>
        )}
      </Box>

      {/* Filter mode */}
      {isFilterMode && (
        <Box marginBottom={1}>
          <Text>Filter: </Text>
          <TextInputWithHint
            value={filter}
            onChange={setFilter}
            onSubmit={() => {
              setIsFilterMode(false);
              setSelectedIndex(0);
            }}
            showCursor
          />
        </Box>
      )}

      {/* Free text mode */}
      {isFreeTextMode && (
        <Box marginBottom={1}>
          <Text>Enter value: </Text>
          <TextInputWithHint
            value={freeTextInput}
            onChange={setFreeTextInput}
            onSubmit={() => {}} // Handled in useInput
            showCursor
            placeholder={filteredOptions[selectedIndex]?.placeholder}
          />
        </Box>
      )}

      {/* Options */}
      {!isFilterMode && !isFreeTextMode && (
        <>
          {filteredOptions.map((option, idx) => {
            const isSelected = idx === selectedIndex;
            const isChecked = multiSelectChoices.has(option.value || option.label);
            const symbol = currentQuestion.multiSelect
              ? isChecked
                ? '[✓]'
                : '[ ]'
              : isSelected
              ? '❯'
              : ' ';

            return (
              <Box key={option.label}>
                <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
                  {symbol} {option.label}
                </Text>
              </Box>
            );
          })}
        </>
      )}

      {/* Help text */}
      <Box marginTop={1}>
        <Text dimColor>
          {currentQuestion.multiSelect
            ? '↑↓: Navigate  │  Space: Toggle  │  Enter: Confirm  │  /: Filter  │  Esc: Cancel'
            : '↑↓: Navigate  │  Enter: Select  │  /: Filter  │  Esc: Cancel'}
        </Text>
      </Box>
    </Box>
  );
}
