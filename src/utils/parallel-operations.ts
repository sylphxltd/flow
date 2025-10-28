/**
 * Parallel Operations Utility
 * Provides utilities for executing async operations in parallel with proper error handling and resource management
 */

import { ErrorHandler } from './simplified-errors.js';
import { logger } from './logger.js';

/**
 * Configuration for parallel operations
 */
export interface ParallelOptions {
  /** Maximum number of concurrent operations */
  concurrency?: number;
  /** Whether to continue on error or stop immediately */
  continueOnError?: boolean;
  /** Timeout for individual operations (ms) */
  timeout?: number;
  /** Delay between batches (ms) */
  batchDelay?: number;
  /** Progress callback */
  onProgress?: (completed: number, total: number, current?: unknown) => void;
}

/**
 * Result of a parallel operation
 */
export interface ParallelResult<T> {
  /** Successful results */
  successful: Array<{ index: number; result: T; item: unknown }>;
  /** Failed operations */
  failed: Array<{ index: number; error: Error; item: unknown }>;
  /** Total number of operations */
  total: number;
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
  /** Execution time in milliseconds */
  duration: number;
}

/**
 * Batch operation configuration
 */
export interface BatchOptions<T> extends ParallelOptions {
  /** Function to process each batch */
  processor: (batch: T[], batchIndex: number) => Promise<unknown[]>;
  /** Batch size */
  batchSize?: number;
}

/**
 * Execute operations in parallel with controlled concurrency
 */
export async function parallel<T>(
  items: unknown[],
  operation: (item: unknown, index: number) => Promise<T>,
  options: ParallelOptions = {}
): Promise<ParallelResult<T>> {
  const startTime = Date.now();
  const {
    concurrency = 10,
    continueOnError = true,
    timeout = 30000,
    onProgress
  } = options;

  logger.debug('Starting parallel operations', {
    itemCount: items.length,
    concurrency,
    continueOnError,
    timeout
  });

  const results: ParallelResult<T> = {
    successful: [],
    failed: [],
    total: items.length,
    successCount: 0,
    failureCount: 0,
    duration: 0
  };

  // Process items in batches based on concurrency limit
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, Math.min(i + concurrency, items.length));
    const batchPromises = batch.map(async (item, batchIndex) => {
      const globalIndex = i + batchIndex;

      try {
        // Add timeout to individual operations
        const operationPromise = operation(item, globalIndex);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout);
        });

        const result = await Promise.race([operationPromise, timeoutPromise]);

        results.successful.push({
          index: globalIndex,
          result,
          item
        });

        // Report progress
        if (onProgress) {
          onProgress(results.successful.length + results.failed.length, results.total, item);
        }

        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));

        results.failed.push({
          index: globalIndex,
          error: errorObj,
          item
        });

        logger.warn('Parallel operation failed', {
          index: globalIndex,
          error: errorObj.message,
          item: typeof item === 'object' ? JSON.stringify(item) : item
        });

        // Re-throw if not continuing on error
        if (!continueOnError) {
          throw errorObj;
        }

        return null;
      }
    });

    // Wait for current batch to complete
    await Promise.allSettled(batchPromises);

    // Add delay between batches if specified
    if (options.batchDelay && i + concurrency < items.length) {
      await new Promise(resolve => setTimeout(resolve, options.batchDelay));
    }
  }

  results.successCount = results.successful.length;
  results.failureCount = results.failed.length;
  results.duration = Date.now() - startTime;

  logger.info('Parallel operations completed', {
    total: results.total,
    successCount: results.successCount,
    failureCount: results.failureCount,
    duration: results.duration,
    successRate: `${((results.successCount / results.total) * 100).toFixed(1)}%`
  });

  return results;
}

/**
 * Execute operations in parallel with automatic retry for failed operations
 */
export async function parallelWithRetry<T>(
  items: unknown[],
  operation: (item: unknown, index: number) => Promise<T>,
  options: ParallelOptions & { maxRetries?: number; retryDelay?: number } = {}
): Promise<ParallelResult<T>> {
  const { maxRetries = 3, retryDelay = 1000, ...parallelOptions } = options;

  let result = await parallel(items, operation, parallelOptions);

  // Retry failed operations
  for (let attempt = 1; attempt <= maxRetries && result.failed.length > 0; attempt++) {
    logger.info(`Retrying failed operations (attempt ${attempt}/${maxRetries})`, {
      failedCount: result.failed.length,
      retryDelay
    });

    // Wait before retry
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    // Retry only failed items
    const failedItems = result.failed.map(f => f.item);
    const retryResult = await parallel(failedItems, operation, parallelOptions);

    // Merge results
    result.successful.push(...retryResult.successful);
    result.failed = retryResult.failed;
    result.successCount = result.successful.length;
    result.failureCount = result.failed.length;
  }

  return result;
}

