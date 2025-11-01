/**
 * Markdown Text Component
 * Renders markdown content in the terminal
 */

import React from 'react';
import Markdown from '@jescalan/ink-markdown';

interface MarkdownTextProps {
  children: string;
}

/**
 * Render markdown text with proper formatting
 * Uses @jescalan/ink-markdown for terminal markdown rendering
 */
export default function MarkdownText({ children }: MarkdownTextProps) {
  return <Markdown>{children}</Markdown>;
}
