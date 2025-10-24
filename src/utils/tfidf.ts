/**
 * TF-IDF (Term Frequency-Inverse Document Frequency) implementation
 * Used for ranking document relevance in semantic search
 */

import { extractTerms, filterStopWords, tokenize } from './text-processing.js';
import { SeparatedMemoryStorage } from './separated-storage.js';

export interface DocumentVector {
  uri: string;
  terms: Map<string, number>; // term → TF-IDF score
  rawTerms: Map<string, number>; // term → raw frequency
  magnitude: number; // Vector magnitude for cosine similarity
}

export interface SearchIndex {
  documents: DocumentVector[];
  idf: Map<string, number>; // term → IDF score
  totalDocuments: number;
  metadata: {
    generatedAt: string;
    version: string;
  };
}

/**
 * Build search index from database (shared between CLI and MCP)
 */
export async function buildSearchIndexFromDB(
  memoryStorage: SeparatedMemoryStorage,
  filters?: {
    file_extensions?: string[];
    path_filter?: string;
    exclude_paths?: string[];
  }
): Promise<SearchIndex | null> {
  try {
    // Get all files from database
    let files = await memoryStorage.getAllCodebaseFiles();

    // Apply filters
    if (filters) {
      if (filters.file_extensions && filters.file_extensions.length > 0) {
        files = files.filter((file) =>
          filters.file_extensions!.some((ext: string) => file.path.endsWith(ext))
        );
      }

      if (filters.path_filter) {
        files = files.filter((file) => file.path.includes(filters.path_filter!));
      }

      if (filters.exclude_paths && filters.exclude_paths.length > 0) {
        files = files.filter(
          (file) => !filters.exclude_paths!.some((exclude: string) => file.path.includes(exclude))
        );
      }
    }

    if (files.length === 0) {
      return null;
    }

    // Build search documents
    const documents = [];
    for (const file of files) {
      const tfidfDoc = await memoryStorage.getTFIDFDocument(file.path);
      if (tfidfDoc) {
        const rawTerms = tfidfDoc.rawTerms || {};
        const terms = new Map<string, number>();
        const rawTermsMap = new Map<string, number>();

        for (const [term, freq] of Object.entries(rawTerms)) {
          terms.set(term, freq as number);
          rawTermsMap.set(term, freq as number);
        }

        documents.push({
          uri: `file://${file.path}`,
          terms,
          rawTerms: rawTermsMap,
          magnitude: tfidfDoc.magnitude,
        });
      }
    }

    if (documents.length === 0) {
      return null;
    }

    // Get IDF values from database
    const idfRecords = await memoryStorage.getIDFValues();
    const idf = new Map<string, number>();
    for (const [term, value] of Object.entries(idfRecords)) {
      idf.set(term, value as number);
    }

    return {
      documents,
      idf,
      totalDocuments: documents.length,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  } catch (error) {
    console.error('[ERROR] Failed to build search index from database:', error);
    return null;
  }
}

/**
 * Calculate Term Frequency (TF)
 * TF = (number of times term appears in document) / (total terms in document)
 */
function calculateTF(termFrequency: Map<string, number>): Map<string, number> {
  const totalTerms = Array.from(termFrequency.values()).reduce((sum, freq) => sum + freq, 0);
  const tf = new Map<string, number>();

  for (const [term, freq] of termFrequency.entries()) {
    tf.set(term, freq / totalTerms);
  }

  return tf;
}

/**
 * Calculate Inverse Document Frequency (IDF)
 * IDF = log(total documents / documents containing term)
 */
function calculateIDF(
  documents: Map<string, number>[],
  totalDocuments: number
): Map<string, number> {
  const documentFrequency = new Map<string, number>();

  // Count how many documents contain each term
  for (const doc of documents) {
    const uniqueTerms = new Set(doc.keys());
    for (const term of uniqueTerms) {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }
  }

  // Calculate IDF for each term
  const idf = new Map<string, number>();
  for (const [term, docFreq] of documentFrequency.entries()) {
    idf.set(term, Math.log(totalDocuments / docFreq));
  }

  return idf;
}

/**
 * Calculate TF-IDF scores for a document
 */
function calculateTFIDF(tf: Map<string, number>, idf: Map<string, number>): Map<string, number> {
  const tfidf = new Map<string, number>();

  for (const [term, tfScore] of tf.entries()) {
    const idfScore = idf.get(term) || 0;
    tfidf.set(term, tfScore * idfScore);
  }

  return tfidf;
}

/**
 * Calculate vector magnitude for cosine similarity
 */
function calculateMagnitude(vector: Map<string, number>): number {
  let sum = 0;
  for (const value of vector.values()) {
    sum += value * value;
  }
  return Math.sqrt(sum);
}

/**
 * Build TF-IDF search index from documents
 */
export function buildSearchIndex(documents: Array<{ uri: string; content: string }>): SearchIndex {
  // Extract terms from all documents
  const documentTerms = documents.map((doc) => ({
    uri: doc.uri,
    terms: extractTerms(doc.content),
  }));

  // Calculate IDF scores
  const idf = calculateIDF(
    documentTerms.map((d) => d.terms),
    documents.length
  );

  // Calculate TF-IDF for each document
  const documentVectors: DocumentVector[] = documentTerms.map((doc) => {
    const tf = calculateTF(doc.terms);
    const tfidf = calculateTFIDF(tf, idf);
    const magnitude = calculateMagnitude(tfidf);

    return {
      uri: doc.uri,
      terms: tfidf,
      rawTerms: doc.terms,
      magnitude,
    };
  });

  return {
    documents: documentVectors,
    idf,
    totalDocuments: documents.length,
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
    },
  };
}

