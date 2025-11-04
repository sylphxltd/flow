/**
 * Background Bash Process Manager
 * Manages long-running bash processes
 */

import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

interface BashProcess {
  id: string;
  command: string;
  process: ChildProcess;
  stdout: string[];
  stderr: string[];
  startTime: number;
  exitCode: number | null;
  cwd: string;
}

class BashManager {
  private processes = new Map<string, BashProcess>();
  private idCounter = 0;

  /**
   * Spawn a background bash process
   */
  spawn(command: string, cwd?: string): string {
    const id = `bash-${Date.now()}-${this.idCounter++}`;

    const bashProcess = spawn('bash', ['-c', command], {
      cwd: cwd || process.cwd(),
      shell: false,
    });

    const processInfo: BashProcess = {
      id,
      command,
      process: bashProcess,
      stdout: [],
      stderr: [],
      startTime: Date.now(),
      exitCode: null,
      cwd: cwd || process.cwd(),
    };

    // Collect stdout
    bashProcess.stdout?.on('data', (data: Buffer) => {
      processInfo.stdout.push(data.toString());
    });

    // Collect stderr
    bashProcess.stderr?.on('data', (data: Buffer) => {
      processInfo.stderr.push(data.toString());
    });

    // Handle exit
    bashProcess.on('exit', (code) => {
      processInfo.exitCode = code;
    });

    this.processes.set(id, processInfo);
    return id;
  }

  /**
   * Get output from a bash process
   */
  getOutput(id: string): {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    isRunning: boolean;
    command: string;
    duration: number;
  } | null {
    const proc = this.processes.get(id);
    if (!proc) return null;

    return {
      stdout: proc.stdout.join(''),
      stderr: proc.stderr.join(''),
      exitCode: proc.exitCode,
      isRunning: proc.exitCode === null,
      command: proc.command,
      duration: Date.now() - proc.startTime,
    };
  }

  /**
   * Kill a bash process
   */
  kill(id: string): boolean {
    const proc = this.processes.get(id);
    if (!proc) return false;

    if (proc.exitCode === null) {
      proc.process.kill('SIGTERM');

      // Force kill after 5s if still running
      setTimeout(() => {
        if (proc.exitCode === null) {
          proc.process.kill('SIGKILL');
        }
      }, 5000);
    }

    return true;
  }

  /**
   * List all bash processes
   */
  list(): Array<{
    id: string;
    command: string;
    isRunning: boolean;
    duration: number;
    cwd: string;
  }> {
    return Array.from(this.processes.values()).map((proc) => ({
      id: proc.id,
      command: proc.command,
      isRunning: proc.exitCode === null,
      duration: Date.now() - proc.startTime,
      cwd: proc.cwd,
    }));
  }

  /**
   * Clean up completed processes older than 1 hour
   */
  cleanup() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [id, proc] of this.processes.entries()) {
      if (proc.exitCode !== null && proc.startTime < oneHourAgo) {
        this.processes.delete(id);
      }
    }
  }
}

// Singleton instance
export const bashManager = new BashManager();

// Auto-cleanup every 10 minutes
setInterval(() => {
  bashManager.cleanup();
}, 10 * 60 * 1000);
