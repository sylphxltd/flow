/**
 * Template Engine Tests
 * Tests for simple template engine with variable replacement
 */

import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TemplateEngine, type TemplateData } from '../../src/utils/template-engine.js';

describe('Template Engine', () => {
  let testDir: string;
  let engine: TemplateEngine;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'template-test-'));
    mkdirSync(join(testDir, 'coordinator'), { recursive: true });
    mkdirSync(join(testDir, 'implementer'), { recursive: true });
    mkdirSync(join(testDir, 'shared'), { recursive: true });
    engine = new TemplateEngine(testDir, 'coordinator');
  });

  afterEach(() => {
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('renderString', () => {
    describe('simple variable replacement', () => {
      it('should replace single variable', () => {
        const template = 'Hello {{name}}!';
        const data: TemplateData = { name: 'World' };
        const result = engine.renderString(template, data);
        expect(result).toBe('Hello World!');
      });

      it('should replace multiple variables', () => {
        const template = '{{greeting}} {{name}}, welcome to {{place}}!';
        const data: TemplateData = { greeting: 'Hello', name: 'John', place: 'Earth' };
        const result = engine.renderString(template, data);
        expect(result).toBe('Hello John, welcome to Earth!');
      });

      it('should replace same variable multiple times', () => {
        const template = '{{name}} loves {{name}}!';
        const data: TemplateData = { name: 'Bob' };
        const result = engine.renderString(template, data);
        expect(result).toBe('Bob loves Bob!');
      });

      it('should handle number values', () => {
        const template = 'Count: {{count}}';
        const data: TemplateData = { count: 42 };
        const result = engine.renderString(template, data);
        expect(result).toBe('Count: 42');
      });

      it('should handle boolean values', () => {
        const template = 'Active: {{active}}';
        const data: TemplateData = { active: true };
        const result = engine.renderString(template, data);
        expect(result).toBe('Active: true');
      });

      it('should leave unreplaced variables as-is', () => {
        const template = 'Hello {{name}}, age {{age}}';
        const data: TemplateData = { name: 'John' };
        const result = engine.renderString(template, data);
        expect(result).toBe('Hello John, age {{age}}');
      });

      it('should handle empty data', () => {
        const template = 'Static text';
        const data: TemplateData = {};
        const result = engine.renderString(template, data);
        expect(result).toBe('Static text');
      });

      it('should handle empty template', () => {
        const template = '';
        const data: TemplateData = { name: 'Test' };
        const result = engine.renderString(template, data);
        expect(result).toBe('');
      });
    });

    describe('conditional blocks', () => {
      it('should include content when condition is truthy', () => {
        const template = 'Start {{#if show}}Visible{{/if}} End';
        const data: TemplateData = { show: true };
        const result = engine.renderString(template, data);
        expect(result).toBe('Start Visible End');
      });

      it('should exclude content when condition is falsy', () => {
        const template = 'Start {{#if show}}Hidden{{/if}} End';
        const data: TemplateData = { show: false };
        const result = engine.renderString(template, data);
        expect(result).toBe('Start  End');
      });

      it('should treat string "false" as falsy', () => {
        const template = '{{#if flag}}Show{{/if}}';
        const data: TemplateData = { flag: 'false' };
        const result = engine.renderString(template, data);
        expect(result).toBe('');
      });

      it('should treat string "0" as falsy', () => {
        const template = '{{#if count}}Show{{/if}}';
        const data: TemplateData = { count: '0' };
        const result = engine.renderString(template, data);
        expect(result).toBe('');
      });

      it('should treat empty string as falsy', () => {
        const template = '{{#if value}}Show{{/if}}';
        const data: TemplateData = { value: '' };
        const result = engine.renderString(template, data);
        expect(result).toBe('');
      });

      it('should treat non-empty string as truthy', () => {
        const template = '{{#if text}}Show{{/if}}';
        const data: TemplateData = { text: 'hello' };
        const result = engine.renderString(template, data);
        expect(result).toBe('Show');
      });

      it('should treat number 1 as truthy', () => {
        const template = '{{#if num}}Show{{/if}}';
        const data: TemplateData = { num: 1 };
        const result = engine.renderString(template, data);
        expect(result).toBe('Show');
      });

      it('should handle missing condition as falsy', () => {
        const template = '{{#if missing}}Show{{/if}}';
        const data: TemplateData = {};
        const result = engine.renderString(template, data);
        expect(result).toBe('');
      });

      it('should handle multiple conditionals', () => {
        const template = '{{#if a}}A{{/if}} {{#if b}}B{{/if}}';
        const data: TemplateData = { a: true, b: false };
        const result = engine.renderString(template, data);
        expect(result).toBe('A ');
      });

      it('should handle conditional with variables inside', () => {
        const template = '{{#if show}}Hello {{name}}{{/if}}';
        const data: TemplateData = { show: true, name: 'World' };
        const result = engine.renderString(template, data);
        expect(result).toBe('Hello World');
      });
    });

    describe('loop blocks', () => {
      it('should iterate over array', () => {
        const template = '{{#each items}}{{item}} {{/each}}';
        const data: TemplateData = { items: ['a', 'b', 'c'] };
        const result = engine.renderString(template, data);
        expect(result).toBe('a \nb \nc ');
      });

      it('should handle empty array', () => {
        const template = 'Start {{#each items}}{{item}}{{/each}} End';
        const data: TemplateData = { items: [] };
        const result = engine.renderString(template, data);
        expect(result).toBe('Start  End');
      });

      it('should handle non-array value', () => {
        const template = '{{#each items}}{{item}}{{/each}}';
        const data: TemplateData = { items: 'not-array' };
        const result = engine.renderString(template, data);
        expect(result).toBe('');
      });

      it('should handle missing array', () => {
        const template = '{{#each missing}}{{item}}{{/each}}';
        const data: TemplateData = {};
        const result = engine.renderString(template, data);
        expect(result).toBe('');
      });

      it('should join items with newlines', () => {
        const template = '{{#each nums}}{{item}}{{/each}}';
        const data: TemplateData = { nums: ['1', '2', '3'] };
        const result = engine.renderString(template, data);
        expect(result).toBe('1\n2\n3');
      });

      it('should handle single item array', () => {
        const template = '{{#each items}}{{item}}{{/each}}';
        const data: TemplateData = { items: ['only'] };
        const result = engine.renderString(template, data);
        expect(result).toBe('only');
      });

      it('should convert items to strings', () => {
        const template = '{{#each nums}}{{item}} {{/each}}';
        const data: TemplateData = { nums: ['1', '2', '3'] };
        const result = engine.renderString(template, data);
        expect(result).toBe('1 \n2 \n3 ');
      });

      it('should handle multiple loops', () => {
        const template = '{{#each a}}{{item}}{{/each}} {{#each b}}{{item}}{{/each}}';
        const data: TemplateData = { a: ['x'], b: ['y'] };
        const result = engine.renderString(template, data);
        expect(result).toBe('x y');
      });
    });

    describe('combined features', () => {
      it('should handle variables and conditionals together', () => {
        const template = '{{name}} {{#if active}}is active{{/if}}';
        const data: TemplateData = { name: 'John', active: true };
        const result = engine.renderString(template, data);
        expect(result).toBe('John is active');
      });

      it('should handle variables and loops together', () => {
        const template = '{{title}}: {{#each items}}{{item}}{{/each}}';
        const data: TemplateData = { title: 'List', items: ['a', 'b'] };
        const result = engine.renderString(template, data);
        expect(result).toBe('List: a\nb');
      });

      it('should handle all features together', () => {
        const template = '{{name}}{{#if show}}: {{#each items}}{{item}} {{/each}}{{/if}}';
        const data: TemplateData = { name: 'Items', show: true, items: ['x', 'y'] };
        const result = engine.renderString(template, data);
        expect(result).toBe('Items: x \ny ');
      });
    });
  });

  describe('render', () => {
    it('should load and render shared template', () => {
      const templatePath = join(testDir, 'shared', 'spec-template.md');
      writeFileSync(templatePath, 'Spec: {{name}}', 'utf8');

      const result = engine.render('spec', { name: 'Test' });
      expect(result).toBe('Spec: Test');
    });

    it('should load and render mode-specific template', () => {
      const templatePath = join(testDir, 'coordinator', 'task-template.md');
      writeFileSync(templatePath, 'Task: {{title}}', 'utf8');

      const result = engine.render('task', { title: 'Build' });
      expect(result).toBe('Task: Build');
    });

    it('should use shared templates for known names', () => {
      const sharedPath = join(testDir, 'shared', 'plan-template.md');
      writeFileSync(sharedPath, 'Plan: {{goal}}', 'utf8');

      const result = engine.render('plan', { goal: 'Test' });
      expect(result).toBe('Plan: Test');
    });

    it('should throw for missing template file', () => {
      expect(() => engine.render('missing', {})).toThrow();
    });
  });

  describe('mode handling', () => {
    it('should use coordinator mode by default', () => {
      const coordEngine = new TemplateEngine(testDir);
      const templatePath = join(testDir, 'coordinator', 'test-template.md');
      writeFileSync(templatePath, 'Coordinator', 'utf8');

      const result = coordEngine.render('test', {});
      expect(result).toBe('Coordinator');
    });

    it('should use implementer mode when specified', () => {
      const implEngine = new TemplateEngine(testDir, 'implementer');
      const templatePath = join(testDir, 'implementer', 'test-template.md');
      writeFileSync(templatePath, 'Implementer', 'utf8');

      const result = implEngine.render('test', {});
      expect(result).toBe('Implementer');
    });

    it('should prioritize shared templates over mode-specific', () => {
      const sharedPath = join(testDir, 'shared', 'validation-template.md');
      const coordPath = join(testDir, 'coordinator', 'validation-template.md');
      writeFileSync(sharedPath, 'Shared', 'utf8');
      writeFileSync(coordPath, 'Coordinator', 'utf8');

      const result = engine.render('validation', {});
      expect(result).toBe('Shared');
    });
  });

  describe('shared template names', () => {
    it('should recognize spec as shared template', () => {
      const sharedPath = join(testDir, 'shared', 'spec-template.md');
      writeFileSync(sharedPath, 'Spec', 'utf8');

      const result = engine.render('spec', {});
      expect(result).toBe('Spec');
    });

    it('should recognize plan as shared template', () => {
      const sharedPath = join(testDir, 'shared', 'plan-template.md');
      writeFileSync(sharedPath, 'Plan', 'utf8');

      const result = engine.render('plan', {});
      expect(result).toBe('Plan');
    });

    it('should recognize validation as shared template', () => {
      const sharedPath = join(testDir, 'shared', 'validation-template.md');
      writeFileSync(sharedPath, 'Validation', 'utf8');

      const result = engine.render('validation', {});
      expect(result).toBe('Validation');
    });

    it('should recognize reviews as shared template', () => {
      const sharedPath = join(testDir, 'shared', 'reviews-template.md');
      writeFileSync(sharedPath, 'Reviews', 'utf8');

      const result = engine.render('reviews', {});
      expect(result).toBe('Reviews');
    });
  });

  describe('Integration', () => {
    it('should support complete workflow', () => {
      const templatePath = join(testDir, 'coordinator', 'report-template.md');
      const template = `# {{title}}

{{#if showDetails}}
Details: {{details}}
{{/if}}

Items:
{{#each items}}
- {{item}}
{{/each}}`;

      writeFileSync(templatePath, template, 'utf8');

      const data: TemplateData = {
        title: 'Test Report',
        showDetails: true,
        details: 'Important info',
        items: ['Item 1', 'Item 2', 'Item 3'],
      };

      const result = engine.render('report', data);

      expect(result).toContain('# Test Report');
      expect(result).toContain('Details: Important info');
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
      expect(result).toContain('- Item 3');
    });

    it('should handle complex nested structures', () => {
      const template = `{{name}}
{{#if enabled}}
{{#each features}}
* {{item}}
{{/each}}
{{/if}}`;

      const data: TemplateData = {
        name: 'Project',
        enabled: true,
        features: ['Auth', 'API', 'UI'],
      };

      const result = engine.renderString(template, data);
      expect(result).toContain('Project');
      expect(result).toContain('* Auth');
      expect(result).toContain('* API');
      expect(result).toContain('* UI');
    });

    it('should preserve formatting in templates', () => {
      const template = `Line 1
  Indented line
    Double indented
Back to start`;

      const result = engine.renderString(template, {});
      expect(result).toBe(template);
    });
  });
});
