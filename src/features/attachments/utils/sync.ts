/**
 * Attachment Sync - Pure functions for synchronizing attachments with @ tags
 * @module features/attachments/utils/sync
 */

import type { FileAttachment } from '../../../types/session.types.js';
import { extractFileReferences } from './parser.js';

/**
 * Synchronize attachments with @ file references in text
 * Removes attachments that are no longer referenced in text
 * @pure No side effects
 *
 * @example
 * const attachments = [{ relativePath: "src/index.ts", ... }, { relativePath: "test.ts", ... }]
 * syncAttachmentsWithText(attachments, "Check @src/index.ts")
 * // [{ relativePath: "src/index.ts", ... }]
 */
export function syncAttachmentsWithText(
  attachments: FileAttachment[],
  text: string
): FileAttachment[] {
  const fileRefs = new Set(extractFileReferences(text));

  return attachments.filter(att => fileRefs.has(att.relativePath));
}

/**
 * Check if attachment already exists in list
 * @pure No side effects
 *
 * @example
 * hasAttachment(attachments, "src/index.ts")
 * // true/false
 */
export function hasAttachment(
  attachments: FileAttachment[],
  path: string
): boolean {
  return attachments.some(a => a.path === path);
}

/**
 * Add attachment if not already present
 * @pure No side effects
 *
 * @example
 * const newAttachments = addAttachment(existingAttachments, newAttachment)
 */
export function addAttachment(
  attachments: FileAttachment[],
  attachment: FileAttachment
): FileAttachment[] {
  if (hasAttachment(attachments, attachment.path)) {
    return attachments;
  }
  return [...attachments, attachment];
}

/**
 * Remove attachment by path
 * @pure No side effects
 */
export function removeAttachment(
  attachments: FileAttachment[],
  path: string
): FileAttachment[] {
  return attachments.filter(a => a.path !== path);
}

/**
 * Remove all attachments
 * @pure No side effects
 */
export function clearAttachments(): FileAttachment[] {
  return [];
}

/**
 * Create validTags set from attachments
 * Used for highlighting @ tags in input
 * @pure No side effects
 *
 * @example
 * const validTags = createValidTagsSet(attachments)
 * validTags.has("src/index.ts") // true if attached
 */
export function createValidTagsSet(
  attachments: FileAttachment[]
): Set<string> {
  return new Set(attachments.map(att => att.relativePath));
}

/**
 * Get attachments that are referenced in text
 * @pure No side effects
 */
export function getReferencedAttachments(
  attachments: FileAttachment[],
  text: string
): FileAttachment[] {
  const refs = new Set(extractFileReferences(text));
  return attachments.filter(att => refs.has(att.relativePath));
}

/**
 * Get attachments that are NOT referenced in text
 * @pure No side effects
 */
export function getUnreferencedAttachments(
  attachments: FileAttachment[],
  text: string
): FileAttachment[] {
  const refs = new Set(extractFileReferences(text));
  return attachments.filter(att => !refs.has(att.relativePath));
}
