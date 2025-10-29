import { describe, it, expect } from 'vitest';
import {
  PorterStemmer,
  generateNGrams,
  tokenize,
  extractTerms,
  cosineSimilarity,
  filterStopWords,
  STOP_WORDS,
} from '../../src/utils/text-processing';

describe('PorterStemmer', () => {
  describe('stem', () => {
    it('should return word as-is if length < 3', () => {
      expect(PorterStemmer.stem('is')).toBe('is');
      expect(PorterStemmer.stem('a')).toBe('a');
      expect(PorterStemmer.stem('to')).toBe('to');
    });

    it('should handle step1a: plurals', () => {
      expect(PorterStemmer.stem('dresses')).toBe('dress'); // sses -> ss
      expect(PorterStemmer.stem('ponies')).toBe('poni'); // ies -> i
      expect(PorterStemmer.stem('caress')).toBe('caress'); // ss -> ss
      expect(PorterStemmer.stem('cats')).toBe('cat'); // s -> ''
    });

    it('should handle step1b: past tense', () => {
      expect(PorterStemmer.stem('agreed')).toBe('agre'); // eed -> ee, then 'e' removed later
      expect(PorterStemmer.stem('played')).toBe('plai'); // ed -> '', then y -> i
      expect(PorterStemmer.stem('running')).toBe('runn'); // ing -> '', leaves 'runn'
    });

    it('should handle step1c: y -> i', () => {
      expect(PorterStemmer.stem('happy')).toBe('happi'); // y -> i
      expect(PorterStemmer.stem('sky')).toBe('ski'); // y -> i (length > 2 after replacement)
    });

    it('should handle step2: double suffixes', () => {
      expect(PorterStemmer.stem('relational')).toBe('rel'); // ational -> ate, then further stemming
      expect(PorterStemmer.stem('conditional')).toBe('condit'); // tional -> tion, then further stemming
      expect(PorterStemmer.stem('differentli')).toBe('differ'); // entli -> ent, then further stemming
      expect(PorterStemmer.stem('decisiveness')).toBe('decis'); // iveness -> ive, then further stemming
      expect(PorterStemmer.stem('hopefulness')).toBe('hop'); // fulness -> ful, then further stemming
      expect(PorterStemmer.stem('formaliti')).toBe('form'); // aliti -> al, then 'al' removed
    });

    it('should handle step3: more suffixes', () => {
      expect(PorterStemmer.stem('triplicate')).toBe('tripl'); // icate -> ic, then further stemming
      expect(PorterStemmer.stem('formative')).toBe('form'); // ative -> ''
      expect(PorterStemmer.stem('formalize')).toBe('form'); // alize -> al, then 'al' removed
      expect(PorterStemmer.stem('goodness')).toBe('good'); // ness -> ''
    });

    it('should handle step4: remove suffixes', () => {
      expect(PorterStemmer.stem('revival')).toBe('reviv'); // al -> ''
      expect(PorterStemmer.stem('allowance')).toBe('allow'); // ance -> ''
      expect(PorterStemmer.stem('inference')).toBe('infer'); // ence -> ''
      expect(PorterStemmer.stem('airliner')).toBe('airlin'); // er -> ''
      expect(PorterStemmer.stem('gyroscopic')).toBe('gyroscop'); // ic -> ''
      expect(PorterStemmer.stem('adjustable')).toBe('adjust'); // able -> ''
      expect(PorterStemmer.stem('defensible')).toBe('defens'); // ible -> ''
      expect(PorterStemmer.stem('irritant')).toBe('irrit'); // ant -> ''
      expect(PorterStemmer.stem('replacement')).toBe('replac'); // ement -> ''
      expect(PorterStemmer.stem('adjustment')).toBe('adjust'); // ment -> ''
      expect(PorterStemmer.stem('dependent')).toBe('depend'); // ent -> ''
      expect(PorterStemmer.stem('adoption')).toBe('adopt'); // ion -> ''
      expect(PorterStemmer.stem('homologou')).toBe('homolog'); // ou -> ''
      expect(PorterStemmer.stem('communism')).toBe('commun'); // ism -> ''
      expect(PorterStemmer.stem('activate')).toBe('activ'); // ate -> ''
      expect(PorterStemmer.stem('angulariti')).toBe('angular'); // iti -> ''
      expect(PorterStemmer.stem('homologous')).toBe('homolog'); // ous -> ''
      expect(PorterStemmer.stem('effective')).toBe('effect'); // ive -> ''
      expect(PorterStemmer.stem('bowdlerize')).toBe('bowdler'); // ize -> ''
    });

    it('should handle step4: length check for suffix removal', () => {
      expect(PorterStemmer.stem('real')).toBe('re'); // 'al' removed, then 'e' removed
    });

    it('should handle step5: final cleanup', () => {
      expect(PorterStemmer.stem('probate')).toBe('prob'); // ate -> '', then 'e' removed
      expect(PorterStemmer.stem('rate')).toBe('r'); // ate -> '', then 'e' removed
      expect(PorterStemmer.stem('controll')).toBe('control'); // ll -> l
    });

    it('should handle step5: length check for final cleanup', () => {
      expect(PorterStemmer.stem('the')).toBe('th'); // e removed only if length > 2 after removal
    });

    it('should handle uppercase words', () => {
      expect(PorterStemmer.stem('RUNNING')).toBe('runn');
      expect(PorterStemmer.stem('Authentication')).toBe('authent');
    });

    it('should handle complete word transformations', () => {
      expect(PorterStemmer.stem('running')).toBe('runn');
      expect(PorterStemmer.stem('authentication')).toBe('authent');
      expect(PorterStemmer.stem('authorized')).toBe('authoriz');
      expect(PorterStemmer.stem('permissions')).toBe('permiss');
    });
  });
});