/**
 * Process items in batches with parallel execution within each batch
 */
export async function batchParallel<T, R>(
  items: T[],
  processor: (batch: T[], batchIndex: number) => Promise<R[]>,
  options: BatchOptions<T> = {}
): Promise<R[]> {
  const {
    batchSize = 50,
    concurrency = 3,
    continueOnError = true,
    onProgress
  } = options;

  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  logger.info('Starting batch parallel processing', {
    totalItems: items.length,
    batchSize,
    batchCount: batches.length,
    concurrency
  });

  const processBatch = async (batch: T[], batchIndex: number): Promise<R[]> => {
    try {
      const result = await processor(batch, batchIndex);

      if (onProgress) {
        onProgress((batchIndex + 1) * batchSize, items.length, batch);
      }

      return result;
    } catch (error) {
      logger.error('Batch processing failed', {
        batchIndex,
        batchSize: batch.length,
        error: (error as Error).message
      });

      if (!continueOnError) {
        throw error;
      }

      return [];
    }
  };

  // Process batches in parallel
  const results = await parallel(
    batches,
    (batch, index) => processBatch(batch as T[], index),
    { concurrency, continueOnError, onProgress }
  );

  // Flatten successful results
  return results.successful.flatMap(r => r.result as R[]);
}

/**
 * Parallel map operation
 */
export async function parallelMap<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  options?: ParallelOptions
): Promise<R[]> {
  const result = await parallel(items, mapper, options);

  if (result.failureCount > 0) {
    logger.warn('parallelMap had failures', {
      total: result.total,
      failures: result.failureCount
    });
  }

  // Return results in original order
  const orderedResults = new Array(result.total);
  result.successful.forEach(({ index, result }) => {
    orderedResults[index] = result;
  });

  return orderedResults.filter(Boolean);
}

/**
 * Parallel filter operation
 */
export async function parallelFilter<T>(
  items: T[],
  predicate: (item: T, index: number) => Promise<boolean>,
  options?: ParallelOptions
): Promise<T[]> {
  const results = await parallelMap(
    items,
    async (item, index) => ({
      item,
      passes: await predicate(item, index)
    }),
    options
  );

  return results.filter(r => r.passes).map(r => r.item);
}

/**
 * Parallel reduce operation (for associative operations)
 */
export async function parallelReduce<T>(
  items: T[],
  reducer: (acc: T, item: T) => Promise<T>,
  initialValue: T,
  options?: ParallelOptions
): Promise<T> {
  if (items.length === 0) {
    return initialValue;
  }

  // For small arrays, use regular reduce
  if (items.length <= 100) {
    let result = initialValue;
    for (const item of items) {
      result = await reducer(result, item);
    }
    return result;
  }

  // For large arrays, split into chunks and reduce in parallel
  const chunkSize = Math.ceil(items.length / (options?.concurrency || 10));
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  const chunkResults = await parallelMap(
    chunks,
    async (chunk) => {
      let result = initialValue;
      for (const item of chunk) {
        result = await reducer(result, item);
      }
      return result;
    },
    options
  );

  // Combine chunk results
  let finalResult = initialValue;
  for (const chunkResult of chunkResults) {
    finalResult = await reducer(finalResult, chunkResult);
  }

  return finalResult;
}

/**
 * Execute multiple async operations in parallel and return all results
 */
export async function all<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
  const promises = operations.map(op => op());
  return Promise.all(promises);
}

/**
 * Execute multiple async operations in parallel and return first successful result
 */
export async function any<T>(operations: Array<() => Promise<T>>): Promise<T> {
  const promises = operations.map(async (op, index) => {
    try {
      return { success: true, result: await op(), index };
    } catch (error) {
      return { success: false, error, index };
    }
  });

  const results = await Promise.all(promises);
  const successful = results.find(r => r.success);

  if (successful) {
    return successful.result as T;
  }

  // If none succeeded, throw the first error
  const firstFailure = results.find(r => !r.success);
  if (firstFailure) {
    throw firstFailure.error;
  }

  throw new Error('No operations provided');
}

/**
 * Create a parallel execution queue with controlled concurrency
 */
export class ParallelQueue<T> {
  private queue: Array<{ item: T; resolve: (value: unknown) => void; reject: (error: Error) => void }> = [];
  private running = 0;
  private concurrency: number;
  private processor: (item: T) => Promise<unknown>;

  constructor(processor: (item: T) => Promise<unknown>, concurrency = 10) {
    this.processor = processor;
    this.concurrency = concurrency;
  }

  async add(item: T): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { item, resolve, reject } = this.queue.shift()!;

    try {
      const result = await this.processor(item);
      resolve(result);
    } catch (error) {
      reject(error as Error);
    } finally {
      this.running--;
      // Process next item in queue
      setImmediate(() => this.process());
    }
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.length = 0;
  }
}