/**
 * Text processing utilities for semantic search
 * Includes: Porter Stemmer, N-grams, tokenization
 */

/**
 * Porter Stemmer Algorithm (simplified version)
 * Reduces words to their root form: "running" → "run", "authentication" → "authent"
 */
export class PorterStemmer {
  private static step1aRules = [
    { pattern: /sses$/i, replacement: 'ss' },
    { pattern: /ies$/i, replacement: 'i' },
    { pattern: /ss$/i, replacement: 'ss' },
    { pattern: /s$/i, replacement: '' },
  ];

  private static step1bRules = [
    { pattern: /eed$/i, replacement: 'ee' },
    { pattern: /ed$/i, replacement: '' },
    { pattern: /ing$/i, replacement: '' },
  ];

  private static step1cRules = [{ pattern: /y$/i, replacement: 'i' }];

  private static step2Rules = [
    { pattern: /ational$/i, replacement: 'ate' },
    { pattern: /tional$/i, replacement: 'tion' },
    { pattern: /enci$/i, replacement: 'ence' },
    { pattern: /anci$/i, replacement: 'ance' },
    { pattern: /izer$/i, replacement: 'ize' },
    { pattern: /abli$/i, replacement: 'able' },
    { pattern: /alli$/i, replacement: 'al' },
    { pattern: /entli$/i, replacement: 'ent' },
    { pattern: /eli$/i, replacement: 'e' },
    { pattern: /ousli$/i, replacement: 'ous' },
    { pattern: /ization$/i, replacement: 'ize' },
    { pattern: /ation$/i, replacement: 'ate' },
    { pattern: /ator$/i, replacement: 'ate' },
    { pattern: /alism$/i, replacement: 'al' },
    { pattern: /iveness$/i, replacement: 'ive' },
    { pattern: /fulness$/i, replacement: 'ful' },
    { pattern: /ousness$/i, replacement: 'ous' },
    { pattern: /aliti$/i, replacement: 'al' },
    { pattern: /iviti$/i, replacement: 'ive' },
    { pattern: /biliti$/i, replacement: 'ble' },
  ];

  private static step3Rules = [
    { pattern: /icate$/i, replacement: 'ic' },
    { pattern: /ative$/i, replacement: '' },
    { pattern: /alize$/i, replacement: 'al' },
    { pattern: /iciti$/i, replacement: 'ic' },
    { pattern: /ical$/i, replacement: 'ic' },
    { pattern: /ful$/i, replacement: '' },
    { pattern: /ness$/i, replacement: '' },
  ];

  private static step4Rules = [
    { pattern: /al$/i, replacement: '' },
    { pattern: /ance$/i, replacement: '' },
    { pattern: /ence$/i, replacement: '' },
    { pattern: /er$/i, replacement: '' },
    { pattern: /ic$/i, replacement: '' },
    { pattern: /able$/i, replacement: '' },
    { pattern: /ible$/i, replacement: '' },
    { pattern: /ant$/i, replacement: '' },
    { pattern: /ement$/i, replacement: '' },
    { pattern: /ment$/i, replacement: '' },
    { pattern: /ent$/i, replacement: '' },
    { pattern: /ion$/i, replacement: '' },
    { pattern: /ou$/i, replacement: '' },
    { pattern: /ism$/i, replacement: '' },
    { pattern: /ate$/i, replacement: '' },
    { pattern: /iti$/i, replacement: '' },
    { pattern: /ous$/i, replacement: '' },
    { pattern: /ive$/i, replacement: '' },
    { pattern: /ize$/i, replacement: '' },
  ];

  private static step5Rules = [
    { pattern: /e$/i, replacement: '' },
    { pattern: /ll$/i, replacement: 'l' },
  ];