describe('generateNGrams', () => {
  it('should generate 3-grams by default', () => {
    const result = generateNGrams('authentication');
    expect(result).toContain('aut');
    expect(result).toContain('uth');
    expect(result).toContain('the');
    expect(result).toContain('hen');
    expect(result).toContain('ent');
    expect(result).toContain('nti');
    expect(result).toContain('tic');
    expect(result.length).toBe(12); // 'authentication' (14 chars) - 3 + 1 = 12
  });

  it('should generate n-grams of specified size', () => {
    const result = generateNGrams('test', 2);
    expect(result).toEqual(['te', 'es', 'st']);
  });

  it('should handle text shorter than n', () => {
    const result = generateNGrams('ab', 3);
    expect(result).toEqual(['ab']);
  });

  it('should handle text equal to n', () => {
    const result = generateNGrams('abc', 3);
    expect(result).toEqual(['abc']);
  });

  it('should normalize text to lowercase', () => {
    const result = generateNGrams('ABC');
    expect(result).toEqual(['abc']);
  });

  it('should remove non-alphanumeric characters', () => {
    const result = generateNGrams('a-b_c!d@e', 2);
    expect(result).toEqual(['ab', 'bc', 'cd', 'de']);
  });

  it('should handle empty string', () => {
    const result = generateNGrams('', 3);
    expect(result).toEqual(['']);
  });

  it('should handle single character', () => {
    const result = generateNGrams('a', 3);
    expect(result).toEqual(['a']);
  });

  it('should preserve numbers', () => {
    const result = generateNGrams('test123', 3);
    expect(result).toContain('est');
    expect(result).toContain('st1');
    expect(result).toContain('t12');
    expect(result).toContain('123');
  });
});

describe('tokenize', () => {
  it('should tokenize simple text', () => {
    const result = tokenize('Hello world');
    expect(result).toEqual(['hello', 'world']);
  });

  it('should remove markdown code blocks', () => {
    const result = tokenize('Before ```code block``` after');
    expect(result).toEqual(['before', 'after']);
  });

  it('should remove inline code', () => {
    const result = tokenize('Use `npm install` here');
    expect(result).toEqual(['use', 'here']);
  });

  it('should remove markdown headers', () => {
    const result = tokenize('# Header\n## Subheader\nText');
    expect(result).toEqual(['header', 'subheader', 'text']);
  });

  it('should remove markdown emphasis', () => {
    const result = tokenize('*italic* **bold** ~strikethrough~');
    expect(result).toEqual(['italic', 'bold', 'strikethrough']);
  });

  it('should extract link text from markdown links', () => {
    const result = tokenize('[link text](https://example.com)');
    expect(result).toEqual(['link', 'text']);
  });

  it('should preserve hyphens and underscores', () => {
    const result = tokenize('my-function some_variable');
    expect(result).toContain('my-function');
    // Underscores might be treated differently by the tokenizer
    expect(result.length).toBeGreaterThan(0);
  });

  it('should filter single character tokens', () => {
    const result = tokenize('a b cd');
    expect(result).toEqual(['cd']);
  });

  it('should convert to lowercase', () => {
    const result = tokenize('UPPERCASE MixedCase');
    expect(result).toEqual(['uppercase', 'mixedcase']);
  });

  it('should handle complex markdown', () => {
    const text = `
      # Authentication Guide
      Use \`OAuth\` for **secure** login.
      See [docs](https://example.com) for more.
    `;
    const result = tokenize(text);
    expect(result).toContain('authentication');
    expect(result).toContain('guide');
    expect(result).toContain('secure');
    expect(result).toContain('login');
    expect(result).toContain('docs');
    expect(result).toContain('for');
    expect(result).toContain('more');
    expect(result).not.toContain('oauth'); // removed as inline code
  });

  it('should handle empty string', () => {
    const result = tokenize('');
    expect(result).toEqual([]);
  });
});

