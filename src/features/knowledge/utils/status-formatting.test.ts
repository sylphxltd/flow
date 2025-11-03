import { describe, it, expect } from 'vitest';
import {
  determineStatusText,
  determineStatusNote,
  buildStatusMessage,
  formatStatusForCLI,
  formatStatusOutput,
  calculateProgress,
  formatProgress,
  type KnowledgeStatus,
} from './status-formatting.js';

describe('determineStatusText', () => {
  it('should return Ready when indexed', () => {
    const status: KnowledgeStatus = {
      indexed: true,
      isIndexing: false,
      documentCount: 10,
    };
    expect(determineStatusText(status)).toBe('✓ Ready');
  });

  it('should return Building index when indexing', () => {
    const status: KnowledgeStatus = {
      indexed: false,
      isIndexing: true,
      progress: 45,
    };
    expect(determineStatusText(status)).toBe('🔄 Building index (45%)');
  });

  it('should handle missing progress during indexing', () => {
    const status: KnowledgeStatus = {
      indexed: false,
      isIndexing: true,
    };
    expect(determineStatusText(status)).toBe('🔄 Building index (0%)');
  });

  it('should return Not initialized when not indexed and not indexing', () => {
    const status: KnowledgeStatus = {
      indexed: false,
      isIndexing: false,
    };
    expect(determineStatusText(status)).toBe('⚠️ Not initialized');
  });
});

describe('determineStatusNote', () => {
  it('should return wait message when indexing', () => {
    const status: KnowledgeStatus = {
      indexed: false,
      isIndexing: true,
      progress: 50,
    };
    expect(determineStatusNote(status)).toBe('Please wait a moment and try again');
  });

  it('should return auto-index message when not initialized', () => {
    const status: KnowledgeStatus = {
      indexed: false,
      isIndexing: false,
    };
    expect(determineStatusNote(status)).toBe('Will auto-index on first search');
  });

  it('should return undefined when ready', () => {
    const status: KnowledgeStatus = {
      indexed: true,
      isIndexing: false,
      documentCount: 10,
    };
    expect(determineStatusNote(status)).toBeUndefined();
  });
});

describe('buildStatusMessage', () => {
  it('should build message for ready status', () => {
    const status: KnowledgeStatus = {
      indexed: true,
      isIndexing: false,
      documentCount: 25,
    };

    const result = buildStatusMessage(status);
    expect(result.status).toBe('✓ Ready');
    expect(result.details).toEqual(['25 files']);
    expect(result.note).toBeUndefined();
  });

  it('should build message for indexing status', () => {
    const status: KnowledgeStatus = {
      indexed: false,
      isIndexing: true,
      progress: 75,
    };

    const result = buildStatusMessage(status);
    expect(result.status).toBe('🔄 Building index (75%)');
    expect(result.details).toEqual([]);
    expect(result.note).toBe('Please wait a moment and try again');
  });

  it('should build message for not initialized status', () => {
    const status: KnowledgeStatus = {
      indexed: false,
      isIndexing: false,
    };

    const result = buildStatusMessage(status);
    expect(result.status).toBe('⚠️ Not initialized');
    expect(result.details).toEqual([]);
    expect(result.note).toBe('Will auto-index on first search');
  });
});

describe('formatStatusForCLI', () => {
  it('should format status with all fields', () => {
    const message = {
      status: '✓ Ready',
      details: ['25 files'],
      note: 'All systems operational',
    };

    const result = formatStatusForCLI(message);
    expect(result).toContain('**Status:** ✓ Ready');
    expect(result).toContain('**Documents:** 25 files');
    expect(result).toContain('**Note:** All systems operational');
  });

  it('should format status without details', () => {
    const message = {
      status: '🔄 Building index (50%)',
      details: [],
      note: 'Please wait',
    };

    const result = formatStatusForCLI(message);
    expect(result).toContain('**Status:** 🔄 Building index (50%)');
    expect(result).not.toContain('**Documents:**');
    expect(result).toContain('**Note:** Please wait');
  });

  it('should format status without note', () => {
    const message = {
      status: '✓ Ready',
      details: ['10 files'],
    };

    const result = formatStatusForCLI(message);
    expect(result).toContain('**Status:** ✓ Ready');
    expect(result).toContain('**Documents:** 10 files');
    expect(result).not.toContain('**Note:**');
  });
});

describe('formatStatusOutput', () => {
  it('should format complete status output', () => {
    const status: KnowledgeStatus = {
      indexed: true,
      isIndexing: false,
      documentCount: 30,
    };

    const result = formatStatusOutput(status);
    expect(result).toContain('**Status:** ✓ Ready');
    expect(result).toContain('**Documents:** 30 files');
  });
});

describe('calculateProgress', () => {
  it('should calculate correct percentage', () => {
    expect(calculateProgress(5, 10)).toBe(50);
    expect(calculateProgress(1, 4)).toBe(25);
    expect(calculateProgress(3, 3)).toBe(100);
  });

  it('should handle zero total', () => {
    expect(calculateProgress(0, 0)).toBe(0);
  });

  it('should cap at 100%', () => {
    expect(calculateProgress(10, 5)).toBe(100);
  });

  it('should round to nearest integer', () => {
    expect(calculateProgress(1, 3)).toBe(33);
    expect(calculateProgress(2, 3)).toBe(67);
  });
});

describe('formatProgress', () => {
  it('should format progress with percentage sign', () => {
    expect(formatProgress(50)).toBe('50%');
    expect(formatProgress(100)).toBe('100%');
    expect(formatProgress(0)).toBe('0%');
  });
});
