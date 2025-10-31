/**
 * ProcessManager interface for managing child processes
 */
export interface ProcessManager {
  trackChildProcess(childProcess: any): void;
  killAllProcesses(): Promise<void>;
  // Internal for testing - exposed for tests to access state
  readonly _state?: ProcessManagerState;
}

/**
 * Internal state for ProcessManager
 */
interface ProcessManagerState {
  readonly childProcesses: Set<any>;
  isShuttingDown: boolean;
  readonly signalHandlers: Map<string, (...args: any[]) => void>;
}

/**
 * Create a ProcessManager instance
 */
export function createProcessManager(): ProcessManager {
  const state: ProcessManagerState = {
    childProcesses: new Set(),
    isShuttingDown: false,
    signalHandlers: new Map(),
  };

  /**
   * Cleanup signal handlers and reset state (for testing)
   */
  const cleanup = (): void => {
    // Remove signal handlers
    for (const [signal, handler] of state.signalHandlers.entries()) {
      process.removeListener(signal as any, handler);
    }
    state.signalHandlers.clear();

    // Clear child processes
    state.childProcesses.clear();
    state.isShuttingDown = false;
  };

  /**
   * Kill all tracked child processes
   */
  const killAllProcesses = async (): Promise<void> => {
    const killPromises = Array.from(state.childProcesses).map(async (childProcess) => {
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
    state.childProcesses.clear();
  };

  /**
   * Setup signal handlers for graceful shutdown
   */
  const setupSignalHandlers = (): void => {
    const shutdown = async (_signal: string) => {
      if (state.isShuttingDown) {
        return;
      }
      state.isShuttingDown = true;

      await killAllProcesses();
      process.exit(0);
    };

    // Create and store signal handlers
    const sigintHandler = () => shutdown('SIGINT');
    const sigtermHandler = () => shutdown('SIGTERM');
    const sighupHandler = () => shutdown('SIGHUP');

    state.signalHandlers.set('SIGINT', sigintHandler);
    state.signalHandlers.set('SIGTERM', sigtermHandler);
    state.signalHandlers.set('SIGHUP', sighupHandler);

    // Handle termination signals
    process.on('SIGINT', sigintHandler);
    process.on('SIGTERM', sigtermHandler);
    process.on('SIGHUP', sighupHandler);
  };

  /**
   * Track a child process for cleanup on shutdown
   */
  const trackChildProcess = (childProcess: any): void => {
    state.childProcesses.add(childProcess);

    // Remove from tracking when process exits
    childProcess.on('exit', () => {
      state.childProcesses.delete(childProcess);
    });
  };

  // Setup signal handlers when instance is created
  setupSignalHandlers();

  const manager: ProcessManager & { _cleanup?: () => void; _state?: ProcessManagerState } = {
    trackChildProcess,
    killAllProcesses,
    _state: state, // Expose state for testing
  };

  // Expose cleanup for testing
  (manager as any)._cleanup = cleanup;

  return manager;
}

// Singleton instance for backward compatibility
let _processManagerInstance: ProcessManager | null = null;

/**
 * Get the singleton ProcessManager instance
 * @deprecated Use createProcessManager() for new code
 */
export class ProcessManager {
  static getInstance(): ProcessManager {
    if (!_processManagerInstance) {
      _processManagerInstance = createProcessManager();
    }
    return _processManagerInstance;
  }

  /**
   * Reset singleton instance (for testing only)
   * @internal
   */
  static resetInstance(): void {
    if (_processManagerInstance) {
      // Call cleanup if available
      const cleanup = (_processManagerInstance as any)._cleanup;
      if (cleanup) {
        cleanup();
      }
      _processManagerInstance = null;
    }
  }
}
