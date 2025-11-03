/**
 * Session Title Utils
 * Pure functions for session title generation and formatting
 */

/**
 * Generate a session title from the first user message
 * Takes the first 50 characters and adds ellipsis if truncated
 * Pure function - no side effects
 */
export function generateSessionTitle(firstMessage: string, maxLength = 50): string {
  if (!firstMessage || firstMessage.trim().length === 0) {
    return 'New Chat';
  }

  // Remove leading/trailing whitespace and normalize newlines
  const cleaned = cleanTitle(firstMessage);

  // Truncate to maxLength
  return truncateTitle(cleaned, maxLength);
}

/**
 * Clean title text
 * Removes leading/trailing whitespace and normalizes newlines to spaces
 */
export function cleanTitle(title: string): string {
  return title.trim().replace(/\n+/g, ' ');
}

/**
 * Truncate title to max length
 * Tries to break at word boundaries when possible
 */
export function truncateTitle(title: string, maxLength = 50): string {
  if (title.length <= maxLength) {
    return title;
  }

  // Find last space before maxLength to avoid cutting words
  const truncated = title.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  // If there's a space in reasonable range (> 60% of maxLength), cut there
  const minReasonableLength = Math.floor(maxLength * 0.6);

  if (lastSpace > minReasonableLength) {
    return truncated.substring(0, lastSpace) + '...';
  }

  // Otherwise just truncate and add ellipsis
  return truncated + '...';
}

/**
 * Remove common title prefixes and quotes
 * Used to clean AI-generated titles
 */
export function removeQuotes(title: string): string {
  // Remove matching leading/trailing quotes (English, Chinese, Japanese)
  // Only remove if quotes appear at BOTH start and end
  let result = title;

  // Try to remove matching pairs of quotes
  const quotesPairs = [
    ['"', '"'],
    ["'", "'"],
    ['「', '」'],
    ['『', '』'],
  ];

  for (const [open, close] of quotesPairs) {
    // Keep removing matching pairs as long as they exist
    while (result.startsWith(open) && result.endsWith(close) && result.length > 1) {
      result = result.slice(open.length, -close.length);
    }
  }

  return result;
}

/**
 * Remove common "Title:" prefixes
 */
export function removeTitlePrefix(title: string): string {
  return title.replace(/^(Title:|标题：)\s*/i, '');
}

/**
 * Clean AI-generated title
 * Removes quotes, prefixes, extra whitespace
 */
export function cleanAITitle(title: string, maxLength = 50): string {
  let cleaned = title.trim();

  // Remove quotes and prefixes iteratively until no more changes
  let previous = '';
  while (previous !== cleaned) {
    previous = cleaned;
    cleaned = removeTitlePrefix(cleaned);
    cleaned = removeQuotes(cleaned);
  }

  // Replace newlines with spaces
  cleaned = cleaned.replace(/\n+/g, ' ');

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Truncate if needed
  return truncateTitle(cleaned, maxLength);
}

/**
 * Format session title for display with timestamp
 * Returns "Title (HH:MM)" for today, "Title (Mon DD)" for other dates
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

/**
 * Format relative time for session display
 * Returns "just now", "5m ago", "2h ago", "3 days ago", etc.
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 30) {
    return 'just now';
  } else if (seconds < 60) {
    return `${seconds}s ago`;
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else {
    // For older sessions, show date
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }
}

/**
 * Check if title needs truncation
 */
export function needsTruncation(title: string, maxLength = 50): boolean {
  return title.length > maxLength;
}

/**
 * Validate title
 * Returns true if title is valid (not empty, not too long)
 */
export function isValidTitle(title: string, maxLength = 100): boolean {
  const trimmed = title.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength;
}

/**
 * Get title length
 * Returns length after trimming
 */
export function getTitleLength(title: string): number {
  return title.trim().length;
}

/**
 * Compare titles for sorting
 * Case-insensitive alphabetical comparison
 */
export function compareTitles(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase());
}

/**
 * Extract title from message content
 * Takes first line or first N characters
 */
export function extractTitleFromMessage(message: string, maxLength = 50): string {
  // Take first line
  const firstLine = message.split('\n')[0];

  // Clean and truncate
  return generateSessionTitle(firstLine, maxLength);
}
