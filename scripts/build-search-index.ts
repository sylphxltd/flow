#!/usr/bin/env bun
/**
 * Build TF-IDF search index for knowledge base
 * Run: bun run scripts/build-search-index.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearchIndex, serializeIndex } from '../src/utils/tfidf.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_DIR = path.join(__dirname, '../assets/knowledge');
const OUTPUT_FILE = path.join(KNOWLEDGE_DIR, 'search-index.json');

interface KnowledgeFile {
  uri: string;
  content: string;
  relativePath: string;
}

/**
 * Recursively scan directory for .md files
 */
function scanKnowledgeFiles(dir: string, baseDir: string): KnowledgeFile[] {
  const results: KnowledgeFile[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...scanKnowledgeFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relativePath = path.relative(baseDir, fullPath);
      const uriPath = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath, 'utf8');

      results.push({
        uri: `knowledge://${uriPath}`,
        content,
        relativePath,
      });
    }
  }

  return results;
}

/**
 * Main build function
 */
function main() {
  console.log('🔍 Building search index for knowledge base...\n');

  // Check if knowledge directory exists
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.error(`❌ Knowledge directory not found: ${KNOWLEDGE_DIR}`);
    process.exit(1);
  }

  // Scan all knowledge files
  console.log(`📂 Scanning: ${KNOWLEDGE_DIR}`);
  const files = scanKnowledgeFiles(KNOWLEDGE_DIR, KNOWLEDGE_DIR);
  console.log(`✅ Found ${files.length} knowledge files\n`);

  if (files.length === 0) {
    console.error('❌ No knowledge files found');
    process.exit(1);
  }

  // Build search index
  console.log('🔨 Building TF-IDF index...');
  const startTime = Date.now();

  const documents = files.map((file) => ({
    uri: file.uri,
    content: file.content,
  }));

  const index = buildSearchIndex(documents);
  const buildTime = Date.now() - startTime;

  console.log(`✅ Index built in ${buildTime}ms`);
  console.log(`   - Documents: ${index.totalDocuments}`);
  console.log(`   - Unique terms: ${index.idf.size}`);
  console.log(`   - Generated: ${index.metadata.generatedAt}\n`);

  // Serialize and save
  console.log(`💾 Saving index to: ${OUTPUT_FILE}`);
  const serialized = serializeIndex(index);
  fs.writeFileSync(OUTPUT_FILE, serialized, 'utf8');

  const fileSize = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2);
  console.log(`✅ Index saved (${fileSize} KB)\n`);

  // Print sample statistics
  console.log('📊 Sample statistics:');
  const topTerms = Array.from(index.idf.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('\nTop 10 most distinctive terms (highest IDF):');
  for (const [term, idf] of topTerms) {
    console.log(`   - ${term}: ${idf.toFixed(3)}`);
  }

  console.log('\n✨ Search index build complete!');
}

// Run
main();
