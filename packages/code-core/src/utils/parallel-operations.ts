/**
 * Parallel Operations Utility
 * Provides utilities for executing async operations in parallel with proper error handling and resource management
 */

import { chunk } from './functional/array.js';
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
  const { concurrency = 10, continueOnError = true, timeout = 30000, onProgress } = options;

  logger.debug('Starting parallel operations', {
    itemCount: items.length,
    concurrency,
    continueOnError,
    timeout,
  });

  // FUNCTIONAL: Use chunk and reduce to accumulate results instead of imperative loop
  const batches = chunk(concurrency)(items);

  const results = await batches.reduce<Promise<ParallelResult<T>>>(
    async (accPromise, batch, batchIdx) => {
      const acc = await accPromise;

      const batchPromises = batch.map(async (item, batchIndex) => {
        const globalIndex = batchIdx * concurrency + batchIndex;

        try {
          // Add timeout to individual operations
          const operationPromise = operation(item, globalIndex);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout);
          });

          const result = await Promise.race([operationPromise, timeoutPromise]);

          // Report progress
          if (onProgress) {
            onProgress(acc.successCount + acc.failureCount + 1, items.length, item);
          }

          return { success: true as const, index: globalIndex, result, item };
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));

          logger.warn('Parallel operation failed', {
            index: globalIndex,
            error: errorObj.message,
            item: typeof item === 'object' ? JSON.stringify(item) : item,
          });

          // Re-throw if not continuing on error
          if (!continueOnError) {
            throw errorObj;
          }

          return { success: false as const, index: globalIndex, error: errorObj, item };
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);

      // FUNCTIONAL: Partition results into successful/failed
      const newSuccessful = batchResults
        .filter((r) => r.success)
        .map((r) => ({ index: r.index, result: r.result, item: r.item }));
      const newFailed = batchResults
        .filter((r) => !r.success)
        .map((r) => ({ index: r.index, error: r.error, item: r.item }));

      // Add delay between batches if specified
      if (options.batchDelay && batchIdx < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, options.batchDelay!));
      }

      return {
        successful: [...acc.successful, ...newSuccessful],
        failed: [...acc.failed, ...newFailed],
        total: items.length,
        successCount: acc.successCount + newSuccessful.length,
        failureCount: acc.failureCount + newFailed.length,
        duration: 0, // Will be set after reduce completes
      };
    },
    Promise.resolve({
      successful: [],
      failed: [],
      total: items.length,
      successCount: 0,
      failureCount: 0,
      duration: 0,
    })
  );

  // Set final duration
  results.duration = Date.now() - startTime;

  logger.info('Parallel operations completed', {
    total: results.total,
    successCount: results.successCount,
    failureCount: results.failureCount,
    duration: results.duration,
    successRate: `${((results.successCount / results.total) * 100).toFixed(1)}%`,
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

  const result = await parallel(items, operation, parallelOptions);

  // FUNCTIONAL: Retry failed operations using reduce instead of for loop
  const attempts = Array.from({ length: maxRetries }, (_, i) => i + 1);

  const finalResult = await attempts.reduce<Promise<ParallelResult<T>>>(
    async (accPromise, attempt) => {
      const acc = await accPromise;

      if (acc.failed.length === 0) {
        return acc; // No more failures to retry
      }

      logger.info(`Retrying failed operations (attempt ${attempt}/${maxRetries})`, {
        failedCount: acc.failed.length,
        retryDelay,
      });

      // Wait before retry
      if (retryDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      // Retry only failed items
      const failedItems = acc.failed.map((f) => f.item);
      const retryResult = await parallel(failedItems, operation, parallelOptions);

      // Merge results immutably
      return {
        successful: [...acc.successful, ...retryResult.successful],
        failed: retryResult.failed,
        total: acc.total,
        successCount: acc.successful.length + retryResult.successful.length,
        failureCount: retryResult.failed.length,
        duration: acc.duration,
      };
    },
    Promise.resolve(result)
  );

  return finalResult;
}

/**
 * Process items in batches with parallel execution within each batch
 */
export async function batchParallel<T, R>(
  items: T[],
  processor: (batch: T[], batchIndex: number) => Promise<R[]>,
  options: BatchOptions<T> = {}
): Promise<R[]> {
  const { batchSize = 50, concurrency = 3, continueOnError = true, onProgress } = options;

  // FUNCTIONAL: Use chunk utility instead of for loop
  const batches = chunk(batchSize)(items);

  logger.info('Starting batch parallel processing', {
    totalItems: items.length,
    batchSize,
    batchCount: batches.length,
    concurrency,
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
        error: (error as Error).message,
      });

      if (!continueOnError) {
        throw error;
      }

      return [];
    }
  };

  // Process batches in parallel
  const results = await parallel(batches, (batch, index) => processBatch(batch as T[], index), {
    concurrency,
    continueOnError,
    onProgress,
  });

  // Flatten successful results
  return results.successful.flatMap((r) => r.result as R[]);
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
      failures: result.failureCount,
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
      passes: await predicate(item, index),
    }),
    options
  );

  return results.filter((r) => r.passes).map((r) => r.item);
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
    // FUNCTIONAL: Use reduce instead of for-of loop
    return await items.reduce(async (accPromise, item) => {
      const acc = await accPromise;
      return await reducer(acc, item);
    }, Promise.resolve(initialValue));
  }

  // For large arrays, split into chunks and reduce in parallel
  const chunkSize = Math.ceil(items.length / (options?.concurrency || 10));

  // FUNCTIONAL: Use chunk utility instead of for loop
  const chunks = chunk(chunkSize)(items);

  const chunkResults = await parallelMap(
    chunks,
    async (chunkItems) => {
      // FUNCTIONAL: Use reduce instead of for-of loop
      return await chunkItems.reduce(async (accPromise, item) => {
        const acc = await accPromise;
        return await reducer(acc, item);
      }, Promise.resolve(initialValue));
    },
    options
  );

  // FUNCTIONAL: Combine chunk results using reduce instead of for-of loop
  return await chunkResults.reduce(async (accPromise, chunkResult) => {
    const acc = await accPromise;
    return await reducer(acc, chunkResult);
  }, Promise.resolve(initialValue));
}

