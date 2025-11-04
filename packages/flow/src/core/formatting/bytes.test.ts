/**
 * Tests for Byte Formatting Utilities
 */

import { describe, expect, it } from 'bun:test';
import { formatBytes, formatFileSize } from './bytes.js';

describe('formatBytes', () => {
  describe('default options (decimals: 2, longUnits)', () => {
    it('formats 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('formats bytes', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('formats kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('formats megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1572864)).toBe('1.5 MB');
    });

    it('formats gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1610612736)).toBe('1.5 GB');
    });

    it('formats terabytes', () => {
      expect(formatBytes(1099511627776)).toBe('1 TB');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatBytes(1587)).toBe('1.55 KB');
      expect(formatBytes(1638400)).toBe('1.56 MB');
    });
  });

  describe('with decimals option', () => {
    it('formats with 0 decimals', () => {
      expect(formatBytes(1536, { decimals: 0 })).toBe('2 KB');
      expect(formatBytes(1024, { decimals: 0 })).toBe('1 KB');
    });

    it('formats with 1 decimal', () => {
      expect(formatBytes(1536, { decimals: 1 })).toBe('1.5 KB');
      expect(formatBytes(1587, { decimals: 1 })).toBe('1.5 KB');
    });

    it('formats with 3 decimals', () => {
      expect(formatBytes(1587, { decimals: 3 })).toBe('1.55 KB'); // toFixed trims to 1.550, then trimmed
    });
  });

  describe('with shortUnits option', () => {
    it('uses short unit for 0 bytes', () => {
      expect(formatBytes(0, { shortUnits: true })).toBe('0 B');
    });

    it('uses short unit for bytes', () => {
      expect(formatBytes(500, { shortUnits: true })).toBe('500 B');
    });

    it('uses short units for kilobytes', () => {
      expect(formatBytes(1024, { shortUnits: true })).toBe('1 KB');
    });

    it('uses short units for megabytes', () => {
      expect(formatBytes(1048576, { shortUnits: true })).toBe('1 MB');
    });
  });

  describe('combined options', () => {
    it('uses short units with 1 decimal', () => {
      expect(formatBytes(1536, { decimals: 1, shortUnits: true })).toBe('1.5 KB');
    });

    it('uses short units with 0 decimals', () => {
      expect(formatBytes(1536, { decimals: 0, shortUnits: true })).toBe('2 KB');
    });
  });

  describe('edge cases', () => {
    it('handles 1 byte', () => {
      expect(formatBytes(1)).toBe('1 Bytes');
    });

    it('handles very large numbers', () => {
      const result = formatBytes(1099511627776 * 1024); // 1 PB
      expect(result).toContain('TB'); // Will show in TB since we only go up to TB
    });

    it('handles fractional KB', () => {
      expect(formatBytes(1500)).toBe('1.46 KB');
    });
  });
});

describe('formatFileSize', () => {
  it('formats with 1 decimal and short units', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB'); // toFixed(1) gives "1.0", trimmed to "1"
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1 MB'); // toFixed(1) gives "1.0", trimmed to "1"
  });

  it('is an alias for formatBytes with specific options', () => {
    const bytes = 1572864;
    expect(formatFileSize(bytes)).toBe(formatBytes(bytes, { decimals: 1, shortUnits: true }));
  });
});
