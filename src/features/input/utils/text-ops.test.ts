import { describe, it, expect } from 'vitest';
import * as TextOps from './text-ops';

describe('text operations', () => {
  describe('insertText', () => {
    it('should insert text at cursor position', () => {
      const result = TextOps.insertText('hello world', 5, ' beautiful');
      expect(result.text).toBe('hello beautiful world');
      expect(result.cursor).toBe(15);
    });

    it('should insert at start', () => {
      const result = TextOps.insertText('world', 0, 'hello ');
      expect(result.text).toBe('hello world');
      expect(result.cursor).toBe(6);
    });

    it('should insert at end', () => {
      const result = TextOps.insertText('hello', 5, ' world');
      expect(result.text).toBe('hello world');
      expect(result.cursor).toBe(11);
    });
  });

  describe('deleteCharLeft', () => {
    it('should delete character before cursor', () => {
      const result = TextOps.deleteCharLeft('hello', 5);
      expect(result.text).toBe('hell');
      expect(result.cursor).toBe(4);
    });

    it('should not delete at position 0', () => {
      const result = TextOps.deleteCharLeft('hello', 0);
      expect(result.text).toBe('hello');
      expect(result.cursor).toBe(0);
    });
  });

  describe('deleteCharRight', () => {
    it('should delete character at cursor', () => {
      const result = TextOps.deleteCharRight('hello', 2);
      expect(result.text).toBe('helo');
      expect(result.cursor).toBe(2);
    });

    it('should not delete at end', () => {
      const result = TextOps.deleteCharRight('hello', 5);
      expect(result.text).toBe('hello');
      expect(result.cursor).toBe(5);
    });
  });

  describe('deleteToStart', () => {
    it('should delete from start to cursor', () => {
      const result = TextOps.deleteToStart('hello world', 5);
      expect(result.text).toBe(' world');
      expect(result.cursor).toBe(0);
      expect(result.deleted).toBe('hello');
    });

    it('should handle cursor at start', () => {
      const result = TextOps.deleteToStart('hello', 0);
      expect(result.text).toBe('hello');
      expect(result.cursor).toBe(0);
      expect(result.deleted).toBe('');
    });
  });

  describe('deleteToEnd', () => {
    it('should delete from cursor to end', () => {
      const result = TextOps.deleteToEnd('hello world', 5);
      expect(result.text).toBe('hello');
      expect(result.cursor).toBe(5);
      expect(result.deleted).toBe(' world');
    });

    it('should handle cursor at end', () => {
      const result = TextOps.deleteToEnd('hello', 5);
      expect(result.text).toBe('hello');
      expect(result.cursor).toBe(5);
      expect(result.deleted).toBe('');
    });
  });

  describe('deleteWordLeft', () => {
    it('should delete word before cursor', () => {
      const result = TextOps.deleteWordLeft('hello world', 11, 6); // word starts at 6
      expect(result.text).toBe('hello ');
      expect(result.cursor).toBe(6);
      expect(result.deleted).toBe('world');
    });

    it('should handle cursor at start', () => {
      const result = TextOps.deleteWordLeft('hello', 0, 0);
      expect(result.text).toBe('hello');
      expect(result.cursor).toBe(0);
      expect(result.deleted).toBe('');
    });
  });

  describe('deleteWordRight', () => {
    it('should delete word after cursor', () => {
      const result = TextOps.deleteWordRight('hello world', 0, 5); // word ends at 5
      expect(result.text).toBe(' world');
      expect(result.cursor).toBe(0);
      expect(result.deleted).toBe('hello');
    });

    it('should handle cursor at end', () => {
      const result = TextOps.deleteWordRight('hello', 5, 5);
      expect(result.text).toBe('hello');
      expect(result.cursor).toBe(5);
      expect(result.deleted).toBe('');
    });
  });

  describe('transposeChars', () => {
    it('should swap characters before and at cursor', () => {
      const result = TextOps.transposeChars('hello', 2);
      expect(result.text).toBe('hlelo');
      expect(result.cursor).toBe(3);
    });

    it('should handle cursor at end', () => {
      const result = TextOps.transposeChars('hello', 5);
      expect(result.text).toBe('helol');
      expect(result.cursor).toBe(5);
    });

    it('should not transpose with less than 2 chars', () => {
      const result = TextOps.transposeChars('h', 1);
      expect(result.text).toBe('h');
      expect(result.cursor).toBe(1);
    });

    it('should not transpose at position 0', () => {
      const result = TextOps.transposeChars('hello', 0);
      expect(result.text).toBe('hello');
      expect(result.cursor).toBe(0);
    });
  });

  describe('yankText', () => {
    it('should paste text at cursor', () => {
      const result = TextOps.yankText('hello world', 5, ' beautiful');
      expect(result.text).toBe('hello beautiful world');
      expect(result.cursor).toBe(15);
    });

    it('should handle empty kill buffer', () => {
      const result = TextOps.yankText('hello', 5, '');
      expect(result.text).toBe('hello');
      expect(result.cursor).toBe(5);
    });
  });

  describe('normalizeLineEndings', () => {
    it('should normalize \\r\\n to \\n', () => {
      expect(TextOps.normalizeLineEndings('hello\r\nworld')).toBe('hello\nworld');
    });

    it('should normalize \\r to \\n', () => {
      expect(TextOps.normalizeLineEndings('hello\rworld')).toBe('hello\nworld');
    });

    it('should leave \\n unchanged', () => {
      expect(TextOps.normalizeLineEndings('hello\nworld')).toBe('hello\nworld');
    });

    it('should handle mixed line endings', () => {
      expect(TextOps.normalizeLineEndings('a\r\nb\rc\n')).toBe('a\nb\nc\n');
    });
  });
});
