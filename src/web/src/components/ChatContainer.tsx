/**
 * ChatContainer - Main chat area
 * Full-screen, borderless design
 */

import { useState } from 'react';
import { trpc } from '../trpc';
import MessageList from './MessageList';
import InputArea from './InputArea';

interface ChatContainerProps {
  sessionId: string | null;
  toast: any;
}

export default function ChatContainer({ sessionId, toast }: ChatContainerProps) {
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | null>(null);
  const [streamingAssistantMessage, setStreamingAssistantMessage] = useState<string>('');

  // Load session data
  const { data: session, isLoading } = trpc.session.getById.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-gray-300 mb-2">
            Welcome to Sylphx Flow
          </h2>
          <p className="text-gray-500">
            Select a chat or create a new one to get started
          </p>
        </div>
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
        streamingAssistantMessage={streamingAssistantMessage}
      />

      {/* Input */}
      <InputArea
        sessionId={sessionId}
        toast={toast}
        onMessageSent={(message) => {
          setOptimisticUserMessage(message);
          setStreamingAssistantMessage('');
        }}
        onStreamingUpdate={(text) => {
          setStreamingAssistantMessage(text);
        }}
        onStreamingComplete={() => {
          setOptimisticUserMessage(null);
          setStreamingAssistantMessage('');
        }}
      />
    </div>
  );
}
