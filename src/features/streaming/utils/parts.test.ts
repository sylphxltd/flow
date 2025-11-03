import { describe, it, expect } from 'vitest';
import * as Parts from './parts';

describe('stream parts', () => {
  describe('addTextChunk', () => {
    it('should create first text part', () => {
      const parts = Parts.addTextChunk([], 'hello');
      expect(parts).toEqual([{ type: 'text', content: 'hello' }]);
    });

    it('should append to existing text part', () => {
      let parts: Parts.StreamPart[] = [{ type: 'text', content: 'hello' }];
      parts = Parts.addTextChunk(parts, ' world');
      expect(parts).toEqual([{ type: 'text', content: 'hello world' }]);
    });

    it('should create new text part after non-text part', () => {
      const parts: Parts.StreamPart[] = [{ type: 'error', error: 'test' }];
      const newParts = Parts.addTextChunk(parts, 'hello');
      expect(newParts).toHaveLength(2);
      expect(newParts[1]).toEqual({ type: 'text', content: 'hello' });
    });
  });

  describe('upsertReasoningPart', () => {
    it('should add new reasoning part', () => {
      const parts = Parts.upsertReasoningPart([], 'thinking...');
      expect(parts).toHaveLength(1);
      expect(parts[0]).toMatchObject({
        type: 'reasoning',
        content: 'thinking...',
        completed: false,
      });
      expect(parts[0].startTime).toBeGreaterThan(0);
    });

    it('should update existing reasoning part', () => {
      const startTime = Date.now();

      let parts: Parts.StreamPart[] = [
        {
          type: 'reasoning',
          content: 'thinking...',
          completed: false,
          startTime,
        },
      ];

      parts = Parts.upsertReasoningPart(parts, 'still thinking...', true);

      expect(parts).toHaveLength(1);
      expect(parts[0]).toMatchObject({
        type: 'reasoning',
        content: 'still thinking...',
        completed: true,
        startTime,
      });
      expect((parts[0] as any).duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addToolPart', () => {
    it('should add tool call part', () => {
      const parts = Parts.addToolPart([], 'tool-1', 'read_file', { path: 'test.ts' });
      expect(parts).toHaveLength(1);
      expect(parts[0]).toMatchObject({
        type: 'tool',
        toolId: 'tool-1',
        name: 'read_file',
        status: 'running',
        args: { path: 'test.ts' },
      });
      expect(parts[0].startTime).toBeGreaterThan(0);
    });
  });

  describe('updateToolResult', () => {
    it('should update tool with result', () => {
      const startTime = Date.now();

      let parts: Parts.StreamPart[] = [
        {
          type: 'tool',
          toolId: 'tool-1',
          name: 'read_file',
          status: 'running',
          startTime,
        },
      ];

      parts = Parts.updateToolResult(parts, 'tool-1', 'file content');

      expect(parts[0]).toMatchObject({
        type: 'tool',
        toolId: 'tool-1',
        status: 'completed',
        result: 'file content',
      });
      expect((parts[0] as any).duration).toBeGreaterThanOrEqual(0);
    });

    it('should return unchanged if tool not found', () => {
      const parts: Parts.StreamPart[] = [{ type: 'text', content: 'test' }];
      const newParts = Parts.updateToolResult(parts, 'missing', 'result');
      expect(newParts).toEqual(parts);
    });
  });

  describe('updateToolError', () => {
    it('should update tool with error', () => {
      const startTime = Date.now();

      let parts: Parts.StreamPart[] = [
        {
          type: 'tool',
          toolId: 'tool-1',
          name: 'read_file',
          status: 'running',
          startTime,
        },
      ];

      parts = Parts.updateToolError(parts, 'tool-1', 'File not found');

      expect(parts[0]).toMatchObject({
        type: 'tool',
        toolId: 'tool-1',
        status: 'failed',
        error: 'File not found',
      });
      expect((parts[0] as any).duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addErrorPart', () => {
    it('should add error part', () => {
      const parts = Parts.addErrorPart([], 'Something went wrong');
      expect(parts).toEqual([{ type: 'error', error: 'Something went wrong' }]);
    });
  });

  describe('getTextContent', () => {
    it('should extract and join text parts', () => {
      const parts: Parts.StreamPart[] = [
        { type: 'text', content: 'hello' },
        { type: 'error', error: 'test' },
        { type: 'text', content: ' world' },
      ];

      expect(Parts.getTextContent(parts)).toBe('hello world');
    });

    it('should return empty string for no text parts', () => {
      const parts: Parts.StreamPart[] = [{ type: 'error', error: 'test' }];
      expect(Parts.getTextContent(parts)).toBe('');
    });
  });

  describe('hasActiveTools', () => {
    it('should return true when has running tools', () => {
      const parts: Parts.StreamPart[] = [
        {
          type: 'tool',
          toolId: 'tool-1',
          name: 'test',
          status: 'running',
          startTime: Date.now(),
        },
      ];
      expect(Parts.hasActiveTools(parts)).toBe(true);
    });

    it('should return false when no running tools', () => {
      const parts: Parts.StreamPart[] = [
        {
          type: 'tool',
          toolId: 'tool-1',
          name: 'test',
          status: 'completed',
          startTime: Date.now(),
        },
      ];
      expect(Parts.hasActiveTools(parts)).toBe(false);
    });
  });

  describe('hasErrors', () => {
    it('should return true for error parts', () => {
      const parts: Parts.StreamPart[] = [{ type: 'error', error: 'test' }];
      expect(Parts.hasErrors(parts)).toBe(true);
    });

    it('should return true for failed tools', () => {
      const parts: Parts.StreamPart[] = [
        {
          type: 'tool',
          toolId: 'tool-1',
          name: 'test',
          status: 'failed',
          error: 'Failed',
          startTime: Date.now(),
        },
      ];
      expect(Parts.hasErrors(parts)).toBe(true);
    });

    it('should return false when no errors', () => {
      const parts: Parts.StreamPart[] = [{ type: 'text', content: 'test' }];
      expect(Parts.hasErrors(parts)).toBe(false);
    });
  });
});
