/**
 * Process Manager Tests
 * Tests for process lifecycle management
 */

import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Process Manager', () => {
  let mockProcess: any;
  let ProcessManager: any;
  let originalProcess: NodeJS.Process;

  beforeEach(async () => {
    // Save original process
    originalProcess = global.process;

    // Mock process global (vitest 4.x compatible approach)
    mockProcess = new EventEmitter();
    mockProcess.exit = vi.fn();
    mockProcess.pid = 12345;
    mockProcess.env = { ...process.env };

    // Replace global process directly
    (global as any).process = mockProcess;

    // Clear module cache and reimport
    // Note: vi.resetModules() removed in vitest 4.x
    const module = await import('../../src/utils/process-manager.js');
    ProcessManager = module.ProcessManager;
  });

  afterEach(() => {
    // Reset singleton instance to clean state
    if (ProcessManager) {
      ProcessManager.resetInstance();
    }

    vi.clearAllMocks();
    // Restore original process
    (global as any).process = originalProcess;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ProcessManager.getInstance();
      const instance2 = ProcessManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should setup signal handlers on first call', () => {
      ProcessManager.getInstance();
      expect(mockProcess.listenerCount('SIGINT')).toBe(1);
      expect(mockProcess.listenerCount('SIGTERM')).toBe(1);
      expect(mockProcess.listenerCount('SIGHUP')).toBe(1);
    });

    it('should not duplicate handlers on multiple calls', () => {
      ProcessManager.getInstance();
      ProcessManager.getInstance();
      ProcessManager.getInstance();
      expect(mockProcess.listenerCount('SIGINT')).toBe(1);
      expect(mockProcess.listenerCount('SIGTERM')).toBe(1);
      expect(mockProcess.listenerCount('SIGHUP')).toBe(1);
    });
  });

  describe('trackChildProcess', () => {
    it('should track child process', () => {
      const manager = ProcessManager.getInstance();
      const mockChild = new EventEmitter();

      manager.trackChildProcess(mockChild);
      expect(manager._state?.childProcesses.has(mockChild)).toBe(true);
    });

    it('should remove child process on exit', () => {
      const manager = ProcessManager.getInstance();
      const mockChild = new EventEmitter();

      manager.trackChildProcess(mockChild);
      expect(manager._state?.childProcesses.has(mockChild)).toBe(true);

      mockChild.emit('exit');
      expect(manager._state?.childProcesses.has(mockChild)).toBe(false);
    });

    it('should track multiple child processes', () => {
      const manager = ProcessManager.getInstance();
      const child1 = new EventEmitter();
      const child2 = new EventEmitter();
      const child3 = new EventEmitter();

      manager.trackChildProcess(child1);
      manager.trackChildProcess(child2);
      manager.trackChildProcess(child3);

      expect(manager._state?.childProcesses.size).toBe(3);
    });

    it('should handle exit events for multiple children', () => {
      const manager = ProcessManager.getInstance();
      const child1 = new EventEmitter();
      const child2 = new EventEmitter();

      manager.trackChildProcess(child1);
      manager.trackChildProcess(child2);

      child1.emit('exit');
      expect(manager._state?.childProcesses.size).toBe(1);
      expect(manager._state?.childProcesses.has(child2)).toBe(true);

      child2.emit('exit');
      expect(manager._state?.childProcesses.size).toBe(0);
    });
  });

  describe('killAllProcesses', () => {
    it('should kill all tracked processes', async () => {
      const manager = ProcessManager.getInstance();
      const child1 = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: false,
      });
      const child2 = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: false,
      });

      manager.trackChildProcess(child1);
      manager.trackChildProcess(child2);

      await manager.killAllProcesses();

      expect(child1.kill).toHaveBeenCalledWith('SIGTERM');
      expect(child2.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should clear all processes after killing', async () => {
      const manager = ProcessManager.getInstance();
      const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: false,
      });

      manager.trackChildProcess(child);
      await manager.killAllProcesses();

      expect(manager._state?.childProcesses.size).toBe(0);
    });

    it('should not kill already killed processes', async () => {
      const manager = ProcessManager.getInstance();
      const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: true,
      });

      manager.trackChildProcess(child);
      await manager.killAllProcesses();

      expect(child.kill).not.toHaveBeenCalled();
    });

    it('should handle null child processes', async () => {
      const manager = ProcessManager.getInstance();
      manager._state?.childProcesses.add(null);

      await expect(manager.killAllProcesses()).resolves.toBeUndefined();
    });

    it('should handle kill errors silently', async () => {
      const manager = ProcessManager.getInstance();
      const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(() => {
          throw new Error('Kill failed');
        }),
        killed: false,
      });

      manager.trackChildProcess(child);
      await expect(manager.killAllProcesses()).resolves.toBeUndefined();
    });

    it('should force kill with SIGKILL after timeout', async () => {
      vi.useFakeTimers();

      const manager = ProcessManager.getInstance();
      const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: false,
      });

      manager.trackChildProcess(child);
      const killPromise = manager.killAllProcesses();

      // Advance time past the 2 second timeout
      await vi.runAllTimersAsync();

      await killPromise;

      expect(child.kill).toHaveBeenCalledWith('SIGTERM');
      expect(child.kill).toHaveBeenCalledWith('SIGKILL');

      vi.useRealTimers();
    });

    it('should not force kill if already killed', async () => {
      vi.useFakeTimers();

      const manager = ProcessManager.getInstance();
      const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(function (this: any) {
          this.killed = true;
        }),
        killed: false,
      });

      manager.trackChildProcess(child);
      const killPromise = manager.killAllProcesses();

      await vi.runAllTimersAsync();
      await killPromise;

      expect(child.kill).toHaveBeenCalledTimes(1);
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');

      vi.useRealTimers();
    });
  });

  describe('signal handlers', () => {
    it('should exit on SIGINT', async () => {
      const manager = ProcessManager.getInstance();
      const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: false,
      });

      manager.trackChildProcess(child);

      mockProcess.emit('SIGINT');

      // Wait for async shutdown
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(child.kill).toHaveBeenCalled();
      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });

    it('should exit on SIGTERM', async () => {
      const manager = ProcessManager.getInstance();
      const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: false,
      });

      manager.trackChildProcess(child);

      mockProcess.emit('SIGTERM');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(child.kill).toHaveBeenCalled();
      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });

    it('should exit on SIGHUP', async () => {
      const manager = ProcessManager.getInstance();
      const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: false,
      });

      manager.trackChildProcess(child);

      mockProcess.emit('SIGHUP');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(child.kill).toHaveBeenCalled();
      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });

    it('should not trigger shutdown twice', async () => {
      const manager = ProcessManager.getInstance();
      const child = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: false,
      });

      manager.trackChildProcess(child);

      mockProcess.emit('SIGINT');
      mockProcess.emit('SIGINT');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProcess.exit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration', () => {
    it('should handle complete lifecycle', async () => {
      const manager = ProcessManager.getInstance();

      const child1 = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: false,
      });
      const child2 = Object.assign(new EventEmitter(), {
        kill: vi.fn(),
        killed: false,
      });

      manager.trackChildProcess(child1);
      manager.trackChildProcess(child2);

      expect(manager._state?.childProcesses.size).toBe(2);

      child1.emit('exit');
      expect(manager._state?.childProcesses.size).toBe(1);

      await manager.killAllProcesses();
      expect(child2.kill).toHaveBeenCalled();
      expect(manager._state?.childProcesses.size).toBe(0);
    });

    it('should handle shutdown with multiple processes', async () => {
      const manager = ProcessManager.getInstance();

      const children = Array.from({ length: 5 }, () =>
        Object.assign(new EventEmitter(), {
          kill: vi.fn(),
          killed: false,
        })
      );

      children.forEach((child) => manager.trackChildProcess(child));

      mockProcess.emit('SIGTERM');

      await new Promise((resolve) => setTimeout(resolve, 10));

      children.forEach((child) => {
        expect(child.kill).toHaveBeenCalledWith('SIGTERM');
      });
      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });
  });
});
