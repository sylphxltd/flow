/**
 * Message - Individual message component
 * Minimalist design with role-based styling
 */

interface MessageProps {
  message: {
    role: 'user' | 'assistant';
    content: any[];
    timestamp: number;
    status?: string;
  };
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'active';

  // Extract text content from message parts
  const textContent = message.content
    .filter((part: any) => part.type === 'text')
    .map((part: any) => part.content)
    .join('\n');

  // Extract reasoning content
  const reasoningContent = message.content
    .filter((part: any) => part.type === 'reasoning')
    .map((part: any) => part.content)
    .join('\n');

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

        {/* Reasoning (if any) */}
        {reasoningContent && (
          <div className="mb-3 p-3 bg-black/20 rounded-lg">
            <div className="text-xs font-medium mb-1 opacity-70">Thinking...</div>
            <div className="text-sm opacity-80 whitespace-pre-wrap">
              {reasoningContent}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="whitespace-pre-wrap leading-relaxed">
          {textContent || (isStreaming ? 'Thinking...' : 'No content')}
        </div>

        {/* Timestamp */}
        <div className="text-xs opacity-50 mt-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
