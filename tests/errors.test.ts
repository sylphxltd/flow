import { Effect } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import * as Errors from '../src/errors';

describe('Error Handling', () => {
  it('should handle InfraError correctly', () => {
    const program = Effect.fail(Errors.InfraError({ message: 'Test infra error' }));

    // This should fail because InfraError is not defined yet
    const error = Effect.runSync(program.pipe(Effect.catchAllError(Effect.succeed))); expect(error).toBeDefined(); expect(error.message).toBe('Test infra error');
  });

  it('should handle DomainError correctly', () => {
    const program = Effect.fail(Errors.DomainError({ message: 'Test domain error' }));

    const error = Effect.runSync(program.pipe(Effect.catchAllError(Effect.succeed))); expect(error).toBeDefined(); expect(error.message).toBe('Test infra error');
  });

  it('should handle AppError correctly', () => {
    const program = Effect.fail(Errors.AppError({ message: 'Test app error' }));

    const error = Effect.runSync(program.pipe(Effect.catchAllError(Effect.succeed))); expect(error).toBeDefined(); expect(error.message).toBe('Test infra error');
  });
});
