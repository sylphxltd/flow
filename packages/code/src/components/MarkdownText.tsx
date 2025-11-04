/**
 * Markdown Text Component
 * Renders markdown content in the terminal
 *
 * ENHANCED: Custom HR rendering to prevent wrapping
 * - Detects HR patterns (---, ***, ___)
 * - Renders with fixed width (48 chars) instead of full terminal width
 * - Prevents awkward line wrapping in narrow containers
 */

import Markdown from '@jescalan/ink-markdown';
import { Box, Text } from 'ink';
import React from 'react';

interface MarkdownTextProps {
  children: string;
  prefix?: string;
  prefixColor?: string;
}

// HR patterns to detect (markdown horizontal rules)
const HR_PATTERNS = [
  /^-{3,}\s*$/, // --- (3 or more dashes)
  /^\*{3,}\s*$/, // *** (3 or more asterisks)
  /^_{3,}\s*$/, // ___ (3 or more underscores)
];

/**
 * Check if a line is a horizontal rule
 */
function isHorizontalRule(line: string): boolean {
  const trimmed = line.trim();
  return HR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Render markdown text with proper formatting
 * Uses @jescalan/ink-markdown for terminal markdown rendering
 * Custom HR rendering with fixed width (48 chars)
 * If prefix is provided, adds it to the beginning of each line
 *
 * PERFORMANCE: Memoized to prevent re-rendering when content hasn't changed
 */
const MarkdownText = React.memo(function MarkdownText({
  children,
  prefix,
  prefixColor,
}: MarkdownTextProps) {
  // Split content into lines for HR detection
  const lines = children.split('\n');

  // Check if we have any HRs that need custom rendering
  const hasHR = lines.some(isHorizontalRule);

  if (!hasHR && !prefix) {
    // No HR and no prefix - use default rendering
    return <Markdown>{children}</Markdown>;
  }

  // Process line by line for HR detection and/or prefix
  return (
    <Box flexDirection="column">
      {lines.map((line, idx) => {
        const isHR = isHorizontalRule(line);

        if (isHR) {
          // Custom HR: fixed width (48 chars), centered with dashes
          return (
            <Box key={idx}>
              {prefix && <Text color={prefixColor}>{prefix}</Text>}
              <Text dimColor>{'─'.repeat(48)}</Text>
            </Box>
          );
        }

        if (prefix) {
          // Regular line with prefix
          return (
            <Box key={idx}>
              <Text color={prefixColor}>{prefix}</Text>
              <Markdown>{line}</Markdown>
            </Box>
          );
        }

        // Regular line without prefix
        // Return each line individually to maintain proper spacing
        return <Markdown key={idx}>{line}</Markdown>;
      })}
    </Box>
  );
});

export default MarkdownText;
