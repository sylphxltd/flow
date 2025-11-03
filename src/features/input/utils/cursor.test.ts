import { describe, it, expect } from 'vitest';
import * as Cursor from './cursor';

describe('cursor movements', () => {
  describe('clampCursor', () => {
    it('should clamp cursor to valid range', () => {
      expect(Cursor.clampCursor(5, 10)).toBe(5);
      expect(Cursor.clampCursor(-1, 10)).toBe(0);
      expect(Cursor.clampCursor(15, 10)).toBe(10);
    });

    it('should handle zero length', () => {
      expect(Cursor.clampCursor(0, 0)).toBe(0);
      expect(Cursor.clampCursor(5, 0)).toBe(0);
    });
  });

  describe('moveCursorLeft', () => {
    it('should move cursor left by 1', () => {
      expect(Cursor.moveCursorLeft(5, 10)).toBe(4);
    });

    it('should not move past 0', () => {
      expect(Cursor.moveCursorLeft(0, 10)).toBe(0);
    });
  });

  describe('moveCursorRight', () => {
    it('should move cursor right by 1', () => {
      expect(Cursor.moveCursorRight(5, 10)).toBe(6);
    });

    it('should not move past length', () => {
      expect(Cursor.moveCursorRight(10, 10)).toBe(10);
    });
  });

  describe('moveCursorToStart', () => {
    it('should return 0', () => {
      expect(Cursor.moveCursorToStart()).toBe(0);
    });
  });

  describe('moveCursorToEnd', () => {
    it('should return length', () => {
      expect(Cursor.moveCursorToEnd(10)).toBe(10);
      expect(Cursor.moveCursorToEnd(0)).toBe(0);
    });
  });

  describe('findWordStart', () => {
    it('should find start of current word', () => {
      const text = 'hello world test';
      expect(Cursor.findWordStart(text, 8)).toBe(6); // 'world' -> start at 6
    });

    it('should skip whitespace and find previous word', () => {
      const text = 'hello world test';
      expect(Cursor.findWordStart(text, 6)).toBe(0); // at space after 'hello'
    });

    it('should return 0 at start', () => {
      const text = 'hello world';
      expect(Cursor.findWordStart(text, 0)).toBe(0);
    });

    it('should handle whitespace at cursor', () => {
      const text = 'hello   world';
      expect(Cursor.findWordStart(text, 7)).toBe(0); // in whitespace
    });
  });

  describe('findWordEnd', () => {
    it('should find end of current word', () => {
      const text = 'hello world test';
      expect(Cursor.findWordEnd(text, 0)).toBe(5); // 'hello'
    });

    it('should skip whitespace and find next word end', () => {
      const text = 'hello   world';
      expect(Cursor.findWordEnd(text, 5)).toBe(13); // at space, skip to 'world' end
    });

    it('should return length at end', () => {
      const text = 'hello world';
      expect(Cursor.findWordEnd(text, text.length)).toBe(text.length);
    });
  });

  describe('getLineInfo', () => {
    it('should return line info for single line', () => {
      const text = 'hello world';
      const info = Cursor.getLineInfo(text, 6);
      expect(info.line).toBe(0);
      expect(info.col).toBe(6);
      expect(info.lines).toEqual(['hello world']);
    });

    it('should return line info for multi-line', () => {
      const text = 'line1\nline2\nline3';
      const info = Cursor.getLineInfo(text, 8); // 'line2' at position 1
      expect(info.line).toBe(1);
      expect(info.col).toBe(2);
      expect(info.lines).toEqual(['line1', 'line2', 'line3']);
    });

    it('should handle cursor at newline', () => {
      const text = 'line1\nline2';
      const info = Cursor.getLineInfo(text, 5); // at \n after 'line1'
      expect(info.line).toBe(0);
      expect(info.col).toBe(5);
    });
  });

  describe('lineToCursor', () => {
    it('should convert line/col to cursor position', () => {
      const lines = ['line1', 'line2', 'line3'];
      expect(Cursor.lineToCursor(lines, 0, 0)).toBe(0);
      expect(Cursor.lineToCursor(lines, 0, 5)).toBe(5);
      expect(Cursor.lineToCursor(lines, 1, 0)).toBe(6); // 'line1\n' = 6
      expect(Cursor.lineToCursor(lines, 1, 2)).toBe(8);
    });

    it('should clamp column to line length', () => {
      const lines = ['hello', 'world'];
      expect(Cursor.lineToCursor(lines, 0, 100)).toBe(5); // clamp to 'hello'.length
    });

    it('should handle empty lines', () => {
      const lines = ['', 'test'];
      expect(Cursor.lineToCursor(lines, 0, 0)).toBe(0);
      expect(Cursor.lineToCursor(lines, 1, 0)).toBe(1); // after '\n'
    });
  });
});
