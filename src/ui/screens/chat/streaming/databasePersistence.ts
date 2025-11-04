/**
 * Database Persistence for Streaming
 * Handles debounced writes and flushing of streaming message content
 */

import { getSessionRepository } from '../../../../db/database.js';
import { useAppStore } from '../../../stores/app-store.js';
import type { MessagePart as StreamPart } from '../../../../types/session.types.js';

export interface PersistenceRefs {
  dbWriteTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  pendingDbContentRef: React.MutableRefObject<StreamPart[] | null>;
  streamingMessageIdRef: React.MutableRefObject<string | null>;
}

/**
 * Schedule a debounced database write
 * Reduces SQLITE_BUSY errors by batching writes
 */
export function createScheduleDatabaseWrite(refs: PersistenceRefs) {
  return (content: StreamPart[]) => {
    // Store pending content
    refs.pendingDbContentRef.current = content;

    // Clear existing timer
    if (refs.dbWriteTimerRef.current) {
      clearTimeout(refs.dbWriteTimerRef.current);
    }

    // Schedule write after 500ms of inactivity
    refs.dbWriteTimerRef.current = setTimeout(async () => {
      if (refs.streamingMessageIdRef.current && refs.pendingDbContentRef.current) {
        try {
          const repo = await getSessionRepository();
          await repo.updateMessageParts(
            refs.streamingMessageIdRef.current,
            refs.pendingDbContentRef.current
          );
          refs.pendingDbContentRef.current = null;
        } catch (error) {
          if (process.env.DEBUG) {
            console.error(`Failed to persist parts: ${error}`);
          }
        }
      }
      refs.dbWriteTimerRef.current = null;
    }, 500);
  };
}

/**
 * Immediately flush pending database write
 * Used on message completion to ensure final state is saved
 */
export function createFlushDatabaseWrite(refs: PersistenceRefs, currentSessionId: string | null) {
  return async () => {
    // Clear timer
    if (refs.dbWriteTimerRef.current) {
      clearTimeout(refs.dbWriteTimerRef.current);
      refs.dbWriteTimerRef.current = null;
    }

    // Get content to persist
    let contentToWrite: StreamPart[] | null = refs.pendingDbContentRef.current;

    // If no pending content, read from app store (handles abort/error cases)
    if (!contentToWrite && refs.streamingMessageIdRef.current) {
      const state = useAppStore.getState();
      const session = state.sessions.find((s) => s.id === currentSessionId);
      if (session) {
        const activeMessage = session.messages.find((m) => m.status === 'active');
        if (activeMessage) {
          contentToWrite = activeMessage.content;
        }
      }
    }

    // ALWAYS write to database if we have a message ID
    // Even if content is empty, we need to save the final state
    if (refs.streamingMessageIdRef.current && contentToWrite) {
      try {
        const repo = await getSessionRepository();
        await repo.updateMessageParts(refs.streamingMessageIdRef.current, contentToWrite);
        refs.pendingDbContentRef.current = null;
      } catch (error) {
        if (process.env.DEBUG) {
          console.error(`Failed to flush parts: ${error}`);
        }
      }
    }
  };
}

/**
 * Create function to update active message content in session
 * NOTE: Using immer-style mutations (immer middleware automatically creates new objects)
 */
export function createUpdateActiveMessageContent(
  currentSessionId: string | null,
  scheduleDatabaseWrite: (content: StreamPart[]) => void
) {
  return (updater: (prev: StreamPart[]) => StreamPart[]) => {
    useAppStore.setState((state) => {
      const session = state.sessions.find((s) => s.id === currentSessionId);
      if (!session) return;

      const activeMessage = session.messages.find((m) => m.status === 'active');
      if (!activeMessage) return;

      // Update content using immer-style mutation
      const newContent = updater(activeMessage.content);
      activeMessage.content = newContent;

      // Schedule debounced database write (batched to reduce SQLITE_BUSY)
      scheduleDatabaseWrite(newContent);
    });
  };
}
