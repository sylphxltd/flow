/**
 * Chat Screen
 * AI chat interface with session management
 *
 * REFACTORED ARCHITECTURE:
 * - All state management extracted to custom hooks
 * - All streaming logic extracted to utility modules
 * - All command handling extracted to separate modules
 * - All autocomplete logic extracted to separate modules
 * - All UI rendering extracted to separate components
 */

import {
  useAIConfig,
  useAppStore,
  useAskToolHandler,
  useChat,
  useFileAttachments,
  useKeyboardNavigation,
  useProjectFiles,
  useSessionInitialization,
  useTokenCalculation,
} from '@sylphx/code-client';
import { Box, useInput } from 'ink';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { commands } from '../commands/registry.js';
import StatusBar from '../components/StatusBar.js';
import TodoList from '../components/TodoList.js';
import { useCommandAutocomplete } from './chat/autocomplete/commandAutocomplete.js';
import { useFileAutocomplete } from './chat/autocomplete/fileAutocomplete.js';
// Autocomplete
import { createGetHintText } from './chat/autocomplete/hintText.js';
import { useCommandOptionLoader } from './chat/autocomplete/optionLoader.js';
// Command handling
import { createCommandContext } from './chat/commands/commandContext.js';
import { createHandleSubmit } from './chat/handlers/messageHandler.js';
import { useCommandState } from './chat/hooks/useCommandState.js';
// Custom hooks
import { useInputState } from './chat/hooks/useInputState.js';
import { useSelectionState } from './chat/hooks/useSelectionState.js';
import { useStreamingState } from './chat/hooks/useStreamingState.js';
// Streaming utilities
import { createSubscriptionSendUserMessageToAI } from './chat/streaming/subscriptionAdapter.js';

// Note: useMessageHistory not needed - using useInputState which includes history management

// UI components
import { ChatHeader } from './chat/components/ChatHeader.js';
import { ChatMessages } from './chat/components/ChatMessages.js';
import { InputSection } from './chat/components/InputSection.js';
import { StatusIndicator } from './chat/components/StatusIndicator.js';

interface ChatProps {
  commandFromPalette?: string | null;
}

