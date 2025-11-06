/**
 * Text Rendering Utilities
 * Helper functions for rendering text with @file tag highlighting
 */
import React from 'react';
/**
 * Render text with @file tags highlighted
 * Valid tags (in validTags set) are shown with green background
 * Invalid tags are rendered as normal text
 */
export declare function renderTextWithTags(text: string, cursorPos: number | undefined, showCursor: boolean, validTags?: Set<string>): React.ReactNode;
/**
 * Extract @file references from text
 */
export declare function extractFileReferences(text: string): string[];
//# sourceMappingURL=text-rendering-utils.d.ts.map