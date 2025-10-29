#!/usr/bin/env bun
/**
 * Build script for @sylphxltd/flow
 * Handles native module dependencies properly
 */

import { build, type BuildOutput } from 'bun';
import { rmSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Clean dist folder
console.log('🧹 Cleaning dist folder...');
if (existsSync('./dist')) {
  rmSync('./dist', { recursive: true, force: true });
}

// Native dependencies that should not be bundled
const externalDeps = [
  '@huggingface/transformers',
  'onnxruntime-node',
  'onnxruntime-web',
  'onnxruntime-common',
  'sharp',
  '@lancedb/lancedb',
  // Add other native dependencies if needed
];

console.log('📦 Building with external native dependencies...');
console.log('   External:', externalDeps.join(', '));

try {
  const result: BuildOutput = await build({
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

  // Copy assets
  console.log('📁 Copying assets...');
  if (existsSync('./src/assets')) {
    cpSync('./src/assets', './dist/assets', { recursive: true });
    console.log('✅ Assets copied');
  }

  console.log('\n🎉 Build complete!');
  console.log('\n📝 Note: Native dependencies are marked as external.');
  console.log('   They will be installed from npm when users run the package.');

} catch (error) {
  console.error('❌ Build error:', error);
  process.exit(1);
}
