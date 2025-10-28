/**
 * Prompts Tests
 * Tests for modern CLI prompts with progressive output
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    cyan: (text: string) => `[CYAN]${text}[/CYAN]`,
    gray: (text: string) => `[GRAY]${text}[/GRAY]`,
  },
}));

describe('Prompts', () => {
  let mockReadline: any;
  let mockStdin: EventEmitter & {
    setRawMode: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
  };
  let mockStdout: {
    write: ReturnType<typeof vi.fn>;
  };
  let createInterfaceSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Create mock stdin with EventEmitter
    mockStdin = Object.assign(new EventEmitter(), {
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
    });

    // Create mock stdout
    mockStdout = {
      write: vi.fn(),
    };

    // Create mock readline interface
    mockReadline = {
      question: vi.fn(),
      close: vi.fn(),
    };

    // Mock readline.createInterface
    createInterfaceSpy = vi.fn(() => mockReadline);

    // Mock node:readline module
    vi.doMock('node:readline', () => ({
      createInterface: createInterfaceSpy,
    }));

    // Mock process.stdin and process.stdout
    vi.stubGlobal('process', {
      ...process,
      stdin: mockStdin,
      stdout: mockStdout,
    });

    // Clear module cache and reimport
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('ask', () => {
    it('should ask question and return answer', async () => {
      const { ask } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('Test answer');
      });

      const result = await ask('What is your name?');
      expect(result).toBe('Test answer');
      expect(mockReadline.close).toHaveBeenCalledOnce();
    });

    it('should include question in prompt', async () => {
      const { ask } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((prompt: string, callback: (answer: string) => void) => {
        expect(prompt).toContain('What is your name?');
        callback('answer');
      });

      await ask('What is your name?');
    });

    it('should format prompt with cyan arrow', async () => {
      const { ask } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((prompt: string, callback: (answer: string) => void) => {
        expect(prompt).toContain('[CYAN]❯[/CYAN]');
        callback('answer');
      });

      await ask('Question?');
    });

    it('should handle default value', async () => {
      const { ask } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((prompt: string, callback: (answer: string) => void) => {
        expect(prompt).toContain('default');
        callback('');
      });

      const result = await ask('Question?', 'default');
      expect(result).toBe('default');
    });

    it('should show default value in prompt', async () => {
      const { ask } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((prompt: string, callback: (answer: string) => void) => {
        expect(prompt).toContain('[GRAY](default)[/GRAY]');
        callback('answer');
      });

      await ask('Question?', 'default');
    });

    it('should trim whitespace from answer', async () => {
      const { ask } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('  answer with spaces  ');
      });

      const result = await ask('Question?');
      expect(result).toBe('answer with spaces');
    });

    it('should return empty string if no answer and no default', async () => {
      const { ask } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('');
      });

      const result = await ask('Question?');
      expect(result).toBe('');
    });

    it('should create readline interface with stdin/stdout', async () => {
      const { ask } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('answer');
      });

      await ask('Question?');

      expect(createInterfaceSpy).toHaveBeenCalledWith({
        input: mockStdin,
        output: mockStdout,
      });
    });
  });

  describe('askSecret', () => {
    it('should ask for secret and return input', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      // Simulate user typing "secret" and pressing enter
      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('s'));
        mockStdin.emit('data', Buffer.from('e'));
        mockStdin.emit('data', Buffer.from('c'));
        mockStdin.emit('data', Buffer.from('r'));
        mockStdin.emit('data', Buffer.from('e'));
        mockStdin.emit('data', Buffer.from('t'));
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      const result = await askSecret('Enter password');
      expect(result).toBe('secret');
    });

    it('should write prompt to stdout', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      await askSecret('Enter password');

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining('Enter password')
      );
    });

    it('should mask input with bullets', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('a'));
        mockStdin.emit('data', Buffer.from('b'));
        mockStdin.emit('data', Buffer.from('c'));
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      await askSecret('Password');

      // Should write bullet for each character
      expect(mockStdout.write).toHaveBeenCalledWith('•');
      const bulletCalls = (mockStdout.write as any).mock.calls.filter(
        (call: any) => call[0] === '•'
      );
      expect(bulletCalls.length).toBe(3);
    });

    it('should handle backspace', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('a'));
        mockStdin.emit('data', Buffer.from('b'));
        mockStdin.emit('data', Buffer.from('\x7f')); // Backspace
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      const result = await askSecret('Password');
      expect(result).toBe('a');
    });

    it('should write backspace escape sequence', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('a'));
        mockStdin.emit('data', Buffer.from('\x7f')); // Backspace
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      await askSecret('Password');

      expect(mockStdout.write).toHaveBeenCalledWith('\b \b');
    });

    it('should ignore backspace when input is empty', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('\x7f')); // Backspace on empty
        mockStdin.emit('data', Buffer.from('a'));
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      const result = await askSecret('Password');
      expect(result).toBe('a');
    });

    it('should handle alternate backspace character', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('a'));
        mockStdin.emit('data', Buffer.from('b'));
        mockStdin.emit('data', Buffer.from('\b')); // Alternate backspace
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      const result = await askSecret('Password');
      expect(result).toBe('a');
    });

    it('should handle carriage return', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('password'));
        mockStdin.emit('data', Buffer.from('\r'));
      }, 10);

      const result = await askSecret('Password');
      expect(result).toBe('password');
    });

    it('should handle CRLF line ending', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('password'));
        mockStdin.emit('data', Buffer.from('\r\n'));
      }, 10);

      const result = await askSecret('Password');
      expect(result).toBe('password');
    });

    it('should set raw mode on stdin', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      await askSecret('Password');

      expect(mockStdin.setRawMode).toHaveBeenCalledWith(true);
    });

    it('should resume stdin', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      await askSecret('Password');

      expect(mockStdin.resume).toHaveBeenCalled();
    });

    it('should reset raw mode in finally', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      await askSecret('Password');

      expect(mockStdin.setRawMode).toHaveBeenCalledWith(false);
    });

    it('should pause stdin in finally', async () => {
      const { askSecret } = await import('../../src/utils/prompts.js');

      setTimeout(() => {
        mockStdin.emit('data', Buffer.from('\n'));
      }, 10);

      await askSecret('Password');

      expect(mockStdin.pause).toHaveBeenCalled();
    });
  });

  describe('select', () => {
    const originalConsoleLog = console.log;

    beforeEach(() => {
      console.log = vi.fn();
    });

    afterEach(() => {
      console.log = originalConsoleLog;
    });

    it('should display question', async () => {
      const { select } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('1');
      });

      await select('Choose option', ['Option 1', 'Option 2']);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Choose option')
      );
    });

    it('should display all choices', async () => {
      const { select } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('1');
      });

      await select('Choose', ['Option 1', 'Option 2', 'Option 3']);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1. Option 1'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2. Option 2'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('3. Option 3'));
    });

    it('should return selected choice', async () => {
      const { select } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('2');
      });

      const result = await select('Choose', ['First', 'Second', 'Third']);
      expect(result).toBe('Second');
    });

    it('should handle first choice', async () => {
      const { select } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('1');
      });

      const result = await select('Choose', ['First', 'Second']);
      expect(result).toBe('First');
    });

    it('should handle last choice', async () => {
      const { select } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('3');
      });

      const result = await select('Choose', ['First', 'Second', 'Third']);
      expect(result).toBe('Third');
    });

    it('should default to first choice if invalid number', async () => {
      const { select } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('99');
      });

      const result = await select('Choose', ['First', 'Second']);
      expect(result).toBe('First');
    });

    it('should default to first choice if negative number', async () => {
      const { select } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('-1');
      });

      const result = await select('Choose', ['First', 'Second']);
      expect(result).toBe('First');
    });

    it('should default to first choice if not a number', async () => {
      const { select } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('not a number');
      });

      const result = await select('Choose', ['First', 'Second']);
      expect(result).toBe('First');
    });

    it('should show range in prompt', async () => {
      const { select } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((prompt: string, callback: (answer: string) => void) => {
        expect(prompt).toContain('1-3');
        callback('1');
      });

      await select('Choose', ['First', 'Second', 'Third']);
    });

    it('should close readline after selection', async () => {
      const { select } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('1');
      });

      await select('Choose', ['First', 'Second']);
      expect(mockReadline.close).toHaveBeenCalledOnce();
    });
  });

  describe('confirm', () => {
    it('should return true for "y" input', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('y');
      });

      const result = await confirm('Continue?');
      expect(result).toBe(true);
    });

    it('should return true for "yes" input', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('yes');
      });

      const result = await confirm('Continue?');
      expect(result).toBe(true);
    });

    it('should return false for "n" input', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('n');
      });

      const result = await confirm('Continue?');
      expect(result).toBe(false);
    });

    it('should return false for "no" input', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('no');
      });

      const result = await confirm('Continue?');
      expect(result).toBe(false);
    });

    it('should handle uppercase input', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('Y');
      });

      const result = await confirm('Continue?');
      expect(result).toBe(true);
    });

    it('should handle mixed case input', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('Yes');
      });

      const result = await confirm('Continue?');
      expect(result).toBe(true);
    });

    it('should use default value for empty input', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('');
      });

      const result = await confirm('Continue?', true);
      expect(result).toBe(true);
    });

    it('should default to true by default', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('');
      });

      const result = await confirm('Continue?');
      expect(result).toBe(true);
    });

    it('should respect false default value', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('');
      });

      const result = await confirm('Continue?', false);
      expect(result).toBe(false);
    });

    it('should show Y/n for true default', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((prompt: string, callback: (answer: string) => void) => {
        expect(prompt).toContain('Y/n');
        callback('');
      });

      await confirm('Continue?', true);
    });

    it('should show y/N for false default', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((prompt: string, callback: (answer: string) => void) => {
        expect(prompt).toContain('y/N');
        callback('');
      });

      await confirm('Continue?', false);
    });

    it('should include question in prompt', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((prompt: string, callback: (answer: string) => void) => {
        expect(prompt).toContain('Do you want to continue?');
        callback('y');
      });

      await confirm('Do you want to continue?');
    });

    it('should format prompt with cyan arrow', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((prompt: string, callback: (answer: string) => void) => {
        expect(prompt).toContain('[CYAN]❯[/CYAN]');
        callback('y');
      });

      await confirm('Continue?');
    });

    it('should close readline after confirmation', async () => {
      const { confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question.mockImplementation((_prompt: string, callback: (answer: string) => void) => {
        callback('y');
      });

      await confirm('Continue?');
      expect(mockReadline.close).toHaveBeenCalledOnce();
    });
  });

  describe('Integration', () => {
    it('should handle multiple prompts in sequence', async () => {
      const { ask, confirm } = await import('../../src/utils/prompts.js');

      mockReadline.question
        .mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
          callback('John');
        })
        .mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
          callback('y');
        });

      const name = await ask('Name?');
      const confirmed = await confirm('Correct?');

      expect(name).toBe('John');
      expect(confirmed).toBe(true);
    });

    it('should create new readline interface for each prompt', async () => {
      const { ask } = await import('../../src/utils/prompts.js');

      mockReadline.question
        .mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
          callback('First');
        })
        .mockImplementationOnce((_prompt: string, callback: (answer: string) => void) => {
          callback('Second');
        });

      await ask('First?');
      await ask('Second?');

      expect(createInterfaceSpy).toHaveBeenCalledTimes(2);
    });
  });
});
