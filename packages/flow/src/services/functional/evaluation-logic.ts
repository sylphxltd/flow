/**
 * Business logic for evaluation service
 * Pure functions for evaluation processing
 *
 * DESIGN RATIONALE:
 * - Pure functions for data transformation
 * - Testable without file system or child processes
 * - Clear separation of I/O and logic
 * - Composable evaluation pipeline
 */

import type { FileSystemError } from '../../core/functional/error-types.js';
import { fileSystemError } from '../../core/functional/error-types.js';
import { pipe } from '../../core/functional/pipe.js';
import type { Result } from '../../core/functional/result.js';
import { failure, success } from '../../core/functional/result.js';
import { Arr, Obj, Str } from '../../utils/functional/index.js';

/**
 * Domain types
 */

export interface AgentTiming {
  duration: number;
}

export interface AgentTimings {
  [agentName: string]: AgentTiming;
}

export interface PerformanceScoreRange {
  max: number;
  score: number;
  label: string;
}

export interface AgentPerformanceData {
  agent: string;
  duration: number;
  score: number;
  label: string;
}

export interface EvaluationTemplate {
  content: string;
  variables: string[];
}

/**
 * Pure functions for timing processing
 */

/**
 * Parse duration from execution time text
 */
export const parseDuration = (content: string): number => {
  const match = content.match(/Duration:\s*(\d+)\s*seconds/);
  return match ? Number.parseInt(match[1], 10) : 0;
};

/**
 * Parse timing from JSON
 */
export const parseTimingJSON = (content: string): Result<AgentTiming, FileSystemError> => {
  try {
    const data = JSON.parse(content);
    return success({ duration: data.duration || 0 });
  } catch (error) {
    return failure(
      fileSystemError('Failed to parse timing JSON', '', 'read', {
        cause: error instanceof Error ? error : undefined,
      })
    );
  }
};

/**
 * Find performance score range for duration
 */
export const findScoreRange = (
  duration: number,
  ranges: PerformanceScoreRange[]
): PerformanceScoreRange => {
  const found = ranges.find((range) => duration <= range.max);
  return found || ranges[ranges.length - 1];
};

/**
 * Calculate agent performance data
 */
export const calculatePerformance = (
  agentName: string,
  timing: AgentTiming,
  scoreRanges: PerformanceScoreRange[]
): AgentPerformanceData => {
  const scoreRange = findScoreRange(timing.duration, scoreRanges);
  return {
    agent: agentName,
    duration: timing.duration,
    score: scoreRange.score,
    label: scoreRange.label,
  };
};

/**
 * Format agent performance as string
 */
export const formatPerformance = (data: AgentPerformanceData): string => {
  return `- ${data.agent}: ${data.duration}s execution time (Performance: ${data.score}/10)`;
};

/**
 * Generate performance data section
 */
export const generatePerformanceSection = (
  timings: AgentTimings,
  scoreRanges: PerformanceScoreRange[]
): string => {
  return pipe(
    Obj.entries(timings),
    Arr.map(([agent, timing]) => calculatePerformance(agent, timing, scoreRanges)),
    Arr.map(formatPerformance),
    Str.join('\n')
  );
};

/**
 * Template variable replacement (pure)
 */
export const replaceTemplateVariables = (
  template: string,
  variables: Record<string, string>
): string => {
  let result = template;

  for (const [key, value] of Obj.entries(variables)) {
    const placeholder = `{{${String(key)}}}`;
    result = Str.replaceAll(placeholder, value)(result);
  }

  return result;
};

/**
 * Parse template and find variables
 */
export const parseTemplate = (content: string): EvaluationTemplate => {
  const variablePattern = /\{\{([A-Z_]+)\}\}/g;
  const variables: string[] = [];

  let match;
  while ((match = variablePattern.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return {
    content,
    variables,
  };
};

/**
 * Build evaluation prompt from template
 */
export const buildEvaluationPrompt = (
  template: string,
  timings: AgentTimings,
  scoreRanges: PerformanceScoreRange[]
): string => {
  const performanceData = generatePerformanceSection(timings, scoreRanges);

  return replaceTemplateVariables(template, {
    AGENT_PERFORMANCE_DATA: performanceData,
  });
};

/**
 * Format agent work content
 */
export const formatAgentWork = (agentName: string, files: string[]): string => {
  const header = `=== ${agentName} WORK ===\n\n`;
  const fileContents = files.map((content) => content).join('\n');
  return header + fileContents;
};

/**
 * Format file content
 */
export const formatFileContent = (fileName: string, content: string): string => {
  return `\n--- File: ${fileName} ---\n${content}\n`;
};

/**
 * Combine agent work sections
 */
export const combineAgentWork = (workSections: string[]): string => {
  const separator = `\n${'='.repeat(80)}\n`;
  return workSections.join(separator);
};

/**
 * Build full evaluation input
 */
export const buildEvaluationInput = (prompt: string, agentWork: string): string => {
  return `${prompt}\n\nAGENT WORK TO EVALUATE:\n${agentWork}`;
};

/**
 * Validate evaluation template
 */
export const validateTemplate = (template: string): Result<string, FileSystemError> => {
  if (Str.isBlank(template)) {
    return failure(fileSystemError('Template is empty', '', 'read'));
  }

  const parsed = parseTemplate(template);
  if (!parsed.variables.includes('AGENT_PERFORMANCE_DATA')) {
    return failure(
      fileSystemError('Template missing required variable: AGENT_PERFORMANCE_DATA', '', 'read')
    );
  }

  return success(template);
};

/**
 * Extract summary statistics from agent work
 */
export const extractSummaryStats = (agentWork: Record<string, string>): Record<string, number> => {
  return pipe(
    Obj.entries(agentWork),
    Arr.map(([agent, content]) => {
      const fileCount = (content.match(/--- File: /g) || []).length;
      return [agent, fileCount] as [string, number];
    }),
    Obj.fromEntries
  );
};

/**
 * Format summary statistics
 */
export const formatSummaryStats = (stats: Record<string, number>): string => {
  return pipe(
    Obj.entries(stats),
    Arr.map(([agent, count]) => `${agent}: ${count} files created`),
    Str.join('\n')
  );
};

/**
 * Parse evaluation output (extract sections)
 */
export const parseEvaluationOutput = (
  output: string
): {
  sections: Array<{ title: string; content: string }>;
} => {
  const sections: Array<{ title: string; content: string }> = [];
  const lines = Str.lines(output);

  let currentSection: { title: string; content: string } | null = null;

  for (const line of lines) {
    if (line.startsWith('##')) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/^##\s*/, '').trim(),
        content: '',
      };
    } else if (currentSection) {
      currentSection.content += `${line}\n`;
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return { sections };
};

/**
 * Default performance score ranges
 */
export const DEFAULT_SCORE_RANGES: PerformanceScoreRange[] = [
  { max: 30, score: 10, label: 'Excellent' },
  { max: 60, score: 8, label: 'Good' },
  { max: 120, score: 6, label: 'Fair' },
  { max: 240, score: 4, label: 'Slow' },
  { max: Number.POSITIVE_INFINITY, score: 2, label: 'Very Slow' },
];