/**
 * Calculate cosine similarity between query and document
 */
export function calculateCosineSimilarity(
  queryVector: Map<string, number>,
  docVector: DocumentVector
): number {
  let dotProduct = 0;

  // Calculate dot product
  for (const [term, queryScore] of queryVector.entries()) {
    const docScore = docVector.terms.get(term) || 0;
    dotProduct += queryScore * docScore;
  }

  // Calculate query magnitude
  const queryMagnitude = calculateMagnitude(queryVector);

  if (queryMagnitude === 0 || docVector.magnitude === 0) {
    return 0;
  }

  return dotProduct / (queryMagnitude * docVector.magnitude);
}

/**
 * Process query into TF-IDF vector
 */
export function processQuery(query: string, idf: Map<string, number>): Map<string, number> {
  const terms = extractTerms(query);
  const tf = calculateTF(terms);
  return calculateTFIDF(tf, idf);
}

/**
 * Search documents using TF-IDF and cosine similarity
 */
export function searchDocuments(
  query: string,
  index: SearchIndex,
  options: {
    limit?: number;
    minScore?: number;
    boostFactors?: {
      exactMatch?: number; // Boost for exact term matches
      phraseMatch?: number; // Boost for phrase matches
    };
  } = {}
): Array<{ uri: string; score: number; matchedTerms: string[] }> {
  const { limit = 10, minScore = 0, boostFactors = {} } = options;
  const { exactMatch = 1.5, phraseMatch = 2.0 } = boostFactors;

  // Process query
  const queryVector = processQuery(query, index.idf);
  const queryTokens = filterStopWords(tokenize(query));

  // Calculate similarity for each document
  const results = index.documents.map((doc) => {
    let score = calculateCosineSimilarity(queryVector, doc);

    // Boost for exact term matches
    const matchedTerms: string[] = [];
    for (const token of queryTokens) {
      if (doc.rawTerms.has(token)) {
        score *= exactMatch;
        matchedTerms.push(token);
      }
    }

    // Boost for phrase matches (all query terms appear in document)
    if (matchedTerms.length === queryTokens.length && queryTokens.length > 1) {
      score *= phraseMatch;
    }

    return {
      uri: doc.uri,
      score,
      matchedTerms,
    };
  });

  // Filter and sort
  return results
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Serialize search index to JSON
 */
export function serializeIndex(index: SearchIndex): string {
  const serializable = {
    documents: index.documents.map((doc) => ({
      uri: doc.uri,
      terms: Array.from(doc.terms.entries()),
      rawTerms: Array.from(doc.rawTerms.entries()),
      magnitude: doc.magnitude,
    })),
    idf: Array.from(index.idf.entries()),
    totalDocuments: index.totalDocuments,
    metadata: index.metadata,
  };

  return JSON.stringify(serializable, null, 2);
}

/**
 * Deserialize search index from JSON
 */
export function deserializeIndex(json: string): SearchIndex {
  const data = JSON.parse(json);

  return {
    documents: data.documents.map(
      (doc: {
        uri: string;
        terms: [string, number][];
        rawTerms: [string, number][];
        magnitude: number;
      }) => ({
        uri: doc.uri,
        terms: new Map(doc.terms),
        rawTerms: new Map(doc.rawTerms),
        magnitude: doc.magnitude,
      })
    ),
    idf: new Map(data.idf),
    totalDocuments: data.totalDocuments,
    metadata: data.metadata,
  };
}