  /**
   * Stem a single word
   */
  static stem(word: string): string {
    if (word.length < 3) return word.toLowerCase();

    let stemmed = word.toLowerCase();

    // Step 1a: plurals
    for (const rule of this.step1aRules) {
      if (rule.pattern.test(stemmed)) {
        stemmed = stemmed.replace(rule.pattern, rule.replacement);
        break;
      }
    }

    // Step 1b: past tense
    for (const rule of this.step1bRules) {
      if (rule.pattern.test(stemmed)) {
        stemmed = stemmed.replace(rule.pattern, rule.replacement);
        break;
      }
    }

    // Step 1c: y → i
    for (const rule of this.step1cRules) {
      if (rule.pattern.test(stemmed) && stemmed.length > 2) {
        stemmed = stemmed.replace(rule.pattern, rule.replacement);
        break;
      }
    }

    // Step 2: double suffixes
    for (const rule of this.step2Rules) {
      if (rule.pattern.test(stemmed)) {
        stemmed = stemmed.replace(rule.pattern, rule.replacement);
        break;
      }
    }

    // Step 3: more suffixes
    for (const rule of this.step3Rules) {
      if (rule.pattern.test(stemmed)) {
        stemmed = stemmed.replace(rule.pattern, rule.replacement);
        break;
      }
    }

    // Step 4: remove suffixes
    for (const rule of this.step4Rules) {
      if (rule.pattern.test(stemmed) && stemmed.length > 3) {
        stemmed = stemmed.replace(rule.pattern, rule.replacement);
        break;
      }
    }

    // Step 5: final cleanup
    for (const rule of this.step5Rules) {
      if (rule.pattern.test(stemmed) && stemmed.length > 2) {
        stemmed = stemmed.replace(rule.pattern, rule.replacement);
        break;
      }
    }

    return stemmed;
  }
}

/**
 * Generate N-grams from text
 * Example: "authentication" → ["aut", "uth", "the", "hen", "ent", "nti", "tic", ...]
 */
export function generateNGrams(text: string, n = 3): string[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.length < n) return [normalized];

  const ngrams: string[] = [];
  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.push(normalized.slice(i, i + n));
  }
  return ngrams;
}

/**
 * Tokenize text into words
 * Handles code, markdown, and natural language
 */
export function tokenize(text: string): string[] {
  // Remove markdown syntax
  let cleaned = text
    .replace(/```[\s\S]*?```/g, ' ') // Remove code blocks
    .replace(/`[^`]+`/g, ' ') // Remove inline code
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/[*_~]/g, '') // Remove emphasis
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Extract link text

  // Split on non-alphanumeric, but keep hyphens and underscores
  const tokens = cleaned
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((token) => token.length > 1); // Filter out single chars

  return tokens;
}

/**
 * Extract important terms from text
 * Combines tokenization with stemming
 */
export function extractTerms(text: string): Map<string, number> {
  const tokens = tokenize(text);
  const termFrequency = new Map<string, number>();

  for (const token of tokens) {
    const stemmed = PorterStemmer.stem(token);
    termFrequency.set(stemmed, (termFrequency.get(stemmed) || 0) + 1);
  }

  return termFrequency;
}

/**
 * Calculate cosine similarity between two term frequency maps
 */
export function cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  // Calculate dot product and magnitude of vec1
  for (const [term, freq1] of vec1.entries()) {
    mag1 += freq1 * freq1;
    const freq2 = vec2.get(term) || 0;
    dotProduct += freq1 * freq2;
  }

  // Calculate magnitude of vec2
  for (const freq2 of vec2.values()) {
    mag2 += freq2 * freq2;
  }

  if (mag1 === 0 || mag2 === 0) return 0;

  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/**
 * Common English stop words to filter out
 */
export const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  'this',
  'but',
  'they',
  'have',
  'had',
  'what',
  'when',
  'where',
  'who',
  'which',
  'why',
  'how',
]);

/**
 * Filter stop words from tokens
 */
export function filterStopWords(tokens: string[]): string[] {
  return tokens.filter((token) => !STOP_WORDS.has(token.toLowerCase()));
}
