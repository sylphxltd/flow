/**
 * Migration examples showing how to replace console statements with the new logging system
 * This file serves as documentation and examples for refactoring the remaining 356 console statements
 */

import { ErrorHandler, createError } from './errors';
import { log, logger } from './logger';

// Example 1: Simple console.log replacement
// Before:
// console.log('Processing file:', filename);

// After:
export const processFile = (filename: string) => {
  log.info('Processing file', { filename });
  // ... processing logic
};

// Example 2: Console.error with error handling
// Before:
// try {
//   await riskyOperation();
// } catch (error) {
//   console.error('Operation failed:', error.message);
//   process.exit(1);
// }

// After:
export const processWithErrorHandling = async () => {
  try {
    await riskyOperation();
    log.info('Operation completed successfully');
  } catch (error) {
    ErrorHandler.handleAndExit(error, { operation: 'riskyOperation' });
  }
};

// Example 3: Console.warn with context
// Before:
// console.warn('Deprecated API used:', apiName);

// After:
export const handleDeprecatedAPI = (apiName: string, alternative?: string) => {
  log.warn('Deprecated API used', { apiName, alternative });
};

// Example 4: Debug logging
// Before:
// if (process.env.DEBUG) {
//   console.log('Debug info:', data);
// }

// After:
export const debugLog = (data: any) => {
  log.debug('Debug info', { data });
};

// Example 5: Console grouping and organization
// Before:
// console.log('=== Database Migration ===');
// console.log('Connecting to database...');
// // ... connection logic
// console.log('Running migrations...');
// // ... migration logic
// console.log('=== Migration Complete ===');

// After:
export const runMigration = async () => {
  const migrationLogger = logger.module('Migration');

  migrationLogger.info('Starting database migration');

  try {
    migrationLogger.debug('Connecting to database');
    await connectToDatabase();

    migrationLogger.info('Running migrations');
    await runMigrations();

    migrationLogger.info('Migration completed successfully');
  } catch (error) {
    migrationLogger.error('Migration failed', error as Error);
    throw error;
  }
};

// Example 6: Structured logging with timing
// Before:
// const start = Date.now();
// console.log('Starting expensive operation...');
// await expensiveOperation();
// console.log(`Operation completed in ${Date.now() - start}ms`);

// After:
export const performExpensiveOperation = async () => {
  return await log.time(
    async () => {
      // ... expensive operation logic
      return result;
    },
    'expensive operation',
    { operationType: 'data-processing' }
  );
};

// Example 7: Error context building
// Before:
// try {
//   await processData(data);
// } catch (error) {
//   console.error(`Failed to process data for user ${userId}:`, error.message);
//   if (error.code) {
//     console.error('Error code:', error.code);
//   }
// }

// After:
export const processDataWithUser = async (data: any, userId: string) => {
  try {
    await processData(data);
    log.info('Data processed successfully', { userId });
  } catch (error) {
    const context = ErrorContext.create()
      .add('userId', userId)
      .add('dataSize', data?.length || 0)
      .add('timestamp', new Date().toISOString())
      .build();

    const standardError = ErrorHandler.handle(error, context);
    throw standardError;
  }
};

// Example 8: Progress logging
// Before:
// for (let i = 0; i < items.length; i++) {
//   console.log(`Processing item ${i + 1}/${items.length}`);
//   await processItem(items[i]);
// }

// After:
export const processItemsWithProgress = async (items: any[]) => {
  const processingLogger = logger.module('ItemProcessor');

  processingLogger.info('Starting batch processing', { totalItems: items.length });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    processingLogger.debug('Processing item', {
      current: i + 1,
      total: items.length,
      itemId: item.id,
    });

    try {
      await processItem(item);

      if ((i + 1) % 10 === 0 || i === items.length - 1) {
        processingLogger.info('Batch progress', {
          processed: i + 1,
          total: items.length,
          percentage: Math.round(((i + 1) / items.length) * 100),
        });
      }
    } catch (error) {
      processingLogger.error('Failed to process item', error as Error, {
        itemId: item.id,
        index: i,
      });
      throw error;
    }
  }

  processingLogger.info('Batch processing completed', { totalProcessed: items.length });
};

// Example 9: Configuration validation logging
// Before:
// if (!config.apiKey) {
//   console.error('API key is required');
//   process.exit(1);
// }
// console.log('Configuration loaded successfully');

// After:
export const validateAndLoadConfig = (config: any) => {
  const configLogger = logger.module('Config');

  if (!config.apiKey) {
    const error = createError.configuration('API key is required', 'MISSING_API_KEY', {
      configKeys: Object.keys(config),
    });
    ErrorHandler.handleAndExit(error);
  }

  configLogger.info('Configuration loaded successfully', {
    hasApiKey: !!config.apiKey,
    environment: config.environment,
  });
};

// Example 10: Service operation logging
// Before:
// console.log(`Connecting to service at ${serviceUrl}`);
// const response = await fetch(serviceUrl);
// if (!response.ok) {
//   console.error(`Service returned ${response.status}: ${response.statusText}`);
// }
// console.log('Service operation completed');

// After:
export const performServiceOperation = async (serviceUrl: string) => {
  const serviceLogger = logger.module('Service');

  serviceLogger.info('Connecting to service', { serviceUrl });

  try {
    const response = await fetch(serviceUrl);

    if (!response.ok) {
      const error = createError.network(
        `Service returned ${response.status}: ${response.statusText}`,
        'SERVICE_HTTP_ERROR',
        {
          serviceUrl,
          status: response.status,
          statusText: response.statusText,
        }
      );
      throw error;
    }

    serviceLogger.info('Service operation completed', {
      serviceUrl,
      status: response.status,
    });

    return await response.json();
  } catch (error) {
    if (error instanceof Error && !(error instanceof BaseError)) {
      serviceLogger.error('Service connection failed', error, { serviceUrl });
      throw createError.network(
        `Failed to connect to service: ${error.message}`,
        'SERVICE_CONNECTION_ERROR',
        { serviceUrl },
        error
      );
    }
    throw error;
  }
};

// Helper function for examples
async function riskyOperation(): Promise<void> {
  // Mock implementation
}

async function connectToDatabase(): Promise<void> {
  // Mock implementation
}

async function runMigrations(): Promise<void> {
  // Mock implementation
}

async function processData(data: any): Promise<void> {
  // Mock implementation
}

async function processItem(item: any): Promise<void> {
  // Mock implementation
}

// Import required for BaseError reference
import { BaseError } from './errors';
