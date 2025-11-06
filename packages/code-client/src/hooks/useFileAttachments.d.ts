/**
 * File Attachments Hook
 * Manages file attachments and synchronization with @file references in input
 */
import type { FileAttachment } from '@sylphx/code-core';
export declare function useFileAttachments(input: string): {
    pendingAttachments: FileAttachment[];
    attachmentTokens: Map<string, number>;
    validTags: Set<string>;
    addAttachment: (attachment: FileAttachment) => void;
    clearAttachments: () => void;
    setAttachmentTokenCount: (path: string, tokens: number) => void;
};
//# sourceMappingURL=useFileAttachments.d.ts.map