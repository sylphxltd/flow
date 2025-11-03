import { describe, it, expect } from 'vitest';
import {
  calculateProgressPercentage,
  calculateEstimatedTimeRemaining,
  formatDuration,
  determineIndexPhase,
  buildPhaseProgress,
  calculateIndexStats,
  formatIndexStats,
  determineIndexMode,
  getModeDisplayName,
  buildProgressMessage,
  buildCompletionMessage,
} from './index-progress.js';

describe('calculateProgressPercentage', () => {
  it('should calculate correct percentage', () => {
    expect(calculateProgressPercentage(5, 10)).toBe(50);
    expect(calculateProgressPercentage(1, 4)).toBe(25);
    expect(calculateProgressPercentage(3, 3)).toBe(100);
  });

  it('should handle zero total', () => {
    expect(calculateProgressPercentage(0, 0)).toBe(0);
  });

  it('should cap at 100%', () => {
    expect(calculateProgressPercentage(10, 5)).toBe(100);
  });
});

describe('calculateEstimatedTimeRemaining', () => {
  it('should estimate remaining time', () => {
    // 5 items in 1000ms = 200ms per item
    // 5 items remaining = 1000ms
    const result = calculateEstimatedTimeRemaining(5, 10, 1000);
    expect(result).toBe(1000);
  });

  it('should handle zero current', () => {
    expect(calculateEstimatedTimeRemaining(0, 10, 1000)).toBe(0);
  });

  it('should handle zero total', () => {
    expect(calculateEstimatedTimeRemaining(5, 0, 1000)).toBe(0);
  });
});

describe('formatDuration', () => {
  it('should format milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('should format seconds', () => {
    expect(formatDuration(2500)).toBe('2.5s');
  });

  it('should format minutes', () => {
    expect(formatDuration(125000)).toBe('2m 5s');
  });
});

describe('determineIndexPhase', () => {
  it('should return completed when done', () => {
    expect(determineIndexPhase(10, 10, true)).toBe('completed');
    expect(determineIndexPhase(10, 10, false)).toBe('completed');
  });

  it('should always return tokenizing without embeddings', () => {
    expect(determineIndexPhase(3, 10, false)).toBe('tokenizing');
  });

  it('should progress through phases with embeddings', () => {
    expect(determineIndexPhase(2, 10, true)).toBe('tokenizing');
    expect(determineIndexPhase(6, 10, true)).toBe('calculating');
  });
});

describe('buildPhaseProgress', () => {
  it('should build phase progress object', () => {
    const result = buildPhaseProgress(5, 10, true);
    expect(result.current).toBe(5);
    expect(result.total).toBe(10);
    expect(result.phase).toBe('calculating');
  });
});

describe('calculateIndexStats', () => {
  it('should calculate correct stats', () => {
    const stats = calculateIndexStats(100, 95, 1000, 3000, false);

    expect(stats.totalFiles).toBe(100);
    expect(stats.indexedFiles).toBe(95);
    expect(stats.skippedFiles).toBe(5);
    expect(stats.duration).toBe(2000);
    expect(stats.cacheHit).toBe(false);
  });
});

describe('formatIndexStats', () => {
  it('should format stats correctly', () => {
    const stats = {
      totalFiles: 100,
      indexedFiles: 95,
      skippedFiles: 5,
      duration: 2500,
      cacheHit: false,
    };

    const result = formatIndexStats(stats);

    expect(result).toContain('Total Files: 100');
    expect(result).toContain('Indexed: 95');
    expect(result).toContain('Skipped: 5');
    expect(result).toContain('Duration: 2.5s');
  });

  it('should show cache hit', () => {
    const stats = {
      totalFiles: 100,
      indexedFiles: 100,
      skippedFiles: 0,
      duration: 100,
      cacheHit: true,
    };

    const result = formatIndexStats(stats);
    expect(result).toContain('Source: Cache');
  });
});

describe('determineIndexMode', () => {
  it('should choose semantic with API key', () => {
    expect(determineIndexMode(true)).toBe('semantic');
  });

  it('should choose tfidf-only without API key', () => {
    expect(determineIndexMode(false)).toBe('tfidf-only');
  });
});

describe('getModeDisplayName', () => {
  it('should return correct display names', () => {
    expect(getModeDisplayName('semantic')).toContain('Semantic');
    expect(getModeDisplayName('tfidf-only')).toContain('TF-IDF Only');
  });
});

describe('buildProgressMessage', () => {
  it('should build basic progress message', () => {
    const result = buildProgressMessage(5, 10);
    expect(result).toBe('50% (5/10)');
  });

  it('should include filename', () => {
    const result = buildProgressMessage(5, 10, 'test.ts');
    expect(result).toBe('50% (5/10) test.ts');
  });

  it('should include status', () => {
    const result = buildProgressMessage(5, 10, 'test.ts', 'processing');
    expect(result).toBe('50% (5/10) test.ts [processing]');
  });
});

describe('buildCompletionMessage', () => {
  it('should build completion message', () => {
    const stats = {
      totalFiles: 100,
      indexedFiles: 100,
      skippedFiles: 0,
      duration: 5000,
      cacheHit: false,
    };

    const result = buildCompletionMessage(stats);
    expect(result).toContain('100 files');
    expect(result).toContain('5.0s');
  });
});
