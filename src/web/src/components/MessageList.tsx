/**
 * MessageList - Display chat messages
 * Clean, spacious design without borders
 */

import { useEffect, useRef } from 'react';
import Message from './Message';

interface MessageListProps {
  messages: any[];
}

export default function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message, index) => (
          <Message key={index} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