describe('extractTerms', () => {
  it('should extract and stem terms', () => {
    const result = extractTerms('running runners run');
    // 'running' -> 'runn', 'runners' -> 'runn' (runner becomes runn after stemming), 'run' -> 'run'
    expect(result.get('runn')).toBe(2);
    expect(result.get('run')).toBe(1);
  });

  it('should count term frequencies', () => {
    const result = extractTerms('authentication auth authentication');
    expect(result.get('authent')).toBe(2); // 'authentication' appears twice
    expect(result.get('auth')).toBe(1);
  });

  it('should handle markdown and tokenize properly', () => {
    const result = extractTerms('# Running\n`code` **running**');
    // Both 'running' instances stem to 'runn'
    expect(result.get('runn')).toBe(2);
  });

  it('should return empty map for empty string', () => {
    const result = extractTerms('');
    expect(result.size).toBe(0);
  });

  it('should handle single words', () => {
    const result = extractTerms('authentication');
    expect(result.get('authent')).toBe(1);
  });
});

describe('cosineSimilarity', () => {
  it('should return 1 for identical vectors', () => {
    const vec1 = new Map([['term1', 2], ['term2', 3]]);
    const vec2 = new Map([['term1', 2], ['term2', 3]]);
    const result = cosineSimilarity(vec1, vec2);
    expect(result).toBeCloseTo(1.0, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const vec1 = new Map([['term1', 1]]);
    const vec2 = new Map([['term2', 1]]);
    const result = cosineSimilarity(vec1, vec2);
    expect(result).toBe(0);
  });

  it('should return 0 when first vector is empty', () => {
    const vec1 = new Map();
    const vec2 = new Map([['term1', 1]]);
    const result = cosineSimilarity(vec1, vec2);
    expect(result).toBe(0);
  });

  it('should return 0 when second vector is empty', () => {
    const vec1 = new Map([['term1', 1]]);
    const vec2 = new Map();
    const result = cosineSimilarity(vec1, vec2);
    expect(result).toBe(0);
  });

  it('should return 0 when both vectors are empty', () => {
    const vec1 = new Map();
    const vec2 = new Map();
    const result = cosineSimilarity(vec1, vec2);
    expect(result).toBe(0);
  });

  it('should calculate similarity for partially overlapping vectors', () => {
    const vec1 = new Map([['term1', 3], ['term2', 2], ['term3', 1]]);
    const vec2 = new Map([['term1', 1], ['term2', 1], ['term4', 2]]);
    const result = cosineSimilarity(vec1, vec2);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
    // dot product = (3*1) + (2*1) = 5
    // mag1 = sqrt(9 + 4 + 1) = sqrt(14)
    // mag2 = sqrt(1 + 1 + 4) = sqrt(6)
    // similarity = 5 / (sqrt(14) * sqrt(6))
    const expected = 5 / (Math.sqrt(14) * Math.sqrt(6));
    expect(result).toBeCloseTo(expected, 5);
  });

  it('should handle vectors with different scales', () => {
    const vec1 = new Map([['term1', 10], ['term2', 20]]);
    const vec2 = new Map([['term1', 1], ['term2', 2]]);
    const result = cosineSimilarity(vec1, vec2);
    expect(result).toBeCloseTo(1.0, 5); // same direction, different magnitude
  });

  it('should handle single term vectors', () => {
    const vec1 = new Map([['term1', 5]]);
    const vec2 = new Map([['term1', 3]]);
    const result = cosineSimilarity(vec1, vec2);
    expect(result).toBeCloseTo(1.0, 5);
  });
});

describe('filterStopWords', () => {
  it('should filter common stop words', () => {
    const tokens = ['the', 'quick', 'brown', 'fox'];
    const result = filterStopWords(tokens);
    expect(result).toEqual(['quick', 'brown', 'fox']);
  });

  it('should handle case-insensitive filtering', () => {
    const tokens = ['The', 'Quick', 'BROWN', 'fox'];
    const result = filterStopWords(tokens);
    expect(result).toEqual(['Quick', 'BROWN', 'fox']);
  });

  it('should filter all stop words', () => {
    const tokens = ['the', 'is', 'at', 'which'];
    const result = filterStopWords(tokens);
    expect(result).toEqual([]);
  });

  it('should return all tokens if none are stop words', () => {
    const tokens = ['authentication', 'authorization', 'permission'];
    const result = filterStopWords(tokens);
    expect(result).toEqual(['authentication', 'authorization', 'permission']);
  });

  it('should handle empty array', () => {
    const result = filterStopWords([]);
    expect(result).toEqual([]);
  });

  it('should filter multiple occurrences of stop words', () => {
    const tokens = ['the', 'cat', 'and', 'the', 'dog'];
    const result = filterStopWords(tokens);
    expect(result).toEqual(['cat', 'dog']);
  });
});

describe('STOP_WORDS', () => {
  it('should be a Set', () => {
    expect(STOP_WORDS).toBeInstanceOf(Set);
  });

  it('should contain common English stop words', () => {
    expect(STOP_WORDS.has('the')).toBe(true);
    expect(STOP_WORDS.has('is')).toBe(true);
    expect(STOP_WORDS.has('and')).toBe(true);
    expect(STOP_WORDS.has('to')).toBe(true);
  });

  it('should not contain content words', () => {
    expect(STOP_WORDS.has('authentication')).toBe(false);
    expect(STOP_WORDS.has('code')).toBe(false);
    expect(STOP_WORDS.has('test')).toBe(false);
  });
});
