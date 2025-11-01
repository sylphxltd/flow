/**
 * Markdown Text Component
 * Renders markdown content in the terminal with mermaid support
 */

import React from 'react';
import { Box, Text } from 'ink';
import Markdown from '@jescalan/ink-markdown';

interface MarkdownTextProps {
  children: string;
}

/**
 * Detect and enhance mermaid code blocks
 * Adds a helpful note with link to mermaid.live
 */
function processMermaidBlocks(content: string): string {
  // Match mermaid code blocks (flexible with whitespace)
  const mermaidBlockRegex = /```mermaid\s*\n([\s\S]*?)```/g;

  // Check if there are any mermaid blocks
  if (!content.includes('```mermaid')) {
    return content;
  }

  // Add note after each mermaid block
  return content.replace(
    mermaidBlockRegex,
    (match, code) => {
      return `\`\`\`mermaid\n${code}\`\`\`\n\n💡 *View diagram at: https://mermaid.live*\n`;
    }
  );
}

/**
 * Render markdown text with proper formatting
 * Uses @jescalan/ink-markdown for terminal markdown rendering
 * Detects mermaid diagrams and adds helpful viewing hints
 */
export default function MarkdownText({ children }: MarkdownTextProps) {
  const processedContent = processMermaidBlocks(children);

  return <Markdown>{processedContent}</Markdown>;
}
