/**
 * Test libSQL file URL formats for Windows
 */

import { createClient } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';

const testDir = path.join(process.cwd(), '.test-libsql');

// Ensure test directory exists
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

const testFile = path.join(testDir, 'test.db');

// Clean up previous test
if (fs.existsSync(testFile)) {
  fs.unlinkSync(testFile);
}

console.log('Platform:', process.platform);
console.log('Test directory:', testDir);
console.log('Test file path:', testFile);

// Test different URL formats
const formats = [
  { name: 'Absolute path (no scheme)', url: testFile },
  { name: 'file: + normalized path', url: `file:${testFile.replace(/\\/g, '/')}` },
  { name: 'file:/ + normalized path', url: `file:/${testFile.replace(/\\/g, '/')}` },
  { name: 'file:// + normalized path', url: `file://${testFile.replace(/\\/g, '/')}` },
  { name: 'file:/// + normalized path', url: `file:///${testFile.replace(/\\/g, '/')}` },
];

for (const format of formats) {
  try {
    console.log(`\nTesting: ${format.name}`);
    console.log(`URL: ${format.url}`);

    const client = createClient({ url: format.url });

    // Try to create a table to verify connection works
    await client.execute('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
    await client.execute("INSERT INTO test (name) VALUES ('test')");
    const result = await client.execute('SELECT * FROM test');

    console.log('✅ SUCCESS');
    console.log('Result:', result.rows);

    client.close();

    // Check if file was created
    if (fs.existsSync(testFile)) {
      console.log('✅ File created:', testFile);
      fs.unlinkSync(testFile);
    } else {
      console.log('❌ File not created');
    }

    break; // Success! Stop testing
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }
}

// Cleanup
try {
  fs.rmdirSync(testDir, { recursive: true });
} catch {}
