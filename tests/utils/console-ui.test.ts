/**
 * Console UI Tests
 * Tests for modern console UI utilities
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ui } from '../../src/utils/console-ui.js';

// Mock chalk to return identifiable strings
vi.mock('chalk', () => {
  const createColorFunction = (color: string) => {
    const colorFn: any = (text: string) => `[${color}]${text}[/${color}]`;
    colorFn.bold = (text: string) => `[${color}_BOLD]${text}[/${color}_BOLD]`;
    return colorFn;
  };

  return {
    default: {
      cyan: createColorFunction('CYAN'),
      gray: createColorFunction('GRAY'),
      green: createColorFunction('GREEN'),
      red: createColorFunction('RED'),
      yellow: createColorFunction('YELLOW'),
      white: createColorFunction('WHITE'),
    },
  };
});

describe('Console UI', () => {
  const originalConsoleLog = console.log;
  let consoleOutput: string[];

  beforeEach(() => {
    consoleOutput = [];
    console.log = vi.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('header', () => {
    it('should print header with cyan bold formatting', () => {
      ui.header('Test Header');
      expect(consoleOutput.some((line) => line.includes('CYAN_BOLD'))).toBe(true);
      expect(consoleOutput.some((line) => line.includes('Test Header'))).toBe(true);
    });

    it('should include arrow symbol', () => {
      ui.header('Header');
      expect(consoleOutput.some((line) => line.includes('▸'))).toBe(true);
    });

    it('should print blank line before header', () => {
      ui.header('Header');
      expect(consoleOutput[0]).toBe('');
    });

    it('should handle empty string', () => {
      ui.header('');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('subheader', () => {
    it('should print subheader with gray formatting', () => {
      ui.subheader('Test Subheader');
      expect(consoleOutput.some((line) => line.includes('GRAY'))).toBe(true);
      expect(consoleOutput.some((line) => line.includes('Test Subheader'))).toBe(true);
    });

    it('should include indentation', () => {
      ui.subheader('Sub');
      expect(consoleOutput[0]).toContain('  ');
    });
  });

  describe('success', () => {
    it('should print success message with green formatting', () => {
      ui.success('Operation successful');
      expect(consoleOutput[0]).toContain('GREEN');
      expect(consoleOutput[0]).toContain('Operation successful');
    });

    it('should include checkmark symbol', () => {
      ui.success('Success');
      expect(consoleOutput[0]).toContain('✓');
    });
  });

  describe('error', () => {
    it('should print error message with red formatting', () => {
      ui.error('Error occurred');
      expect(consoleOutput[0]).toContain('RED');
      expect(consoleOutput[0]).toContain('Error occurred');
    });

    it('should include X symbol', () => {
      ui.error('Error');
      expect(consoleOutput[0]).toContain('✗');
    });
  });

  describe('warning', () => {
    it('should print warning message with yellow formatting', () => {
      ui.warning('Warning message');
      expect(consoleOutput[0]).toContain('YELLOW');
      expect(consoleOutput[0]).toContain('Warning message');
    });

    it('should include warning symbol', () => {
      ui.warning('Warning');
      expect(consoleOutput[0]).toContain('⚠');
    });
  });

  describe('info', () => {
    it('should print info message with cyan formatting', () => {
      ui.info('Information');
      expect(consoleOutput[0]).toContain('CYAN');
      expect(consoleOutput[0]).toContain('Information');
    });

    it('should include info symbol', () => {
      ui.info('Info');
      expect(consoleOutput[0]).toContain('ℹ');
    });
  });

  describe('step', () => {
    it('should print step with gray formatting', () => {
      ui.step('Step one');
      expect(consoleOutput[0]).toContain('GRAY');
      expect(consoleOutput[0]).toContain('Step one');
    });

    it('should include bullet point', () => {
      ui.step('Step');
      expect(consoleOutput[0]).toContain('•');
    });

    it('should include indentation', () => {
      ui.step('Step');
      expect(consoleOutput[0]).toContain('  ');
    });
  });

  describe('loading', () => {
    it('should print loading message with cyan formatting', () => {
      ui.loading('Loading...');
      expect(consoleOutput[0]).toContain('CYAN');
      expect(consoleOutput[0]).toContain('Loading...');
    });

    it('should include hourglass symbol', () => {
      ui.loading('Loading');
      expect(consoleOutput[0]).toContain('⏳');
    });
  });

  describe('field', () => {
    it('should print field with label and value', () => {
      ui.field('Name', 'John Doe');
      expect(consoleOutput[0]).toContain('Name');
      expect(consoleOutput[0]).toContain('John Doe');
    });

    it('should format label with gray', () => {
      ui.field('Label', 'Value');
      expect(consoleOutput[0]).toContain('GRAY');
    });

    it('should format value with white', () => {
      ui.field('Label', 'Value');
      expect(consoleOutput[0]).toContain('WHITE');
    });

    it('should mask secret values', () => {
      ui.field('Password', 'secret123', true);
      expect(consoleOutput[0]).not.toContain('secret123');
      expect(consoleOutput[0]).toContain('•');
    });

    it('should limit secret masking to 8 characters', () => {
      ui.field('API Key', 'very-long-secret-key', true);
      const bulletCount = (consoleOutput[0].match(/•/g) || []).length;
      expect(bulletCount).toBe(8);
    });

    it('should handle short secret values', () => {
      ui.field('PIN', '1234', true);
      const bulletCount = (consoleOutput[0].match(/•/g) || []).length;
      expect(bulletCount).toBe(4);
    });

    it('should include indentation', () => {
      ui.field('Label', 'Value');
      expect(consoleOutput[0]).toMatch(/^\s\s/);
    });
  });

  describe('divider', () => {
    it('should print divider line', () => {
      ui.divider();
      expect(consoleOutput[0]).toContain('─');
    });

    it('should use gray formatting', () => {
      ui.divider();
      expect(consoleOutput[0]).toContain('GRAY');
    });

    it('should repeat divider character', () => {
      ui.divider();
      const dividerCount = (consoleOutput[0].match(/─/g) || []).length;
      expect(dividerCount).toBeGreaterThan(1);
    });
  });

  describe('spacer', () => {
    it('should print blank line', () => {
      ui.spacer();
      expect(consoleOutput[0]).toBe('');
    });

    it('should call console.log once', () => {
      ui.spacer();
      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    it('should print list items', () => {
      ui.list(['Item 1', 'Item 2', 'Item 3']);
      expect(consoleOutput.length).toBe(3);
      expect(consoleOutput[0]).toContain('Item 1');
      expect(consoleOutput[1]).toContain('Item 2');
      expect(consoleOutput[2]).toContain('Item 3');
    });

    it('should format items with gray', () => {
      ui.list(['Item']);
      expect(consoleOutput[0]).toContain('GRAY');
    });

    it('should include bullet points', () => {
      ui.list(['Item 1', 'Item 2']);
      expect(consoleOutput[0]).toContain('•');
      expect(consoleOutput[1]).toContain('•');
    });

    it('should handle empty list', () => {
      ui.list([]);
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle single item', () => {
      ui.list(['Only one']);
      expect(consoleOutput.length).toBe(1);
      expect(consoleOutput[0]).toContain('Only one');
    });

    it('should include indentation for each item', () => {
      ui.list(['Item']);
      expect(consoleOutput[0]).toContain('  ');
    });
  });

  describe('prompt', () => {
    it('should return prompt string with label', () => {
      const result = ui.prompt('Enter name');
      expect(result).toContain('Enter name');
    });

    it('should include cyan arrow symbol', () => {
      const result = ui.prompt('Label');
      expect(result).toContain('CYAN');
      expect(result).toContain('❯');
    });

    it('should include colon and space', () => {
      const result = ui.prompt('Label');
      expect(result.endsWith(': ')).toBe(true);
    });

    it('should include red asterisk for required fields', () => {
      const result = ui.prompt('Required field', true);
      expect(result).toContain('RED');
      expect(result).toContain('*');
    });

    it('should not include asterisk for optional fields', () => {
      const result = ui.prompt('Optional field', false);
      expect(result).not.toContain('*');
    });

    it('should default to optional', () => {
      const result = ui.prompt('Field');
      expect(result).not.toContain('*');
    });

    it('should not call console.log', () => {
      ui.prompt('Label');
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('section', () => {
    it('should print section title', () => {
      ui.section('Section Title', () => {});
      expect(consoleOutput.some((line) => line.includes('Section Title'))).toBe(true);
    });

    it('should format title with cyan bold', () => {
      ui.section('Title', () => {});
      expect(consoleOutput.some((line) => line.includes('CYAN_BOLD'))).toBe(true);
    });

    it('should include arrow symbol', () => {
      ui.section('Title', () => {});
      expect(consoleOutput.some((line) => line.includes('▸'))).toBe(true);
    });

    it('should execute content callback', () => {
      const callback = vi.fn();
      ui.section('Title', callback);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should print blank line before section', () => {
      ui.section('Title', () => {});
      expect(consoleOutput[0]).toBe('');
    });

    it('should print content from callback', () => {
      ui.section('Title', () => {
        console.log('Content line');
      });
      expect(consoleOutput.some((line) => line.includes('Content line'))).toBe(true);
    });

    it('should support nested UI calls in callback', () => {
      ui.section('Section', () => {
        ui.success('Nested success');
        ui.info('Nested info');
      });

      expect(consoleOutput.some((line) => line.includes('Nested success'))).toBe(true);
      expect(consoleOutput.some((line) => line.includes('Nested info'))).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should support chaining multiple UI calls', () => {
      ui.header('Main Header');
      ui.subheader('Subtitle');
      ui.success('Operation complete');
      ui.info('Additional info');
      ui.divider();
      ui.list(['Item 1', 'Item 2']);

      expect(consoleOutput.length).toBeGreaterThan(5);
    });

    it('should support section with complex content', () => {
      ui.section('Configuration', () => {
        ui.field('Name', 'Test');
        ui.field('Version', '1.0.0');
        ui.field('API Key', 'secret', true);
        ui.divider();
        ui.list(['Feature 1', 'Feature 2']);
      });

      expect(consoleOutput.some((line) => line.includes('Configuration'))).toBe(true);
      expect(consoleOutput.some((line) => line.includes('Name'))).toBe(true);
      expect(consoleOutput.some((line) => line.includes('Feature 1'))).toBe(true);
    });

    it('should handle mixed status messages', () => {
      ui.success('Step 1 complete');
      ui.loading('Processing step 2');
      ui.warning('Potential issue in step 3');
      ui.error('Step 4 failed');

      expect(consoleOutput[0]).toContain('✓');
      expect(consoleOutput[1]).toContain('⏳');
      expect(consoleOutput[2]).toContain('⚠');
      expect(consoleOutput[3]).toContain('✗');
    });
  });
});
