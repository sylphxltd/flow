/**
 * Codebase Index Progress Utilities
 * Pure functions for calculating and formatting index progress
 */

// ===== Types =====

export interface IndexProgress {
  current: number;
  total: number;
  fileName?: string;
  status?: string;
}

export interface IndexPhase {
  phase: 'tokenizing' | 'calculating' | 'completed';
  current: number;
  total: number;
}

export interface IndexStats {
  totalFiles: number;
  indexedFiles: number;
  skippedFiles: number;
  duration: number;
  cacheHit: boolean;
}

export interface IndexMode {
  mode: 'tfidf-only' | 'semantic';
}

// ===== Progress Calculation =====

/**
 * Calculate progress percentage
 * Pure - percentage calculation
 */
export function calculateProgressPercentage(current: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  const percentage = (current / total) * 100;
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Calculate estimated time remaining
 * Pure - time estimation
 */
export function calculateEstimatedTimeRemaining(
  current: number,
  total: number,
  elapsed: number
): number {
  if (current === 0 || total === 0) {
    return 0;
  }

  const timePerItem = elapsed / current;
  const remaining = total - current;
  return timePerItem * remaining;
}

/**
 * Format duration in human-readable format
 * Pure - duration formatting
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

// ===== Phase Tracking =====

/**
 * Determine current index phase based on progress
 * Pure - phase determination logic
 */
export function determineIndexPhase(
  current: number,
  total: number,
  hasEmbeddings: boolean
): IndexPhase['phase'] {
  if (current >= total) {
    return 'completed';
  }

  // If no embeddings, we're always in tokenizing phase
  if (!hasEmbeddings) {
    return 'tokenizing';
  }

  // With embeddings, split into two phases
  const halfway = Math.floor(total / 2);
  if (current < halfway) {
    return 'tokenizing';
  }

  return 'calculating';
}

/**
 * Build phase progress object
 * Pure - object construction
 */
export function buildPhaseProgress(
  current: number,
  total: number,
  hasEmbeddings: boolean
): IndexPhase {
  return {
    phase: determineIndexPhase(current, total, hasEmbeddings),
    current,
    total,
  };
}

// ===== Stats Calculation =====

/**
 * Calculate indexing statistics
 * Pure - stats calculation
 */
export function calculateIndexStats(
  totalFiles: number,
  indexedFiles: number,
  startTime: number,
  endTime: number,
  cacheHit: boolean
): IndexStats {
  return {
    totalFiles,
    indexedFiles,
    skippedFiles: totalFiles - indexedFiles,
    duration: endTime - startTime,
    cacheHit,
  };
}

/**
 * Format index stats for display
 * Pure - string formatting
 */
export function formatIndexStats(stats: IndexStats): string {
  const lines: string[] = [];

  lines.push(`Total Files: ${stats.totalFiles}`);
  lines.push(`Indexed: ${stats.indexedFiles}`);

  if (stats.skippedFiles > 0) {
    lines.push(`Skipped: ${stats.skippedFiles}`);
  }

  lines.push(`Duration: ${formatDuration(stats.duration)}`);

  if (stats.cacheHit) {
    lines.push('Source: Cache');
  }

  return lines.join('\n');
}

// ===== Mode Determination =====

/**
 * Determine indexing mode based on API key availability
 * Pure - mode selection logic
 */
export function determineIndexMode(hasApiKey: boolean): IndexMode['mode'] {
  return hasApiKey ? 'semantic' : 'tfidf-only';
}

/**
 * Get mode display name
 * Pure - string mapping
 */
export function getModeDisplayName(mode: IndexMode['mode']): string {
  switch (mode) {
    case 'semantic':
      return 'Semantic (TF-IDF + Embeddings)';
    case 'tfidf-only':
      return 'TF-IDF Only';
  }
}

// ===== Progress Messages =====

/**
 * Build progress message
 * Pure - message formatting
 */
export function buildProgressMessage(
  current: number,
  total: number,
  fileName?: string,
  status?: string
): string {
  const percentage = calculateProgressPercentage(current, total);
  const parts: string[] = [];

  parts.push(`${percentage.toFixed(0)}%`);
  parts.push(`(${current}/${total})`);

  if (fileName) {
    parts.push(fileName);
  }

  if (status) {
    parts.push(`[${status}]`);
  }

  return parts.join(' ');
}

/**
 * Build completion message
 * Pure - message formatting
 */
export function buildCompletionMessage(stats: IndexStats): string {
  return `✓ Indexing complete! ${stats.indexedFiles} files in ${formatDuration(stats.duration)}`;
}
