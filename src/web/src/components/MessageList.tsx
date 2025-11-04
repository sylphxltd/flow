/**
 * MessageList - Display chat messages
 * Clean, spacious design without borders
 * Supports optimistic updates and streaming
 */

import { useEffect, useRef } from 'react';
import Message from './Message';

interface MessageListProps {
  messages: any[];
  optimisticUserMessage?: string | null;
  isAssistantTyping?: boolean;
  streamingAssistantMessage?: string;
}

export default function MessageList({
  messages,
  optimisticUserMessage,
  isAssistantTyping,
  streamingAssistantMessage,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticUserMessage, isAssistantTyping, streamingAssistantMessage]);

  const hasContent =
    messages.length > 0 || optimisticUserMessage || isAssistantTyping;

  if (!hasContent) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Existing messages */}
        {messages.map((message, index) => (
          <Message key={message.id || index} message={message} />
        ))}

        {/* Optimistic user message (shown immediately when sent) */}
        {optimisticUserMessage && (
          <div className="flex justify-end">
            <div className="max-w-[80%] px-4 py-3 bg-blue-600 text-white rounded-xl">
              <div className="whitespace-pre-wrap">{optimisticUserMessage}</div>
              <div className="text-xs text-blue-200 mt-1 opacity-70">Sending...</div>
            </div>
          </div>
        )}

        {/* Streaming assistant message (shown in real-time) */}
        {isAssistantTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-3 bg-gray-800 text-gray-200 rounded-xl">
              <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Assistant is typing...
              </div>
              {streamingAssistantMessage && (
                <div className="whitespace-pre-wrap">{streamingAssistantMessage}</div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
