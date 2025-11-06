/**
 * Text Rendering Utilities
 * Helper functions for rendering text with @file tag highlighting
 */

import React from 'react';
import { Text } from 'ink';

/**
 * Render text with @file tags highlighted
 * Valid tags (in validTags set) are shown with green background
 * Invalid tags are rendered as normal text
 */
export function renderTextWithTags(
  text: string,
  cursorPos: number | undefined,
  showCursor: boolean,
  validTags?: Set<string>
): React.ReactNode {
  // Handle empty text
  if (text.length === 0) {
    // If cursor should be shown at position 0 (empty line with cursor)
    if (cursorPos === 0 && showCursor) {
      return <Text inverse> </Text>;
    }
    return <Text> </Text>;
  }

  const parts: React.ReactNode[] = [];
  const regex = /@([^\s]+)/g;
  let lastIndex = 0;
  let match;
  let partIndex = 0;
  let cursorRendered = cursorPos === undefined;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // Add text before match
    if (matchStart > lastIndex) {
      const beforeText = text.slice(lastIndex, matchStart);

      // Check if cursor is in this segment
      if (!cursorRendered && cursorPos !== undefined && cursorPos >= lastIndex && cursorPos < matchStart) {
        const leftPart = beforeText.slice(0, cursorPos - lastIndex);
        const rightPart = beforeText.slice(cursorPos - lastIndex);
        parts.push(
          <Text key={`before-${partIndex}`}>
            {leftPart}
            {showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : ' '}</Text>}
            {rightPart.slice(1)}
          </Text>
        );
        cursorRendered = true;
      } else {
        parts.push(<Text key={`before-${partIndex}`}>{beforeText}</Text>);
      }
      partIndex++;
    }

    // Check if this tag is valid
    const fileName = match[1];
    if (!fileName) continue;
    const isValidTag = validTags ? validTags.has(fileName) : false;

    // Add @file tag (with or without highlighting)
    if (!cursorRendered && cursorPos !== undefined && cursorPos >= matchStart && cursorPos < matchEnd) {
      // Cursor is inside the tag
      const tagText = match[0];
      const leftPart = tagText.slice(0, cursorPos - matchStart);
      const rightPart = tagText.slice(cursorPos - matchStart);

      if (isValidTag) {
        parts.push(
          <Text key={`tag-${partIndex}`} backgroundColor="#1a472a" color="#00FF88">
            {leftPart}
            {showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : ' '}</Text>}
            {rightPart.slice(1)}
          </Text>
        );
      } else {
        // Invalid tag - render as normal text with cursor
        parts.push(
          <Text key={`tag-${partIndex}`}>
            {leftPart}
            {showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : ' '}</Text>}
            {rightPart.slice(1)}
          </Text>
        );
      }
      cursorRendered = true;
    } else {
      if (isValidTag) {
        parts.push(
          <Text key={`tag-${partIndex}`} backgroundColor="#1a472a" color="#00FF88">
            {match[0]}
          </Text>
        );
      } else {
        // Invalid tag - render as normal text
        parts.push(<Text key={`tag-${partIndex}`}>{match[0]}</Text>);
      }
    }
    partIndex++;

    lastIndex = matchEnd;
  }

  // Add remaining text and handle cursor at/after last index
  if (lastIndex <= text.length) {
    if (!cursorRendered && cursorPos !== undefined && cursorPos >= lastIndex) {
      // Cursor is in remaining text or at end
      const remainingText = text.slice(lastIndex);
      const leftPart = remainingText.slice(0, cursorPos - lastIndex);
      const rightPart = remainingText.slice(cursorPos - lastIndex);

      if (leftPart.length > 0 || rightPart.length > 0) {
        parts.push(
          <Text key={`after-${partIndex}`}>
            {leftPart}
            {showCursor && <Text inverse>{rightPart.length > 0 ? rightPart[0] : ' '}</Text>}
            {rightPart.slice(1)}
          </Text>
        );
      } else {
        // Cursor at end with no remaining text
        if (showCursor) {
          parts.push(<Text key="cursor-end" inverse> </Text>);
        }
      }
      cursorRendered = true;
    } else if (lastIndex < text.length) {
      // No cursor in remaining text
      const remainingText = text.slice(lastIndex);
      parts.push(<Text key={`after-${partIndex}`}>{remainingText}</Text>);
    }
  }

  // Final fallback: cursor not rendered yet
  if (!cursorRendered && showCursor && cursorPos !== undefined) {
    parts.push(<Text key="cursor-fallback" inverse> </Text>);
  }

  return <>{parts}</>;
}

/**
 * Extract @file references from text
 */
export function extractFileReferences(text: string): string[] {
  const refs: string[] = [];
  const regex = /@([^\s]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      refs.push(match[1]);
    }
  }

  return refs;
}
