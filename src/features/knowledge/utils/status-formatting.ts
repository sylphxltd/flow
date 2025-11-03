/**
 * Knowledge Status Formatting Utilities
 * Pure functions for formatting knowledge base status information
 */

// ===== Types =====

export interface KnowledgeStatus {
  indexed: boolean;
  isIndexing: boolean;
  progress?: number;
  documentCount?: number;
}

export interface StatusMessage {
  status: string;
  details: string[];
  note?: string;
}

// ===== Status Determination =====

/**
 * Determine status display text
 * Pure - status mapping
 */
export function determineStatusText(status: KnowledgeStatus): string {
  if (status.indexed) {
    return '✓ Ready';
  }

  if (status.isIndexing) {
    const progress = status.progress ?? 0;
    return `🔄 Building index (${progress}%)`;
  }

  return '⚠️ Not initialized';
}

/**
 * Determine status note
 * Pure - conditional text
 */
export function determineStatusNote(status: KnowledgeStatus): string | undefined {
  if (status.isIndexing) {
    return 'Please wait a moment and try again';
  }

  if (!status.indexed && !status.isIndexing) {
    return 'Will auto-index on first search';
  }

  return undefined;
}

/**
 * Build status message
 * Pure - object construction
 */
export function buildStatusMessage(status: KnowledgeStatus): StatusMessage {
  const statusText = determineStatusText(status);
  const note = determineStatusNote(status);
  const details: string[] = [];

  if (status.indexed && status.documentCount !== undefined) {
    details.push(`${status.documentCount} files`);
  }

  return {
    status: statusText,
    details,
    note,
  };
}

// ===== Status Formatting =====

/**
 * Format status message for CLI display
 * Pure - string formatting
 */
export function formatStatusForCLI(statusMessage: StatusMessage): string {
  const lines: string[] = [];

  lines.push(`**Status:** ${statusMessage.status}`);

  if (statusMessage.details.length > 0) {
    lines.push(`**Documents:** ${statusMessage.details.join(', ')}`);
  }

  if (statusMessage.note) {
    lines.push(`**Note:** ${statusMessage.note}`);
  }

  return lines.join('\n');
}

/**
 * Format complete status output
 * Pure - string composition
 */
export function formatStatusOutput(status: KnowledgeStatus): string {
  const statusMessage = buildStatusMessage(status);
  return formatStatusForCLI(statusMessage);
}

// ===== Progress Calculation =====

/**
 * Calculate indexing progress percentage
 * Pure - percentage calculation
 */
export function calculateProgress(current: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  const percentage = (current / total) * 100;
  return Math.min(100, Math.max(0, Math.round(percentage)));
}

/**
 * Format progress text
 * Pure - string formatting
 */
export function formatProgress(progress: number): string {
  return `${progress}%`;
}
