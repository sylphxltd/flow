import { spawn } from 'node:child_process';

export class ProcessManager {
  private static instance: ProcessManager;
  private childProcesses: Set<any> = new Set();
  private isShuttingDown = false;

  static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
      ProcessManager.instance.setupSignalHandlers();
    }
    return ProcessManager.instance;
  }

  private setupSignalHandlers() {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      await this.killAllProcesses();
      process.exit(0);
    };

    // Handle termination signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));
  }

  trackChildProcess(childProcess: any) {
    this.childProcesses.add(childProcess);

    // Remove from tracking when process exits
    childProcess.on('exit', () => {
      this.childProcesses.delete(childProcess);
    });
  }

  async killAllProcesses() {
    const killPromises = Array.from(this.childProcesses).map(async (childProcess) => {
      try {
        if (childProcess && !childProcess.killed) {
          childProcess.kill('SIGTERM');

          // Force kill if it doesn't stop after 2 seconds
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGKILL');
            }
          }, 2000);
        }
      } catch (error) {
        // Silently handle kill errors
      }
    });

    await Promise.all(killPromises);
    this.childProcesses.clear();
  }
}