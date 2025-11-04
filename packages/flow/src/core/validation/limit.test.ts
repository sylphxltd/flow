/**
 * Tests for Limit Validation Utilities
 */

import { describe, expect, it } from 'bun:test';
import { validateLimit } from './limit.js';

describe('validateLimit', () => {
  describe('with default parameters (defaultLimit=50, maxLimit=1000)', () => {
    it('returns default limit when undefined', () => {
      const result = validateLimit(undefined);
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(50);
    });

    it('accepts valid number', () => {
      const result = validateLimit(100);
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(100);
    });

    it('accepts valid string number', () => {
      const result = validateLimit('500');
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(500);
    });

    it('accepts limit at max', () => {
      const result = validateLimit(1000);
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(1000);
    });

    it('rejects limit above max', () => {
      const result = validateLimit(1001);
      expect(result._tag).toBe('Failure');
      expect(result._tag === 'Failure' && result.error.message).toBe('Limit cannot exceed 1000');
    });

    it('rejects zero', () => {
      const result = validateLimit(0);
      expect(result._tag).toBe('Failure');
      expect(result._tag === 'Failure' && result.error.message).toBe(
        'Limit must be a positive number'
      );
    });

    it('rejects negative number', () => {
      const result = validateLimit(-10);
      expect(result._tag).toBe('Failure');
      expect(result._tag === 'Failure' && result.error.message).toBe(
        'Limit must be a positive number'
      );
    });

    it('rejects invalid string', () => {
      const result = validateLimit('invalid');
      expect(result._tag).toBe('Failure');
      expect(result._tag === 'Failure' && result.error.message).toBe(
        'Limit must be a positive number'
      );
    });

    it('rejects empty string', () => {
      const result = validateLimit('');
      expect(result._tag).toBe('Failure');
      expect(result._tag === 'Failure' && result.error.message).toBe(
        'Limit must be a positive number'
      );
    });
  });

  describe('with custom default (defaultLimit=10)', () => {
    it('returns custom default when undefined', () => {
      const result = validateLimit(undefined, 10);
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(10);
    });
  });

  describe('with custom max (maxLimit=100)', () => {
    it('accepts limit at custom max', () => {
      const result = validateLimit(100, 10, 100);
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(100);
    });

    it('rejects limit above custom max', () => {
      const result = validateLimit(101, 10, 100);
      expect(result._tag).toBe('Failure');
      expect(result._tag === 'Failure' && result.error.message).toBe('Limit cannot exceed 100');
    });
  });

  describe('knowledge feature defaults (defaultLimit=10, maxLimit=100)', () => {
    it('returns 10 when undefined', () => {
      const result = validateLimit(undefined, 10, 100);
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(10);
    });

    it('accepts 50', () => {
      const result = validateLimit(50, 10, 100);
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(50);
    });

    it('rejects 101', () => {
      const result = validateLimit(101, 10, 100);
      expect(result._tag).toBe('Failure');
      expect(result._tag === 'Failure' && result.error.message).toBe('Limit cannot exceed 100');
    });
  });

  describe('memory feature defaults (defaultLimit=50, maxLimit=1000)', () => {
    it('returns 50 when undefined', () => {
      const result = validateLimit(undefined, 50, 1000);
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(50);
    });

    it('accepts 500', () => {
      const result = validateLimit(500, 50, 1000);
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(500);
    });

    it('rejects 1001', () => {
      const result = validateLimit(1001, 50, 1000);
      expect(result._tag).toBe('Failure');
      expect(result._tag === 'Failure' && result.error.message).toBe('Limit cannot exceed 1000');
    });
  });

  describe('edge cases', () => {
    it('accepts 1 (minimum valid)', () => {
      const result = validateLimit(1);
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(1);
    });

    it('handles string with whitespace', () => {
      const result = validateLimit('  100  ');
      expect(result._tag).toBe('Success');
      expect(result._tag === 'Success' && result.value).toBe(100);
    });

    it('rejects decimal numbers', () => {
      const result = validateLimit('10.5');
      expect(result._tag).toBe('Success');
      // parseInt truncates to 10
      expect(result._tag === 'Success' && result.value).toBe(10);
    });
  });
});
