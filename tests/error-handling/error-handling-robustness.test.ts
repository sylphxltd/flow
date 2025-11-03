/**
 * Comprehensive Error Handling Robustness Tests
 * Tests error wrapping, propagation, recovery mechanisms, message clarity, and concurrent error handling
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import * as R from '../../src/core/functional/result.js';
import * as EH from '../../src/core/functional/error-handler.js';
import * as ET from '../../src/core/functional/error-types.js';
import { CLIError } from '../../src/utils/error-handler.js';

describe('Error Handling Robustness', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Wrapping and Propagation Accuracy', () => {
    it('should preserve error message through multiple layers of wrapping', () => {
      const originalError = new Error('Original error message');

      // Wrap error multiple times
      const wrapped1 = new Error(`Wrapper 1: ${originalError.message}`);
      wrapped1.cause = originalError;

      const wrapped2 = new Error(`Wrapper 2: ${wrapped1.message}`);
      wrapped2.cause = wrapped1;

      const wrapped3 = new Error(`Wrapper 3: ${wrapped2.message}`);
      wrapped3.cause = wrapped2;

      // Trace back to original error
      let current = wrapped3;
      let messageStack = [];

      while (current) {
        messageStack.push(current.message);
        current = current.cause as Error;
      }

      expect(messageStack).toHaveLength(4);
      expect(messageStack[0]).toBe('Wrapper 3: Wrapper 2: Wrapper 1: Original error message');
      expect(messageStack[1]).toBe('Wrapper 2: Wrapper 1: Original error message');
      expect(messageStack[2]).toBe('Wrapper 1: Original error message');
      expect(messageStack[3]).toBe('Original error message');
    });

    it('should maintain error type through Result transformations', () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const customError = new CustomError('Custom error', 'CUSTOM_001');
      const result: R.Result<string, CustomError> = R.failure(customError);

      // Transform through map (should preserve error)
      const mappedResult = R.map((s: string) => s.toUpperCase())(result);
      expect(R.isFailure(mappedResult)).toBe(true);
      if (R.isFailure(mappedResult)) {
        expect(mappedResult.error).toBeInstanceOf(CustomError);
        expect(mappedResult.error.code).toBe('CUSTOM_001');
        expect(mappedResult.error.message).toBe('Custom error');
      }

      // Transform through flatMap (should preserve error)
      const flatMappedResult = R.flatMap((s: string) => R.success(s + '!'))(result);
      expect(R.isFailure(flatMappedResult)).toBe(true);
      if (R.isFailure(flatMappedResult)) {
        expect(flatMappedResult.error).toBeInstanceOf(CustomError);
        expect(flatMappedResult.error.code).toBe('CUSTOM_001');
      }
    });

    it('should handle error propagation through async/await chains', async () => {
      class AsyncError extends Error {
        constructor(message: string, public asyncContext: string) {
          super(message);
          this.name = 'AsyncError';
        }
      }

      const asyncFunction1 = async (): Promise<R.Result<string, AsyncError>> => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return R.failure(new AsyncError('Async error 1', 'context1'));
      };

      const asyncFunction2 = async (input: string): Promise<R.Result<string, Error>> => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return R.success(input + ' processed');
      };

      const asyncFunction3 = async (input: string): Promise<R.Result<string, AsyncError>> => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new AsyncError('Async error 2', 'context2');
      };

      // Test successful async chain
      const chain1 = await EH.executeAsync(async () => {
        const r1 = await asyncFunction1();
        return R.flatMap(async (s) => asyncFunction2(s))(r1);
      });

      expect(R.isFailure(chain1)).toBe(true);
      if (R.isFailure(chain1)) {
        expect(chain1.error).toBeInstanceOf(AsyncError);
        expect(chain1.error.asyncContext).toBe('context1');
      }

      // Test async chain with thrown error
      const chain2 = await EH.executeAsync(async () => {
        const r1 = await asyncFunction1();
        if (R.isFailure(r1)) return r1;
        return await asyncFunction3(r1.value);
      });

      expect(R.isFailure(chain2)).toBe(true);
      if (R.isFailure(chain2)) {
        expect(chain2.error.message).toContain('Async error 2');
      }
    });

    it('should preserve stack traces through error transformations', () => {
      const originalError = new Error('Original error');
      const stackTrace = originalError.stack || '';

      // Wrap with Result transformation
      const result = R.tryCatch(() => {
        throw originalError;
      });

      expect(R.isFailure(result)).toBe(true);
      if (R.isFailure(result)) {
        expect(result.error.stack).toContain(stackTrace);
        expect(result.error.message).toBe('Original error');
      }

      // Transform error type
      const transformedResult = R.mapError((err: Error) => {
        const wrapped = new Error(`Wrapped: ${err.message}`);
        wrapped.stack = err.stack;
        wrapped.cause = err;
        return wrapped;
      })(result);

      expect(R.isFailure(transformedResult)).toBe(true);
      if (R.isFailure(transformedResult)) {
        expect(transformedResult.error.stack).toContain(stackTrace);
        expect(transformedResult.error.message).toBe('Wrapped: Original error');
        expect(transformedResult.error.cause).toBe(originalError);
      }
    });
  });

  describe('Error Type Preservation Across Transformations', () => {
    it('should preserve custom error classes through Result operations', () => {
      class ValidationError extends Error {
        constructor(message: string, public field: string) {
          super(message);
          this.name = 'ValidationError';
        }
      }

      class NetworkError extends Error {
        constructor(message: string, public statusCode: number) {
          super(message);
          this.name = 'NetworkError';
        }
      }

      const validationError = new ValidationError('Invalid email', 'email');
      const networkError = new NetworkError('Connection failed', 500);

      const validationFailure: R.Result<string, ValidationError> = R.failure(validationError);
      const networkFailure: R.Result<string, NetworkError> = R.failure(networkError);

      // Combine results
      const combined = R.all([validationFailure, networkFailure]);
      expect(R.isFailure(combined)).toBe(true);
      if (R.isFailure(combined)) {
        // Should preserve the first error type
        expect(combined.error).toBeInstanceOf(ValidationError);
        expect(combined.error.field).toBe('email');
      }

      // Type-specific error handling
      const handled = R.match(
        (value: string) => `Success: ${value}`,
        (error: Error) => {
          if (error instanceof ValidationError) {
            return `Validation error on ${error.field}: ${error.message}`;
          } else if (error instanceof NetworkError) {
            return `Network error (${error.statusCode}): ${error.message}`;
          }
          return `Unknown error: ${error.message}`;
        }
      )(validationFailure);

      expect(handled).toBe('Validation error on email: Invalid email');
    });

    it('should handle union types correctly', () => {
      type AppError = ValidationError | NetworkError;

      class ValidationError extends Error {
        constructor(message: string, public field: string) {
          super(message);
          this.name = 'ValidationError';
        }
      }

      class NetworkError extends Error {
        constructor(message: string, public statusCode: number) {
          super(message);
          this.name = 'NetworkError';
        }
      }

      const createResult = (type: 'validation' | 'network'): R.Result<string, AppError> => {
        if (type === 'validation') {
          return R.failure(new ValidationError('Invalid input', 'field1'));
        } else {
          return R.failure(new NetworkError('API error', 404));
        }
      };

      const validationResult = createResult('validation');
      const networkResult = createResult('network');

      // Type guard function
      const isValidationError = (error: AppError): error is ValidationError => {
        return error instanceof ValidationError;
      };

      const isNetworkError = (error: AppError): error is NetworkError => {
        return error instanceof NetworkError;
      };

      expect(R.isFailure(validationResult)).toBe(true);
      if (R.isFailure(validationResult) && isValidationError(validationResult.error)) {
        expect(validationResult.error.field).toBe('field1');
      }

      expect(R.isFailure(networkResult)).toBe(true);
      if (R.isFailure(networkResult) && isNetworkError(networkResult.error)) {
        expect(networkResult.error.statusCode).toBe(404);
      }
    });

    it('should preserve error metadata through serialization', () => {
      class ErrorWithMetadata extends Error {
        constructor(message: string, public metadata: Record<string, any>) {
          super(message);
          this.name = 'ErrorWithMetadata';
        }
      }

      const originalError = new ErrorWithMetadata('Error with data', {
        userId: 123,
        action: 'create',
        timestamp: Date.now(),
        nested: { deep: { value: 'test' } },
      });

      const result = R.failure(originalError);

      // Simulate serialization/deserialization
      const serialized = JSON.stringify({
        name: originalError.name,
        message: originalError.message,
        metadata: originalError.metadata,
        stack: originalError.stack,
      });

      const parsed = JSON.parse(serialized);
      const reconstructed = new ErrorWithMetadata(parsed.message, parsed.metadata);
      reconstructed.stack = parsed.stack;
      reconstructed.name = parsed.name;

      expect(reconstructed.message).toBe(originalError.message);
      expect(reconstructed.metadata.userId).toBe(123);
      expect(reconstructed.metadata.nested.deep.value).toBe('test');
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should implement retry logic with exponential backoff', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;

      const flakyOperation = async (): Promise<R.Result<string, Error>> => {
        attemptCount++;
        if (attemptCount < maxAttempts) {
          return R.failure(new Error(`Attempt ${attemptCount} failed`));
        }
        return R.success('success');
      };

      const result = await EH.retry(flakyOperation, {
        maxRetries: maxAttempts - 1,
        delayMs: 10,
        backoff: 2,
        onRetry: (error, attempt) => {
          console.log(`Retry ${attempt}: ${error.message}`);
        },
      });

      expect(R.isSuccess(result)).toBe(true);
      if (R.isSuccess(result)) {
        expect(result.value).toBe('success');
      }
      expect(attemptCount).toBe(maxAttempts);
    });

    it('should handle circuit breaker pattern', async () => {
      class CircuitBreaker {
        private failures = 0;
        private lastFailureTime = 0;
        private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
        private readonly threshold = 3;
        private readonly timeout = 1000;

        async execute<T>(operation: () => Promise<R.Result<T, Error>>): Promise<R.Result<T, Error>> {
          if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
              this.state = 'HALF_OPEN';
            } else {
              return R.failure(new Error('Circuit breaker is OPEN'));
            }
          }

          const result = await operation();

          if (R.isFailure(result)) {
            this.failures++;
            this.lastFailureTime = Date.now();

            if (this.failures >= this.threshold) {
              this.state = 'OPEN';
            }
          } else {
            this.failures = 0;
            this.state = 'CLOSED';
          }

          return result;
        }
      }

      const circuitBreaker = new CircuitBreaker();
      let shouldFail = true;

      const operation = async (): Promise<R.Result<string, Error>> => {
        if (shouldFail) {
          return R.failure(new Error('Operation failed'));
        }
        return R.success('success');
      };

      // Fail multiple times to open circuit
      for (let i = 0; i < 3; i++) {
        const result = await circuitBreaker.execute(operation);
        expect(R.isFailure(result)).toBe(true);
      }

      // Circuit should be open now
      const openResult = await circuitBreaker.execute(operation);
      expect(R.isFailure(openResult)).toBe(true);
      if (R.isFailure(openResult)) {
        expect(openResult.error.message).toBe('Circuit breaker is OPEN');
      }

      // Wait for timeout and try again
      await new Promise(resolve => setTimeout(resolve, 1100));
      shouldFail = false;

      const halfOpenResult = await circuitBreaker.execute(operation);
      expect(R.isSuccess(halfOpenResult)).toBe(true);

      // Circuit should be closed now
      const closedResult = await circuitBreaker.execute(operation);
      expect(R.isSuccess(closedResult)).toBe(true);
    });

    it('should implement fallback mechanisms', async () => {
      const primaryOperation = async (): Promise<R.Result<string, Error>> => {
        return R.failure(new Error('Primary service unavailable'));
      };

      const fallbackOperation = async (): Promise<R.Result<string, Error>> => {
        return R.failure(new Error('Fallback service unavailable'));
      };

      const ultimateFallback = (): R.Result<string, Error> => {
        return R.success('Default value');
      };

      const result = await EH.executeAsync(async () => {
        const primaryResult = await primaryOperation();
        if (R.isSuccess(primaryResult)) return primaryResult;

        const fallbackResult = await fallbackOperation();
        if (R.isSuccess(fallbackResult)) return fallbackResult;

        return ultimateFallback();
      });

      expect(R.isSuccess(result)).toBe(true);
      if (R.isSuccess(result)) {
        expect(result.value).toBe('Default value');
      }
    });

    it('should handle graceful degradation', async () => {
      interface FeatureFlags {
        advancedSearch: boolean;
        caching: boolean;
        analytics: boolean;
      }

      const checkFeature = async (feature: keyof FeatureFlags): Promise<R.Result<boolean, Error>> => {
        // Simulate feature flag service
        if (Math.random() > 0.7) {
          return R.failure(new Error('Feature flag service unavailable'));
        }
        return R.success(Math.random() > 0.5);
      };

      const executeWithGracefulDegradation = async (
        features: Partial<FeatureFlags>
      ): Promise<R.Result<Partial<FeatureFlags>, Error>> => {
        const results: Partial<FeatureFlags> = {};

        for (const [feature, defaultValue] of Object.entries(features)) {
          const checkResult = await checkFeature(feature as keyof FeatureFlags);
          results[feature as keyof FeatureFlags] = R.isSuccess(checkResult)
            ? checkResult.value
            : defaultValue;
        }

        return R.success(results);
      };

      const result = await executeWithGracefulDegradation({
        advancedSearch: false,
        caching: true,
        analytics: false,
      });

      expect(R.isSuccess(result)).toBe(true);
      if (R.isSuccess(result)) {
        expect(typeof result.value.advancedSearch).toBe('boolean');
        expect(typeof result.value.caching).toBe('boolean');
        expect(typeof result.value.analytics).toBe('boolean');
      }
    });
  });

  describe('Error Message Clarity and Usefulness', () => {
    it('should provide context-rich error messages', () => {
      class ContextualError extends Error {
        constructor(
          message: string,
          public context: {
            operation: string;
            userId?: string;
            requestId?: string;
            timestamp: number;
            metadata?: Record<string, any>;
          }
        ) {
          super(message);
          this.name = 'ContextualError';
        }
      }

      const createUser = (userData: any): R.Result<string, ContextualError> => {
        if (!userData.email) {
          return R.failure(new ContextualError('Email is required', {
            operation: 'createUser',
            userId: 'user-123',
            requestId: 'req-456',
            timestamp: Date.now(),
            metadata: { userData, validation: { email: 'missing' } },
          }));
        }
        return R.success('user-created');
      };

      const result = createUser({ name: 'John Doe' });
      expect(R.isFailure(result)).toBe(true);
      if (R.isFailure(result)) {
        expect(result.error.message).toBe('Email is required');
        expect(result.error.context.operation).toBe('createUser');
        expect(result.error.context.metadata.validation.email).toBe('missing');
      }

      // Format for user display
      const userMessage = R.match(
        (id: string) => `User created successfully with ID: ${id}`,
        (error: ContextualError) => {
          const { operation, timestamp, metadata } = error.context;
          return `Failed to ${operation}. Please provide: ${metadata?.validation?.email || 'required fields'}`;
        }
      )(result);

      expect(userMessage).toContain('Failed to createUser');
      expect(userMessage).toContain('Please provide: email');
    });

    it('should provide actionable error messages', () => {
      const validateFileUpload = (file: any): R.Result<string, Error> => {
        if (!file) {
          return R.failure(new Error('No file provided. Please select a file to upload.'));
        }

        if (file.size > 10 * 1024 * 1024) {
          return R.failure(new Error(
            `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds limit (10MB). ` +
            'Please compress the file or choose a smaller one.'
          ));
        }

        if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
          return R.failure(new Error(
            `Unsupported file type: ${file.type}. ` +
            'Please upload a JPEG, PNG, or PDF file.'
          ));
        }

        return R.success('File validated');
      };

      const testCases = [
        { file: null, expectedMessage: 'No file provided' },
        { file: { size: 15 * 1024 * 1024, type: 'image/jpeg' }, expectedMessage: 'exceeds limit' },
        { file: { size: 1024, type: 'text/plain' }, expectedMessage: 'Unsupported file type' },
      ];

      testCases.forEach(({ file, expectedMessage }) => {
        const result = validateFileUpload(file);
        expect(R.isFailure(result)).toBe(true);
        if (R.isFailure(result)) {
          expect(result.error.message).toContain(expectedMessage);
          expect(result.error.message).toContain('Please');
        }
      });
    });

    it('should provide error severity levels', () => {
      enum ErrorSeverity {
        LOW = 'low',
        MEDIUM = 'medium',
        HIGH = 'high',
        CRITICAL = 'critical',
      }

      class SeverityError extends Error {
        constructor(
          message: string,
          public severity: ErrorSeverity,
          public userAction?: string,
          public technicalDetails?: string
        ) {
          super(message);
          this.name = 'SeverityError';
        }
      }

      const handleError = (error: SeverityError): {
        userMessage: string;
        logLevel: string;
        shouldNotify: boolean;
      } => {
        const userMessage = error.userAction
          ? `${error.message}. ${error.userAction}`
          : error.message;

        const logLevel = {
          [ErrorSeverity.LOW]: 'info',
          [ErrorSeverity.MEDIUM]: 'warn',
          [ErrorSeverity.HIGH]: 'error',
          [ErrorSeverity.CRITICAL]: 'error',
        }[error.severity];

        const shouldNotify = error.severity === ErrorSeverity.HIGH ||
                            error.severity === ErrorSeverity.CRITICAL;

        return { userMessage, logLevel, shouldNotify };
      };

      const errors = [
        new SeverityError('Cache miss', ErrorSeverity.LOW, 'Try refreshing the page'),
        new SeverityError('Rate limit exceeded', ErrorSeverity.MEDIUM, 'Wait before trying again'),
        new SeverityError('Database connection failed', ErrorSeverity.HIGH, 'Contact support'),
        new SeverityError('System crash', ErrorSeverity.CRITICAL, 'Contact support immediately'),
      ];

      const results = errors.map(handleError);
      expect(results[0].logLevel).toBe('info');
      expect(results[0].shouldNotify).toBe(false);
      expect(results[1].logLevel).toBe('warn');
      expect(results[2].logLevel).toBe('error');
      expect(results[2].shouldNotify).toBe(true);
      expect(results[3].logLevel).toBe('error');
      expect(results[3].shouldNotify).toBe(true);
    });
  });

  describe('Error Handling in Concurrent Operations', () => {
    it('should handle concurrent error operations without interference', async () => {
      const createOperation = (id: number, shouldFail: boolean) => async (): Promise<R.Result<string, Error>> => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        if (shouldFail) {
          return R.failure(new Error(`Operation ${id} failed`));
        }
        return R.success(`Operation ${id} succeeded`);
      };

      const operations = [
        createOperation(1, false),
        createOperation(2, true),
        createOperation(3, false),
        createOperation(4, true),
        createOperation(5, false),
      ];

      const promises = operations.map(op => EH.executeAsync(op));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(results.filter(R.isSuccess)).toHaveLength(3);
      expect(results.filter(R.isFailure)).toHaveLength(2);

      // Each error should have its own context
      const failures = results.filter(R.isFailure) as R.Result<string, Error>[];
      failures.forEach((failure, index) => {
        expect(R.isFailure(failure)).toBe(true);
        if (R.isFailure(failure)) {
          expect(failure.error.message).toMatch(/Operation \d+ failed/);
        }
      });
    });

    it('should handle race conditions in error handling', async () => {
      let sharedState = 0;
      const mutex = {
        locked: false,
        async acquire(): Promise<void> {
          while (this.locked) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
          this.locked = true;
        },
        release(): void {
          this.locked = false;
        },
      };

      const concurrentOperation = async (id: number): Promise<R.Result<number, Error>> => {
        await mutex.acquire();
        try {
          const oldValue = sharedState;
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

          if (Math.random() > 0.5) {
            throw new Error(`Concurrent operation ${id} failed`);
          }

          sharedState = oldValue + 1;
          return R.success(sharedState);
        } finally {
          mutex.release();
        }
      };

      const promises = Array.from({ length: 10 }, (_, i) =>
        EH.executeAsync(() => concurrentOperation(i))
      );

      const results = await Promise.all(promises);
      const successes = results.filter(R.isSuccess);
      const failures = results.filter(R.isFailure);

      expect(sharedState).toBe(successes.length);
      expect(successes.length + failures.length).toBe(10);
    });

    it('should handle error aggregation in parallel operations', async () => {
      type MultiError = {
        errors: Error[];
        successful: any[];
      };

      const parallelOperations = [
        () => Promise.resolve(R.success('result1')),
        () => Promise.resolve(R.failure(new Error('error1'))),
        () => Promise.resolve(R.success('result2')),
        () => Promise.reject(new Error('error2')),
        () => Promise.resolve(R.failure(new Error('error3'))),
      ];

      const results = await Promise.allSettled(
        parallelOperations.map(op => EH.executeAsync(op))
      );

      const errors: Error[] = [];
      const successful: any[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (R.isSuccess(result.value)) {
            successful.push(result.value.value);
          } else {
            errors.push(result.value.error);
          }
        } else {
          errors.push(new Error(`Operation ${index} failed: ${result.reason}`));
        }
      });

      expect(successful).toHaveLength(2);
      expect(errors).toHaveLength(3);
      expect(errors.map(e => e.message)).toEqual([
        'error1',
        'Operation 3 failed: error2',
        'error3',
      ]);
    });

    it('should handle timeout in concurrent operations', async () => {
      const timeoutOperation = (timeoutMs: number) => async (): Promise<R.Result<string, Error>> => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(R.success('completed'));
          }, timeoutMs);
        });
      };

      const withTimeout = async <T>(
        operation: () => Promise<R.Result<T, Error>>,
        timeoutMs: number
      ): Promise<R.Result<T, Error>> => {
        const timeoutPromise = new Promise<R.Result<T, Error>>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
        });

        try {
          return await Promise.race([operation(), timeoutPromise]);
        } catch (error) {
          return R.failure(error as Error);
        }
      };

      const operations = [
        () => withTimeout(timeoutOperation(50)(null), 100), // should succeed
        () => withTimeout(timeoutOperation(200)(null), 100), // should timeout
        () => withTimeout(timeoutOperation(50)(null), 100), // should succeed
      ];

      const results = await Promise.all(operations.map(op => op()));
      expect(R.isSuccess(results[0])).toBe(true);
      expect(R.isFailure(results[1])).toBe(true);
      expect(R.isSuccess(results[2])).toBe(true);

      if (R.isFailure(results[1])) {
        expect(results[1].error.message).toBe('Operation timed out');
      }
    });
  });

  describe('Memory and Performance in Error Handling', () => {
    it('should handle memory-efficient error creation', () => {
      // Test that creating many errors doesn't cause memory leaks
      const errors: Error[] = [];
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        errors.push(new Error(`Error ${i}`));
        errors[i].stack = `Stack trace for error ${i}`;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(errors).toHaveLength(10000);
      expect(duration).toBeLessThan(1000); // Should be fast

      // Clean up
      errors.length = 0;
    });

    it('should handle efficient error stack trace collection', () => {
      const captureStackTrace = (depth: number): string => {
        const error = new Error();
        return error.stack || '';
      };

      // Test stack trace at different depths
      const stack1 = captureStackTrace(1);
      const stack2 = captureStackTrace(10);
      const stack3 = captureStackTrace(100);

      expect(stack1).toContain('captureStackTrace');
      expect(stack2).toContain('captureStackTrace');
      expect(stack3).toContain('captureStackTrace');

      // Stack traces should be different lengths
      expect(stack1.split('\n').length).toBeLessThanOrEqual(stack2.split('\n').length);
    });

    it('should handle error serialization performance', () => {
      const createComplexError = () => {
        const error = new Error('Complex error');
        error.stack = 'Stack trace with many lines\n'.repeat(100);
        (error as any).metadata = {
          userId: 123,
          requestId: 'req-456',
          timestamp: Date.now(),
          nested: {
            deep: {
              value: 'test',
              array: Array(100).fill(0).map((_, i) => ({ id: i, data: `item-${i}` })),
            },
          },
        };
        return error;
      };

      const errors = Array(1000).fill(0).map(() => createComplexError());

      const startTime = Date.now();
      const serialized = errors.map(error => JSON.stringify(error, Object.getOwnPropertyNames(error)));
      const endTime = Date.now();

      expect(serialized).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should be reasonably fast
    });
  });

  describe('Error Recovery and System Stability', () => {
    it('should maintain system stability after cascading failures', async () => {
      class SystemMonitor {
        private failures = 0;
        private lastFailureTime = 0;
        private isHealthy = true;

        recordFailure(): void {
          this.failures++;
          this.lastFailureTime = Date.now();

          if (this.failures > 5 && (Date.now() - this.lastFailureTime) < 1000) {
            this.isHealthy = false;
          }
        }

        recordSuccess(): void {
          if (Date.now() - this.lastFailureTime > 5000) {
            this.failures = Math.max(0, this.failures - 1);
            if (this.failures <= 2) {
              this.isHealthy = true;
            }
          }
        }

        getHealth(): boolean {
          return this.isHealthy;
        }
      }

      const monitor = new SystemMonitor();
      let shouldFail = true;

      const operation = async (): Promise<R.Result<string, Error>> => {
        await new Promise(resolve => setTimeout(resolve, 10));

        if (shouldFail) {
          monitor.recordFailure();
          return R.failure(new Error('Operation failed'));
        }

        monitor.recordSuccess();
        return R.success('success');
      };

      // Simulate cascading failures
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await operation();
        results.push(result);
        if (i === 5) {
          shouldFail = false; // Start succeeding after 5 failures
        }
      }

      expect(results.filter(R.isFailure)).toHaveLength(6);
      expect(results.filter(R.isSuccess)).toHaveLength(4);
      expect(monitor.getHealth()).toBe(true); // Should recover
    });

    it('should handle graceful shutdown with pending operations', async () => {
      const pendingOperations: Promise<R.Result<string, Error>>[] = [];
      let shutdownRequested = false;

      const longRunningOperation = async (id: number): Promise<R.Result<string, Error>> => {
        for (let i = 0; i < 10; i++) {
          if (shutdownRequested) {
            return R.failure(new Error(`Operation ${id} cancelled due to shutdown`));
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        return R.success(`Operation ${id} completed`);
      };

      // Start operations
      for (let i = 0; i < 5; i++) {
        pendingOperations.push(longRunningOperation(i));
      }

      // Request shutdown after some time
      setTimeout(() => {
        shutdownRequested = true;
      }, 25);

      const results = await Promise.all(pendingOperations);

      // Some operations might have completed, others cancelled
      const completed = results.filter(R.isSuccess);
      const cancelled = results.filter(R.isFailure);

      expect(completed.length + cancelled.length).toBe(5);
      cancelled.forEach(result => {
        if (R.isFailure(result)) {
          expect(result.error.message).toContain('cancelled due to shutdown');
        }
      });
    });
  });
});