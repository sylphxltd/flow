/**
 * Tests for attachment sync
 */

import { describe, it, expect } from 'vitest';
import type { FileAttachment } from '../../../types/session.types.js';
import {
  syncAttachmentsWithText,
  hasAttachment,
  addAttachment,
  removeAttachment,
  clearAttachments,
  createValidTagsSet,
  getReferencedAttachments,
  getUnreferencedAttachments,
} from './sync.js';

const mockAttachments: FileAttachment[] = [
  { path: '/project/src/index.ts', relativePath: 'src/index.ts', size: 1000 },
  { path: '/project/test.ts', relativePath: 'test.ts', size: 500 },
  { path: '/project/README.md', relativePath: 'README.md', size: 200 },
];

describe('syncAttachmentsWithText', () => {
  it('should keep referenced attachments', () => {
    const result = syncAttachmentsWithText(
      mockAttachments,
      'Check @src/index.ts and @test.ts'
    );
    expect(result).toHaveLength(2);
    expect(result[0].relativePath).toBe('src/index.ts');
    expect(result[1].relativePath).toBe('test.ts');
  });

  it('should remove unreferenced attachments', () => {
    const result = syncAttachmentsWithText(
      mockAttachments,
      'Only @README.md'
    );
    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe('README.md');
  });

  it('should return empty array when no references', () => {
    const result = syncAttachmentsWithText(mockAttachments, 'No references');
    expect(result).toEqual([]);
  });

  it('should handle empty attachments', () => {
    const result = syncAttachmentsWithText([], 'Check @file.ts');
    expect(result).toEqual([]);
  });

  it('should preserve attachment order', () => {
    const result = syncAttachmentsWithText(
      mockAttachments,
      '@README.md @test.ts @src/index.ts'
    );
    expect(result.map(a => a.relativePath)).toEqual([
      'src/index.ts',
      'test.ts',
      'README.md'
    ]);
  });
});

describe('hasAttachment', () => {
  it('should return true when attachment exists', () => {
    expect(hasAttachment(mockAttachments, '/project/src/index.ts')).toBe(true);
  });

  it('should return false when attachment does not exist', () => {
    expect(hasAttachment(mockAttachments, '/project/missing.ts')).toBe(false);
  });

  it('should handle empty attachments', () => {
    expect(hasAttachment([], '/project/file.ts')).toBe(false);
  });
});

describe('addAttachment', () => {
  it('should add new attachment', () => {
    const newAtt: FileAttachment = {
      path: '/project/new.ts',
      relativePath: 'new.ts',
      size: 300,
    };
    const result = addAttachment(mockAttachments, newAtt);
    expect(result).toHaveLength(4);
    expect(result[3]).toEqual(newAtt);
  });

  it('should not add duplicate attachment', () => {
    const duplicate = mockAttachments[0];
    const result = addAttachment(mockAttachments, duplicate);
    expect(result).toHaveLength(3);
    expect(result).toEqual(mockAttachments);
  });

  it('should not mutate original array', () => {
    const original = [...mockAttachments];
    const newAtt: FileAttachment = {
      path: '/project/new.ts',
      relativePath: 'new.ts',
      size: 300,
    };
    addAttachment(mockAttachments, newAtt);
    expect(mockAttachments).toEqual(original);
  });
});

describe('removeAttachment', () => {
  it('should remove attachment by path', () => {
    const result = removeAttachment(mockAttachments, '/project/test.ts');
    expect(result).toHaveLength(2);
    expect(result.map(a => a.relativePath)).toEqual(['src/index.ts', 'README.md']);
  });

  it('should return same array when attachment not found', () => {
    const result = removeAttachment(mockAttachments, '/project/missing.ts');
    expect(result).toHaveLength(3);
  });

  it('should not mutate original array', () => {
    const original = [...mockAttachments];
    removeAttachment(mockAttachments, '/project/test.ts');
    expect(mockAttachments).toEqual(original);
  });
});

describe('clearAttachments', () => {
  it('should return empty array', () => {
    const result = clearAttachments();
    expect(result).toEqual([]);
  });
});

describe('createValidTagsSet', () => {
  it('should create set from attachment relative paths', () => {
    const result = createValidTagsSet(mockAttachments);
    expect(result.size).toBe(3);
    expect(result.has('src/index.ts')).toBe(true);
    expect(result.has('test.ts')).toBe(true);
    expect(result.has('README.md')).toBe(true);
  });

  it('should handle empty attachments', () => {
    const result = createValidTagsSet([]);
    expect(result.size).toBe(0);
  });

  it('should handle duplicate paths', () => {
    const duplicates: FileAttachment[] = [
      { path: '/a/file.ts', relativePath: 'file.ts', size: 100 },
      { path: '/b/file.ts', relativePath: 'file.ts', size: 100 },
    ];
    const result = createValidTagsSet(duplicates);
    expect(result.size).toBe(1);
    expect(result.has('file.ts')).toBe(true);
  });
});

describe('getReferencedAttachments', () => {
  it('should return attachments referenced in text', () => {
    const result = getReferencedAttachments(
      mockAttachments,
      'Check @src/index.ts and @test.ts'
    );
    expect(result).toHaveLength(2);
    expect(result.map(a => a.relativePath)).toEqual(['src/index.ts', 'test.ts']);
  });

  it('should return empty array when none referenced', () => {
    const result = getReferencedAttachments(mockAttachments, 'No references');
    expect(result).toEqual([]);
  });
});

describe('getUnreferencedAttachments', () => {
  it('should return attachments NOT referenced in text', () => {
    const result = getUnreferencedAttachments(
      mockAttachments,
      'Check @src/index.ts'
    );
    expect(result).toHaveLength(2);
    expect(result.map(a => a.relativePath)).toEqual(['test.ts', 'README.md']);
  });

  it('should return all attachments when none referenced', () => {
    const result = getUnreferencedAttachments(mockAttachments, 'No references');
    expect(result).toHaveLength(3);
  });

  it('should return empty array when all referenced', () => {
    const result = getUnreferencedAttachments(
      mockAttachments,
      '@src/index.ts @test.ts @README.md'
    );
    expect(result).toEqual([]);
  });
});
