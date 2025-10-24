/**
 * Semantic search implementation using TF-IDF
 * Runtime indexing with intelligent caching
 */

import fs from 'node:fs';
import path from 'node:path';
import { getKnowledgeDir } from './paths.js';
import { type SearchIndex, buildSearchIndex, processQuery } from './tfidf.js';

let cachedIndex: SearchIndex | null = null;
let indexingPromise: Promise<SearchIndex> | null = null;
const indexingStatus = {
  isIndexing: false,
  progress: 0,
  error: undefined as string | undefined,
};

/**
 * Scan knowledge directory for markdown files
 */
function scanKnowledgeFiles(dir: string): Array<{ uri: string; content: string }> {
  const results: Array<{ uri: string; content: string }> = [];

  function scan(currentDir: string, baseDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath, baseDir);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = path.relative(baseDir, fullPath);
        const uriPath = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');
        const content = fs.readFileSync(fullPath, 'utf8');

        results.push({
          uri: `knowledge://${uriPath}`,
          content,
        });
      }
    }
  }

  scan(dir, dir);
  return results;
}

/**
 * Build knowledge index at runtime
 */
async function buildKnowledgeIndex(): Promise<SearchIndex> {
  const knowledgeDir = getKnowledgeDir();

  if (!fs.existsSync(knowledgeDir)) {
    throw new Error(`Knowledge directory not found: ${knowledgeDir}`);
  }

  console.error('[INFO] Building knowledge search index...');
  const files = scanKnowledgeFiles(knowledgeDir);
  console.error(`[INFO] Found ${files.length} knowledge files`);

  const index = buildSearchIndex(files);
  console.error(
    `[INFO] Knowledge index built: ${index.totalDocuments} documents, ${index.idf.size} terms`
  );

  return index;
}

/**
 * Load or build search index (with caching)
 */
export async function loadSearchIndex(): Promise<SearchIndex | null> {
  // Return cached index if available
  if (cachedIndex) {
    return cachedIndex;
  }

  // If already indexing, wait for it
  if (indexingPromise) {
    return indexingPromise;
  }

  // Start indexing
  indexingStatus.isIndexing = true;
  indexingStatus.progress = 0;
  indexingStatus.error = undefined;

  indexingPromise = buildKnowledgeIndex()
    .then((index) => {
      cachedIndex = index;
      indexingStatus.isIndexing = false;
      indexingStatus.progress = 100;
      return index;
    })
    .catch((error) => {
      indexingStatus.isIndexing = false;
      indexingStatus.error = error instanceof Error ? error.message : String(error);
      console.error('[ERROR] Failed to build knowledge index:', error);
      throw error;
    });

  return indexingPromise;
}

/**
 * Start background indexing (non-blocking)
 */
export function startKnowledgeIndexing() {
  if (indexingStatus.isIndexing || cachedIndex) {
    return;
  }

  console.error('[INFO] Starting background knowledge indexing...');
  loadSearchIndex().catch((error) => {
    console.error('[ERROR] Background knowledge indexing failed:', error);
  });
}

/**
 * Get indexing status
 */
export function getKnowledgeIndexingStatus() {
  return {
    isIndexing: indexingStatus.isIndexing,
    progress: indexingStatus.progress,
    isReady: cachedIndex !== null,
    error: indexingStatus.error,
  };
}

/**
 * Search knowledge base using semantic search
 */
export async function semanticSearch(
  query: string,
  options: {
    limit?: number;
    minScore?: number;
    categories?: string[];
  } = {}
): Promise<
  Array<{
    uri: string;
    score: number;
    matchedTerms: string[];
    relevance: number; // 0-100 percentage
  }>
> {
  const { limit = 5, minScore = 0.01, categories } = options;

  const index = await loadSearchIndex();
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
export async function getSearchIndexStats(): Promise<{
  loaded: boolean;
  totalDocuments: number;
  uniqueTerms: number;
  generatedAt: string;
  version: string;
} | null> {
  const index = await loadSearchIndex();
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
  indexingPromise = null;
}
