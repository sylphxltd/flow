/**
 * Simple test to verify the new logging and error handling utilities work correctly
 */

import { ConfigurationError, ErrorHandler, ValidationError, createError } from './errors';
import { log, logger } from './logger';

// Test logging functionality
export function testLogging() {
  console.log('Testing logging utilities...');

  // Test basic logging
  log.info('Test info message', { test: true });
  log.warn('Test warning message');
  log.debug('Test debug message', { debug: true, data: { nested: 'value' } });

  // Test module logger
  const moduleLogger = logger.module('TestModule');
  moduleLogger.info('Message from test module');

  // Test child logger with context
  const childLogger = log.child({ userId: '123', action: 'test' });
  childLogger.info('Message with context');

  // Test error logging
  const testError = new Error('Test error for logging');
  log.error('Test error logging', testError, { errorCode: 'TEST_001' });

  console.log('Logging tests completed.\n');
}

// Test error handling functionality
export function testErrorHandling() {
  console.log('Testing error handling utilities...');

  try {
    // Test creating different error types
    const validationError = createError.validation('Invalid input provided', 'INVALID_INPUT', {
      field: 'email',
      value: 'invalid-email',
    });

    const _configError = new ConfigurationError(
      'Missing required configuration',
      'MISSING_CONFIG',
      {
        requiredKey: 'API_KEY',
      }
    );

    // Test error handling
    ErrorHandler.handle(validationError, { testContext: true });

    // This will exit the process, so we comment it out
    // ErrorHandler.handleAndExit(configError, { testContext: true });

    console.log('Created error objects successfully');
    console.log('Validation error:', {
      name: validationError.name,
      message: validationError.message,
      code: validationError.code,
      category: validationError.category,
      severity: validationError.severity,
    });
  } catch (error) {
    console.error('Error in test:', error);
  }

  console.log('Error handling tests completed.\n');
}

// Test Result type functionality
export function testResultType() {
  console.log('Testing Result type...');

  const { Result } = require('./errors');

  // Test successful result
  const successResult = Result.ok('test data');
  console.log('Success result:', successResult);

  // Test error result
  const errorResult = Result.error(new ValidationError('Test validation error'));
  console.log('Error result:', errorResult);

  // Test Result.fromAsync
  const asyncTest = async () => {
    const asyncResult = await Result.fromAsync(async () => {
      return 'async test data';
    });
    console.log('Async result:', asyncResult);

    // Test async error
    const asyncErrorResult = await Result.fromAsync(async () => {
      throw new Error('Async test error');
    });
    console.log('Async error result:', asyncErrorResult);
  };

  asyncTest().then(() => {
    console.log('Result type tests completed.\n');
  });
}

// Test timing functionality
export function testTiming() {
  console.log('Testing timing functionality...');

  // Test sync timing
  const result = log.timeSync(() => {
    // Simulate some work
    const sum = Array.from({ length: 1000000 }, (_, i) => i).reduce((a, b) => a + b, 0);
    return sum;
  }, 'sum calculation');

  console.log('Sync timing result:', result);

  // Test async timing
  log
    .time(async () => {
      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'async result';
    }, 'async operation')
    .then((result) => {
      console.log('Async timing result:', result);
      console.log('Timing tests completed.\n');
    });
}

// Run all tests if this file is executed directly
if (require.main === module) {
  testLogging();
  testErrorHandling();
  testResultType();
  testTiming();
}
