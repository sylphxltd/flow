/**
 * TF-IDF (Term Frequency-Inverse Document Frequency) implementation
 * Used for ranking document relevance in semantic search
 */

import { filterStopWords } from '../../utils/text-processing.js';
import { ProfessionalTokenizer, type Token } from '../../utils/professional-tokenizer.js';
import { StarCoder2Tokenizer, type StarCoder2Token } from '../../utils/starcoder2-tokenizer.js';
import { UltimateCodeTokenizer, type UltimateToken } from '../../utils/ultimate-code-tokenizer.js';
import { DirectStarCoder2Tokenizer, type DirectStarCoder2Token } from '../../utils/direct-starcoder2.js';
import type { SeparatedMemoryStorage } from './separated-storage.js';

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
          filters.file_extensions?.some((ext: string) => file.path.endsWith(ext))
        );
      }

      if (filters.path_filter) {
        files = files.filter((file) => file.path.includes(filters.path_filter!));
      }

      if (filters.exclude_paths && filters.exclude_paths.length > 0) {
        files = files.filter(
          (file) => !filters.exclude_paths?.some((exclude: string) => file.path.includes(exclude))
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
 * Extract terms using professional tokenizer (保持原有功能)
 */
function extractProfessionalTerms(content: string): Map<string, number> {
  const tokenizer = new ProfessionalTokenizer({
    language: 'en',
    extractCamelCase: true,
    extractTechnicalTerms: true,
    useNgrams: true,
    extractCompoundWords: true,
    useContextualScoring: true,
    codeAware: true,
  });

  const tokens = tokenizer.tokenize(content);
  const terms = new Map<string, number>();

  // Group tokens by text and sum their scores
  for (const token of tokens) {
    const term = token.text.toLowerCase();
    const currentScore = terms.get(term) || 0;
    terms.set(term, currentScore + token.score);
  }

  return terms;
}

/**
 * Extract terms using Direct StarCoder2 (直接用 StarCoder2)
 */
async function extractDirectStarCoder2Terms(content: string): Promise<Map<string, number>> {
  const tokenizer = new DirectStarCoder2Tokenizer({
    modelPath: './models/starcoder2'
  });

  await tokenizer.initialize();
  const result = await tokenizer.tokenize(content);
  const terms = new Map<string, number>();

  // 使用 Direct StarCoder2 的分數
  for (const token of result.tokens) {
    const term = token.text.toLowerCase();
    const currentScore = terms.get(term) || 0;
    // 使用分數作為 TF 權重
    terms.set(term, currentScore + token.score);
  }

  return terms;
}

/**
 * Extract simple tokens for query processing (using optimized tokenizer)
 */
function extractQueryTokens(query: string): string[] {
  const tokenizer = new ProfessionalTokenizer({
    language: 'en',
    extractCamelCase: true,
    extractTechnicalTerms: true,
    useNgrams: false, // Disable n-grams for queries to keep them precise
    extractCompoundWords: false, // Disable compound words for queries
    useContextualScoring: false, // Disable contextual scoring for queries
    codeAware: true,
  });

  const tokens = tokenizer.tokenize(query);

  // Return unique tokens, sorted by score (highest first)
  const uniqueTokens = new Map<string, string>();
  for (const token of tokens) {
    const lowerText = token.text.toLowerCase();
    if (!uniqueTokens.has(lowerText) || token.score > 0.8) {
      uniqueTokens.set(lowerText, token.text);
    }
  }

  return Array.from(uniqueTokens.values());
}

/**
 * Build TF-IDF search index from documents using Direct StarCoder2 (直接用 StarCoder2)
 */
export async function buildDirectStarCoder2Index(documents: Array<{ uri: string; content: string }>): Promise<SearchIndex> {
  console.log('🚀 Building Direct StarCoder2 search index...');

  // Extract terms from all documents using Direct StarCoder2
  const documentTermsPromises = documents.map(async (doc) => ({
    uri: doc.uri,
    terms: await extractDirectStarCoder2Terms(doc.content),
  }));

  const documentTerms = await Promise.all(documentTermsPromises);

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

  console.log(`✅ Direct StarCoder2 search index built with ${documentVectors.length} documents`);

  return {
    documents: documentVectors,
    idf,
    totalDocuments: documents.length,
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '5.0.0-direct-starcoder2', // Direct StarCoder2 powered version
      tokenizer: 'Direct StarCoder2',
      features: [
        'StarCoder2 industry-leading code understanding',
        'Advanced technical term recognition',
        'Optimized for code search',
        'Simple and effective approach',
        'No unnecessary complexity'
      ]
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
 * Process query into TF-IDF vector using professional tokenizer
 */
export function processQuery(query: string, idf: Map<string, number>): Map<string, number> {
  const terms = extractProfessionalTerms(query);
  const tf = calculateTF(terms);
  return calculateTFIDF(tf, idf);
}

/**
 * Search documents using TF-IDF and cosine similarity with professional tokenizer
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
      technicalMatch?: number; // Boost for technical term matches
      identifierMatch?: number; // Boost for identifier matches
    };
  } = {}
): Array<{ uri: string; score: number; matchedTerms: string[] }> {
  const { limit = 10, minScore = 0, boostFactors = {} } = options;
  const {
    exactMatch = 1.5,
    phraseMatch = 2.0,
    technicalMatch = 1.8,
    identifierMatch = 1.3
  } = boostFactors;

  // Process query using professional tokenizer
  const queryVector = processQuery(query, index.idf);
  const queryTokens = extractQueryTokens(query).map(t => t.toLowerCase());

  // Calculate similarity for each document
  const results = index.documents.map((doc) => {
    let score = calculateCosineSimilarity(queryVector, doc);

    // Boost for exact term matches with enhanced scoring
    const matchedTerms: string[] = [];
    for (const token of queryTokens) {
      if (doc.rawTerms.has(token)) {
        // Apply different boost factors based on term characteristics
        let boostFactor = exactMatch;

        // Additional boost for technical terms
        if (isTechnicalTerm(token)) {
          boostFactor = Math.max(boostFactor, technicalMatch);
        }

        // Additional boost for identifiers
        if (isIdentifier(token)) {
          boostFactor = Math.max(boostFactor, identifierMatch);
        }

        score *= boostFactor;
        matchedTerms.push(token);
      }
    }

    // Enhanced phrase match detection (all query terms appear in document)
    if (matchedTerms.length === queryTokens.length && queryTokens.length > 1) {
      score *= phraseMatch;
    }

    // Contextual relevance boost for longer queries
    if (queryTokens.length > 3 && matchedTerms.length >= queryTokens.length * 0.7) {
      score *= 1.2; // Boost for partial matches on complex queries
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
 * Check if a term is likely a technical term
 */
function isTechnicalTerm(term: string): boolean {
  const technicalPatterns = [
    /\b[A-Z]{2,}\b/, // Acronyms like HTTP, API, JSON
    /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/, // PascalCase like ComponentName
    /\b[a-z]+[A-Z][a-z]*\b/, // camelCase like functionName
    /\b\w+(?:Dir|Config|File|Path|Data|Service|Manager|Handler)\b/, // Common suffixes
    /\b(?:get|set|is|has|can|should|will|do)[A-Z]\w*\b/, // Common prefixes
    /\b(?:http|https|json|xml|yaml|sql|api|url|uri)\b/, // Technical keywords
  ];

  return technicalPatterns.some(pattern => pattern.test(term));
}

/**
 * Check if a term is likely an identifier
 */
function isIdentifier(term: string): boolean {
  // Identifiers typically contain letters and numbers, maybe underscores
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(term) && term.length > 1;
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
