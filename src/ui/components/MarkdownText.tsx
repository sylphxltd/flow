/**
 * Markdown Text Component
 * Renders markdown content in the terminal
 */

import React from 'react';
import { Box, Text } from 'ink';
import Markdown from '@jescalan/ink-markdown';

interface MarkdownTextProps {
  children: string;
  prefix?: string;
  prefixColor?: string;
}

/**
 * Render markdown text with proper formatting
 * Uses @jescalan/ink-markdown for terminal markdown rendering
 * If prefix is provided, adds it to the beginning of each line
 */
export default function MarkdownText({ children, prefix, prefixColor }: MarkdownTextProps) {
  if (!prefix) {
    return <Markdown>{children}</Markdown>;
  }

  // Split content by lines and add prefix to each line
  const lines = children.split('\n');

  return (
    <Box flexDirection="column">
      {lines.map((line, idx) => (
        <Box key={idx}>
          <Text color={prefixColor}>{prefix}</Text>
          <Markdown>{line}</Markdown>
        </Box>
      ))}
    </Box>
  );
}
