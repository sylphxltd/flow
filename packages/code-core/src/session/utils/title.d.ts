/**
 * Session Title Utils
 * Pure functions for session title generation and formatting
 */
/**
 * Generate a session title from the first user message
 * Takes the first 50 characters and adds ellipsis if truncated
 * Pure function - no side effects
 */
export declare function generateSessionTitle(firstMessage: string, maxLength?: number): string;
/**
 * Clean title text
 * Removes leading/trailing whitespace and normalizes newlines to spaces
 */
export declare function cleanTitle(title: string): string;
/**
 * Truncate title to max length
 * Tries to break at word boundaries when possible
 */
export declare function truncateTitle(title: string, maxLength?: number): string;
/**
 * Remove common title prefixes and quotes
 * Used to clean AI-generated titles
 */
export declare function removeQuotes(title: string): string;
/**
 * Remove common "Title:" prefixes
 */
export declare function removeTitlePrefix(title: string): string;
/**
 * Clean AI-generated title
 * Removes quotes, prefixes, extra whitespace
 */
export declare function cleanAITitle(title: string, maxLength?: number): string;
/**
 * Format session title for display with timestamp
 * Returns "Title (HH:MM)" for today, "Title (Mon DD)" for other dates
 */
export declare function formatSessionDisplay(title: string | undefined, created: number): string;
/**
 * Format relative time for session display
 * Returns "just now", "5m ago", "2h ago", "3 days ago", etc.
 */
export declare function formatRelativeTime(timestamp: number): string;
/**
 * Check if title needs truncation
 */
export declare function needsTruncation(title: string, maxLength?: number): boolean;
/**
 * Validate title
 * Returns true if title is valid (not empty, not too long)
 */
export declare function isValidTitle(title: string, maxLength?: number): boolean;
/**
 * Get title length
 * Returns length after trimming
 */
export declare function getTitleLength(title: string): number;
/**
 * Compare titles for sorting
 * Case-insensitive alphabetical comparison
 */
export declare function compareTitles(a: string, b: string): number;
/**
 * Extract title from message content
 * Takes first line or first N characters
 */
export declare function extractTitleFromMessage(message: string, maxLength?: number): string;
//# sourceMappingURL=title.d.ts.map