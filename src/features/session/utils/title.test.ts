/**
 * Tests for session title utils
 */

import { describe, it, expect } from 'vitest';
import {
  generateSessionTitle,
  cleanTitle,
  truncateTitle,
  removeQuotes,
  removeTitlePrefix,
  cleanAITitle,
  formatSessionDisplay,
  formatRelativeTime,
  needsTruncation,
  isValidTitle,
  getTitleLength,
  compareTitles,
  extractTitleFromMessage,
} from './title.js';

describe('generateSessionTitle', () => {
  it('should return "New Chat" for empty input', () => {
    expect(generateSessionTitle('')).toBe('New Chat');
    expect(generateSessionTitle('   ')).toBe('New Chat');
  });

  it('should return full title if under max length', () => {
    expect(generateSessionTitle('Hello world')).toBe('Hello world');
    expect(generateSessionTitle('Short title')).toBe('Short title');
  });

  it('should truncate long titles', () => {
    const longTitle = 'This is a very long title that should be truncated to fit the maximum length';
    const result = generateSessionTitle(longTitle, 50);

    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(53); // 50 + '...'
  });

  it('should break at word boundaries when possible', () => {
    const title = 'This is a test message that should be truncated nicely';
    const result = generateSessionTitle(title, 30);

    // Should break at word boundary, not in middle of "truncated"
    expect(result).not.toContain('trun...');
    expect(result).toContain('...');
  });

  it('should normalize newlines to spaces', () => {
    const title = 'First line\nSecond line\nThird line';
    const result = generateSessionTitle(title);

    expect(result).not.toContain('\n');
    expect(result).toContain(' ');
  });
});

describe('cleanTitle', () => {
  it('should remove leading/trailing whitespace', () => {
    expect(cleanTitle('  Hello  ')).toBe('Hello');
    expect(cleanTitle('\n\nTitle\n\n')).toBe('Title');
  });

  it('should normalize newlines to spaces', () => {
    expect(cleanTitle('Line 1\nLine 2')).toBe('Line 1 Line 2');
    expect(cleanTitle('A\n\n\nB')).toBe('A B');
  });
});

describe('truncateTitle', () => {
  it('should return title as-is if under max length', () => {
    expect(truncateTitle('Short', 50)).toBe('Short');
    expect(truncateTitle('Exactly 10', 10)).toBe('Exactly 10');
  });

  it('should truncate and add ellipsis', () => {
    const result = truncateTitle('This is a long title', 10);

    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(13); // 10 + '...'
  });

  it('should break at word boundaries when reasonable', () => {
    const result = truncateTitle('Hello world from tests', 15);

    // Should break at space, not in middle of word
    expect(result).toBe('Hello world...');
  });

  it('should truncate mid-word if no reasonable break point', () => {
    const result = truncateTitle('Supercalifragilisticexpialidocious', 10);

    expect(result).toBe('Supercalif...');
  });
});

describe('removeQuotes', () => {
  it('should remove English quotes', () => {
    expect(removeQuotes('"Title"')).toBe('Title');
    expect(removeQuotes("'Title'")).toBe('Title');
  });

  it('should remove Chinese quotes', () => {
    expect(removeQuotes('「タイトル」')).toBe('タイトル');
    expect(removeQuotes('『标题』')).toBe('标题');
  });

  it('should remove multiple quote types', () => {
    expect(removeQuotes('"""Title"""')).toBe('Title');
  });

  it('should not remove quotes in middle', () => {
    expect(removeQuotes('It\'s "great"')).toBe('It\'s "great"');
  });
});

describe('removeTitlePrefix', () => {
  it('should remove "Title:" prefix', () => {
    expect(removeTitlePrefix('Title: My Session')).toBe('My Session');
    expect(removeTitlePrefix('title: lowercase')).toBe('lowercase');
  });

  it('should remove Chinese "标题：" prefix', () => {
    expect(removeTitlePrefix('标题：我的会话')).toBe('我的会话');
  });

  it('should not remove partial matches', () => {
    expect(removeTitlePrefix('MyTitle: Session')).toBe('MyTitle: Session');
  });
});

describe('cleanAITitle', () => {
  it('should remove quotes and prefixes', () => {
    expect(cleanAITitle('Title: "My Session"')).toBe('My Session');
    expect(cleanAITitle('"Title: Session"')).toBe('Session');
  });

  it('should normalize whitespace', () => {
    expect(cleanAITitle('Title:   Multiple   Spaces')).toBe('Multiple Spaces');
    expect(cleanAITitle('Title:\n\nNewlines')).toBe('Newlines');
  });

  it('should truncate if needed', () => {
    const long = 'Title: This is a very long AI-generated title that needs truncation';
    const result = cleanAITitle(long, 30);

    expect(result.length).toBeLessThanOrEqual(33); // 30 + '...'
    expect(result).toContain('...');
  });
});

