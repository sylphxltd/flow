/**
 * InputSection Component
 * Handles all input modes: selection, pending command, and normal input
 */

import { Box, Text } from 'ink';
import TextInputWithHint from '../../../components/TextInputWithHint.js';
import { SelectionUI } from '../../../components/SelectionUI.js';
import { PendingCommandSelection } from '../../../components/PendingCommandSelection.js';
import { FileAutocomplete } from '../../../components/FileAutocomplete.js';
import { CommandAutocomplete } from '../../../components/CommandAutocomplete.js';
import type { WaitForInputOptions, Command } from '../../../commands/types.js';
import type { FileAttachment } from '../../../../types/session.types.js';
import { formatTokenCount } from '../../../../utils/token-counter.js';
import type { FilteredFileInfo, FilteredCommand } from '../autocomplete/types.js';

interface InputSectionProps {
  // Input state
  input: string;
  setInput: (value: string) => void;
  cursor: number;
  setCursor: (pos: number) => void;
  onSubmit: (value: string) => void | Promise<void>;

  // Selection mode
  pendingInput: WaitForInputOptions | null;
  multiSelectionPage: number;
  multiSelectionAnswers: Record<string, string | string[]>;
  multiSelectChoices: Set<string>;
  selectionFilter: string;
  setSelectionFilter: (value: string) => void;
  isFilterMode: boolean;
  freeTextInput: string;
  isFreeTextMode: boolean;
  selectedCommandIndex: number;
  setSelectedCommandIndex: (idx: number) => void;
  askQueueLength: number;

  // Pending command mode
  pendingCommand: { command: Command; currentInput: string } | null;
  setPendingCommand: (cmd: { command: Command; currentInput: string } | null) => void;
  currentlyLoading: string | null;
  loadError: string | null;
  cachedOptions: Map<string, Array<{ id: string; name: string; label: string; value?: string }>>;
  currentSessionId: string | null;
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string) => void;
  createCommandContext: (args: string[]) => any;

  // Attachments
  pendingAttachments: FileAttachment[];
  attachmentTokens: Map<string, number>;

  // Autocomplete
  filteredFileInfo: FilteredFileInfo;
  filteredCommands: FilteredCommand[];
  selectedFileIndex: number;
  filesLoading: boolean;
  hintText: string;
  validTags: Set<string>;

  // ESC hint
  showEscHint: boolean;
}

export function InputSection({
  input,
  setInput,
  cursor,
  setCursor,
  onSubmit,
  pendingInput,
  multiSelectionPage,
  multiSelectionAnswers,
  multiSelectChoices,
  selectionFilter,
  isFilterMode,
  freeTextInput,
  isFreeTextMode,
  selectedCommandIndex,
  setSelectedCommandIndex,
  askQueueLength,
  pendingCommand,
  setPendingCommand,
  currentlyLoading,
  loadError,
  cachedOptions,
  currentSessionId,
  addMessage,
  createCommandContext,
  pendingAttachments,
  attachmentTokens,
  filteredFileInfo,
  filteredCommands,
  selectedFileIndex,
  filesLoading,
  hintText,
  validTags,
  showEscHint,
}: InputSectionProps) {
  return (
    <Box flexDirection="column" flexShrink={0}>
      <Box>
        <Text color="#00D9FF">▌ YOU</Text>
      </Box>

      {/* PendingInput Mode - when command calls waitForInput */}
      {pendingInput && pendingInput.type === 'selection' ? (
        <SelectionUI
          pendingInput={pendingInput}
          multiSelectionPage={multiSelectionPage}
          multiSelectionAnswers={multiSelectionAnswers}
          multiSelectChoices={multiSelectChoices}
          selectionFilter={selectionFilter}
          isFilterMode={isFilterMode}
          freeTextInput={freeTextInput}
          isFreeTextMode={isFreeTextMode}
          selectedCommandIndex={selectedCommandIndex}
          askQueueLength={askQueueLength}
        />
      ) : /* Selection Mode - when a command is pending and needs args */
      pendingCommand ? (
        <PendingCommandSelection
          pendingCommand={pendingCommand}
          currentlyLoading={currentlyLoading}
          loadError={loadError}
          cachedOptions={cachedOptions}
          selectedCommandIndex={selectedCommandIndex}
          onSelect={async (option) => {
            const response = await pendingCommand.command.execute(createCommandContext([option.value || option.label]));
            if (currentSessionId && response) {
              addMessage(currentSessionId, 'assistant', response);
            }
            setPendingCommand(null);
            setSelectedCommandIndex(0);
          }}
        />
      ) : (
        <>
          {/* Show pending attachments */}
          {pendingAttachments.length > 0 ? (
            <Box flexDirection="column" marginBottom={1}>
              <Box marginBottom={1}>
                <Text dimColor>Attachments ({pendingAttachments.length}):</Text>
              </Box>
              {pendingAttachments.map((att) => (
                <Box key={`pending-att-${att.path}`} marginLeft={2}>
                  <Text color="#00D9FF">{att.relativePath}</Text>
                  <Text dimColor> (</Text>
                  {att.size ? (
                    <>
                      <Text dimColor>{(att.size / 1024).toFixed(1)}KB</Text>
                      {attachmentTokens.has(att.path) && <Text dimColor>, </Text>}
                    </>
                  ) : null}
                  {attachmentTokens.has(att.path) ? (
                    <Text dimColor>{formatTokenCount(attachmentTokens.get(att.path)!)} Tokens</Text>
                  ) : null}
                  <Text dimColor>)</Text>
                </Box>
              ))}
            </Box>
          ) : null}

          {/* Show prompt for text input mode */}
          {pendingInput?.type === 'text' && pendingInput.prompt && (
            <Box marginBottom={1}>
              <Text dimColor>{pendingInput.prompt}</Text>
            </Box>
          )}

          {/* Text Input with inline hint */}
          <Box marginLeft={2}>
            <TextInputWithHint
              key="main-input"
              value={input}
              onChange={setInput}
              cursor={cursor}
              onCursorChange={setCursor}
              onSubmit={onSubmit}
              placeholder={
                pendingInput?.type === 'text'
                  ? (pendingInput.placeholder || 'Type your response...')
                  : 'Type your message, / for commands, @ for files...'
              }
              showCursor
              hint={hintText}
              validTags={validTags}
              disableUpDownArrows={
                // Disable up/down arrows when autocomplete is active
                filteredFileInfo.hasAt ||
                (input.startsWith('/') && filteredCommands.length > 0)
              }
            />
          </Box>

          {/* ESC hint - shows after first ESC press */}
          {showEscHint && (
            <Box marginTop={1}>
              <Text color="yellow">Press ESC again to clear input</Text>
            </Box>
          )}

          {/* File Autocomplete - Shows below input when typing @ */}
          {filteredFileInfo.hasAt ? (
            <FileAutocomplete
              files={filteredFileInfo.files}
              selectedFileIndex={selectedFileIndex}
              filesLoading={filesLoading}
            />
          ) : null}

          {/* Command Autocomplete - Shows below input when typing / */}
          {input.startsWith('/') && !filteredFileInfo.hasAt && filteredCommands.length > 0 ? (
            <CommandAutocomplete
              commands={filteredCommands}
              selectedCommandIndex={selectedCommandIndex}
              currentlyLoading={currentlyLoading}
              loadError={loadError}
            />
          ) : null}
        </>
      )}
    </Box>
  );
}
