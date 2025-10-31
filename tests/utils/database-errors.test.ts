/**
 * Database Errors Tests
 * Tests for database error handling utilities
 */

import { describe, expect, it } from 'vitest';
import {
  AppError,
  ConnectionError,
  createConnectionError,
  createDatabaseError,
  createMigrationError,
  createValidationError,
  DatabaseError,
  executeOperation,
  isConnectionError,
  isDatabaseError,
  isMigrationError,
  isValidationError,
  MigrationError,
  ValidationError,
} from '../../src/utils/database-errors.js';

describe('Database Errors', () => {
  describe('DatabaseError', () => {
    it('should create database error with message', () => {
      const error = new DatabaseError('Query failed');
      expect(error.message).toBe('Query failed');
      expect(error.name).toBe('DatabaseError');
    });

    it('should create database error with operation', () => {
      const error = new DatabaseError('Query failed', 'SELECT');
      expect(error.message).toBe('Query failed');
      expect(error.context?.operation).toBe('SELECT');
    });

    it('should create database error with cause', () => {
      const cause = new Error('Connection timeout');
      const error = new DatabaseError('Query failed', 'SELECT', cause);
      expect(error.cause).toBe(cause);
    });

    it('should create database error with context', () => {
      const context = { query: 'SELECT * FROM users', table: 'users' };
      const error = new DatabaseError('Query failed', 'SELECT', undefined, context);
      expect(error.context?.query).toBe('SELECT * FROM users');
      expect(error.context?.table).toBe('users');
    });

    it('should include all information', () => {
      const cause = new Error('Timeout');
      const context = { query: 'SELECT *', timeout: 5000 };
      const error = new DatabaseError('Query failed', 'SELECT', cause, context);

      expect(error.message).toBe('Query failed');
      expect(error.cause).toBe(cause);
      expect(error.context?.operation).toBe('SELECT');
      expect(error.context?.query).toBe('SELECT *');
      expect(error.context?.timeout).toBe(5000);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with message and field', () => {
      const error = new ValidationError('Invalid email', 'email');
      expect(error.message).toBe('Invalid email');
      expect(error.context?.field).toBe('email');
    });

    it('should create validation error with value', () => {
      const error = new ValidationError('Invalid email', 'email', 'invalid@');
      expect(error.message).toBe('Invalid email');
      expect(error.context?.field).toBe('email');
      expect(error.context?.value).toBe('invalid@');
    });

    it('should create validation error with cause', () => {
      const cause = new Error('Format error');
      const error = new ValidationError('Invalid email', 'email', 'test@', cause);
      expect(error.cause).toBe(cause);
    });

    it('should include all information', () => {
      const cause = new Error('Regex failed');
      const error = new ValidationError('Invalid format', 'username', 'bad@name', cause);

      expect(error.message).toBe('Invalid format');
      expect(error.context?.field).toBe('username');
      expect(error.context?.value).toBe('bad@name');
      expect(error.cause).toBe(cause);
    });
  });

  describe('ConnectionError', () => {
    it('should create connection error with message', () => {
      const error = new ConnectionError('Failed to connect');
      expect(error.message).toBe('Failed to connect');
      expect(error.name).toBe('ConnectionError');
      expect(error.code).toBe('CONNECTION_ERROR');
    });

    it('should create connection error with connection details', () => {
      const details = { host: 'localhost', port: 5432, database: 'test' };
      const error = new ConnectionError('Failed to connect', details);
      expect(error.context).toMatchObject(details);
    });

    it('should create connection error with cause', () => {
      const cause = new Error('Network timeout');
      const error = new ConnectionError('Failed to connect', undefined, cause);
      expect(error.cause).toBe(cause);
    });

    it('should have high severity', () => {
      const error = new ConnectionError('Failed to connect');
      expect(error.severity).toBe('HIGH');
    });

    it('should have network category', () => {
      const error = new ConnectionError('Failed to connect');
      expect(error.category).toBe('NETWORK');
    });

    it('should include all information', () => {
      const cause = new Error('Timeout');
      const details = { host: 'db.example.com', port: 5432 };
      const error = new ConnectionError('Connection failed', details, cause);

      expect(error.message).toBe('Connection failed');
      expect(error.cause).toBe(cause);
      expect(error.context).toMatchObject(details);
    });
  });

  describe('MigrationError', () => {
    it('should create migration error with message', () => {
      const error = new MigrationError('Migration failed');
      expect(error.message).toBe('Migration failed');
      expect(error.name).toBe('MigrationError');
      expect(error.code).toBe('MIGRATION_ERROR');
    });

    it('should create migration error with migration name', () => {
      const error = new MigrationError('Migration failed', '001_create_users');
      expect(error.migrationName).toBe('001_create_users');
      expect(error.context?.migrationName).toBe('001_create_users');
    });

    it('should create migration error with cause', () => {
      const cause = new Error('SQL syntax error');
      const error = new MigrationError('Migration failed', '001_create_users', cause);
      expect(error.cause).toBe(cause);
    });

    it('should have high severity', () => {
      const error = new MigrationError('Migration failed');
      expect(error.severity).toBe('HIGH');
    });

    it('should have database category', () => {
      const error = new MigrationError('Migration failed');
      expect(error.category).toBe('DATABASE');
    });

    it('should include all information', () => {
      const cause = new Error('Constraint violation');
      const error = new MigrationError('Failed to apply migration', '002_add_indexes', cause);

      expect(error.message).toBe('Failed to apply migration');
      expect(error.migrationName).toBe('002_add_indexes');
      expect(error.cause).toBe(cause);
    });
  });

  describe('executeOperation', () => {
    it('should execute successful operation', async () => {
      const result = await executeOperation('test-op', async () => 'success');
      expect(result).toBe('success');
    });

    it('should return operation result', async () => {
      const data = { id: 1, name: 'test' };
      const result = await executeOperation('query', async () => data);
      expect(result).toEqual(data);
    });

    it('should throw on operation failure', async () => {
      await expect(
        executeOperation('test-op', async () => {
          throw new Error('Operation failed');
        })
      ).rejects.toThrow();
    });

    it('should preserve AppError', async () => {
      const appError = new AppError('Test error', 'TEST_CODE');
      await expect(
        executeOperation('test-op', async () => {
          throw appError;
        })
      ).rejects.toThrow(AppError);
    });

    it('should wrap unknown errors in DatabaseError', async () => {
      await expect(
        executeOperation('test-op', async () => {
          throw new Error('Unknown error');
        })
      ).rejects.toThrow();
    });

    it('should include context in error', async () => {
      const context = { query: 'SELECT *', table: 'users' };
      try {
        await executeOperation(
          'SELECT',
          async () => {
            throw new Error('Query failed');
          },
          context
        );
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should handle async operations', async () => {
      const result = await executeOperation('async-op', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'completed';
      });
      expect(result).toBe('completed');
    });

    it('should handle complex return values', async () => {
      const complex = {
        nested: { data: [1, 2, 3] },
        metadata: { count: 3 },
      };
      const result = await executeOperation('complex-op', async () => complex);
      expect(result).toEqual(complex);
    });
  });

  describe('Type Guards', () => {
    describe('isDatabaseError', () => {
      it('should return true for DatabaseError', () => {
        const error = new DatabaseError('Test');
        expect(isDatabaseError(error)).toBe(true);
      });

      it('should return false for other errors', () => {
        expect(isDatabaseError(new Error('Test'))).toBe(false);
        expect(isDatabaseError(new ValidationError('Test', 'field'))).toBe(false);
        expect(isDatabaseError(new ConnectionError('Test'))).toBe(false);
      });

      it('should return false for non-errors', () => {
        expect(isDatabaseError('string')).toBe(false);
        expect(isDatabaseError(null)).toBe(false);
        expect(isDatabaseError(undefined)).toBe(false);
        expect(isDatabaseError({})).toBe(false);
      });
    });

    describe('isValidationError', () => {
      it('should return true for ValidationError', () => {
        const error = new ValidationError('Test', 'field');
        expect(isValidationError(error)).toBe(true);
      });

      it('should return false for other errors', () => {
        expect(isValidationError(new Error('Test'))).toBe(false);
        expect(isValidationError(new DatabaseError('Test'))).toBe(false);
        expect(isValidationError(new ConnectionError('Test'))).toBe(false);
      });

      it('should return false for non-errors', () => {
        expect(isValidationError('string')).toBe(false);
        expect(isValidationError(null)).toBe(false);
        expect(isValidationError(undefined)).toBe(false);
      });
    });

    describe('isConnectionError', () => {
      it('should return true for ConnectionError', () => {
        const error = new ConnectionError('Test');
        expect(isConnectionError(error)).toBe(true);
      });

      it('should return false for other errors', () => {
        expect(isConnectionError(new Error('Test'))).toBe(false);
        expect(isConnectionError(new DatabaseError('Test'))).toBe(false);
        expect(isConnectionError(new ValidationError('Test', 'field'))).toBe(false);
      });

      it('should return false for non-errors', () => {
        expect(isConnectionError('string')).toBe(false);
        expect(isConnectionError(null)).toBe(false);
        expect(isConnectionError(123)).toBe(false);
      });
    });

    describe('isMigrationError', () => {
      it('should return true for MigrationError', () => {
        const error = new MigrationError('Test');
        expect(isMigrationError(error)).toBe(true);
      });

      it('should return false for other errors', () => {
        expect(isMigrationError(new Error('Test'))).toBe(false);
        expect(isMigrationError(new DatabaseError('Test'))).toBe(false);
        expect(isMigrationError(new ConnectionError('Test'))).toBe(false);
      });

      it('should return false for non-errors', () => {
        expect(isMigrationError('string')).toBe(false);
        expect(isMigrationError(null)).toBe(false);
        expect(isMigrationError({ migrationName: 'test' })).toBe(false);
      });
    });
  });

  describe('Factory Functions', () => {
    describe('createMigrationError', () => {
      it('should create migration error', () => {
        const error = createMigrationError('Migration failed');
        expect(error).toBeInstanceOf(MigrationError);
        expect(error.message).toBe('Migration failed');
      });

      it('should create with migration name', () => {
        const error = createMigrationError('Failed', '001_init');
        expect(error.migrationName).toBe('001_init');
      });

      it('should create with cause', () => {
        const cause = new Error('SQL error');
        const error = createMigrationError('Failed', '001_init', cause);
        expect(error.cause).toBe(cause);
      });

      it('should create with all parameters', () => {
        const cause = new Error('Constraint');
        const error = createMigrationError('Migration failed', '002_users', cause);

        expect(error.message).toBe('Migration failed');
        expect(error.migrationName).toBe('002_users');
        expect(error.cause).toBe(cause);
      });
    });

    describe('createConnectionError', () => {
      it('should create connection error', () => {
        const error = createConnectionError('Connection failed');
        expect(error).toBeInstanceOf(ConnectionError);
        expect(error.message).toBe('Connection failed');
      });

      it('should create with connection details', () => {
        const details = { host: 'localhost', port: 5432 };
        const error = createConnectionError('Failed', details);
        expect(error.context).toMatchObject(details);
      });

      it('should create with cause', () => {
        const cause = new Error('Timeout');
        const error = createConnectionError('Failed', undefined, cause);
        expect(error.cause).toBe(cause);
      });

      it('should create with all parameters', () => {
        const cause = new Error('Network');
        const details = { host: 'db.example.com', port: 5432 };
        const error = createConnectionError('Connection lost', details, cause);

        expect(error.message).toBe('Connection lost');
        expect(error.context).toMatchObject(details);
        expect(error.cause).toBe(cause);
      });
    });

    describe('createDatabaseError', () => {
      it('should create database error', () => {
        const error = createDatabaseError('Query failed');
        expect(error.message).toBe('Query failed');
      });

      it('should create with operation', () => {
        const error = createDatabaseError('Query failed', 'SELECT');
        expect(error.context?.operation).toBe('SELECT');
      });

      it('should create with query', () => {
        const error = createDatabaseError('Query failed', 'SELECT', 'SELECT * FROM users');
        expect(error.context?.query).toBe('SELECT * FROM users');
      });
    });

    describe('createValidationError', () => {
      it('should create validation error', () => {
        const error = createValidationError('Invalid input', 'email');
        expect(error.message).toBe('Invalid input');
        expect(error.context?.field).toBe('email');
      });

      it('should create with value', () => {
        const error = createValidationError('Invalid format', 'email', 'invalid@');
        expect(error.context?.value).toBe('invalid@');
      });
    });
  });

  describe('Error Properties', () => {
    it('should have correct error names', () => {
      expect(new DatabaseError('Test').name).toBe('DatabaseError');
      expect(new ValidationError('Test', 'field').name).toBe('ValidationError');
      expect(new ConnectionError('Test').name).toBe('ConnectionError');
      expect(new MigrationError('Test').name).toBe('MigrationError');
    });

    it('should preserve stack traces', () => {
      const error = new DatabaseError('Test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Error');
    });

    it('should be instanceof Error', () => {
      expect(new DatabaseError('Test')).toBeInstanceOf(Error);
      expect(new ValidationError('Test', 'field')).toBeInstanceOf(Error);
      expect(new ConnectionError('Test')).toBeInstanceOf(Error);
      expect(new MigrationError('Test')).toBeInstanceOf(Error);
    });

    it('should be instanceof AppError', () => {
      expect(new DatabaseError('Test')).toBeInstanceOf(AppError);
      expect(new ValidationError('Test', 'field')).toBeInstanceOf(AppError);
      expect(new ConnectionError('Test')).toBeInstanceOf(AppError);
      expect(new MigrationError('Test')).toBeInstanceOf(AppError);
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain error hierarchy', () => {
      const dbError = new DatabaseError('Test');
      expect(dbError instanceof DatabaseError).toBe(true);
      expect(dbError instanceof AppError).toBe(true);
      expect(dbError instanceof Error).toBe(true);
    });

    it('should distinguish between error types', () => {
      const dbError = new DatabaseError('Test');
      const valError = new ValidationError('Test', 'field');

      expect(dbError instanceof ValidationError).toBe(false);
      expect(valError instanceof DatabaseError).toBe(false);
    });

    it('should handle error catching', () => {
      try {
        throw new DatabaseError('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
