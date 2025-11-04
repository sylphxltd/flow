/**
 * Database Persistence for Streaming
 * Batch-sync model: Update Zustand immediately, sync to DB via tRPC after completion
 *
 * Architecture:
 * - UI updates Zustand store (instant response)
 * - Content batched in memory during streaming
 * - On completion: single tRPC call to persist final state
 * - No direct database access from UI layer
 */

import { useAppStore } from '../../../stores/app-store.js';
import { getTRPCClient } from '../../../../server/trpc/client.js';
import type { MessagePart as StreamPart } from '../../../../types/session.types.js';

export interface PersistenceRefs {
  streamingMessageIdRef: React.MutableRefObject<string | null>;
  pendingContentRef: React.MutableRefObject<StreamPart[] | null>;
}

/**
 * Create function to update active message content in Zustand
 * NO database writes here - just optimistic UI updates
 */
export function createUpdateActiveMessageContent(currentSessionId: string | null) {
  return (updater: (prev: StreamPart[]) => StreamPart[]) => {
    useAppStore.setState((state) => {
      const session = state.currentSession;
      if (!session || session.id !== currentSessionId) return;

      const activeMessage = session.messages.find((m) => m.status === 'active');
      if (!activeMessage) return;

      // Update content using immer-style mutation (instant UI update)
      const newContent = updater(activeMessage.content);
      activeMessage.content = newContent;
    });
  };
}

/**
 * Sync message content to database via tRPC
 * Called once after streaming completes (batch sync)
 */
export async function syncMessageContentToDatabase(
  messageId: string,
  content: StreamPart[]
): Promise<void> {
  try {
    const client = await getTRPCClient();
    await client.message.updateParts({ messageId, parts: content });
  } catch (error) {
    if (process.env.DEBUG) {
      console.error(`Failed to sync message content: ${error}`);
    }
    // Don't throw - database sync is async, UI already updated
  }
}

/**
 * Get current message content from store
 * Used when we need to sync final state
 */
export function getCurrentMessageContent(
  currentSessionId: string | null
): StreamPart[] | null {
  const state = useAppStore.getState();
  const session = state.currentSession;

  if (!session || session.id !== currentSessionId) {
    return null;
  }

  const activeMessage = session.messages.find((m) => m.status === 'active');
  return activeMessage?.content || null;
}

/**
 * DEPRECATED: Backward compatibility layer
 * These will be removed when streaming is fully migrated to subscriptions
 */

export interface DeprecatedPersistenceRefs {
  dbWriteTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  pendingDbContentRef: React.MutableRefObject<StreamPart[] | null>;
  streamingMessageIdRef: React.MutableRefObject<string | null>;
}

/**
 * @deprecated Use tRPC subscription instead
 */
export function createScheduleDatabaseWrite(_refs: DeprecatedPersistenceRefs) {
  // No-op during migration - actual sync happens after streaming completes
  return (_content: StreamPart[]) => {
    // Intentionally empty
  };
}

/**
 * @deprecated Use syncMessageContentToDatabase instead
 */
export function createFlushDatabaseWrite(
  refs: DeprecatedPersistenceRefs,
  currentSessionId: string | null
) {
  return async () => {
    // Get content and sync if available
    if (refs.streamingMessageIdRef.current) {
      const content = getCurrentMessageContent(currentSessionId);
      if (content) {
        await syncMessageContentToDatabase(refs.streamingMessageIdRef.current, content);
      }
    }
  };
}
