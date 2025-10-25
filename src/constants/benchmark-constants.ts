// Benchmark command constants
export const DEFAULT_AGENTS = ['craftsman', 'practitioner', 'craftsman-reflective', 'practitioner-reflective'];

export const DEFAULT_TASK = 'examples/benchmark-tasks/user-management-system.md';

export const DEFAULT_CONCURRENCY = 1;
export const DEFAULT_DELAY = 2; // seconds
export const DEFAULT_TIMEOUT = 3600; // 1 hour
export const DEFAULT_REPORT_DIR = 'benchmark-results';

export const PERFORMANCE_SCORE_RANGES = [
  { max: 300, score: 9, description: 'Under 5 minutes' },
  { max: 600, score: 8, description: '5-10 minutes' },
  { max: 900, score: 7, description: '10-15 minutes' },
  { max: 1200, score: 6, description: '15-20 minutes' },
  { max: 1800, score: 5, description: '20-30 minutes' },
  { max: 2400, score: 4, description: '30-40 minutes' },
  { max: 3600, score: 3, description: '40-60 minutes' },
  { max: 5400, score: 2, description: '60-90 minutes' },
  { max: Infinity, score: 1, description: 'Over 90 minutes' }
];

export const EVALUATION_CRITERIA = {
  CODE_IMPLEMENTATION: 'Code Implementation Analysis',
  FEATURE_COMPLETENESS: 'Feature Completeness',
  TESTING_QUALITY: 'Testing Quality',
  DOCUMENTATION_QUALITY: 'Documentation Quality',
  ARCHITECTURE_DESIGN: 'Architecture & Design'
} as const;

export const AGENT_DESCRIPTIONS = {
  craftsman: 'Idealistic craftsman with principles-based approach',
  practitioner: 'Pragmatic practitioner with business-focused approach',
  'craftsman-reflective': 'Idealistic craftsman with reflective questioning',
  'practitioner-reflective': 'Pragmatic practitioner with contextual decision-making'
} as const;