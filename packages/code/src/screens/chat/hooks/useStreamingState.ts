/**
 * Streaming State Hook
 * Manages streaming flags, refs, and title generation state
 */

import { useRef, useState } from 'react';
import type { MessagePart as StreamPart, TokenUsage } from '../../../../types/session.types.js';

export interface StreamingState {
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  isTitleStreaming: boolean;
  setIsTitleStreaming: (streaming: boolean) => void;
  streamingTitle: string;
  setStreamingTitle: (title: string | ((prev: string) => string)) => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  lastErrorRef: React.MutableRefObject<string | null>;
  wasAbortedRef: React.MutableRefObject<boolean>;
  streamingMessageIdRef: React.MutableRefObject<string | null>;
  usageRef: React.MutableRefObject<TokenUsage | null>;
  finishReasonRef: React.MutableRefObject<string | null>;
  dbWriteTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  pendingDbContentRef: React.MutableRefObject<StreamPart[] | null>;
}

export function useStreamingState(): StreamingState {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTitleStreaming, setIsTitleStreaming] = useState(false);
  const [streamingTitle, setStreamingTitle] = useState('');

  // Refs for streaming management
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const wasAbortedRef = useRef(false);
  const streamingMessageIdRef = useRef<string | null>(null);
  const usageRef = useRef<TokenUsage | null>(null);
  const finishReasonRef = useRef<string | null>(null);

  // Database persistence refs
  const dbWriteTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDbContentRef = useRef<StreamPart[] | null>(null);

  return {
    isStreaming,
    setIsStreaming,
    isTitleStreaming,
    setIsTitleStreaming,
    streamingTitle,
    setStreamingTitle,
    abortControllerRef,
    lastErrorRef,
    wasAbortedRef,
    streamingMessageIdRef,
    usageRef,
    finishReasonRef,
    dbWriteTimerRef,
    pendingDbContentRef,
  };
}
