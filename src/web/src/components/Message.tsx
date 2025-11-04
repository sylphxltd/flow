/**
 * Message - Individual message component
 * Minimalist design with role-based styling
 */

import type { MessagePart } from '../../../types/session.types';
import MarkdownContent from './MarkdownContent';

interface MessageProps {
  message: {
    role: 'user' | 'assistant';
    content: MessagePart[];
    timestamp: number;
    status?: string;
  };
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'active';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] px-6 py-4 rounded-2xl
          ${isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-800/50 text-gray-100'
          }
          ${isStreaming ? 'animate-pulse' : ''}
        `}
      >
        {/* Role badge */}
        <div className="text-xs font-medium mb-2 opacity-70">
          {isUser ? 'You' : 'Assistant'}
        </div>

        {/* Render all parts in order */}
        {message.content.length === 0 && (
          <div className="whitespace-pre-wrap leading-relaxed opacity-50">
            {isStreaming ? 'Thinking...' : 'No content'}
          </div>
        )}

        {message.content.map((part, index) => (
          <div key={index} className="mb-2 last:mb-0">
            {part.type === 'reasoning' && (
              <div className="mb-3 p-3 bg-black/20 rounded-lg">
                <div className="text-xs font-medium mb-1 opacity-70">🤔 Thinking...</div>
                <div className="text-sm opacity-80 whitespace-pre-wrap italic">
                  {part.content}
                </div>
              </div>
            )}
            {part.type === 'text' && (
              <div className="leading-relaxed">
                <MarkdownContent content={part.content} />
              </div>
            )}
            {part.type === 'tool' && (
              <div className="p-3 bg-black/20 rounded-lg text-sm mb-2">
                <div className="font-medium mb-1 opacity-70">🔧 Tool: {part.name}</div>
                {part.status === 'active' && (
                  <div className="opacity-60">Running...</div>
                )}
                {part.status === 'completed' && part.result && (
                  <div className="opacity-80 text-xs mt-1">
                    {typeof part.result === 'string'
                      ? part.result
                      : JSON.stringify(part.result, null, 2)}
                  </div>
                )}
                {part.status === 'error' && part.error && (
                  <div className="text-red-300 text-xs mt-1">{part.error}</div>
                )}
              </div>
            )}
            {part.type === 'error' && (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-300">
                ❌ Error: {part.error}
              </div>
            )}
          </div>
        ))}

        {/* Timestamp */}
        <div className="text-xs opacity-50 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
