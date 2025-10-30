#!/usr/bin/env bun
/**
 * Build script for @sylphxltd/flow
 * Uses Bun for faster builds with proper native module handling
 */

import { chmodSync, cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'bun';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Clean dist folder
console.log('🧹 Cleaning dist folder...');
const distPath = join(__dirname, 'dist');
if (existsSync(distPath)) {
  rmSync(distPath, { recursive: true, force: true });
}

// Native dependencies that should not be bundled
const externalDeps = [
  '@huggingface/transformers',
  'onnxruntime-node',
  'onnxruntime-web',
  'onnxruntime-common',
  'sharp',
  '@lancedb/lancedb',
  'fsevents',
];

console.log('📦 Building with Bun...');
console.log('   External deps:', externalDeps.join(', '));

try {
  const result = await build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    target: 'node',
    minify: true,
    splitting: true,
    external: externalDeps,
    sourcemap: 'external',
  });

  if (!result.success) {
    console.error('❌ Build failed');
    process.exit(1);
  }

  console.log('✅ Build successful!');

  // Make index.js executable
  const indexPath = join(distPath, 'index.js');
  if (existsSync(indexPath)) {
    chmodSync(indexPath, '755');
    console.log('✅ Made index.js executable');
  }

  // Copy assets
  console.log('📁 Copying assets...');
  const assetsPath = join(__dirname, 'src', 'assets');
  if (existsSync(assetsPath)) {
    const destPath = join(distPath, 'assets');
    cpSync(assetsPath, destPath, { recursive: true });
    console.log('✅ Assets copied');
  }

  console.log('\n🎉 Build complete!');
  console.log('\n📝 Note: Native dependencies are marked as external.');
  console.log('   They will be resolved from node_modules at runtime.');
} catch (error) {
  console.error('❌ Build error:', error);
  process.exit(1);
}
