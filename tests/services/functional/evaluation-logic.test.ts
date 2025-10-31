import { describe, expect, it } from 'vitest';
import {
  buildEvaluationInput,
  buildEvaluationPrompt,
  calculatePerformance,
  combineAgentWork,
  DEFAULT_SCORE_RANGES,
  extractSummaryStats,
  findScoreRange,
  formatAgentWork,
  formatFileContent,
  formatPerformance,
  formatSummaryStats,
  generatePerformanceSection,
  parseDuration,
  parseTemplate,
  parseTimingJSON,
  replaceTemplateVariables,
  validateTemplate,
} from '../../../src/services/functional/evaluation-logic.js';

describe('evaluation-logic', () => {
  describe('parseDuration', () => {
    it('should parse duration from text', () => {
      const content = 'Duration: 42 seconds';
      expect(parseDuration(content)).toBe(42);
    });

    it('should return 0 if no match', () => {
      const content = 'No duration here';
      expect(parseDuration(content)).toBe(0);
    });
  });

  describe('parseTimingJSON', () => {
    it('should parse valid JSON', () => {
      const result = parseTimingJSON('{"duration": 30}');
      expect(result._tag).toBe('Success');
      if (result._tag === 'Success') {
        expect(result.value.duration).toBe(30);
      }
    });

    it('should handle invalid JSON', () => {
      const result = parseTimingJSON('{invalid}');
      expect(result._tag).toBe('Failure');
    });
  });

  describe('findScoreRange', () => {
    it('should find correct range', () => {
      const range = findScoreRange(45, DEFAULT_SCORE_RANGES);
      expect(range.score).toBe(8);
      expect(range.label).toBe('Good');
    });

    it('should return last range for very high duration', () => {
      const range = findScoreRange(1000, DEFAULT_SCORE_RANGES);
      expect(range.score).toBe(2);
      expect(range.label).toBe('Very Slow');
    });
  });

  describe('calculatePerformance', () => {
    it('should calculate performance data', () => {
      const data = calculatePerformance('test-agent', { duration: 45 }, DEFAULT_SCORE_RANGES);

      expect(data.agent).toBe('test-agent');
      expect(data.duration).toBe(45);
      expect(data.score).toBe(8);
      expect(data.label).toBe('Good');
    });
  });

  describe('formatPerformance', () => {
    it('should format performance data', () => {
      const formatted = formatPerformance({
        agent: 'test-agent',
        duration: 45,
        score: 8,
        label: 'Good',
      });

      expect(formatted).toContain('test-agent');
      expect(formatted).toContain('45s');
      expect(formatted).toContain('8/10');
    });
  });

  describe('generatePerformanceSection', () => {
    it('should generate performance section', () => {
      const timings = {
        agent1: { duration: 20 },
        agent2: { duration: 50 },
      };

      const section = generatePerformanceSection(timings, DEFAULT_SCORE_RANGES);

      expect(section).toContain('agent1');
      expect(section).toContain('agent2');
      expect(section).toContain('20s');
      expect(section).toContain('50s');
    });
  });

  describe('replaceTemplateVariables', () => {
    it('should replace variables', () => {
      const template = 'Hello {{NAME}}, you are {{AGE}} years old';
      const result = replaceTemplateVariables(template, {
        NAME: 'John',
        AGE: '30',
      });

      expect(result).toBe('Hello John, you are 30 years old');
    });

    it('should handle missing variables', () => {
      const template = 'Hello {{NAME}}';
      const result = replaceTemplateVariables(template, {});

      expect(result).toBe('Hello {{NAME}}');
    });
  });

  describe('parseTemplate', () => {
    it('should extract variables', () => {
      const template = 'Hello {{NAME}}, {{GREETING}}!';
      const parsed = parseTemplate(template);

      expect(parsed.variables).toContain('NAME');
      expect(parsed.variables).toContain('GREETING');
      expect(parsed.variables.length).toBe(2);
    });

    it('should deduplicate variables', () => {
      const template = '{{NAME}} {{NAME}} {{NAME}}';
      const parsed = parseTemplate(template);

      expect(parsed.variables).toEqual(['NAME']);
    });
  });

  describe('buildEvaluationPrompt', () => {
    it('should build prompt from template', () => {
      const template = 'Performance:\n{{AGENT_PERFORMANCE_DATA}}';
      const timings = {
        agent1: { duration: 30 },
      };

      const prompt = buildEvaluationPrompt(template, timings, DEFAULT_SCORE_RANGES);

      expect(prompt).toContain('Performance:');
      expect(prompt).toContain('agent1');
      expect(prompt).toContain('30s');
    });
  });

  describe('formatAgentWork', () => {
    it('should format agent work', () => {
      const files = ['file1 content', 'file2 content'];
      const work = formatAgentWork('test-agent', files);

      expect(work).toContain('=== test-agent WORK ===');
      expect(work).toContain('file1 content');
      expect(work).toContain('file2 content');
    });
  });

  describe('formatFileContent', () => {
    it('should format file content', () => {
      const formatted = formatFileContent('test.txt', 'Hello World');

      expect(formatted).toContain('--- File: test.txt ---');
      expect(formatted).toContain('Hello World');
    });
  });

  describe('combineAgentWork', () => {
    it('should combine work sections', () => {
      const sections = ['section1', 'section2', 'section3'];
      const combined = combineAgentWork(sections);

      expect(combined).toContain('section1');
      expect(combined).toContain('section2');
      expect(combined).toContain('section3');
      expect(combined).toContain('='.repeat(80));
    });
  });

  describe('buildEvaluationInput', () => {
    it('should build full evaluation input', () => {
      const input = buildEvaluationInput('prompt', 'work');

      expect(input).toContain('prompt');
      expect(input).toContain('AGENT WORK TO EVALUATE:');
      expect(input).toContain('work');
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const template = 'Data: {{AGENT_PERFORMANCE_DATA}}';
      const result = validateTemplate(template);

      expect(result._tag).toBe('Success');
    });

    it('should reject empty template', () => {
      const result = validateTemplate('   ');

      expect(result._tag).toBe('Failure');
    });

    it('should reject template without required variable', () => {
      const result = validateTemplate('No variables here');

      expect(result._tag).toBe('Failure');
    });
  });

  describe('extractSummaryStats', () => {
    it('should extract file counts', () => {
      const agentWork = {
        agent1: '--- File: test.txt ---\ncontent',
        agent2: '--- File: a.txt ---\n--- File: b.txt ---',
      };

      const stats = extractSummaryStats(agentWork);

      expect(stats.agent1).toBe(1);
      expect(stats.agent2).toBe(2);
    });
  });

  describe('formatSummaryStats', () => {
    it('should format statistics', () => {
      const stats = {
        agent1: 2,
        agent2: 5,
      };

      const formatted = formatSummaryStats(stats);

      expect(formatted).toContain('agent1: 2 files');
      expect(formatted).toContain('agent2: 5 files');
    });
  });
});
