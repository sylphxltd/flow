import { describe, it, expect } from 'vitest';
import * as Buffer from './buffer';

describe('streaming buffer', () => {
  describe('createBuffer', () => {
    it('should create empty buffer', () => {
      const buffer = Buffer.createBuffer();
      expect(buffer.chunks).toEqual([]);
      expect(buffer.timeout).toBeNull();
    });
  });

  describe('addChunk', () => {
    it('should add chunk to buffer', () => {
      const buffer = Buffer.createBuffer();
      const newBuffer = Buffer.addChunk(buffer, 'hello');
      expect(newBuffer.chunks).toEqual(['hello']);
    });

    it('should not mutate original buffer', () => {
      const buffer = Buffer.createBuffer();
      const newBuffer = Buffer.addChunk(buffer, 'hello');
      expect(buffer.chunks).toEqual([]);
      expect(newBuffer.chunks).toEqual(['hello']);
    });

    it('should add multiple chunks', () => {
      let buffer = Buffer.createBuffer();
      buffer = Buffer.addChunk(buffer, 'hello');
      buffer = Buffer.addChunk(buffer, ' ');
      buffer = Buffer.addChunk(buffer, 'world');
      expect(buffer.chunks).toEqual(['hello', ' ', 'world']);
    });
  });

  describe('flushBuffer', () => {
    it('should flush and return accumulated text', () => {
      let buffer = Buffer.createBuffer();
      buffer = Buffer.addChunk(buffer, 'hello');
      buffer = Buffer.addChunk(buffer, ' ');
      buffer = Buffer.addChunk(buffer, 'world');

      const [text, newBuffer] = Buffer.flushBuffer(buffer);
      expect(text).toBe('hello world');
      expect(newBuffer.chunks).toEqual([]);
    });

    it('should return empty string for empty buffer', () => {
      const buffer = Buffer.createBuffer();
      const [text, newBuffer] = Buffer.flushBuffer(buffer);
      expect(text).toBe('');
      expect(newBuffer.chunks).toEqual([]);
    });

    it('should not mutate original buffer', () => {
      let buffer = Buffer.createBuffer();
      buffer = Buffer.addChunk(buffer, 'test');

      const [, newBuffer] = Buffer.flushBuffer(buffer);
      expect(buffer.chunks).toEqual(['test']);
      expect(newBuffer.chunks).toEqual([]);
    });
  });

  describe('clearBufferTimeout', () => {
    it('should clear timeout', () => {
      const timeout = setTimeout(() => {}, 100) as unknown as NodeJS.Timeout;
      const buffer: Buffer.StreamBuffer = {
        chunks: ['test'],
        timeout,
      };

      const newBuffer = Buffer.clearBufferTimeout(buffer);
      expect(newBuffer.timeout).toBeNull();
      expect(newBuffer.chunks).toEqual(['test']);

      clearTimeout(timeout);
    });
  });

  describe('setBufferTimeout', () => {
    it('should set timeout', () => {
      const buffer = Buffer.createBuffer();
      const timeout = setTimeout(() => {}, 100) as unknown as NodeJS.Timeout;

      const newBuffer = Buffer.setBufferTimeout(buffer, timeout);
      expect(newBuffer.timeout).toBe(timeout);

      clearTimeout(timeout);
    });
  });

  describe('hasChunks', () => {
    it('should return true when buffer has chunks', () => {
      let buffer = Buffer.createBuffer();
      buffer = Buffer.addChunk(buffer, 'test');
      expect(Buffer.hasChunks(buffer)).toBe(true);
    });

    it('should return false when buffer is empty', () => {
      const buffer = Buffer.createBuffer();
      expect(Buffer.hasChunks(buffer)).toBe(false);
    });
  });

  describe('getAccumulatedText', () => {
    it('should get accumulated text without flushing', () => {
      let buffer = Buffer.createBuffer();
      buffer = Buffer.addChunk(buffer, 'hello');
      buffer = Buffer.addChunk(buffer, ' world');

      const text = Buffer.getAccumulatedText(buffer);
      expect(text).toBe('hello world');
      expect(buffer.chunks).toEqual(['hello', ' world']);
    });

    it('should return empty string for empty buffer', () => {
      const buffer = Buffer.createBuffer();
      expect(Buffer.getAccumulatedText(buffer)).toBe('');
    });
  });
});
