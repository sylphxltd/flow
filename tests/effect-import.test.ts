import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';

describe('Effect Integration', () => {
  it('should import Effect successfully', () => {
    expect(Effect).toBeDefined();
    expect(Effect.succeed).toBeDefined();
  });
});
