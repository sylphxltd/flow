/**
 * File Attachments Hook
 * Manages file attachments and synchronization with @file references in input
 */
import { useState, useEffect, useMemo } from 'react';
import { extractFileReferences } from '../utils/text-rendering-utils.js';
export function useFileAttachments(input) {
    const [pendingAttachments, setPendingAttachments] = useState([]);
    const [attachmentTokens, setAttachmentTokens] = useState(new Map());
    // Sync pending attachments with @file references in input
    useEffect(() => {
        const fileRefs = new Set(extractFileReferences(input));
        // Remove attachments that are no longer in input
        setPendingAttachments((prev) => {
            return prev.filter((att) => fileRefs.has(att.relativePath));
        });
    }, [input]);
    // Create validTags set from pendingAttachments
    const validTags = useMemo(() => {
        return new Set(pendingAttachments.map((att) => att.relativePath));
    }, [pendingAttachments]);
    // Add attachment
    const addAttachment = (attachment) => {
        setPendingAttachments((prev) => {
            // Check if already attached
            if (prev.some((a) => a.path === attachment.path)) {
                return prev;
            }
            return [...prev, attachment];
        });
    };
    // Clear all attachments
    const clearAttachments = () => {
        setPendingAttachments([]);
    };
    // Set token count for an attachment
    const setAttachmentTokenCount = (path, tokens) => {
        setAttachmentTokens((prev) => new Map(prev).set(path, tokens));
    };
    return {
        pendingAttachments,
        attachmentTokens,
        validTags,
        addAttachment,
        clearAttachments,
        setAttachmentTokenCount,
    };
}
//# sourceMappingURL=useFileAttachments.js.map