export default function Chat(_props: ChatProps) {
  // Store selectors
  const addDebugLog = useAppStore((state) => state.addDebugLog);
  const navigateTo = useAppStore((state) => state.navigateTo);
  const aiConfig = useAppStore((state) => state.aiConfig);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const createSession = useAppStore((state) => state.createSession);
  const updateSessionModel = useAppStore((state) => state.updateSessionModel);
  const updateSessionProvider = useAppStore((state) => state.updateSessionProvider);
  const updateSessionTitle = useAppStore((state) => state.updateSessionTitle);
  const updateProvider = useAppStore((state) => state.updateProvider);
  const setAIConfig = useAppStore((state) => state.setAIConfig);
  const setCurrentSession = useAppStore((state) => state.setCurrentSession);
  const addMessage = useAppStore((state) => state.addMessage);
  const setSelectedProvider = useAppStore((state) => state.setSelectedProvider);
  const setSelectedModel = useAppStore((state) => state.setSelectedModel);
  const updateNotificationSettings = useAppStore((state) => state.updateNotificationSettings);
  const notificationSettings = useAppStore((state) => state.notificationSettings);

  // Helper function
  const addLog = (message: string) => {
    addDebugLog(message);
  };

  // Custom hooks
  const { sendMessage, currentSession } = useChat();
  const { saveConfig } = useAIConfig();
  const usedTokens = useTokenCalculation(currentSession || null);

  // LAZY SESSIONS: No auto-session creation on startup
  // Server will create session on-demand when user sends first message

  // State hooks
  const inputState = useInputState();
  const {
    input,
    setInput,
    normalizedCursor,
    setCursor,
    messageHistory,
    setMessageHistory,
    historyIndex,
    setHistoryIndex,
    tempInput,
    setTempInput,
  } = inputState;

  const streamingState = useStreamingState();
  const {
    isStreaming,
    isTitleStreaming,
    streamingTitle,
    abortControllerRef,
    lastErrorRef,
    wasAbortedRef,
    streamingMessageIdRef,
    usageRef,
    finishReasonRef,
    dbWriteTimerRef,
    pendingDbContentRef,
    setIsStreaming,
    setIsTitleStreaming,
    setStreamingTitle,
  } = streamingState;

  const selectionState = useSelectionState();
  const {
    pendingInput,
    inputResolver,
    selectionFilter,
    isFilterMode,
    multiSelectionPage,
    multiSelectionAnswers,
    multiSelectChoices,
    freeTextInput,
    isFreeTextMode,
    askQueueLength,
    setPendingInput,
    setSelectionFilter,
    setIsFilterMode,
    setMultiSelectionPage,
    setMultiSelectionAnswers,
    setMultiSelectChoices,
    setFreeTextInput,
    setIsFreeTextMode,
    setAskQueueLength,
  } = selectionState;

  const commandState = useCommandState();
  const {
    pendingCommand,
    skipNextSubmit,
    lastEscapeTime,
    cachedOptions,
    currentlyLoading,
    loadError,
    commandSessionRef,
    inputComponent,
    inputComponentTitle,
    setPendingCommand,
    setCachedOptions,
    setCurrentlyLoading,
    setLoadError,
    setInputComponent,
  } = commandState;

  // Local state not in hooks
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showEscHint, setShowEscHint] = useState(false);

  // Helper function to get AI config
  const getAIConfig = () => useAppStore.getState().aiConfig;

  // File attachment hook
  const {
    pendingAttachments,
    attachmentTokens,
    validTags,
    addAttachment,
    clearAttachments,
    setAttachmentTokenCount,
  } = useFileAttachments(input);

  const { projectFiles, filesLoading } = useProjectFiles();

  // Ask tool handler
  useAskToolHandler({
    setPendingInput,
    setMultiSelectionPage,
    setMultiSelectionAnswers,
    setSelectionFilter,
    setSelectedCommandIndex,
    setAskQueueLength,
    inputResolver,
    addDebugLog,
  });

  // Create sendUserMessageToAI function using new subscription adapter
  const sendUserMessageToAI = useCallback(
    createSubscriptionSendUserMessageToAI({
      aiConfig,
      currentSessionId,
      addMessage,
      addLog,
      updateSessionTitle,
      notificationSettings,
      abortControllerRef,
      lastErrorRef,
      wasAbortedRef,
      streamingMessageIdRef,
      usageRef,
      finishReasonRef,
      setIsStreaming,
      setIsTitleStreaming,
      setStreamingTitle,
    }),
    [
      aiConfig,
      currentSessionId,
      addMessage,
      addLog,
      updateSessionTitle,
      notificationSettings,
      setIsStreaming,
      setIsTitleStreaming,
      setStreamingTitle,
    ]
  );

  // Create factory for command context
  const createCommandContextForArgs = useCallback(
    (args: string[]) =>
      createCommandContext(args, {
        createSession,
        updateProvider,
        setAIConfig,
        updateSessionModel,
        updateSessionProvider,
        setSelectedProvider,
        setSelectedModel,
        navigateTo,
        addMessage,
        updateNotificationSettings,
        getAIConfig: () => useAppStore.getState().aiConfig,
        getSessions: async () => {
          const { getTRPCClient } = await import('@sylphx/code-server');
          const client = await getTRPCClient();
          return await client.session.getRecent({ limit: 100 });
        },
        getCurrentSessionId: () => currentSessionId,
        setCurrentSession,
        getNotificationSettings: () => notificationSettings,
        saveConfig,
        getCurrentSession: () => currentSession,
        sendUserMessageToAI,
        setInput,
        setPendingInput,
        setMultiSelectionPage,
        setMultiSelectionAnswers,
        setMultiSelectChoices,
        setSelectedCommandIndex,
        setSelectionFilter,
        setIsFilterMode,
        setInputComponent,
        inputResolver,
        commandSessionRef,
        currentSessionId,
        addLog,
        getCommands: () => commands,
      }),
    [
      currentSessionId,
      currentSession,
      saveConfig,
      notificationSettings,
      sendUserMessageToAI,
      setInput,
      setInputComponent,
      addLog,
      updateProvider,
      setAIConfig,
      updateSessionModel,
      updateSessionProvider,
      setSelectedProvider,
      setSelectedModel,
      setCurrentSession,
      navigateTo,
      updateNotificationSettings,
      addMessage,
      createSession,
      setPendingInput,
      setMultiSelectionPage,
      setMultiSelectionAnswers,
      setMultiSelectChoices,
      setSelectedCommandIndex,
      setSelectionFilter,
      setIsFilterMode,
      inputResolver,
      commandSessionRef,
    ]
  );

  // Create hint text getter function
  const getHintText = useMemo(() => createGetHintText(commands), []);

  // Autocomplete hooks
  const filteredFileInfo = useFileAutocomplete(input, normalizedCursor, projectFiles);
  const filteredCommands = useCommandAutocomplete(
    input,
    normalizedCursor,
    cachedOptions,
    createCommandContextForArgs,
    commands
  );

  // Get hint text for current input
  const hintText = useMemo(() => getHintText(input), [input, getHintText]);

  // Clear error when input changes
  useEffect(() => {
    setLoadError(null);
  }, [input, setLoadError]);

  // Use command option loader hook
  useCommandOptionLoader(
    input,
    currentlyLoading,
    cachedOptions,
    setCachedOptions,
    setCurrentlyLoading,
    setLoadError,
    createCommandContextForArgs,
    commands,
    addLog
  );

  // Restore streaming state on session switch
  useEffect(() => {
    if (!currentSessionId) {
      setIsStreaming(false);
      return;
    }

    // Get current session from store (tRPC: already cached)
    const session = useAppStore.getState().currentSession;
    if (!session || session.id !== currentSessionId) {
      setIsStreaming(false);
      return;
    }

    // Find active (streaming) message in session
    const activeMessage = session.messages.find((m) => m.status === 'active');
    setIsStreaming(!!activeMessage);
  }, [currentSessionId, setIsStreaming]);

  // Create handleSubmit function with filteredCommands
  const handleSubmit = useMemo(
    () =>
      createHandleSubmit({
        isStreaming,
        addMessage,
        getAIConfig,
        pendingInput,
        filteredCommands,
        pendingAttachments,
        setHistoryIndex,
        setTempInput,
        setInput,
        setPendingInput,
        setPendingCommand,
        setMessageHistory,
        clearAttachments,
        inputResolver,
        commandSessionRef,
        skipNextSubmit,
        currentSessionId,
        addLog,
        sendUserMessageToAI,
        createCommandContext: createCommandContextForArgs,
        getCommands: () => commands,
      }),
    [
      isStreaming,
      addMessage,
      getAIConfig,
      pendingInput,
      filteredCommands,
      pendingAttachments,
      setHistoryIndex,
      setTempInput,
      setInput,
      setPendingInput,
      setPendingCommand,
      setMessageHistory,
      clearAttachments,
      inputResolver,
      commandSessionRef,
      skipNextSubmit,
      currentSessionId,
      addLog,
      sendUserMessageToAI,
      createCommandContextForArgs,
    ]
  );

  // Keyboard navigation hook
  useKeyboardNavigation({
    input,
    cursor: normalizedCursor,
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
    createCommandContext: createCommandContextForArgs,
    getAIConfig,
    currentSessionId,
    currentSession,
  });

  // Message history navigation (like bash)
  useInput(
    (char, key) => {
      // inputComponent has its own keyboard handling (e.g. ProviderManagement)
      // Don't interfere with it
      if (inputComponent) {
        return;
      }

      const isNormalMode = !pendingInput && !pendingCommand;
      if (!isNormalMode) return;

      // Up arrow - navigate to previous message in history
      if (key.upArrow) {
        if (messageHistory.length === 0) return;

        if (historyIndex === -1) {
          setTempInput(input);
          const newIndex = messageHistory.length - 1;
          setHistoryIndex(newIndex);
          setInput(messageHistory[newIndex]);
          setCursor(0);
        } else if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(messageHistory[newIndex]);
          setCursor(0);
        }
        return;
      }

      // Down arrow - navigate to next message in history
      if (key.downArrow) {
        if (historyIndex === -1) return;

        if (historyIndex === messageHistory.length - 1) {
          setHistoryIndex(-1);
          setInput(tempInput);
          setCursor(0);
        } else {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setInput(messageHistory[newIndex]);
          setCursor(0);
        }
        return;
      }

      // Any other key - exit history browsing mode
      if (historyIndex !== -1 && char) {
        setHistoryIndex(-1);
        setTempInput('');
      }
    },
    { isActive: !isStreaming }
  );

  // Reset selected indices when filtered lists change
  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [filteredCommands.length]);

  useEffect(() => {
    setSelectedFileIndex(0);
  }, [filteredFileInfo.files.length]);

  return (
    <Box flexDirection="row" flexGrow={1}>
      {/* Main chat area */}
      <Box flexDirection="column" flexGrow={1} width="70%">
        {/* App Header and Chat Title */}
        <Box flexShrink={0}>
          <ChatHeader
            currentSessionTitle={currentSession?.title}
            isTitleStreaming={isTitleStreaming}
            streamingTitle={streamingTitle}
          />
        </Box>

        {/* Messages */}
        <ChatMessages
          hasSession={!!currentSession}
          messages={currentSession?.messages}
          attachmentTokens={attachmentTokens}
        />

        {/* Status Indicator */}
        <Box flexShrink={0}>
          <StatusIndicator
            isStreaming={isStreaming}
            streamParts={currentSession?.messages.find((m) => m.status === 'active')?.content || []}
          />
        </Box>

        {/* Todo List */}
        <Box flexShrink={0}>
          <TodoList />
        </Box>

        {/* Input Area */}
        <Box flexShrink={0}>
          <InputSection
            input={input}
            cursor={normalizedCursor}
            pendingInput={pendingInput}
            pendingCommand={pendingCommand}
            multiSelectionPage={multiSelectionPage}
            multiSelectionAnswers={multiSelectionAnswers}
            multiSelectChoices={multiSelectChoices}
            selectionFilter={selectionFilter}
            isFilterMode={isFilterMode}
            freeTextInput={freeTextInput}
            isFreeTextMode={isFreeTextMode}
            selectedCommandIndex={selectedCommandIndex}
            askQueueLength={askQueueLength}
            pendingAttachments={pendingAttachments}
            attachmentTokens={attachmentTokens}
            showEscHint={showEscHint}
            filteredFileInfo={filteredFileInfo}
            filteredCommands={filteredCommands}
            filesLoading={filesLoading}
            selectedFileIndex={selectedFileIndex}
            currentlyLoading={currentlyLoading}
            loadError={loadError}
            cachedOptions={cachedOptions}
            hintText={hintText}
            validTags={validTags}
            currentSessionId={currentSessionId}
            setInput={setInput}
            setCursor={setCursor}
            setSelectionFilter={setSelectionFilter}
            setSelectedCommandIndex={setSelectedCommandIndex}
            onSubmit={handleSubmit}
            addMessage={addMessage}
            createCommandContext={createCommandContextForArgs}
            getAIConfig={getAIConfig}
            setPendingCommand={setPendingCommand}
            inputComponent={inputComponent}
            inputComponentTitle={inputComponentTitle}
          />
        </Box>

        {/* Status Bar */}
        <Box flexShrink={0} paddingTop={1} flexDirection="row">
          <StatusBar
            provider={currentSession?.provider || aiConfig?.defaultProvider || null}
            model={currentSession?.model || aiConfig?.defaultModel || null}
            usedTokens={currentSession ? usedTokens : 0}
          />
        </Box>
      </Box>
    </Box>
  );
}
