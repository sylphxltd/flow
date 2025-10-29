#!/usr/bin/env node

/**
 * Ultimate Code Tokenizer 最終測試
 * 測試真正實用嘅 StarCoder2 + Professional 整合方案
 */

import { UltimateCodeTokenizer } from './src/utils/ultimate-code-tokenizer.js';
import { buildUltimateSearchIndex, searchDocuments } from './src/services/search/tfidf.js';

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

async function runUltimateTests() {
  console.log('🚀 Starting Ultimate Code Tokenizer final tests...\n');

  // 測試 1: 基本功能測試
  await testBasicFunctionality();

  // 測試 2: 搜索索引測試
  await testSearchIndex();

  // 測試 3: 搜索效果測試
  await testSearchEffectiveness();

  console.log('\n🎉 All Ultimate tests completed!');
}

async function testBasicFunctionality() {
  console.log('📋 Test 1: Basic Functionality');
  console.log('=' .repeat(50));

  const tokenizer = new UltimateCodeTokenizer({
    starcoderModelPath: './models/starcoder2',
    starcoderWeight: 0.7,
    professionalWeight: 0.3,
    enableStarcoder: true
  });

  await tokenizer.initialize();

  const testCode = `export function getUserData(id: string): Promise<User> {
  const API_KEY = process.env.API_KEY;
  return await fetch(\`/api/users/\${id}\`);
}`;

  console.log('🔤 Testing ultimate tokenization...');
  const result = await tokenizer.tokenize(testCode);

  console.log(`✅ Total tokens: ${result.metadata.totalTokens}`);
  console.log(`🤖 StarCoder2 tokens: ${result.metadata.starcoderTokens}`);
  console.log(`🔧 Professional tokens: ${result.metadata.professionalTokens}`);
  console.log(`⏱️  Processing time: ${result.metadata.processingTime}ms`);
  console.log(`🎯 Average score: ${result.metadata.averageScore.toFixed(3)}`);
  console.log(`✨ StarCoder2 available: ${result.starcoder.available}`);

  console.log('\nTop 10 tokens by score:');
  result.tokens.slice(0, 10).forEach((token, i) => {
    console.log(`  ${i + 1}. "${token.text}" (final: ${token.finalScore.toFixed(3)}, prof: ${token.professionalScore.toFixed(3)}, star: ${token.starcoderScore.toFixed(3)}, source: ${token.source}, relevance: ${token.relevance})`);
  });

  console.log('\n🔍 Technical tokens:');
  const technicalTokens = await tokenizer.getTechnicalTokens(testCode);
  technicalTokens.slice(0, 5).forEach((token, i) => {
    console.log(`  ${i + 1}. "${token.text}" (${token.relevance}, source: ${token.source})`);
  });

  console.log('\n');
}

async function testSearchIndex() {
  console.log('📋 Test 2: Search Index Building');
  console.log('=' .repeat(50));

  try {
    console.log('🏗️  Building Ultimate search index...');
    const startTime = Date.now();

    const index = await buildUltimateSearchIndex(testDocuments);

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
      'jwt token'
    ];

    for (const query of searchQueries) {
      const results = searchDocuments(query, index, { limit: 3 });
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
    const index = await buildUltimateSearchIndex(testDocuments);

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

    console.log('🎯 Ultimate Search Effectiveness Test Results:');
    console.log('Query                    | Results | Expected    | Match?');
    console.log('-'.repeat(70));

    let totalTests = 0;
    let passedTests = 0;

    for (const test of searchTests) {
      const results = searchDocuments(test.query, index, { limit: 5, minScore: 0.1 });
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
      console.log('🎉 Excellent search performance! Ultimate tokenizer is working great!');
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
runUltimateTests().catch(console.error);