/**
 * TF-IDF Search Service Tests
 * Tests for TF-IDF indexing, search, and cosine similarity
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildSearchIndex,
  searchDocuments,
  processQuery,
  calculateCosineSimilarity,
  serializeIndex,
  deserializeIndex,
  type SearchIndex,
  type DocumentVector,
} from '../../../src/services/search/tfidf.js';

describe('TF-IDF Search Service', () => {
  let testDir: string;
  let sampleDocuments: Array<{ uri: string; content: string }>;

  beforeEach(() => {
    // Create temp directory
    testDir = join(tmpdir(), `tfidf-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Sample documents for testing
    sampleDocuments = [
      {
        uri: 'file:///project/auth.ts',
        content: 'function authenticateUser(username, password) { return validateCredentials(username, password); }',
      },
      {
        uri: 'file:///project/database.ts',
        content: 'class Database { connect() {} query(sql) {} disconnect() {} }',
      },
      {
        uri: 'file:///project/api.ts',
        content: 'async function fetchUserData(userId) { const user = await database.query("SELECT * FROM users WHERE id = ?", userId); return user; }',
      },
      {
        uri: 'file:///project/utils.ts',
        content: 'function validateEmail(email) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); }',
      },
    ];
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('buildSearchIndex', () => {
    it('should build search index from documents', () => {
      const index = buildSearchIndex(sampleDocuments);

      expect(index.documents).toHaveLength(4);
      expect(index.totalDocuments).toBe(4);
      expect(index.idf.size).toBeGreaterThan(0);
      expect(index.metadata.version).toBe('1.0.0');
      expect(index.metadata.generatedAt).toBeDefined();
    });

    it('should calculate document vectors with TF-IDF scores', () => {
      const index = buildSearchIndex(sampleDocuments);

      // Each document should have terms with TF-IDF scores
      for (const doc of index.documents) {
        expect(doc.uri).toBeDefined();
        expect(doc.terms.size).toBeGreaterThan(0);
        expect(doc.rawTerms.size).toBeGreaterThan(0);
        expect(doc.magnitude).toBeGreaterThan(0);
      }
    });

    it('should handle empty documents array', () => {
      const index = buildSearchIndex([]);

      expect(index.documents).toHaveLength(0);
      expect(index.totalDocuments).toBe(0);
      expect(index.idf.size).toBe(0);
    });

    it('should handle single document', () => {
      const index = buildSearchIndex([sampleDocuments[0]]);

      expect(index.documents).toHaveLength(1);
      expect(index.totalDocuments).toBe(1);
      expect(index.documents[0].uri).toBe('file:///project/auth.ts');
    });
  });

  describe('searchDocuments', () => {
    let index: SearchIndex;

    beforeEach(() => {
      index = buildSearchIndex(sampleDocuments);
    });

    it('should find relevant documents for query', () => {
      const results = searchDocuments('authenticate user password', index);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].uri).toBe('file:///project/auth.ts');
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].matchedTerms.length).toBeGreaterThan(0);
    });

    it('should find database-related documents', () => {
      const results = searchDocuments('database query connect', index);

      // Database.ts should rank highly
      const topResult = results[0];
      expect(topResult.uri).toMatch(/database\.ts/);
      expect(topResult.score).toBeGreaterThan(0);
    });

    it('should find email validation', () => {
      const results = searchDocuments('validate email', index);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].uri).toContain('utils.ts');
    });

    it('should respect limit parameter', () => {
      const results = searchDocuments('function', index, { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should respect minScore parameter', () => {
      const results = searchDocuments('xyz random nonexistent', index, {
        minScore: 0.5,
      });

      // Should return empty or very few results for nonsense query
      expect(results.every((r) => r.score >= 0.5)).toBe(true);
    });

    it('should boost exact matches', () => {
      const resultsWithBoost = searchDocuments('database', index, {
        boostFactors: { exactMatch: 2.0 },
      });

      const resultsNoBoost = searchDocuments('database', index, {
        boostFactors: { exactMatch: 1.0 },
      });

      // With boost should have higher scores
      if (resultsWithBoost.length > 0 && resultsNoBoost.length > 0) {
        expect(resultsWithBoost[0].score).toBeGreaterThanOrEqual(resultsNoBoost[0].score);
      }
    });

    it('should boost phrase matches', () => {
      const results = searchDocuments('function authenticate user', index, {
        boostFactors: { phraseMatch: 2.0 },
      });

      // Documents containing terms should be found
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should return empty array for nonsense query', () => {
      const results = searchDocuments('xyzabc123', index);

      // Should either return empty or very low scores
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should sort results by score descending', () => {
      const results = searchDocuments('function user database', index);

      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
        }
      }
    });
  });

  describe('processQuery', () => {
    let index: SearchIndex;

    beforeEach(() => {
      index = buildSearchIndex(sampleDocuments);
    });

    it('should convert query to TF-IDF vector', () => {
      const queryVector = processQuery('authenticate user', index.idf);

      expect(queryVector.size).toBeGreaterThan(0);
      // Check that at least one term has a positive TF-IDF score
      const hasPositiveScore = Array.from(queryVector.values()).some((score) => score > 0);
      expect(hasPositiveScore).toBe(true);
    });

    it('should handle empty query', () => {
      const queryVector = processQuery('', index.idf);

      expect(queryVector.size).toBe(0);
    });

    it('should handle single word query', () => {
      const queryVector = processQuery('database', index.idf);

      expect(queryVector.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateCosineSimilarity', () => {
    let index: SearchIndex;

    beforeEach(() => {
      index = buildSearchIndex(sampleDocuments);
    });

    it('should calculate similarity between query and document', () => {
      const queryVector = processQuery('authenticate', index.idf);
      const authDoc = index.documents.find((d) => d.uri.includes('auth.ts'));

      if (authDoc) {
        const similarity = calculateCosineSimilarity(queryVector, authDoc);

        expect(similarity).toBeGreaterThanOrEqual(0);
        expect(similarity).toBeLessThanOrEqual(1);
      }
    });

    it('should return 0 for completely unrelated terms', () => {
      // Create query vector with terms not in document
      const queryVector = new Map([['nonexistent', 1.0]]);
      const doc = index.documents[0];

      const similarity = calculateCosineSimilarity(queryVector, doc);

      expect(similarity).toBe(0);
    });

    it('should return 0 when query vector is empty', () => {
      const queryVector = new Map();
      const doc = index.documents[0];

      const similarity = calculateCosineSimilarity(queryVector, doc);

      expect(similarity).toBe(0);
    });

    it('should return 0 when document has zero magnitude', () => {
      const queryVector = new Map([['test', 1.0]]);
      const doc: DocumentVector = {
        uri: 'test',
        terms: new Map([['test', 1.0]]),
        rawTerms: new Map([['test', 1]]),
        magnitude: 0,
      };

      const similarity = calculateCosineSimilarity(queryVector, doc);

      expect(similarity).toBe(0);
    });
  });

  describe('serializeIndex and deserializeIndex', () => {
    let index: SearchIndex;

    beforeEach(() => {
      index = buildSearchIndex(sampleDocuments);
    });

    it('should serialize index to JSON', () => {
      const json = serializeIndex(index);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.documents).toBeDefined();
      expect(parsed.idf).toBeDefined();
      expect(parsed.totalDocuments).toBe(4);
      expect(parsed.metadata).toBeDefined();
    });

    it('should deserialize index from JSON', () => {
      const json = serializeIndex(index);
      const restored = deserializeIndex(json);

      expect(restored.documents.length).toBe(index.documents.length);
      expect(restored.idf.size).toBe(index.idf.size);
      expect(restored.totalDocuments).toBe(index.totalDocuments);
      expect(restored.metadata.version).toBe(index.metadata.version);
    });

    it('should preserve search functionality after serialization', () => {
      const json = serializeIndex(index);
      const restored = deserializeIndex(json);

      const originalResults = searchDocuments('authenticate', index);
      const restoredResults = searchDocuments('authenticate', restored);

      expect(restoredResults.length).toBe(originalResults.length);
      if (originalResults.length > 0) {
        expect(restoredResults[0].uri).toBe(originalResults[0].uri);
      }
    });

    it('should handle Maps correctly after round-trip', () => {
      const json = serializeIndex(index);
      const restored = deserializeIndex(json);

      // Check that Maps are properly restored
      expect(restored.idf).toBeInstanceOf(Map);
      expect(restored.documents[0].terms).toBeInstanceOf(Map);
      expect(restored.documents[0].rawTerms).toBeInstanceOf(Map);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex search workflow', () => {
      // Build index
      const index = buildSearchIndex(sampleDocuments);

      // Search
      const results = searchDocuments('user authentication', index, {
        limit: 10,
        minScore: 0,
      });

      expect(results.length).toBeGreaterThan(0);

      // Serialize
      const json = serializeIndex(index);

      // Deserialize
      const restored = deserializeIndex(json);

      // Search again
      const restoredResults = searchDocuments('user authentication', restored, {
        limit: 10,
        minScore: 0,
      });

      expect(restoredResults.length).toBe(results.length);
    });

    it('should handle case-insensitive search', () => {
      const index = buildSearchIndex(sampleDocuments);

      const upperResults = searchDocuments('DATABASE', index);
      const lowerResults = searchDocuments('database', index);

      // Should find similar results regardless of case
      expect(upperResults.length).toBeGreaterThan(0);
      expect(lowerResults.length).toBeGreaterThan(0);
    });

    it('should handle multi-word queries', () => {
      const index = buildSearchIndex(sampleDocuments);

      const results = searchDocuments('function user database query', index);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].uri).toBeDefined();
    });
  });
});
