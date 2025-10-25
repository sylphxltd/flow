export interface BenchmarkCommandOptions {
  agents?: string;
  task?: string;
  output?: string;
  context?: string;
  evaluate?: boolean;
  report?: string;
  concurrency?: number;
  delay?: number;
  timeout?: number;
  quiet?: boolean;
}

export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';

export interface AgentData {
  status: AgentStatus;
  output: string[];
  startTime?: number;
  endTime?: number;
  pid?: number;
}

export interface InitialInfo {
  agentCount: number;
  concurrency: number;
  delay: number;
  taskFile: string;
  outputDir: string;
}

export interface AgentWork {
  [key: string]: string;
}

export interface AgentTimings {
  [key: string]: {
    startTime?: number;
    endTime?: number;
    duration?: number;
  };
}

export interface TimingData {
  endTime: number;
  exitCode: number;
  stdoutLength: number;
  stderrLength: number;
}