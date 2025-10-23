/**
 * Semantic search implementation using TF-IDF
 * Runtime component that loads pre-built search index
 */

import fs from 'node:fs';
import path from 'node:path';
import { deserializeIndex, processQuery, type SearchIndex } from './tfidf.js';
import { getKnowledgeDir } from './paths.js';

let cachedIndex: SearchIndex | null = null;

/**
 * Load search index from disk (with caching)
 */
export function loadSearchIndex(): SearchIndex | null {
  if (cachedIndex) {
    return cachedIndex;
  }

  const indexPath = path.join(getKnowledgeDir(), 'search-index.json');

  if (!fs.existsSync(indexPath)) {
    console.error('[WARN] Search index not found. Run: bun run build:search-index');
    return null;
  }

  try {
    const indexData = fs.readFileSync(indexPath, 'utf8');
    cachedIndex = deserializeIndex(indexData);
    console.error(
      `[INFO] Loaded search index: ${cachedIndex.totalDocuments} documents, ${cachedIndex.idf.size} terms`
    );
    return cachedIndex;
  } catch (error) {
    console.error('[ERROR] Failed to load search index:', error);
    return null;
  }
}

/**
 * Search knowledge base using semantic search
 */
export function semanticSearch(
  query: string,
  options: {
    limit?: number;
    minScore?: number;
    categories?: string[];
  } = {}
): Array<{
  uri: string;
  score: number;
  matchedTerms: string[];
  relevance: number; // 0-100 percentage
}> {
  const { limit = 5, minScore = 0.01, categories } = options;

  const index = loadSearchIndex();
  if (!index) {
    return [];
  }

  // Process query into TF-IDF vector
  const queryVector = processQuery(query, index.idf);

  // Calculate cosine similarity for each document
  const results = index.documents.map((doc) => {
    let dotProduct = 0;
    const matchedTerms: string[] = [];

    // Calculate dot product and track matched terms
    for (const [term, queryScore] of queryVector.entries()) {
      const docScore = doc.terms.get(term);
      if (docScore) {
        dotProduct += queryScore * docScore;
        matchedTerms.push(term);
      }
    }

    // Calculate query magnitude
    let queryMagnitude = 0;
    for (const score of queryVector.values()) {
      queryMagnitude += score * score;
    }
    queryMagnitude = Math.sqrt(queryMagnitude);

    // Cosine similarity
    const score =
      queryMagnitude === 0 || doc.magnitude === 0
        ? 0
        : dotProduct / (queryMagnitude * doc.magnitude);

    return {
      uri: doc.uri,
      score,
      matchedTerms,
      relevance: Math.round(score * 100),
    };
  });

  // Filter by categories if specified
  let filtered = results;
  if (categories && categories.length > 0) {
    filtered = results.filter((result) => {
      const category = result.uri.split('/')[1]; // knowledge://stacks/react-app → stacks
      return categories.includes(category);
    });
  }

  // Filter by minimum score and sort
  return filtered
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get search index statistics
 */
export function getSearchIndexStats(): {
  loaded: boolean;
  totalDocuments: number;
  uniqueTerms: number;
  generatedAt: string;
  version: string;
} | null {
  const index = loadSearchIndex();
  if (!index) {
    return null;
  }

  return {
    loaded: true,
    totalDocuments: index.totalDocuments,
    uniqueTerms: index.idf.size,
    generatedAt: index.metadata.generatedAt,
    version: index.metadata.version,
  };
}

/**
 * Clear cached index (useful for testing)
 */
export function clearSearchIndexCache(): void {
  cachedIndex = null;
}
