/**
 * ChatContainer - Main chat area
 * Full-screen, borderless design
 */

import React, { useState, useEffect } from 'react';
import { trpc } from '../trpc';
import MessageList from './MessageList';
import InputArea from './InputArea';
import type { MessagePart } from '../../../types/session.types';

interface ChatContainerProps {
  sessionId: string | null;
  toast: any;
}

export default function ChatContainer({ sessionId, toast }: ChatContainerProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  const [isAssistantTyping, setIsAssistantTyping] = useState<boolean>(false);
  const [streamingParts, setStreamingParts] = useState<MessagePart[]>([]);
  const [streamingTitle, setStreamingTitle] = useState<string>('');
  const [isTitleStreaming, setIsTitleStreaming] = useState<boolean>(false);

  // Sync currentSessionId with props
  useEffect(() => {
    setCurrentSessionId(sessionId);
  }, [sessionId]);

  // Load session data (only if sessionId exists)
  const { data: session, isLoading } = trpc.session.getById.useQuery(
    { sessionId: currentSessionId! },
    { enabled: !!currentSessionId }
  );

  const utils = trpc.useUtils();

  // When sessionId is null, show "New Chat" interface
  if (!currentSessionId) {
    return (
      <div className="flex-1 flex flex-col bg-gray-950">
        {/* Header */}
        <div className="h-16 flex items-center px-8 bg-gray-900/30 backdrop-blur-sm">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-100">
              {isTitleStreaming ? streamingTitle || 'Generating title...' : 'New Chat'}
            </h2>
            <div className="text-sm text-gray-500">
              Start a conversation
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-bold text-gray-300 mb-2">
              Start a New Conversation
            </h2>
            <p className="text-gray-500">
              Type your message below to begin
            </p>
          </div>
        </div>

        {/* Input */}
        <InputArea
          sessionId={null}
          toast={toast}
          onMessageSent={() => {
            setOptimisticUserMessage(null);
            setIsAssistantTyping(false);
            setStreamingParts([]);
          }}
          onStreamingStart={() => {
            setIsAssistantTyping(true);
            setStreamingParts([]);
          }}
          onStreamingPartsUpdate={(parts) => {
            setIsAssistantTyping(true);
            setStreamingParts(parts);
          }}
          onStreamingComplete={() => {
            setOptimisticUserMessage(null);
            setIsAssistantTyping(false);
            setStreamingParts([]);
            setIsTitleStreaming(false);
            // Refetch sessions list
            utils.session.getRecent.invalidate();
          }}
          onSessionCreated={(newSessionId, provider, model) => {
            console.log('Session created:', newSessionId);
            setCurrentSessionId(newSessionId);
            setStreamingTitle('');
            setIsTitleStreaming(true);
          }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <div className="text-red-500">Session not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="h-16 flex items-center px-8 bg-gray-900/30 backdrop-blur-sm">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-100">
            {session.title || 'New Chat'}
          </h2>
          <div className="text-sm text-gray-500">
            {session.provider} · {session.model}
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={session.messages}
        optimisticUserMessage={optimisticUserMessage}
        isAssistantTyping={isAssistantTyping}
        streamingParts={streamingParts}
      />

      {/* Input */}
      <InputArea
        sessionId={currentSessionId}
        toast={toast}
        onMessageSent={(message) => {
          setOptimisticUserMessage(message);
          setIsAssistantTyping(false);
          setStreamingParts([]);
        }}
        onStreamingStart={() => {
          setIsAssistantTyping(true);
          setStreamingParts([]);
        }}
        onStreamingPartsUpdate={(parts) => {
          setIsAssistantTyping(true);
          setStreamingParts(parts);
        }}
        onStreamingComplete={() => {
          setOptimisticUserMessage(null);
          setIsAssistantTyping(false);
          setStreamingParts([]);
        }}
        onSessionCreated={(newSessionId) => {
          // This shouldn't happen for existing sessions, but handle it just in case
          console.log('Session created unexpectedly:', newSessionId);
        }}
        onTitleStreamingStart={() => {
          setIsTitleStreaming(true);
          setStreamingTitle('');
        }}
        onTitleStreamingDelta={(text) => {
          setStreamingTitle((prev) => prev + text);
        }}
        onTitleStreamingComplete={(title) => {
          setStreamingTitle(title);
          setIsTitleStreaming(false);
        }}
      />
    </div>
  );
}