/**
 * Execute multiple async operations in parallel and return all results
 */
export async function all<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
  const promises = operations.map((op) => op());
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
  const successful = results.find((r) => r.success);

  if (successful) {
    return successful.result as T;
  }

  // If none succeeded, throw the first error
  const firstFailure = results.find((r) => !r.success);
  if (firstFailure) {
    throw firstFailure.error;
  }

  throw new Error('No operations provided');
}

/**
 * Parallel queue interface
 */
export interface ParallelQueueInstance<T> {
  add(item: T): Promise<unknown>;
  size(): number;
  clear(): void;
}

/**
 * Create a parallel execution queue with controlled concurrency
 */
export function createParallelQueue<T>(
  processor: (item: T) => Promise<unknown>,
  concurrency = 10
): ParallelQueueInstance<T> {
  // Closure-based state
  const queue: Array<{
    item: T;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  let running = 0;

  const process = async (): Promise<void> => {
    if (running >= concurrency || queue.length === 0) {
      return;
    }

    running++;
    const { item, resolve, reject } = queue.shift()!;

    try {
      const result = await processor(item);
      resolve(result);
    } catch (error) {
      reject(error as Error);
    } finally {
      running--;
      // Process next item in queue
      setImmediate(() => process());
    }
  };

  const add = async (item: T): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      queue.push({ item, resolve, reject });
      process();
    });
  };

  const size = (): number => {
    return queue.length;
  };

  const clear = (): void => {
    queue.length = 0;
  };

  return {
    add,
    size,
    clear,
  };
}

/**
 * @deprecated Use createParallelQueue() for new code
 */
export class ParallelQueue<T> {
  private instance: ParallelQueueInstance<T>;

  constructor(processor: (item: T) => Promise<unknown>, concurrency = 10) {
    this.instance = createParallelQueue(processor, concurrency);
  }

  async add(item: T): Promise<unknown> {
    return this.instance.add(item);
  }

  size(): number {
    return this.instance.size();
  }

  clear(): void {
    return this.instance.clear();
  }
}
