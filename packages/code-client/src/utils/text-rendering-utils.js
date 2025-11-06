import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Text } from 'ink';
/**
 * Render text with @file tags highlighted
 * Valid tags (in validTags set) are shown with green background
 * Invalid tags are rendered as normal text
 */
export function renderTextWithTags(text, cursorPos, showCursor, validTags) {
    // Handle empty text
    if (text.length === 0) {
        // If cursor should be shown at position 0 (empty line with cursor)
        if (cursorPos === 0 && showCursor) {
            return _jsx(Text, { inverse: true, children: " " });
        }
        return _jsx(Text, { children: " " });
    }
    const parts = [];
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
                parts.push(_jsxs(Text, { children: [leftPart, showCursor && _jsx(Text, { inverse: true, children: rightPart.length > 0 ? rightPart[0] : ' ' }), rightPart.slice(1)] }, `before-${partIndex}`));
                cursorRendered = true;
            }
            else {
                parts.push(_jsx(Text, { children: beforeText }, `before-${partIndex}`));
            }
            partIndex++;
        }
        // Check if this tag is valid
        const fileName = match[1];
        const isValidTag = validTags ? validTags.has(fileName) : false;
        // Add @file tag (with or without highlighting)
        if (!cursorRendered && cursorPos !== undefined && cursorPos >= matchStart && cursorPos < matchEnd) {
            // Cursor is inside the tag
            const tagText = match[0];
            const leftPart = tagText.slice(0, cursorPos - matchStart);
            const rightPart = tagText.slice(cursorPos - matchStart);
            if (isValidTag) {
                parts.push(_jsxs(Text, { backgroundColor: "#1a472a", color: "#00FF88", children: [leftPart, showCursor && _jsx(Text, { inverse: true, children: rightPart.length > 0 ? rightPart[0] : ' ' }), rightPart.slice(1)] }, `tag-${partIndex}`));
            }
            else {
                // Invalid tag - render as normal text with cursor
                parts.push(_jsxs(Text, { children: [leftPart, showCursor && _jsx(Text, { inverse: true, children: rightPart.length > 0 ? rightPart[0] : ' ' }), rightPart.slice(1)] }, `tag-${partIndex}`));
            }
            cursorRendered = true;
        }
        else {
            if (isValidTag) {
                parts.push(_jsx(Text, { backgroundColor: "#1a472a", color: "#00FF88", children: match[0] }, `tag-${partIndex}`));
            }
            else {
                // Invalid tag - render as normal text
                parts.push(_jsx(Text, { children: match[0] }, `tag-${partIndex}`));
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
                parts.push(_jsxs(Text, { children: [leftPart, showCursor && _jsx(Text, { inverse: true, children: rightPart.length > 0 ? rightPart[0] : ' ' }), rightPart.slice(1)] }, `after-${partIndex}`));
            }
            else {
                // Cursor at end with no remaining text
                if (showCursor) {
                    parts.push(_jsx(Text, { inverse: true, children: " " }, "cursor-end"));
                }
            }
            cursorRendered = true;
        }
        else if (lastIndex < text.length) {
            // No cursor in remaining text
            const remainingText = text.slice(lastIndex);
            parts.push(_jsx(Text, { children: remainingText }, `after-${partIndex}`));
        }
    }
    // Final fallback: cursor not rendered yet
    if (!cursorRendered && showCursor && cursorPos !== undefined) {
        parts.push(_jsx(Text, { inverse: true, children: " " }, "cursor-fallback"));
    }
    return _jsx(_Fragment, { children: parts });
}
/**
 * Extract @file references from text
 */
export function extractFileReferences(text) {
    const refs = [];
    const regex = /@([^\s]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        refs.push(match[1]);
    }
    return refs;
}
//# sourceMappingURL=text-rendering-utils.js.map