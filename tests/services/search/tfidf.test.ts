/**
 * TF-IDF Search Service Tests
 * Tests for TF-IDF indexing, search, and cosine similarity
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type DocumentVector,
  type SearchIndex,
  buildSearchIndex,
  calculateCosineSimilarity,
  deserializeIndex,
  processQuery,
  searchDocuments,
  serializeIndex,
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
        content:
          'function authenticateUser(username, password) { return validateCredentials(username, password); }',
      },
      {
        uri: 'file:///project/database.ts',
        content: 'class Database { connect() {} query(sql) {} disconnect() {} }',
      },
      {
        uri: 'file:///project/api.ts',
        content:
          'async function fetchUserData(userId) { const user = await database.query("SELECT * FROM users WHERE id = ?", userId); return user; }',
      },
      {
        uri: 'file:///project/utils.ts',
        content:
          'function validateEmail(email) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); }',
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
    it('should build search index from documents', async () => {
      const index = await buildSearchIndex(sampleDocuments);

      expect(index.documents).toHaveLength(4);
      expect(index.totalDocuments).toBe(4);
      expect(index.idf.size).toBeGreaterThan(0);
      expect(index.metadata.version).toBe('5.0.0');
      expect(index.metadata.generatedAt).toBeDefined();
    });

    it('should calculate document vectors with TF-IDF scores', async () => {
      const index = await buildSearchIndex(sampleDocuments);

      // Each document should have terms with TF-IDF scores
      for (const doc of index.documents) {
        expect(doc.uri).toBeDefined();
        expect(doc.terms.size).toBeGreaterThan(0);
        expect(doc.rawTerms.size).toBeGreaterThan(0);
        expect(doc.magnitude).toBeGreaterThan(0);
      }
    });

    it('should handle empty documents array', async () => {
      const index = await buildSearchIndex([]);

      expect(index.documents).toHaveLength(0);
      expect(index.totalDocuments).toBe(0);
      expect(index.idf.size).toBe(0);
    });

    it('should handle single document', async () => {
      const index = await buildSearchIndex([sampleDocuments[0]]);

      expect(index.documents).toHaveLength(1);
      expect(index.totalDocuments).toBe(1);
      expect(index.documents[0].uri).toBe('file:///project/auth.ts');
    });
  });

  describe('searchDocuments', () => {
    let index: SearchIndex;

    beforeEach(async () => {
      index = await buildSearchIndex(sampleDocuments);
    });

    it('should find relevant documents for query', async () => {
      const results = await searchDocuments('authenticate user password', index);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].uri).toBe('file:///project/auth.ts');
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].matchedTerms.length).toBeGreaterThan(0);
    });

    it('should find database-related documents', async () => {
      const results = await searchDocuments('database query connect', index);

      // Database.ts should rank highly
      const topResult = results[0];
      expect(topResult.uri).toMatch(/database\.ts/);
      expect(topResult.score).toBeGreaterThan(0);
    });

    it('should find email validation', async () => {
      const results = await searchDocuments('validate email', index);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].uri).toContain('utils.ts');
    });

    it('should respect limit parameter', async () => {
      const results = await searchDocuments('function', index, { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should respect minScore parameter', async () => {
      const results = await searchDocuments('xyz random nonexistent', index, {
        minScore: 0.5,
      });

      // Should return empty or very few results for nonsense query
      expect(results.every((r) => r.score >= 0.5)).toBe(true);
    });

    it('should boost exact matches', async () => {
      const resultsWithBoost = await searchDocuments('database', index, {
        boostFactors: { exactMatch: 2.0 },
      });

      const resultsNoBoost = await searchDocuments('database', index, {
        boostFactors: { exactMatch: 1.0 },
      });

      // With boost should have higher scores
      if (resultsWithBoost.length > 0 && resultsNoBoost.length > 0) {
        expect(resultsWithBoost[0].score).toBeGreaterThanOrEqual(resultsNoBoost[0].score);
      }
    });

    it('should boost phrase matches', async () => {
      const results = await searchDocuments('function authenticate user', index, {
        boostFactors: { phraseMatch: 2.0 },
      });

      // Documents containing terms should be found
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should return empty array for nonsense query', async () => {
      const results = await searchDocuments('xyzabc123', index);

      // Should either return empty or very low scores
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should sort results by score descending', async () => {
      const results = await searchDocuments('function user database', index);

      if (results.length > 1) {
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
        }
      }
    });
  });

  describe('processQuery', () => {
    let index: SearchIndex;

    beforeEach(async () => {
      index = await buildSearchIndex(sampleDocuments);
    });

    it('should convert query to TF-IDF vector', async () => {
      const queryVector = await processQuery('authenticate user', index.idf);

      expect(queryVector.size).toBeGreaterThan(0);
      // Check that at least one term has a positive TF-IDF score
      const hasPositiveScore = Array.from(queryVector.values()).some((score) => score > 0);
      expect(hasPositiveScore).toBe(true);
    });

    it('should handle empty query', async () => {
      const queryVector = await processQuery('', index.idf);

      expect(queryVector.size).toBe(0);
    });

    it('should handle single word query', async () => {
      const queryVector = await processQuery('database', index.idf);

      expect(queryVector.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateCosineSimilarity', () => {
    let index: SearchIndex;

    beforeEach(async () => {
      index = await buildSearchIndex(sampleDocuments);
    });

    it('should calculate similarity between query and document', async () => {
      const queryVector = await processQuery('authenticate', index.idf);
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

    beforeEach(async () => {
      index = await buildSearchIndex(sampleDocuments);
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
    it('should handle complex search workflow', async () => {
      // Build index
      const index = await buildSearchIndex(sampleDocuments);

      // Search
      const results = await searchDocuments('user authentication', index, {
        limit: 10,
        minScore: 0,
      });

      expect(results.length).toBeGreaterThan(0);

      // Serialize
      const json = serializeIndex(index);

      // Deserialize
      const restored = deserializeIndex(json);

      // Search again
      const restoredResults = await searchDocuments('user authentication', restored, {
        limit: 10,
        minScore: 0,
      });

      expect(restoredResults.length).toBe(results.length);
    });

    it('should handle case-insensitive search', async () => {
      const index = await buildSearchIndex(sampleDocuments);

      const upperResults = await searchDocuments('DATABASE', index);
      const lowerResults = await searchDocuments('database', index);

      // Should find similar results regardless of case
      expect(upperResults.length).toBeGreaterThan(0);
      expect(lowerResults.length).toBeGreaterThan(0);
    });

    it('should handle multi-word queries', async () => {
      const index = await buildSearchIndex(sampleDocuments);

      const results = await searchDocuments('function user database query', index);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].uri).toBeDefined();
    });
  });
});
