import { describe, it, expect } from 'vitest';
import * as Wrapping from './wrapping';

describe('text wrapping', () => {
  describe('wrapLine', () => {
    it('should not wrap text shorter than width', () => {
      expect(Wrapping.wrapLine('hello', 10)).toEqual(['hello']);
    });

    it('should wrap text longer than width', () => {
      expect(Wrapping.wrapLine('hello world test', 5)).toEqual(['hello', ' worl', 'd tes', 't']);
    });

    it('should handle empty text', () => {
      expect(Wrapping.wrapLine('', 10)).toEqual(['']);
    });

    it('should handle zero width', () => {
      expect(Wrapping.wrapLine('hello', 0)).toEqual(['hello']);
    });

    it('should handle exact width match', () => {
      expect(Wrapping.wrapLine('hello', 5)).toEqual(['hello']);
    });
  });

  describe('getPhysicalCursorPos', () => {
    it('should calculate physical position for single line', () => {
      const result = Wrapping.getPhysicalCursorPos('hello world', 3, 10);
      expect(result).toEqual({ physicalLine: 0, physicalCol: 3 });
    });

    it('should calculate physical position for wrapped line', () => {
      const result = Wrapping.getPhysicalCursorPos('hello world test', 12, 10);
      expect(result).toEqual({ physicalLine: 1, physicalCol: 2 });
    });

    it('should handle zero width', () => {
      const result = Wrapping.getPhysicalCursorPos('hello', 3, 0);
      expect(result).toEqual({ physicalLine: 0, physicalCol: 3 });
    });

    it('should handle cursor at line boundary', () => {
      const result = Wrapping.getPhysicalCursorPos('hello world', 10, 10);
      expect(result).toEqual({ physicalLine: 1, physicalCol: 0 });
    });
  });

  describe('moveCursorUpPhysical', () => {
    it('should move up within same logical line (multi-wrapped)', () => {
      const text = 'this is a very long line that will wrap';
      const width = 10;
      // Cursor at position 25 (3rd physical line)
      const newCursor = Wrapping.moveCursorUpPhysical(text, 25, width);
      expect(newCursor).toBe(15); // Move up to 2nd physical line
    });

    it('should move to previous logical line when at first physical line', () => {
      const text = 'line1\nline2';
      const width = 10;
      const newCursor = Wrapping.moveCursorUpPhysical(text, 8, width); // 'line2' position 2
      expect(newCursor).toBe(2); // Move to 'line1' position 2
    });

    it('should not move when at first line', () => {
      const text = 'line1\nline2';
      const width = 10;
      const newCursor = Wrapping.moveCursorUpPhysical(text, 2, width);
      expect(newCursor).toBe(2); // Stay at same position
    });

    it('should handle zero width', () => {
      const text = 'hello';
      const cursor = 3;
      const newCursor = Wrapping.moveCursorUpPhysical(text, cursor, 0);
      expect(newCursor).toBe(cursor);
    });
  });

  describe('moveCursorDownPhysical', () => {
    it('should move down within same logical line (multi-wrapped)', () => {
      const text = 'this is a very long line that will wrap';
      const width = 10;
      // Cursor at position 5 (1st physical line)
      const newCursor = Wrapping.moveCursorDownPhysical(text, 5, width);
      expect(newCursor).toBe(15); // Move down to 2nd physical line
    });

    it('should move to next logical line when at last physical line', () => {
      const text = 'line1\nline2';
      const width = 10;
      const newCursor = Wrapping.moveCursorDownPhysical(text, 2, width); // 'line1' position 2
      expect(newCursor).toBe(8); // Move to 'line2' position 2
    });

    it('should not move when at last line', () => {
      const text = 'line1\nline2';
      const width = 10;
      const newCursor = Wrapping.moveCursorDownPhysical(text, 8, width); // 'line2' position 2
      expect(newCursor).toBe(8); // Stay at same position
    });

    it('should handle zero width', () => {
      const text = 'hello';
      const cursor = 3;
      const newCursor = Wrapping.moveCursorDownPhysical(text, cursor, 0);
      expect(newCursor).toBe(cursor);
    });
  });
});
