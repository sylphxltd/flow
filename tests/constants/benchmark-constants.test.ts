/**
 * Benchmark Constants Tests
 * Tests for benchmark command constants
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AGENTS,
  DEFAULT_TASK,
  DEFAULT_CONCURRENCY,
  DEFAULT_DELAY,
  DEFAULT_TIMEOUT,
  DEFAULT_REPORT_DIR,
  PERFORMANCE_SCORE_RANGES,
  EVALUATION_CRITERIA,
  AGENT_DESCRIPTIONS,
} from '../../src/constants/benchmark-constants.js';

describe('Benchmark Constants', () => {
  describe('DEFAULT_AGENTS', () => {
    it('should define default agents array', () => {
      expect(DEFAULT_AGENTS).toBeDefined();
      expect(Array.isArray(DEFAULT_AGENTS)).toBe(true);
    });

    it('should include 4 default agents', () => {
      expect(DEFAULT_AGENTS).toHaveLength(4);
    });

    it('should include craftsman', () => {
      expect(DEFAULT_AGENTS).toContain('craftsman');
    });

    it('should include practitioner', () => {
      expect(DEFAULT_AGENTS).toContain('practitioner');
    });

    it('should include craftsman-reflective', () => {
      expect(DEFAULT_AGENTS).toContain('craftsman-reflective');
    });

    it('should include practitioner-reflective', () => {
      expect(DEFAULT_AGENTS).toContain('practitioner-reflective');
    });

    it('should only contain strings', () => {
      DEFAULT_AGENTS.forEach((agent) => {
        expect(typeof agent).toBe('string');
      });
    });
  });

  describe('DEFAULT_TASK', () => {
    it('should define default task path', () => {
      expect(DEFAULT_TASK).toBeDefined();
      expect(typeof DEFAULT_TASK).toBe('string');
    });

    it('should point to examples directory', () => {
      expect(DEFAULT_TASK).toContain('examples/');
    });

    it('should point to benchmark-tasks directory', () => {
      expect(DEFAULT_TASK).toContain('benchmark-tasks');
    });

    it('should be a markdown file', () => {
      expect(DEFAULT_TASK).toMatch(/\.md$/);
    });

    it('should be user-management-system task', () => {
      expect(DEFAULT_TASK).toBe('examples/benchmark-tasks/user-management-system.md');
    });
  });

  describe('DEFAULT_CONCURRENCY', () => {
    it('should define default concurrency', () => {
      expect(DEFAULT_CONCURRENCY).toBeDefined();
      expect(typeof DEFAULT_CONCURRENCY).toBe('number');
    });

    it('should be 1', () => {
      expect(DEFAULT_CONCURRENCY).toBe(1);
    });

    it('should be positive', () => {
      expect(DEFAULT_CONCURRENCY).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_DELAY', () => {
    it('should define default delay', () => {
      expect(DEFAULT_DELAY).toBeDefined();
      expect(typeof DEFAULT_DELAY).toBe('number');
    });

    it('should be 2 seconds', () => {
      expect(DEFAULT_DELAY).toBe(2);
    });

    it('should be positive', () => {
      expect(DEFAULT_DELAY).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_TIMEOUT', () => {
    it('should define default timeout', () => {
      expect(DEFAULT_TIMEOUT).toBeDefined();
      expect(typeof DEFAULT_TIMEOUT).toBe('number');
    });

    it('should be 3600 seconds (1 hour)', () => {
      expect(DEFAULT_TIMEOUT).toBe(3600);
    });

    it('should be 1 hour in seconds', () => {
      expect(DEFAULT_TIMEOUT).toBe(60 * 60);
    });

    it('should be positive', () => {
      expect(DEFAULT_TIMEOUT).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_REPORT_DIR', () => {
    it('should define default report directory', () => {
      expect(DEFAULT_REPORT_DIR).toBeDefined();
      expect(typeof DEFAULT_REPORT_DIR).toBe('string');
    });

    it('should be benchmark-results', () => {
      expect(DEFAULT_REPORT_DIR).toBe('benchmark-results');
    });

    it('should not be empty', () => {
      expect(DEFAULT_REPORT_DIR.length).toBeGreaterThan(0);
    });
  });

  describe('PERFORMANCE_SCORE_RANGES', () => {
    it('should define performance score ranges', () => {
      expect(PERFORMANCE_SCORE_RANGES).toBeDefined();
      expect(Array.isArray(PERFORMANCE_SCORE_RANGES)).toBe(true);
    });

    it('should have 9 score ranges', () => {
      expect(PERFORMANCE_SCORE_RANGES).toHaveLength(9);
    });

    it('should have scores from 9 to 1', () => {
      const scores = PERFORMANCE_SCORE_RANGES.map((r) => r.score);
      expect(scores).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1]);
    });

    it('should have increasing max thresholds', () => {
      for (let i = 1; i < PERFORMANCE_SCORE_RANGES.length - 1; i++) {
        expect(PERFORMANCE_SCORE_RANGES[i].max).toBeGreaterThan(
          PERFORMANCE_SCORE_RANGES[i - 1].max
        );
      }
    });

    it('should have last range as infinity', () => {
      const lastRange = PERFORMANCE_SCORE_RANGES[PERFORMANCE_SCORE_RANGES.length - 1];
      expect(lastRange.max).toBe(Number.POSITIVE_INFINITY);
    });

    it('should have descriptions for all ranges', () => {
      PERFORMANCE_SCORE_RANGES.forEach((range) => {
        expect(range.description).toBeDefined();
        expect(typeof range.description).toBe('string');
        expect(range.description.length).toBeGreaterThan(0);
      });
    });

    it('should have valid structure for each range', () => {
      PERFORMANCE_SCORE_RANGES.forEach((range) => {
        expect(range).toHaveProperty('max');
        expect(range).toHaveProperty('score');
        expect(range).toHaveProperty('description');
        expect(typeof range.max).toBe('number');
        expect(typeof range.score).toBe('number');
        expect(typeof range.description).toBe('string');
      });
    });

    it('should start with fastest time range', () => {
      expect(PERFORMANCE_SCORE_RANGES[0].max).toBe(300);
      expect(PERFORMANCE_SCORE_RANGES[0].score).toBe(9);
      expect(PERFORMANCE_SCORE_RANGES[0].description).toBe('Under 5 minutes');
    });

    it('should cover realistic benchmark timeframes', () => {
      const maxes = PERFORMANCE_SCORE_RANGES.map((r) => r.max).filter(
        (m) => m !== Number.POSITIVE_INFINITY
      );
      expect(Math.max(...maxes)).toBe(5400); // 90 minutes
      expect(Math.min(...maxes)).toBe(300); // 5 minutes
    });
  });

  describe('EVALUATION_CRITERIA', () => {
    it('should define evaluation criteria', () => {
      expect(EVALUATION_CRITERIA).toBeDefined();
      expect(typeof EVALUATION_CRITERIA).toBe('object');
    });

    it('should have 5 criteria', () => {
      expect(Object.keys(EVALUATION_CRITERIA)).toHaveLength(5);
    });

    it('should include CODE_IMPLEMENTATION', () => {
      expect(EVALUATION_CRITERIA.CODE_IMPLEMENTATION).toBe('Code Implementation Analysis');
    });

    it('should include FEATURE_COMPLETENESS', () => {
      expect(EVALUATION_CRITERIA.FEATURE_COMPLETENESS).toBe('Feature Completeness');
    });

    it('should include TESTING_QUALITY', () => {
      expect(EVALUATION_CRITERIA.TESTING_QUALITY).toBe('Testing Quality');
    });

    it('should include DOCUMENTATION_QUALITY', () => {
      expect(EVALUATION_CRITERIA.DOCUMENTATION_QUALITY).toBe('Documentation Quality');
    });

    it('should include ARCHITECTURE_DESIGN', () => {
      expect(EVALUATION_CRITERIA.ARCHITECTURE_DESIGN).toBe('Architecture & Design');
    });

    it('should have all string values', () => {
      Object.values(EVALUATION_CRITERIA).forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive names', () => {
      Object.values(EVALUATION_CRITERIA).forEach((value) => {
        expect(value).toMatch(/[A-Z]/); // Should have capital letters
      });
    });
  });

  describe('AGENT_DESCRIPTIONS', () => {
    it('should define agent descriptions', () => {
      expect(AGENT_DESCRIPTIONS).toBeDefined();
      expect(typeof AGENT_DESCRIPTIONS).toBe('object');
    });

    it('should have 4 agent descriptions', () => {
      expect(Object.keys(AGENT_DESCRIPTIONS)).toHaveLength(4);
    });

    it('should describe craftsman', () => {
      expect(AGENT_DESCRIPTIONS.craftsman).toBe(
        'Idealistic craftsman with principles-based approach'
      );
    });

    it('should describe practitioner', () => {
      expect(AGENT_DESCRIPTIONS.practitioner).toBe(
        'Pragmatic practitioner with business-focused approach'
      );
    });

    it('should describe craftsman-reflective', () => {
      expect(AGENT_DESCRIPTIONS['craftsman-reflective']).toBe(
        'Idealistic craftsman with reflective questioning'
      );
    });

    it('should describe practitioner-reflective', () => {
      expect(AGENT_DESCRIPTIONS['practitioner-reflective']).toBe(
        'Pragmatic practitioner with contextual decision-making'
      );
    });

    it('should match DEFAULT_AGENTS keys', () => {
      DEFAULT_AGENTS.forEach((agent) => {
        expect(AGENT_DESCRIPTIONS).toHaveProperty(agent);
      });
    });

    it('should have all string descriptions', () => {
      Object.values(AGENT_DESCRIPTIONS).forEach((desc) => {
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive text for each agent', () => {
      Object.values(AGENT_DESCRIPTIONS).forEach((desc) => {
        expect(desc.split(' ').length).toBeGreaterThan(2); // At least 3 words
      });
    });
  });

  describe('Integration', () => {
    it('should have matching agents in DEFAULT_AGENTS and AGENT_DESCRIPTIONS', () => {
      DEFAULT_AGENTS.forEach((agent) => {
        expect(AGENT_DESCRIPTIONS).toHaveProperty(agent);
        expect(AGENT_DESCRIPTIONS[agent as keyof typeof AGENT_DESCRIPTIONS]).toBeDefined();
      });
    });

    it('should have consistent timeout and delay values', () => {
      expect(DEFAULT_TIMEOUT).toBeGreaterThan(DEFAULT_DELAY);
      expect(DEFAULT_TIMEOUT / DEFAULT_DELAY).toBeGreaterThan(100); // Reasonable ratio
    });

    it('should have performance ranges covering full benchmark duration', () => {
      const maxTime = PERFORMANCE_SCORE_RANGES.find(
        (r) => r.max === Number.POSITIVE_INFINITY
      );
      expect(maxTime).toBeDefined();
      expect(maxTime?.score).toBe(1); // Lowest score for infinite time
    });

    it('should have all constants defined and exportable', () => {
      expect(DEFAULT_AGENTS).toBeDefined();
      expect(DEFAULT_TASK).toBeDefined();
      expect(DEFAULT_CONCURRENCY).toBeDefined();
      expect(DEFAULT_DELAY).toBeDefined();
      expect(DEFAULT_TIMEOUT).toBeDefined();
      expect(DEFAULT_REPORT_DIR).toBeDefined();
      expect(PERFORMANCE_SCORE_RANGES).toBeDefined();
      expect(EVALUATION_CRITERIA).toBeDefined();
      expect(AGENT_DESCRIPTIONS).toBeDefined();
    });
  });
});
