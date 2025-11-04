/**
 * Background Bash Process Manager
 * Manages long-running bash processes
 */
declare class BashManager {
    private processes;
    private idCounter;
    /**
     * Spawn a background bash process
     */
    spawn(command: string, cwd?: string): string;
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
    } | null;
    /**
     * Kill a bash process
     */
    kill(id: string): boolean;
    /**
     * List all bash processes
     */
    list(): Array<{
        id: string;
        command: string;
        isRunning: boolean;
        duration: number;
        cwd: string;
    }>;
    /**
     * Clean up completed processes older than 1 hour
     */
    cleanup(): void;
}
export declare const bashManager: BashManager;
export {};
//# sourceMappingURL=bash-manager.d.ts.map