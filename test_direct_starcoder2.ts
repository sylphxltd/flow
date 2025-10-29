#!/usr/bin/env node

/**
 * Direct StarCoder2 Tokenizer 最終測試
 * 直接用 StarCoder2，咁勁就咁用，無需要複雜混合
 */

import { DirectStarCoder2Tokenizer } from './src/utils/direct-starcoder2.js';
import { buildDirectStarCoder2Index, searchDocuments } from './src/services/search/tfidf.js';

interface TestDocument {
  uri: string;
  content: string;
}

const testDocuments: TestDocument[] = [
  {
    uri: 'file:///project/auth.ts',
    content: `export async function authenticateUser(username: string, password: string): Promise<User> {
  const user = await database.users.findByUsername(username);
  if (!user || !bcrypt.compare(password, user.passwordHash)) {
    throw new Error('Invalid credentials');
  }
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  return { user, token };
}`
  },
  {
    uri: 'file:///project/database.ts',
    content: `import { Pool } from 'pg';

export class Database {
  private pool: Pool;

  constructor(connectionConfig: DatabaseConfig) {
    this.pool = new Pool(connectionConfig);
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
}`
  },
  {
    uri: 'file:///project/api.ts',
    content: `import express from 'express';
import { authenticateUser } from './auth.js';

const router = express.Router();

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authenticateUser(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

export default router;`
  }
];

async function runDirectTests() {
  console.log('🚀 Starting Direct StarCoder2 final tests...\n');

  // 測試 1: 基本功能測試
  await testBasicFunctionality();

  // 測試 2: 搜索索引測試
  await testSearchIndex();

  // 測試 3: 搜索效果測試
  await testSearchEffectiveness();

  console.log('\n🎉 All Direct StarCoder2 tests completed!');
}

async function testBasicFunctionality() {
  console.log('📋 Test 1: Basic Functionality');
  console.log('=' .repeat(50));

  const tokenizer = new DirectStarCoder2Tokenizer({
    modelPath: './models/starcoder2'
  });

  await tokenizer.initialize();

  const testCode = `export function getUserData(id: string): Promise<User> {
  const API_KEY = process.env.API_KEY;
  return await fetch(\`/api/users/\${id}\`);
}`;

  console.log('🔤 Testing Direct StarCoder2 tokenization...');
  const result = await tokenizer.tokenize(testCode);

  console.log(`✅ Total tokens: ${result.metadata.totalTokens}`);
  console.log(`📊 Vocabulary size: ${result.metadata.vocabSize}`);
  console.log(`⏱️  Processing time: ${result.metadata.processingTime}ms`);
  console.log(`🎯 Average confidence: ${result.metadata.averageConfidence.toFixed(3)}`);

  console.log('\nTop 10 tokens by score:');
  result.tokens.slice(0, 10).forEach((token, i) => {
    console.log(`  ${i + 1}. "${token.text}" (score: ${token.score.toFixed(3)}, confidence: ${token.confidence.toFixed(3)}, relevance: ${token.relevance})`);
  });

  console.log('\n🔍 Technical tokens:');
  const technicalTokens = await tokenizer.getTechnicalTokens(testCode);
  technicalTokens.slice(0, 5).forEach((token, i) => {
    console.log(`  ${i + 1}. "${token.text}" (${token.relevance})`);
  });

  console.log('\n');
}

async function testSearchIndex() {
  console.log('📋 Test 2: Search Index Building');
  console.log('=' .repeat(50));

  try {
    console.log('🏗️  Building Direct StarCoder2 search index...');
    const startTime = Date.now();

    const index = await buildDirectStarCoder2Index(testDocuments);

    const buildTime = Date.now() - startTime;

    console.log(`✅ Index built in ${buildTime}ms`);
    console.log(`📚 Total documents: ${index.totalDocuments}`);
    console.log(`🔤 Total unique terms: ${index.idf.size}`);
    console.log(`📋 Version: ${index.metadata.version}`);
    console.log(`🤖 Tokenizer: ${index.metadata.tokenizer}`);

    console.log('\n📊 Index features:');
    index.metadata.features.forEach((feature, i) => {
      console.log(`  ${i + 1}. ${feature}`);
    });

    // 測試搜索
    console.log('\n🔍 Testing search...');
    const searchQueries = [
      'authenticate user password',
      'database query',
      'API_KEY fetch',
      'express router',
      'jwt token',
      'function',
      'export'
    ];

    for (const query of searchQueries) {
      const results = await searchDocuments(query, index, { limit: 3 });
      console.log(`\nQuery: "${query}"`);
      if (results.length > 0) {
        results.forEach((result, i) => {
          console.log(`  ${i + 1}. ${result.uri.split('/').pop()} (score: ${result.score.toFixed(3)})`);
        });
      } else {
        console.log('  No results found');
      }
    }

  } catch (error) {
    console.error('❌ Search index test failed:', error.message);
  }

  console.log('\n');
}

async function testSearchEffectiveness() {
  console.log('📋 Test 3: Search Effectiveness');
  console.log('=' .repeat(50));

  try {
    const index = await buildDirectStarCoder2Index(testDocuments);

    const searchTests = [
      {
        query: 'authentication',
        expected: ['auth.ts'],
        description: 'Find authentication related code'
      },
      {
        query: 'database query',
        expected: ['database.ts'],
        description: 'Find database operations'
      },
      {
        query: 'express router API',
        expected: ['api.ts'],
        description: 'Find Express API endpoints'
      },
      {
        query: 'JWT token',
        expected: ['auth.ts'],
        description: 'Find JWT token handling'
      },
      {
        query: 'fetch API_KEY',
        expected: ['auth.ts', 'api.ts'],
        description: 'Find API calls with keys'
      },
      {
        query: 'function',
        expected: ['auth.ts', 'database.ts', 'api.ts'],
        description: 'Find function definitions'
      },
      {
        query: 'export',
        expected: ['auth.ts', 'database.ts', 'api.ts'],
        description: 'Find export statements'
      }
    ];

    console.log('🎯 Direct StarCoder2 Search Effectiveness Test Results:');
    console.log('Query                    | Results | Expected    | Match?');
    console.log('-'.repeat(70));

    let totalTests = 0;
    let passedTests = 0;

    for (const test of searchTests) {
      const results = await searchDocuments(test.query, index, { limit: 5, minScore: 0.1 });
      const resultFiles = results.map(r => r.uri.split('/').pop());

      const hasExpected = test.expected.some(expected =>
        resultFiles.some(result => result.includes(expected))
      );

      if (hasExpected) passedTests++;
      totalTests++;

      console.log(
        `${test.query.padEnd(24)} | ${results.length.toString().padEnd(7)} | ${test.expected.join(', ').padEnd(11)} | ${hasExpected ? '✅' : '❌'}`
      );

      // 顯示實際找到的文件
      if (results.length > 0) {
        console.log(`                         Found: ${resultFiles.join(', ')}`);
      }
    }

    const accuracy = (passedTests / totalTests) * 100;
    console.log(`\n📈 Search Accuracy: ${accuracy.toFixed(1)}% (${passedTests}/${totalTests})`);

    if (accuracy >= 80) {
      console.log('🎉 Excellent search performance! Direct StarCoder2 is working perfectly!');
    } else if (accuracy >= 60) {
      console.log('👍 Good search performance');
    } else {
      console.log('⚠️  Search performance needs improvement');
    }

  } catch (error) {
    console.error('❌ Search effectiveness test failed:', error.message);
  }

  console.log('\n');
}

// 運行所有測試
runDirectTests().catch(console.error);