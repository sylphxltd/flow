/**
 * InputArea - Message input with SSE streaming
 * Clean, modern design without borders
 * Supports @file attachments
 */

import { useState, useRef, useEffect } from 'react';
import { trpc } from '../trpc';
import type { MessagePart } from '@sylphx/code-core';

interface InputAreaProps {
  sessionId: string | null;  // null = new session will be created
  toast: any;
  onMessageSent?: (message: string) => void;
  onStreamingStart?: () => void;
  onStreamingPartsUpdate?: (parts: MessagePart[]) => void;
  onStreamingComplete?: () => void;
  onSessionCreated?: (sessionId: string, provider: string, model: string) => void;
  onTitleStreamingStart?: () => void;
  onTitleStreamingDelta?: (text: string) => void;
  onTitleStreamingComplete?: (title: string) => void;
}

interface FileAttachment {
  path: string;
  relativePath: string;
  size?: number;
}

interface StreamRequest {
  sessionId: string | null;
  provider?: string;
  model?: string;
  userMessage: string;
  attachments?: FileAttachment[];
  key: number; // Used to trigger new subscription
}

export default function InputArea({
  sessionId,
  toast,
  onMessageSent,
  onStreamingStart,
  onStreamingPartsUpdate,
  onStreamingComplete,
  onSessionCreated,
  onTitleStreamingStart,
  onTitleStreamingDelta,
  onTitleStreamingComplete,
}: InputAreaProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [streamRequest, setStreamRequest] = useState<StreamRequest | null>(null);
  const [streamingParts, setStreamingParts] = useState<MessagePart[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Load config to get provider/model for new sessions
  const { data: configData } = trpc.config.load.useQuery({});

  // Subscribe to streaming - only active when streamRequest is set
  trpc.message.streamResponse.useSubscription(
    streamRequest
      ? {
          sessionId: streamRequest.sessionId,
          provider: streamRequest.provider,
          model: streamRequest.model,
          userMessage: streamRequest.userMessage,
          attachments: streamRequest.attachments,
        }
      : undefined as any,
    {
      enabled: streamRequest !== null,
      onStarted: () => {
        console.log('[Subscription] Started streaming');
      },
      onData: (event: any) => {
        console.log('[Subscription] Event:', event.type, event);

        switch (event.type) {
          case 'session-created':
            console.log('Session created:', event.sessionId);
            onSessionCreated?.(event.sessionId, event.provider, event.model);
            break;

          case 'assistant-message-created':
            console.log('Message created:', event.messageId);
            onStreamingStart?.();
            break;

          case 'reasoning-start':
            onStreamingStart?.();
            setStreamingParts((prev) => {
              const newParts: MessagePart[] = [...prev, { type: 'reasoning', content: '', status: 'active' }];
              onStreamingPartsUpdate?.(newParts);
              return newParts;
            });
            break;

          case 'reasoning-delta':
            setStreamingParts((prev) => {
              const newParts = [...prev];
              const lastReasoningIndex = newParts.map((p, i) => p.type === 'reasoning' && p.status === 'active' ? i : -1).filter(i => i !== -1).pop();
              if (lastReasoningIndex !== undefined && newParts[lastReasoningIndex].type === 'reasoning') {
                newParts[lastReasoningIndex] = {
                  ...newParts[lastReasoningIndex],
                  content: newParts[lastReasoningIndex].content + event.text,
                };
              }
              onStreamingPartsUpdate?.(newParts);
              return newParts;
            });
            break;

          case 'reasoning-end':
            setStreamingParts((prev) => {
              const newParts = [...prev];
              const lastReasoningIndex = newParts.map((p, i) => p.type === 'reasoning' && p.status === 'active' ? i : -1).filter(i => i !== -1).pop();
              if (lastReasoningIndex !== undefined && newParts[lastReasoningIndex].type === 'reasoning') {
                newParts[lastReasoningIndex] = {
                  ...newParts[lastReasoningIndex],
                  status: 'completed',
                };
              }
              onStreamingPartsUpdate?.(newParts);
              return newParts;
            });
            break;

          case 'text-start':
            setStreamingParts((prev) => {
              const newParts: MessagePart[] = [...prev, { type: 'text', content: '', status: 'active' }];
              onStreamingPartsUpdate?.(newParts);
              return newParts;
            });
            break;

          case 'text-delta':
            setStreamingParts((prev) => {
              const newParts = [...prev];
              const lastTextIndex = newParts.map((p, i) => p.type === 'text' && p.status === 'active' ? i : -1).filter(i => i !== -1).pop();
              if (lastTextIndex !== undefined && newParts[lastTextIndex].type === 'text') {
                newParts[lastTextIndex] = {
                  ...newParts[lastTextIndex],
                  content: newParts[lastTextIndex].content + event.text,
                };
              }
              onStreamingPartsUpdate?.(newParts);
              return newParts;
            });
            break;

          case 'text-end':
            setStreamingParts((prev) => {
              const newParts = [...prev];
              const lastTextIndex = newParts.map((p, i) => p.type === 'text' && p.status === 'active' ? i : -1).filter(i => i !== -1).pop();
              if (lastTextIndex !== undefined && newParts[lastTextIndex].type === 'text') {
                newParts[lastTextIndex] = {
                  ...newParts[lastTextIndex],
                  status: 'completed',
                };
              }
              onStreamingPartsUpdate?.(newParts);
              return newParts;
            });
            // Refetch session to get updated messages
            utils.session.getById.invalidate({ sessionId });
            break;

          case 'session-title-start':
            onTitleStreamingStart?.();
            break;

          case 'session-title-delta':
            onTitleStreamingDelta?.(event.text);
            break;

          case 'session-title-complete':
            onTitleStreamingComplete?.(event.title);
            // Refetch sessions list to show new title
            utils.session.getRecent.invalidate();
            break;

          case 'complete':
            console.log('Streaming complete!', event.usage);
            setStreamRequest(null);
            setStreamingParts([]);
            onStreamingComplete?.();
            // Refetch session
            utils.session.getById.invalidate({ sessionId });
            break;

          case 'error':
            console.error('Streaming error:', event.error);
            toast.error(event.error);
            setStreamRequest(null);
            setStreamingParts([]);
            onStreamingComplete?.();
            break;
        }
      },
      onError: (err) => {
        console.error('Subscription error:', err);
        toast.error(`Subscription error: ${err.message || String(err)}`);
        setStreamRequest(null);
        setStreamingParts([]);
        onStreamingComplete?.();
      },
    }
  );

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || streamRequest !== null) return;

    console.log('[Submit] Starting submission...', {
      sessionId,
      messageLength: trimmedInput.length,
      attachmentCount: attachments.length,
    });

    // Clear input and attachments immediately
    setInput('');
    const messageAttachments = attachments;
    setAttachments([]);
    setStreamingParts([]);

    // Notify parent of message sent (for optimistic UI)
    onMessageSent?.(trimmedInput);

    // Get provider and model if creating new session
    let provider: string | undefined;
    let model: string | undefined;

    if (!sessionId && configData?.config) {
      const config = configData.config;
      provider = config.defaultProvider || 'anthropic';
      const providerConfig = config.providers?.[provider];

      model =
        providerConfig?.['default-model'] ||
        (provider === 'anthropic'
          ? 'claude-3-5-sonnet-20241022'
          : provider === 'openai'
          ? 'gpt-4o'
          : provider === 'google'
          ? 'gemini-2.0-flash-exp'
          : 'claude-3-5-sonnet-20241022');
    }

    // Start streaming by setting stream request
    const request: StreamRequest = {
      sessionId,
      provider,
      model,
      userMessage: trimmedInput,
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
      key: Date.now(), // Unique key to force new subscription
    };

    console.log('[Submit] Setting stream request:', request);
    setStreamRequest(request);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: FileAttachment[] = Array.from(files).map((file) => ({
      path: file.path || file.name, // file.path is available in Electron/desktop contexts
      relativePath: file.name,
      size: file.size,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);

    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const isStreaming = streamRequest !== null;

  return (
    <div className="px-8 py-6 bg-gray-900/30 backdrop-blur-sm">
      {/* Input area */}
      <div className="max-w-4xl mx-auto">
        {/* File attachments */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 text-blue-300 rounded-lg text-sm"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                <span className="truncate max-w-xs">{file.relativePath}</span>
                {file.size && (
                  <span className="text-blue-400/60 text-xs">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                )}
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-1 hover:text-red-400 transition-colors"
                  disabled={isStreaming}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 items-end">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Attach file button */}
          <button
            onClick={handleFileSelect}
            disabled={isStreaming}
            className="p-3 bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach files (@file)"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

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
          {attachments.length > 0
            ? `${attachments.length} file${attachments.length > 1 ? 's' : ''} attached • `
            : ''}
          Powered by SSE streaming
        </div>
      </div>
    </div>
  );
}
