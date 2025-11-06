/**
 * Debug test to trace the complete submission flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React, { useState } from 'react';
import TextInputWithHint from '../components/TextInputWithHint.js';

describe('Submit Flow Debug', () => {
  it('should trace the complete flow from keystroke to onSubmit', () => {
    const logs: string[] = [];

    const onSubmitHandler = vi.fn((value: string) => {
      logs.push(`[onSubmit] Called with: "${value}"`);
      console.log(`[TEST] onSubmit called with: "${value}"`);
    });

    const onChangeHandler = vi.fn((value: string) => {
      logs.push(`[onChange] Called with: "${value}"`);
      console.log(`[TEST] onChange called with: "${value}"`);
    });

    const TestComponent = () => {
      const [value, setValue] = useState('test message');

      return (
        <TextInputWithHint
          value={value}
          onChange={(newValue) => {
            onChangeHandler(newValue);
            setValue(newValue);
          }}
          onSubmit={onSubmitHandler}
          placeholder="Type..."
        />
      );
    };

    console.log('[TEST] Rendering component...');
    const { stdin } = render(<TestComponent />);

    console.log('[TEST] Component rendered');
    console.log('[TEST] Current logs:', logs);

    console.log('[TEST] Simulating Enter keypress...');
    stdin.write('\r');

    console.log('[TEST] After Enter keypress');
    console.log('[TEST] Final logs:', logs);
    console.log('[TEST] onSubmit call count:', onSubmitHandler.mock.calls.length);
    console.log('[TEST] onSubmit calls:', onSubmitHandler.mock.calls);

    // Verify onSubmit was called
    expect(onSubmitHandler).toHaveBeenCalled();
    expect(onSubmitHandler).toHaveBeenCalledWith('test message');
  });

  it('should test async onSubmit handler', async () => {
    const logs: string[] = [];

    const asyncHandler = vi.fn(async (value: string) => {
      logs.push(`[asyncHandler] Start: "${value}"`);
      console.log(`[TEST] asyncHandler called with: "${value}"`);

      await new Promise(resolve => setTimeout(resolve, 10));

      logs.push(`[asyncHandler] Complete: "${value}"`);
      console.log(`[TEST] asyncHandler completed`);
    });

    const { stdin } = render(
      <TextInputWithHint
        value="async test"
        onChange={vi.fn()}
        onSubmit={asyncHandler}
        placeholder="Type..."
      />
    );

    console.log('[TEST] Pressing Enter...');
    stdin.write('\r');

    console.log('[TEST] After Enter, waiting for async...');
    expect(asyncHandler).toHaveBeenCalledWith('async test');

    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('[TEST] Async completed');
  });
});
