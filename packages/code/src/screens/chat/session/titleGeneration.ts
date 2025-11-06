/**
 * Title Generation Logic
 * Handles automatic title generation for new chat sessions
 */

import type { AIConfig } from '@sylphx/code-core';

/**
 * Generate a streaming title for the first message in a session
 *
 * @param userMessage - The user's first message
 * @param currentSessionId - ID of the current session
 * @param aiConfig - AI configuration with provider details
 * @param updateSessionTitle - Function to update session title in store
 * @param setIsTitleStreaming - State setter for title streaming flag
 * @param setStreamingTitle - State setter function for streaming title text
 */
export async function generateTitleAfterFirstMessage(
  userMessage: string,
  currentSessionId: string,
  aiConfig: AIConfig | null,
  updateSessionTitle: (sessionId: string, title: string) => void,
  setIsTitleStreaming: (streaming: boolean) => void,
  setStreamingTitle: (updater: string | ((prev: string) => string)) => void,
  provider: string,
  modelName: string
) {
  const providerConfig = aiConfig?.providers?.[provider];

  if (!providerConfig) {
    return;
  }

  setIsTitleStreaming(true);
  setStreamingTitle('');

  try {
    const { generateSessionTitleWithStreaming } = await import('@sylphx/code-core');

    const finalTitle = await generateSessionTitleWithStreaming(
      userMessage,
      provider,
      modelName,
      providerConfig,
      (chunk) => {
        setStreamingTitle((prev) => prev + chunk);
      }
    );

    setIsTitleStreaming(false);
    updateSessionTitle(currentSessionId, finalTitle);
  } catch (error) {
    // Only log errors in debug mode
    if (process.env.DEBUG) {
      console.error(`[Title] Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
    setIsTitleStreaming(false);

    // Fallback to simple title
    const { generateSessionTitle } = await import('@sylphx/code-core');
    const title = generateSessionTitle(userMessage);
    updateSessionTitle(currentSessionId, title);
  }
}
