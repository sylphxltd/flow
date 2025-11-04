/**
 * File Attachments Hook
 * Manages file attachments and synchronization with @file references in input
 */

import { useState, useEffect, useMemo } from 'react';
import type { FileAttachment } from '@sylphx/code-core';
import { extractFileReferences } from '../utils/text-rendering-utils.js';

export function useFileAttachments(input: string) {
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachment[]>([]);
  const [attachmentTokens, setAttachmentTokens] = useState<Map<string, number>>(new Map());

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
  const addAttachment = (attachment: FileAttachment) => {
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
  const setAttachmentTokenCount = (path: string, tokens: number) => {
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
