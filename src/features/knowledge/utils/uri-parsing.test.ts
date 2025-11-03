import { describe, it, expect } from 'vitest';
import {
  validateKnowledgeURI,
  extractCategory,
  extractName,
  parseKnowledgeURI,
  filterByCategory,
  groupByCategory,
  sortURIs,
  sortCategories,
  capitalizeCategoryName,
} from './uri-parsing.js';
import { isSuccess, isFailure } from '../../../core/functional/result.js';

describe('validateKnowledgeURI', () => {
  it('should accept valid URIs', () => {
    const result = validateKnowledgeURI('knowledge://stacks/react-app');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe('knowledge://stacks/react-app');
    }
  });

  it('should reject empty URIs', () => {
    expect(isFailure(validateKnowledgeURI(''))).toBe(true);
    expect(isFailure(validateKnowledgeURI('   '))).toBe(true);
  });

  it('should reject URIs without knowledge:// protocol', () => {
    expect(isFailure(validateKnowledgeURI('http://example.com'))).toBe(true);
    expect(isFailure(validateKnowledgeURI('stacks/react-app'))).toBe(true);
  });
});

describe('extractCategory', () => {
  it('should extract valid categories', () => {
    expect(extractCategory('knowledge://stacks/react-app')).toBe('stacks');
    expect(extractCategory('knowledge://guides/setup')).toBe('guides');
    expect(extractCategory('knowledge://universal/intro')).toBe('universal');
    expect(extractCategory('knowledge://data/report')).toBe('data');
  });

  it('should return unknown for invalid categories', () => {
    expect(extractCategory('knowledge://invalid/test')).toBe('unknown');
    expect(extractCategory('knowledge://')).toBe('unknown');
    expect(extractCategory('malformed')).toBe('unknown');
  });
});

describe('extractName', () => {
  it('should extract name from URI', () => {
    expect(extractName('knowledge://stacks/react-app')).toBe('react-app');
    expect(extractName('knowledge://guides/setup')).toBe('setup');
  });

  it('should handle URIs with multiple segments', () => {
    expect(extractName('knowledge://stacks/frontend/react')).toBe('react');
  });

  it('should return Unknown for malformed URIs', () => {
    expect(extractName('')).toBe('Unknown');
    expect(extractName('knowledge://')).toBe('Unknown');
  });
});

describe('parseKnowledgeURI', () => {
  it('should parse valid URI', () => {
    const result = parseKnowledgeURI('knowledge://stacks/react-app');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.protocol).toBe('knowledge');
      expect(result.value.category).toBe('stacks');
      expect(result.value.name).toBe('react-app');
      expect(result.value.fullURI).toBe('knowledge://stacks/react-app');
    }
  });

  it('should fail for invalid URIs', () => {
    expect(isFailure(parseKnowledgeURI(''))).toBe(true);
    expect(isFailure(parseKnowledgeURI('invalid'))).toBe(true);
  });
});

describe('filterByCategory', () => {
  const uris = [
    'knowledge://stacks/react-app',
    'knowledge://stacks/vue-app',
    'knowledge://guides/setup',
    'knowledge://guides/deploy',
  ];

  it('should filter by stacks category', () => {
    const result = filterByCategory(uris, 'stacks');
    expect(result).toHaveLength(2);
    expect(result.every((uri) => uri.includes('/stacks/'))).toBe(true);
  });

  it('should filter by guides category', () => {
    const result = filterByCategory(uris, 'guides');
    expect(result).toHaveLength(2);
    expect(result.every((uri) => uri.includes('/guides/'))).toBe(true);
  });

  it('should return empty array for non-existent category', () => {
    const result = filterByCategory(uris, 'nonexistent');
    expect(result).toHaveLength(0);
  });
});

describe('groupByCategory', () => {
  it('should group URIs by category', () => {
    const uris = [
      'knowledge://stacks/react-app',
      'knowledge://stacks/vue-app',
      'knowledge://guides/setup',
    ];

    const result = groupByCategory(uris);
    expect(result.stacks).toHaveLength(2);
    expect(result.guides).toHaveLength(1);
  });

  it('should handle empty array', () => {
    const result = groupByCategory([]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should handle unknown categories', () => {
    const uris = ['knowledge://invalid/test'];
    const result = groupByCategory(uris);
    expect(result.unknown).toHaveLength(1);
  });
});

describe('sortURIs', () => {
  it('should sort URIs alphabetically', () => {
    const uris = [
      'knowledge://stacks/vue-app',
      'knowledge://stacks/react-app',
      'knowledge://guides/setup',
    ];

    const result = sortURIs(uris);
    expect(result[0]).toBe('knowledge://guides/setup');
    expect(result[1]).toBe('knowledge://stacks/react-app');
    expect(result[2]).toBe('knowledge://stacks/vue-app');
  });

  it('should not mutate original array', () => {
    const uris = ['b', 'a', 'c'];
    const result = sortURIs(uris);
    expect(uris).toEqual(['b', 'a', 'c']);
    expect(result).toEqual(['a', 'b', 'c']);
  });
});

describe('sortCategories', () => {
  it('should sort categories by priority', () => {
    const categories = ['data', 'stacks', 'unknown', 'guides', 'universal'];
    const result = sortCategories(categories);
    expect(result).toEqual(['stacks', 'guides', 'universal', 'data', 'unknown']);
  });

  it('should handle custom categories at the end', () => {
    const categories = ['custom', 'stacks', 'guides'];
    const result = sortCategories(categories);
    expect(result[0]).toBe('stacks');
    expect(result[1]).toBe('guides');
    expect(result[2]).toBe('custom');
  });
});

describe('capitalizeCategoryName', () => {
  it('should capitalize category names', () => {
    expect(capitalizeCategoryName('stacks')).toBe('Stacks');
    expect(capitalizeCategoryName('guides')).toBe('Guides');
    expect(capitalizeCategoryName('universal')).toBe('Universal');
  });

  it('should handle empty strings', () => {
    expect(capitalizeCategoryName('')).toBe('Unknown');
  });

  it('should handle already capitalized', () => {
    expect(capitalizeCategoryName('Stacks')).toBe('Stacks');
  });
});
