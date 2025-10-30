import { spawn } from 'node:child_process';

export class ProcessManager {
  private static instance: ProcessManager;
  private childProcesses: Set<any> = new Set();
  private isShuttingDown = false;
  private signalHandlers: Map<string, (...args: any[]) => void> = new Map();

  static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
      ProcessManager.instance.setupSignalHandlers();
    }
    return ProcessManager.instance;
  }

  /**
   * Reset singleton instance (for testing only)
   * @internal
   */
  static resetInstance(): void {
    if (ProcessManager.instance) {
      ProcessManager.instance.cleanup();
      ProcessManager.instance = undefined as any;
    }
  }

  private setupSignalHandlers() {
    const shutdown = async (_signal: string) => {
      if (this.isShuttingDown) {
        return;
      }
      this.isShuttingDown = true;

      await this.killAllProcesses();
      process.exit(0);
    };

    // Create and store signal handlers
    const sigintHandler = () => shutdown('SIGINT');
    const sigtermHandler = () => shutdown('SIGTERM');
    const sighupHandler = () => shutdown('SIGHUP');

    this.signalHandlers.set('SIGINT', sigintHandler);
    this.signalHandlers.set('SIGTERM', sigtermHandler);
    this.signalHandlers.set('SIGHUP', sighupHandler);

    // Handle termination signals
    process.on('SIGINT', sigintHandler);
    process.on('SIGTERM', sigtermHandler);
    process.on('SIGHUP', sighupHandler);
  }

  /**
   * Cleanup signal handlers and reset state (for testing)
   * @internal
   */
  private cleanup() {
    // Remove signal handlers
    for (const [signal, handler] of this.signalHandlers.entries()) {
      process.removeListener(signal as any, handler);
    }
    this.signalHandlers.clear();

    // Clear child processes
    this.childProcesses.clear();
    this.isShuttingDown = false;
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
      } catch (_error) {
        // Silently handle kill errors
      }
    });

    await Promise.all(killPromises);
    this.childProcesses.clear();
  }
}
