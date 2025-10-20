import React from 'react';
import TestRenderer from 'react-test-renderer';
import { vi } from 'vitest';
import { FullscreenMemoryTUI } from '../../src/components/FullscreenMemoryTUI';

// Mock libsql-storage
vi.mock('../../src/utils/libsql-storage', () => {
  const mockEntries = [
    {
      namespace: 'default',
      key: 'test-key',
      value: { data: 'test' },
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }
  ];
  return {
    LibSQLMemoryStorage: vi.fn(() => ({
      getAll: vi.fn().mockResolvedValue(mockEntries),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
    })),
  };
});

// Mock ink components and hooks to prevent unmount and allow string matching
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useApp: vi.fn(() => ({ exit: vi.fn() })),
    useInput: vi.fn(),
    Text: vi.fn(({ children }) => children),
    Box: vi.fn(({ children }) => Array.isArray(children) ? children.flat() : children),
    render: vi.fn(),
  };
});

const InkText = vi.mocked(require('ink').Text);
const InkBox = vi.mocked(require('ink').Box);

describe('FullscreenMemoryTUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders the memory manager title', () => {
    const renderer = TestRenderer.create(<FullscreenMemoryTUI />);
    const json = renderer.toJSON();
    expect(json).toContain('🧠 Memory Manager');
  });

  it('shows loading message initially and loaded message after fetch', async () => {
    const renderer = TestRenderer.create(<FullscreenMemoryTUI />);

    // Initial loading
    let json = renderer.toJSON();
    expect(json).toContain('Loading...');

    // Advance timers to run useEffect and async
    vi.runAllTimers();
    await vi.waitFor(() => {
      renderer.update(<FullscreenMemoryTUI />);
    });

    // Run the async resolve
    vi.runAllTimers();

    json = renderer.toJSON();
    expect(json).toContain('Loaded 1 entries');
    expect(json).toContain('1. default:test-key');
  });
});