describe('formatSessionDisplay', () => {
  it('should format today\'s session with time', () => {
    const now = Date.now();
    const result = formatSessionDisplay('My Chat', now);

    expect(result).toContain('My Chat');
    expect(result).toMatch(/\d{1,2}:\d{2}/); // Time format
  });

  it('should format old session with date', () => {
    const oldDate = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
    const result = formatSessionDisplay('Old Chat', oldDate);

    expect(result).toContain('Old Chat');
    expect(result).toMatch(/\w{3} \d{1,2}/); // Month + day
  });

  it('should use "New Chat" for undefined title', () => {
    const result = formatSessionDisplay(undefined, Date.now());

    expect(result).toContain('New Chat');
  });
});

describe('formatRelativeTime', () => {
  it('should return "just now" for recent times', () => {
    const now = Date.now();
    expect(formatRelativeTime(now)).toBe('just now');
    expect(formatRelativeTime(now - 10 * 1000)).toBe('just now'); // 10 seconds ago
  });

  it('should return seconds for < 1 minute', () => {
    const time = Date.now() - 45 * 1000; // 45 seconds ago
    expect(formatRelativeTime(time)).toBe('45s ago');
  });

  it('should return minutes for < 1 hour', () => {
    const time = Date.now() - 30 * 60 * 1000; // 30 minutes ago
    expect(formatRelativeTime(time)).toBe('30m ago');
  });

  it('should return hours for < 1 day', () => {
    const time = Date.now() - 5 * 60 * 60 * 1000; // 5 hours ago
    expect(formatRelativeTime(time)).toBe('5h ago');
  });

  it('should return days for < 1 week', () => {
    const time = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
    expect(formatRelativeTime(time)).toBe('3 days ago');
  });

  it('should return date for older times', () => {
    const time = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
    const result = formatRelativeTime(time);

    expect(result).toMatch(/\w{3} \d{1,2}/); // e.g., "Jan 1"
  });
});

describe('needsTruncation', () => {
  it('should return false for short titles', () => {
    expect(needsTruncation('Short')).toBe(false);
    expect(needsTruncation('12345678901234567890123456789012345678901234567890', 50)).toBe(false); // exactly 50 chars
  });

  it('should return true for long titles', () => {
    expect(needsTruncation('This is a very long title that exceeds the maximum length')).toBe(true);
    expect(needsTruncation('123456789012345678901234567890123456789012345678901', 50)).toBe(true); // 51 chars
  });
});

describe('isValidTitle', () => {
  it('should return true for valid titles', () => {
    expect(isValidTitle('Valid Title')).toBe(true);
    expect(isValidTitle('A')).toBe(true);
  });

  it('should return false for empty titles', () => {
    expect(isValidTitle('')).toBe(false);
    expect(isValidTitle('   ')).toBe(false);
  });

  it('should return false for too long titles', () => {
    const tooLong = 'A'.repeat(101);
    expect(isValidTitle(tooLong, 100)).toBe(false);
  });
});

describe('getTitleLength', () => {
  it('should return trimmed length', () => {
    expect(getTitleLength('Hello')).toBe(5);
    expect(getTitleLength('  Hello  ')).toBe(5);
    expect(getTitleLength('   ')).toBe(0);
  });
});

describe('compareTitles', () => {
  it('should compare case-insensitively', () => {
    expect(compareTitles('Apple', 'banana')).toBeLessThan(0);
    expect(compareTitles('ZEBRA', 'apple')).toBeGreaterThan(0);
    expect(compareTitles('Same', 'same')).toBe(0);
  });

  it('should handle special characters', () => {
    expect(compareTitles('123', 'abc')).toBeLessThan(0);
    expect(compareTitles('!@#', 'abc')).toBeLessThan(0);
  });
});

describe('extractTitleFromMessage', () => {
  it('should extract first line', () => {
    const message = 'First line is title\nSecond line is ignored';
    expect(extractTitleFromMessage(message)).toBe('First line is title');
  });

  it('should truncate long first lines', () => {
    const message = 'This is a very long first line that should be truncated to a reasonable length\nSecond line';
    const result = extractTitleFromMessage(message, 30);

    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(33);
  });

  it('should clean whitespace', () => {
    const message = '  First line with spaces  \nSecond line';
    expect(extractTitleFromMessage(message)).toBe('First line with spaces');
  });
});
