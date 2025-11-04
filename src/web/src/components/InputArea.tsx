/**
 * InputArea - Message input with SSE streaming
 * Clean, modern design without borders
 */

import { useState, useRef, useEffect } from 'react';
import { trpc } from '../trpc';

interface InputAreaProps {
  sessionId: string;
}

export default function InputArea({ sessionId }: InputAreaProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  // Subscribe to streaming
  trpc.message.streamResponse.useSubscription(
    {
      sessionId,
      userMessage: input,
    },
    {
      enabled: isStreaming,
      onData: (event: any) => {
        switch (event.type) {
          case 'assistant-message-created':
            console.log('Message created:', event.messageId);
            break;

          case 'text-delta':
            setStreamingText((prev) => prev + event.text);
            break;

          case 'text-end':
            // Refetch session to get updated messages
            utils.session.getById.invalidate({ sessionId });
            break;

          case 'complete':
            console.log('Streaming complete!', event.usage);
            setIsStreaming(false);
            setStreamingText('');
            // Refetch session
            utils.session.getById.invalidate({ sessionId });
            break;

          case 'error':
            console.error('Streaming error:', event.error);
            setIsStreaming(false);
            setStreamingText('');
            break;
        }
      },
      onError: (err) => {
        console.error('Subscription error:', err);
        setIsStreaming(false);
        setStreamingText('');
      },
    }
  );

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isStreaming) return;

    // Store message to send
    const messageToSend = trimmedInput;

    // Clear input immediately
    setInput('');

    // Start streaming
    setIsStreaming(true);
    setStreamingText('');

    // Trigger subscription by setting input
    // Note: This is a workaround - the subscription params should be updated
    // In a real implementation, you'd trigger this differently
    setTimeout(() => {
      setInput(messageToSend);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="px-8 py-6 bg-gray-900/30 backdrop-blur-sm">
      {/* Streaming preview */}
      {streamingText && (
        <div className="mb-4 p-4 bg-gray-800/50 rounded-xl max-w-4xl mx-auto">
          <div className="text-xs text-gray-500 mb-2">Assistant is typing...</div>
          <div className="text-gray-200 whitespace-pre-wrap">
            {streamingText}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 px-4 py-3 bg-gray-800/50 text-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-600"
            style={{ maxHeight: '200px' }}
          />

          <button
            onClick={handleSubmit}
            disabled={isStreaming || !input.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            {isStreaming ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              'Send'
            )}
          </button>
        </div>

        <div className="text-xs text-gray-600 mt-2 text-center">
          Powered by SSE streaming
        </div>
      </div>
    </div>
  );
}
