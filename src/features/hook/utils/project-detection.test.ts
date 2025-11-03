import { describe, it, expect } from 'vitest';
import {
  hasTypeScript,
  hasReact,
  hasNext,
  detectProjectType,
  extractPackageManager,
  detectPackageManagerFromFiles,
  determinePackageManager,
  buildProjectInfo,
  type PackageJson,
} from './project-detection.js';

describe('hasTypeScript', () => {
  it('should detect TypeScript from dependencies', () => {
    expect(hasTypeScript({ dependencies: { typescript: '^5.0.0' } })).toBe(true);
    expect(hasTypeScript({ devDependencies: { typescript: '^5.0.0' } })).toBe(true);
    expect(hasTypeScript({ devDependencies: { '@types/node': '^20.0.0' } })).toBe(true);
  });

  it('should detect TypeScript from scripts', () => {
    expect(hasTypeScript({ scripts: { build: 'tsc' } })).toBe(true);
    expect(hasTypeScript({ scripts: { dev: 'ts-node index.ts' } })).toBe(true);
  });

  it('should return false when TypeScript not present', () => {
    expect(hasTypeScript({})).toBe(false);
    expect(hasTypeScript({ dependencies: { react: '^18.0.0' } })).toBe(false);
  });
});

describe('hasReact', () => {
  it('should detect React from dependencies', () => {
    expect(hasReact({ dependencies: { react: '^18.0.0' } })).toBe(true);
    expect(hasReact({ devDependencies: { react: '^18.0.0' } })).toBe(true);
  });

  it('should detect React from vite scripts', () => {
    expect(hasReact({ scripts: { dev: 'vite' } })).toBe(true);
    expect(hasReact({ scripts: { build: 'vite build' } })).toBe(true);
  });

  it('should return false when React not present', () => {
    expect(hasReact({})).toBe(false);
  });
});

describe('hasNext', () => {
  it('should detect Next.js from dependencies', () => {
    expect(hasNext({ dependencies: { next: '^14.0.0' } })).toBe(true);
    expect(hasNext({ devDependencies: { next: '^14.0.0' } })).toBe(true);
  });

  it('should detect Next.js from scripts', () => {
    expect(hasNext({ scripts: { dev: 'next dev' } })).toBe(true);
    expect(hasNext({ scripts: { build: 'next build' } })).toBe(true);
  });

  it('should return false when Next.js not present', () => {
    expect(hasNext({})).toBe(false);
  });
});

describe('detectProjectType', () => {
  it('should detect next.js', () => {
    const pkg: PackageJson = {
      dependencies: { next: '^14.0.0' },
    };
    expect(detectProjectType(pkg)).toBe('next.js');
  });

  it('should detect react', () => {
    const pkg: PackageJson = {
      dependencies: { react: '^18.0.0' },
    };
    expect(detectProjectType(pkg)).toBe('react');
  });

  it('should detect typescript', () => {
    const pkg: PackageJson = {
      devDependencies: { typescript: '^5.0.0' },
    };
    expect(detectProjectType(pkg)).toBe('typescript');
  });

  it('should default to javascript', () => {
    expect(detectProjectType({})).toBe('javascript');
  });

  it('should prioritize next.js over react', () => {
    const pkg: PackageJson = {
      dependencies: { next: '^14.0.0', react: '^18.0.0' },
    };
    expect(detectProjectType(pkg)).toBe('next.js');
  });
});

describe('extractPackageManager', () => {
  it('should extract manager from version string', () => {
    expect(extractPackageManager('bun@1.3.1')).toBe('bun');
    expect(extractPackageManager('pnpm@8.0.0')).toBe('pnpm');
    expect(extractPackageManager('yarn@1.22.0')).toBe('yarn');
    expect(extractPackageManager('npm@9.0.0')).toBe('npm');
  });

  it('should return null for invalid managers', () => {
    expect(extractPackageManager('invalid@1.0.0')).toBe(null);
    expect(extractPackageManager('')).toBe(null);
  });
});

describe('detectPackageManagerFromFiles', () => {
  it('should detect pnpm from lock file', () => {
    expect(detectPackageManagerFromFiles(['pnpm-lock.yaml'])).toBe('pnpm');
  });

  it('should detect yarn from lock file', () => {
    expect(detectPackageManagerFromFiles(['yarn.lock'])).toBe('yarn');
  });

  it('should detect npm from lock file', () => {
    expect(detectPackageManagerFromFiles(['package-lock.json'])).toBe('npm');
  });

  it('should detect bun from lock file', () => {
    expect(detectPackageManagerFromFiles(['bun.lockb'])).toBe('bun');
  });

  it('should prioritize pnpm over others', () => {
    const files = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'];
    expect(detectPackageManagerFromFiles(files)).toBe('pnpm');
  });

  it('should default to npm when no lock files found', () => {
    expect(detectPackageManagerFromFiles([])).toBe('npm');
    expect(detectPackageManagerFromFiles(['other-file.txt'])).toBe('npm');
  });
});

describe('determinePackageManager', () => {
  it('should use packageManager field first', () => {
    const pkg: PackageJson = {
      packageManager: 'bun@1.3.1',
    };
    expect(determinePackageManager(pkg, ['yarn.lock'])).toBe('bun');
  });

  it('should fall back to lock files', () => {
    const pkg: PackageJson = {
      name: 'test',
    };
    expect(determinePackageManager(pkg, ['yarn.lock'])).toBe('yarn');
  });

  it('should handle null package.json', () => {
    expect(determinePackageManager(null, ['pnpm-lock.yaml'])).toBe('pnpm');
  });

  it('should default to npm when nothing found', () => {
    expect(determinePackageManager({}, [])).toBe('npm');
  });
});

describe('buildProjectInfo', () => {
  it('should build complete project info', () => {
    const pkg: PackageJson = {
      name: 'my-app',
      version: '1.0.0',
      description: 'My awesome app',
      packageManager: 'bun@1.3.1',
      dependencies: {
        react: '^18.0.0',
      },
    };

    const info = buildProjectInfo(pkg, ['bun.lockb']);

    expect(info).toEqual({
      type: 'react',
      packageManager: 'bun',
      name: 'my-app',
      version: '1.0.0',
      description: 'My awesome app',
    });
  });

  it('should handle missing package.json', () => {
    const info = buildProjectInfo(null, []);

    expect(info).toEqual({
      type: 'unknown',
      packageManager: 'none',
      description: 'No package.json found',
    });
  });

  it('should provide defaults for missing fields', () => {
    const info = buildProjectInfo({}, []);

    expect(info).toEqual({
      type: 'javascript',
      packageManager: 'npm',
      name: 'unnamed',
      version: '0.0.0',
      description: '',
    });
  });
});
