/**
 * Core module interfaces
 * Defines contracts for core functionality
 */

import type { AgentConfig, CommonOptions, ProcessResult } from '../shared/types/index.js';

/**
 * Core service interface
 */
export interface CoreService {
  /**
   * Initialize the core service
   */
  initialize(): Promise<void>;

  /**
   * Check if service is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Shutdown the service gracefully
   */
  shutdown(): Promise<void>;
}

/**
 * Target manager interface
 */
export interface TargetManager {
  /**
   * Get all available targets
   */
  getTargets(): string[];

  /**
   * Get target configuration
   */
  getTargetConfig(target: string): AgentConfig | null;

  /**
   * Validate target configuration
   */
  validateTarget(target: string): boolean;
}

/**
 * File processor interface
 */
export interface FileProcessor {
  /**
   * Process files with given options
   */
  processFiles(options: CommonOptions): Promise<ProcessResult[]>;

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[];

  /**
   * Validate file content
   */
  validateContent(content: string): boolean;
}

/**
 * Initialization options
 */
export interface InitializationOptions {
  /**
   * Configuration directory
   */
  configDir?: string;

  /**
   * Working directory
   */
  workingDir?: string;

  /**
   * Whether to skip validation
   */
  skipValidation?: boolean;

  /**
   * Log level
   */
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}
