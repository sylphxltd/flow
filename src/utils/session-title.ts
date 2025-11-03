/**
 * Session Title Generation Utility
 * Generate concise titles from user messages
 */

import { createAIStream } from '../core/ai-sdk.js';
import type { ProviderId } from '../types/config.types.js';

/**
 * Generate a session title from the first user message
 * Takes the first 50 characters and adds ellipsis if truncated
 */
export function generateSessionTitle(firstMessage: string): string {
  if (!firstMessage || firstMessage.trim().length === 0) {
    return 'New Chat';
  }

  // Remove leading/trailing whitespace and newlines
  const cleaned = firstMessage.trim().replace(/\n+/g, ' ');

  // Truncate to 50 characters
  const maxLength = 50;
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Find last space before maxLength to avoid cutting words
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 30) {
    // If there's a space in reasonable range, cut there
    return truncated.substring(0, lastSpace) + '...';
  }

  // Otherwise just truncate and add ellipsis
  return truncated + '...';
}

/**
 * Generate a session title using LLM with streaming
 */
export async function generateSessionTitleWithStreaming(
  firstMessage: string,
  provider: ProviderId,
  modelName: string,
  providerConfig: any,
  onChunk: (chunk: string) => void
): Promise<string> {
  if (!firstMessage || firstMessage.trim().length === 0) {
    return 'New Chat';
  }

  try {
    const stream = createAIStream(
      provider,
      modelName,
      providerConfig,
      [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates concise, descriptive titles for chat conversations. Create titles that capture the main topic or intent, not just repeat the message. Keep titles under 50 characters. Respond with ONLY the title, no quotes or extra text.'
        },
        {
          role: 'user',
          content: `Create a descriptive title for a conversation that starts with: "${firstMessage}"\n\nTitle:`,
        },
      ],
      [], // no tools for title generation
    );

    let fullTitle = '';

    for await (const chunk of stream.textStream) {
      fullTitle += chunk;
      onChunk(chunk);
    }

    // Clean up title - remove quotes, newlines, and common prefixes
    let cleaned = fullTitle.trim();
    cleaned = cleaned.replace(/^["'「『]+|["'」』]+$/g, ''); // Remove quotes
    cleaned = cleaned.replace(/^(Title:|标题：)\s*/i, ''); // Remove "Title:" prefix
    cleaned = cleaned.replace(/\n+/g, ' '); // Replace newlines with spaces
    cleaned = cleaned.trim();

    return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned;
  } catch (error) {
    // Fallback to simple title generation
    return generateSessionTitle(firstMessage);
  }
}

/**
 * Format session title for display with timestamp
 */
export function formatSessionDisplay(title: string | undefined, created: number): string {
  const displayTitle = title || 'New Chat';
  const date = new Date(created);
  const now = new Date();

  // Show time if today, otherwise show date
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${displayTitle} (${timeStr})`;
  }

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${displayTitle} (${dateStr})`;
}
