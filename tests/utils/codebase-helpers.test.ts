/**
 * Codebase Helpers Tests
 * Tests for file scanning and language detection utilities
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectLanguage,
  isTextFile,
  loadGitignore,
  scanFiles,
  simpleHash,
} from '../../src/utils/codebase-helpers.js';

describe('Codebase Helpers', () => {
  describe('detectLanguage', () => {
    it('should detect TypeScript', () => {
      expect(detectLanguage('file.ts')).toBe('TypeScript');
      expect(detectLanguage('path/to/file.ts')).toBe('TypeScript');
    });

    it('should detect TSX', () => {
      expect(detectLanguage('component.tsx')).toBe('TSX');
    });

    it('should detect JavaScript', () => {
      expect(detectLanguage('script.js')).toBe('JavaScript');
    });

    it('should detect JSX', () => {
      expect(detectLanguage('component.jsx')).toBe('JSX');
    });

    it('should detect Python', () => {
      expect(detectLanguage('script.py')).toBe('Python');
    });

    it('should detect Java', () => {
      expect(detectLanguage('Main.java')).toBe('Java');
    });

    it('should detect Go', () => {
      expect(detectLanguage('main.go')).toBe('Go');
    });

    it('should detect Rust', () => {
      expect(detectLanguage('main.rs')).toBe('Rust');
    });

    it('should detect C', () => {
      expect(detectLanguage('main.c')).toBe('C');
    });

    it('should detect C++', () => {
      expect(detectLanguage('main.cpp')).toBe('C++');
    });

    it('should detect C#', () => {
      expect(detectLanguage('Program.cs')).toBe('C#');
    });

    it('should detect Ruby', () => {
      expect(detectLanguage('script.rb')).toBe('Ruby');
    });

    it('should detect PHP', () => {
      expect(detectLanguage('index.php')).toBe('PHP');
    });

    it('should detect Swift', () => {
      expect(detectLanguage('App.swift')).toBe('Swift');
    });

    it('should detect Kotlin', () => {
      expect(detectLanguage('Main.kt')).toBe('Kotlin');
    });

    it('should detect Markdown', () => {
      expect(detectLanguage('README.md')).toBe('Markdown');
    });

    it('should detect JSON', () => {
      expect(detectLanguage('package.json')).toBe('JSON');
    });

    it('should detect YAML', () => {
      expect(detectLanguage('config.yaml')).toBe('YAML');
      expect(detectLanguage('config.yml')).toBe('YAML');
    });

    it('should detect TOML', () => {
      expect(detectLanguage('config.toml')).toBe('TOML');
    });

    it('should detect SQL', () => {
      expect(detectLanguage('query.sql')).toBe('SQL');
    });

    it('should detect Shell scripts', () => {
      expect(detectLanguage('script.sh')).toBe('Shell');
      expect(detectLanguage('script.bash')).toBe('Bash');
    });

    it('should handle case insensitivity', () => {
      expect(detectLanguage('FILE.TS')).toBe('TypeScript');
      expect(detectLanguage('FILE.Ts')).toBe('TypeScript');
    });

    it('should return undefined for unknown extensions', () => {
      expect(detectLanguage('file.xyz')).toBeUndefined();
      expect(detectLanguage('file.unknown')).toBeUndefined();
    });

    it('should return undefined for files without extension', () => {
      expect(detectLanguage('Makefile')).toBeUndefined();
      expect(detectLanguage('README')).toBeUndefined();
    });
  });

  describe('isTextFile', () => {
    it('should identify TypeScript files as text', () => {
      expect(isTextFile('file.ts')).toBe(true);
      expect(isTextFile('file.tsx')).toBe(true);
    });

    it('should identify JavaScript files as text', () => {
      expect(isTextFile('file.js')).toBe(true);
      expect(isTextFile('file.jsx')).toBe(true);
    });

    it('should identify Python files as text', () => {
      expect(isTextFile('script.py')).toBe(true);
    });

    it('should identify Markdown files as text', () => {
      expect(isTextFile('README.md')).toBe(true);
    });

    it('should identify JSON files as text', () => {
      expect(isTextFile('package.json')).toBe(true);
    });

    it('should identify YAML files as text', () => {
      expect(isTextFile('config.yaml')).toBe(true);
      expect(isTextFile('config.yml')).toBe(true);
    });

    it('should identify common text files', () => {
      expect(isTextFile('file.txt')).toBe(true);
      expect(isTextFile('.gitignore')).toBe(true);
      expect(isTextFile('.env')).toBe(true);
      // Note: Files with compound extensions like .env.example won't match
      // because path.extname('.env.example') returns '.example', not '.env.example'
    });

    it('should identify Dockerfile as text', () => {
      expect(isTextFile('Dockerfile')).toBe(true);
      expect(isTextFile('.dockerfile')).toBe(true);
    });

    it('should reject binary file extensions', () => {
      expect(isTextFile('image.png')).toBe(false);
      expect(isTextFile('image.jpg')).toBe(false);
      expect(isTextFile('image.gif')).toBe(false);
      expect(isTextFile('video.mp4')).toBe(false);
      expect(isTextFile('archive.zip')).toBe(false);
      expect(isTextFile('binary.exe')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isTextFile('FILE.TS')).toBe(true);
      expect(isTextFile('IMAGE.PNG')).toBe(false);
    });
  });

  describe('simpleHash', () => {
    it('should generate consistent hash for same content', () => {
      const content = 'Hello, World!';
      const hash1 = simpleHash(content);
      const hash2 = simpleHash(content);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const hash1 = simpleHash('content1');
      const hash2 = simpleHash('content2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = simpleHash('');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle long content', () => {
      const longContent = 'x'.repeat(10000);
      const hash = simpleHash(longContent);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle special characters', () => {
      const content = '!@#$%^&*(){}[]<>?/\\|~`';
      const hash = simpleHash(content);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const content = '你好世界 🌍';
      const hash = simpleHash(content);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should be deterministic', () => {
      const content = 'test content';
      const hashes = Array.from({ length: 10 }, () => simpleHash(content));

      expect(new Set(hashes).size).toBe(1);
    });
  });

  describe('loadGitignore', () => {
    let testDir: string;
    let originalCwd: string;

    beforeEach(() => {
      testDir = join(tmpdir(), `gitignore-test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });
      originalCwd = process.cwd();
      process.chdir(testDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should load .gitignore file', () => {
      writeFileSync('.gitignore', 'node_modules/\n*.log\ndist/');

      const ig = loadGitignore(testDir);

      expect(ig.ignores('node_modules/package.json')).toBe(true);
      expect(ig.ignores('error.log')).toBe(true);
      expect(ig.ignores('dist/index.js')).toBe(true);
      expect(ig.ignores('src/index.ts')).toBe(false);
    });

    it('should handle missing .gitignore', () => {
      const ig = loadGitignore(testDir);

      // Should return an ignore instance that doesn't ignore anything
      expect(ig.ignores('any-file.txt')).toBe(false);
    });

    it('should handle comments in .gitignore', () => {
      writeFileSync('.gitignore', '# Comment\nnode_modules/\n# Another comment\n*.log');

      const ig = loadGitignore(testDir);

      expect(ig.ignores('node_modules/test.js')).toBe(true);
      expect(ig.ignores('test.log')).toBe(true);
    });

    it('should handle empty lines', () => {
      writeFileSync('.gitignore', 'node_modules/\n\n\n*.log\n\n');

      const ig = loadGitignore(testDir);

      expect(ig.ignores('node_modules/test.js')).toBe(true);
      expect(ig.ignores('test.log')).toBe(true);
    });

    it('should handle negation patterns', () => {
      writeFileSync('.gitignore', '*.log\n!important.log');

      const ig = loadGitignore(testDir);

      expect(ig.ignores('error.log')).toBe(true);
      expect(ig.ignores('important.log')).toBe(false);
    });

    it('should always ignore common directories', () => {
      const ig = loadGitignore(testDir);

      expect(ig.ignores('node_modules/package.json')).toBe(true);
      expect(ig.ignores('.git/config')).toBe(true);
      expect(ig.ignores('dist/bundle.js')).toBe(true);
    });
  });

  describe('scanFiles', () => {
    let testDir: string;
    let originalCwd: string;

    beforeEach(() => {
      testDir = join(tmpdir(), `scan-test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });
      originalCwd = process.cwd();
      process.chdir(testDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should scan files in directory', () => {
      writeFileSync('file1.ts', 'content1');
      writeFileSync('file2.js', 'content2');

      const results = scanFiles(testDir);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some((f) => f.path.endsWith('file1.ts'))).toBe(true);
      expect(results.some((f) => f.path.endsWith('file2.js'))).toBe(true);
    });

    it('should scan nested directories', () => {
      mkdirSync('src', { recursive: true });
      mkdirSync('src/utils', { recursive: true });
      writeFileSync('src/index.ts', 'content');
      writeFileSync('src/utils/helper.ts', 'content');

      const results = scanFiles(testDir);

      expect(
        results.some((f) => f.path.includes('src/index.ts') || f.path.includes('src\\index.ts'))
      ).toBe(true);
      expect(
        results.some(
          (f) => f.path.includes('src/utils/helper.ts') || f.path.includes('src\\utils\\helper.ts')
        )
      ).toBe(true);
    });

    it('should respect .gitignore', () => {
      writeFileSync('.gitignore', 'ignored.txt');
      writeFileSync('included.txt', 'content');
      writeFileSync('ignored.txt', 'content');

      const ig = loadGitignore(testDir);
      const results = scanFiles(testDir, { ignoreFilter: ig });

      expect(results.some((f) => f.path.includes('included.txt'))).toBe(true);
      expect(results.some((f) => f.path.includes('ignored.txt'))).toBe(false);
    });

    it('should ignore node_modules', () => {
      mkdirSync('node_modules', { recursive: true });
      writeFileSync('index.ts', 'content');
      writeFileSync('node_modules/package.json', '{}');

      const ig = loadGitignore(testDir);
      const results = scanFiles(testDir, { ignoreFilter: ig });

      expect(results.some((f) => f.path.includes('index.ts'))).toBe(true);
      expect(results.some((f) => f.path.includes('node_modules'))).toBe(false);
    });

    it('should ignore .git directory', () => {
      mkdirSync('.git', { recursive: true });
      writeFileSync('file.ts', 'content');
      writeFileSync('.git/config', 'content');

      const ig = loadGitignore(testDir);
      const results = scanFiles(testDir, { ignoreFilter: ig });

      expect(results.some((f) => f.path.includes('file.ts'))).toBe(true);
      expect(results.some((f) => f.path.includes('.git'))).toBe(false);
    });

    it('should return total size', () => {
      writeFileSync('file1.txt', 'content');
      writeFileSync('file2.txt', 'more content');

      const results = scanFiles(testDir);
      const totalSize = results.reduce((sum, f) => sum + f.size, 0);

      expect(totalSize).toBeGreaterThan(0);
    });

    it('should return file count', () => {
      writeFileSync('file1.txt', 'content');
      writeFileSync('file2.txt', 'content');
      writeFileSync('file3.txt', 'content');

      const results = scanFiles(testDir);

      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle empty directory', () => {
      const emptyDir = join(testDir, 'empty');
      mkdirSync(emptyDir);

      const results = scanFiles(emptyDir);

      expect(results).toEqual([]);
    });

    it('should only include text files', () => {
      writeFileSync('text.ts', 'content');
      writeFileSync('binary.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));

      const results = scanFiles(testDir);

      expect(results.some((f) => f.path.includes('text.ts'))).toBe(true);
      // PNG files should not be included in scan
      const hasPng = results.some((f) => f.path.includes('binary.png'));
      expect(hasPng).toBe(false);
    });
  });

  describe('Integration', () => {
    let testDir: string;
    let originalCwd: string;

    beforeEach(() => {
      testDir = join(tmpdir(), `integration-test-${Date.now()}`);
      mkdirSync(testDir, { recursive: true });
      originalCwd = process.cwd();
      process.chdir(testDir);
    });

    afterEach(() => {
      process.chdir(originalCwd);
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should work together for codebase indexing', () => {
      // Create realistic project structure
      mkdirSync('src', { recursive: true });
      mkdirSync('node_modules', { recursive: true });

      writeFileSync('src/index.ts', 'export const foo = "bar";');
      writeFileSync('src/utils.js', 'module.exports = {};');
      writeFileSync('README.md', '# Project');
      writeFileSync('node_modules/lib.js', 'ignored');
      writeFileSync('.gitignore', 'node_modules/');

      // Scan files with ignore filter
      const ig = loadGitignore(testDir);
      const results = scanFiles(testDir, { ignoreFilter: ig });

      // Check files are scanned
      expect(results.length).toBeGreaterThan(0);

      // Verify each file
      for (const result of results) {
        // Should not include node_modules
        expect(result.path).not.toContain('node_modules');

        // Detect language
        const lang = detectLanguage(result.path);
        expect(['TypeScript', 'JavaScript', 'Markdown', undefined]).toContain(lang);

        // Check if text file
        const isText = isTextFile(result.path);
        expect(typeof isText).toBe('boolean');
      }
    });
  });
});
