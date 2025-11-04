/**
 * MessageList - Display chat messages
 * Clean, spacious design without borders
 * Supports optimistic updates and streaming
 */

import { useEffect, useRef } from 'react';
import Message from './Message';
import MarkdownContent from './MarkdownContent';
import type { MessagePart } from '@sylphx/code-client';

interface MessageListProps {
  messages: any[];
  optimisticUserMessage?: string | null;
  isAssistantTyping?: boolean;
  streamingParts?: MessagePart[];
}

export default function MessageList({
  messages,
  optimisticUserMessage,
  isAssistantTyping,
  streamingParts = [],
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticUserMessage, isAssistantTyping, streamingParts]);

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

              {/* Render all streaming parts in order */}
              {streamingParts.map((part, index) => (
                <div key={index} className="mb-2 last:mb-0">
                  {part.type === 'reasoning' && (
                    <div className="pb-2 border-b border-gray-700 mb-2">
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                        🤔 Thinking...
                      </div>
                      <div className="whitespace-pre-wrap text-gray-400 text-sm italic">
                        {part.content}
                      </div>
                    </div>
                  )}
                  {part.type === 'text' && (
                    <div>
                      <MarkdownContent content={part.content} />
                    </div>
                  )}
                  {part.type === 'tool' && (
                    <div className="p-2 bg-gray-700/50 rounded text-sm">
                      <div className="text-gray-400 mb-1">🔧 Tool: {part.name}</div>
                      {part.status === 'active' && (
                        <div className="text-gray-500">Running...</div>
                      )}
                      {part.status === 'completed' && part.result && (
                        <div className="text-gray-300 text-xs mt-1">
                          {typeof part.result === 'string'
                            ? part.result
                            : JSON.stringify(part.result, null, 2)}
                        </div>
                      )}
                      {part.status === 'error' && part.error && (
                        <div className="text-red-400 text-xs mt-1">{part.error}</div>
                      )}
                    </div>
                  )}
                  {part.type === 'error' && (
                    <div className="p-2 bg-red-900/30 border border-red-700/50 rounded text-sm text-red-300">
                      ❌ Error: {part.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
