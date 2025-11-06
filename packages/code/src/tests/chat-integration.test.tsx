/**
 * Chat Integration Test
 * Tests the full message submission flow from InputSection through handleSubmit
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { InputSection } from '../screens/chat/components/InputSection.js';

describe('Chat Integration - Message Submission', () => {
  let onSubmitMock: ReturnType<typeof vi.fn>;
  let setInputMock: ReturnType<typeof vi.fn>;
  let setCursorMock: ReturnType<typeof vi.fn>;
  let addMessageMock: ReturnType<typeof vi.fn>;
  let createCommandContextMock: ReturnType<typeof vi.fn>;
  let getAIConfigMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmitMock = vi.fn(async (value: string) => {
      console.log('[TEST onSubmit] Called with:', JSON.stringify(value));

      if (!value.trim()) {
        console.log('[TEST onSubmit] Empty value, returning');
        return;
      }

      console.log('[TEST onSubmit] Processing message...');
      await new Promise((resolve) => setTimeout(resolve, 10));
      console.log('[TEST onSubmit] Done');
    });

    setInputMock = vi.fn();
    setCursorMock = vi.fn();
    addMessageMock = vi.fn();
    createCommandContextMock = vi.fn();
    getAIConfigMock = vi.fn(() => ({
      defaultProvider: 'anthropic',
      defaultModel: 'claude-3-5-sonnet',
    }));
  });

  describe('InputSection with normal input', () => {
    it('should call onSubmit when Enter is pressed', () => {
      const { stdin } = render(
        <InputSection
          input="test message"
          setInput={setInputMock}
          cursor={12}
          setCursor={setCursorMock}
          onSubmit={onSubmitMock}
          pendingInput={null}
          multiSelectionPage={0}
          multiSelectionAnswers={{}}
          multiSelectChoices={new Set()}
          selectionFilter=""
          setSelectionFilter={vi.fn()}
          isFilterMode={false}
          freeTextInput=""
          isFreeTextMode={false}
          selectedCommandIndex={0}
          setSelectedCommandIndex={vi.fn()}
          askQueueLength={0}
          pendingCommand={null}
          setPendingCommand={vi.fn()}
          currentlyLoading={null}
          loadError={null}
          cachedOptions={new Map()}
          currentSessionId="test-session"
          addMessage={addMessageMock}
          createCommandContext={createCommandContextMock}
          getAIConfig={getAIConfigMock}
          pendingAttachments={[]}
          attachmentTokens={new Map()}
          filteredFileInfo={{ hasAt: false, files: [] }}
          filteredCommands={[]}
          selectedFileIndex={0}
          filesLoading={false}
          hintText=""
          validTags={new Set()}
          showEscHint={false}
          inputComponent={null}
          inputComponentTitle={null}
        />
      );

      console.log('[TEST] Simulating Enter key press...');
      stdin.write('\r');

      console.log('[TEST] Checking if onSubmit was called...');
      expect(onSubmitMock).toHaveBeenCalledWith('test message');
      expect(onSubmitMock).toHaveBeenCalledTimes(1);
      console.log('[TEST] ✓ onSubmit was called correctly');
    });

    it('should call onSubmit with empty string', () => {
      const { stdin } = render(
        <InputSection
          input=""
          setInput={setInputMock}
          cursor={0}
          setCursor={setCursorMock}
          onSubmit={onSubmitMock}
          pendingInput={null}
          multiSelectionPage={0}
          multiSelectionAnswers={{}}
          multiSelectChoices={new Set()}
          selectionFilter=""
          setSelectionFilter={vi.fn()}
          isFilterMode={false}
          freeTextInput=""
          isFreeTextMode={false}
          selectedCommandIndex={0}
          setSelectedCommandIndex={vi.fn()}
          askQueueLength={0}
          pendingCommand={null}
          setPendingCommand={vi.fn()}
          currentlyLoading={null}
          loadError={null}
          cachedOptions={new Map()}
          currentSessionId="test-session"
          addMessage={addMessageMock}
          createCommandContext={createCommandContextMock}
          getAIConfig={getAIConfigMock}
          pendingAttachments={[]}
          attachmentTokens={new Map()}
          filteredFileInfo={{ hasAt: false, files: [] }}
          filteredCommands={[]}
          selectedFileIndex={0}
          filesLoading={false}
          hintText=""
          validTags={new Set()}
          showEscHint={false}
          inputComponent={null}
          inputComponentTitle={null}
        />
      );

      stdin.write('\r');

      // onSubmit should still be called (even with empty value)
      expect(onSubmitMock).toHaveBeenCalledWith('');
      expect(onSubmitMock).toHaveBeenCalledTimes(1);
    });

    it('should call async onSubmit without blocking', async () => {
      const asyncSubmit = vi.fn(async (value: string) => {
        console.log('[Async Submit] Start:', value);
        await new Promise((resolve) => setTimeout(resolve, 50));
        console.log('[Async Submit] End:', value);
      });

      const { stdin } = render(
        <InputSection
          input="async message"
          setInput={setInputMock}
          cursor={13}
          setCursor={setCursorMock}
          onSubmit={asyncSubmit}
          pendingInput={null}
          multiSelectionPage={0}
          multiSelectionAnswers={{}}
          multiSelectChoices={new Set()}
          selectionFilter=""
          setSelectionFilter={vi.fn()}
          isFilterMode={false}
          freeTextInput=""
          isFreeTextMode={false}
          selectedCommandIndex={0}
          setSelectedCommandIndex={vi.fn()}
          askQueueLength={0}
          pendingCommand={null}
          setPendingCommand={vi.fn()}
          currentlyLoading={null}
          loadError={null}
          cachedOptions={new Map()}
          currentSessionId="test-session"
          addMessage={addMessageMock}
          createCommandContext={createCommandContextMock}
          getAIConfig={getAIConfigMock}
          pendingAttachments={[]}
          attachmentTokens={new Map()}
          filteredFileInfo={{ hasAt: false, files: [] }}
          filteredCommands={[]}
          selectedFileIndex={0}
          filesLoading={false}
          hintText=""
          validTags={new Set()}
          showEscHint={false}
          inputComponent={null}
          inputComponentTitle={null}
        />
      );

      stdin.write('\r');

      // Should be called immediately
      expect(asyncSubmit).toHaveBeenCalledWith('async message');
      expect(asyncSubmit).toHaveBeenCalledTimes(1);

      // Wait for async to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });

  describe('Real handleSubmit behavior simulation', () => {
    it('should mimic actual handleSubmit flow', async () => {
      const realHandleSubmit = vi.fn(async (value: string) => {
        console.log('[handleSubmit] Entry:', JSON.stringify(value));

        // Step 1: Check for empty
        if (!value.trim()) {
          console.log('[handleSubmit] Empty, returning');
          return;
        }

        // Step 2: Check if streaming (simulate)
        const isStreaming = false;
        if (isStreaming) {
          console.log('[handleSubmit] Already streaming, ignoring');
          return;
        }

        // Step 3: Process message
        console.log('[handleSubmit] Sending to AI...');
        await new Promise((resolve) => setTimeout(resolve, 20));
        console.log('[handleSubmit] Message sent');
      });

      const { stdin } = render(
        <InputSection
          input="Hello AI"
          setInput={setInputMock}
          cursor={8}
          setCursor={setCursorMock}
          onSubmit={realHandleSubmit}
          pendingInput={null}
          multiSelectionPage={0}
          multiSelectionAnswers={{}}
          multiSelectChoices={new Set()}
          selectionFilter=""
          setSelectionFilter={vi.fn()}
          isFilterMode={false}
          freeTextInput=""
          isFreeTextMode={false}
          selectedCommandIndex={0}
          setSelectedCommandIndex={vi.fn()}
          askQueueLength={0}
          pendingCommand={null}
          setPendingCommand={vi.fn()}
          currentlyLoading={null}
          loadError={null}
          cachedOptions={new Map()}
          currentSessionId="test-session"
          addMessage={addMessageMock}
          createCommandContext={createCommandContextMock}
          getAIConfig={getAIConfigMock}
          pendingAttachments={[]}
          attachmentTokens={new Map()}
          filteredFileInfo={{ hasAt: false, files: [] }}
          filteredCommands={[]}
          selectedFileIndex={0}
          filesLoading={false}
          hintText=""
          validTags={new Set()}
          showEscHint={false}
          inputComponent={null}
          inputComponentTitle={null}
        />
      );

      console.log('[TEST] Pressing Enter...');
      stdin.write('\r');

      console.log('[TEST] Verifying handleSubmit was called...');
      expect(realHandleSubmit).toHaveBeenCalledWith('Hello AI');
      expect(realHandleSubmit).toHaveBeenCalledTimes(1);

      // Wait for async to complete
      await new Promise((resolve) => setTimeout(resolve, 50));
      console.log('[TEST] ✓ Test complete');
    });
  });
});
