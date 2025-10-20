import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Log from '@effect/log';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Infra from '../../src/layers/infra.layer';
import { pipe } from 'effect/Function';
import { withLogSpan } from '../../src/layers/log.layer';

describe('Logging Integration', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should log info message in program', async () => {
    const program = pipe(
      Infra.program,
      Effect.flatMap(() => Log.log('Test log message'))
    );

    await Effect.runPromise(Effect.provide(program, Infra.infraLayer));

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('INFO Infra layer initialized'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test log message'));
  });

  it('should use log span', async () => {
    const spanned = withLogSpan('Test span')(
      Log.log('Inside span')
    );

    await Effect.runPromise(Effect.provide(spanned, Infra.infraLayer));

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('span=Test span'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Inside span'));
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });
});
