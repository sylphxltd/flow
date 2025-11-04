/**
 * Shell Tools
 * Tools for executing shell commands
 */
/**
 * Execute bash command tool
 */
export declare const executeBashTool: import("ai").Tool<{
    command: string;
    cwd?: string | undefined;
    timeout?: number | undefined;
    run_in_background?: boolean | undefined;
}, {
    bash_id: string;
    command: string;
    mode: string;
    message: string;
    stdout?: undefined;
    stderr?: undefined;
    exitCode?: undefined;
} | {
    command: string;
    stdout: any;
    stderr: any;
    exitCode: any;
    bash_id?: undefined;
    mode?: undefined;
    message?: undefined;
}>;
/**
 * Get output from background bash process
 */
export declare const bashOutputTool: import("ai").Tool<{
    bash_id: string;
    filter?: string | undefined;
}, {
    bash_id: string;
    command: string;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    isRunning: boolean;
    duration: number;
}>;
/**
 * Kill a background bash process
 */
export declare const killBashTool: import("ai").Tool<{
    bash_id: string;
}, {
    bash_id: string;
    status: string;
    message: string;
}>;
/**
 * All shell tools
 */
export declare const shellTools: {
    bash: import("ai").Tool<{
        command: string;
        cwd?: string | undefined;
        timeout?: number | undefined;
        run_in_background?: boolean | undefined;
    }, {
        bash_id: string;
        command: string;
        mode: string;
        message: string;
        stdout?: undefined;
        stderr?: undefined;
        exitCode?: undefined;
    } | {
        command: string;
        stdout: any;
        stderr: any;
        exitCode: any;
        bash_id?: undefined;
        mode?: undefined;
        message?: undefined;
    }>;
    'bash-output': import("ai").Tool<{
        bash_id: string;
        filter?: string | undefined;
    }, {
        bash_id: string;
        command: string;
        stdout: string;
        stderr: string;
        exitCode: number | null;
        isRunning: boolean;
        duration: number;
    }>;
    'kill-bash': import("ai").Tool<{
        bash_id: string;
    }, {
        bash_id: string;
        status: string;
        message: string;
    }>;
};
//# sourceMappingURL=shell.d.ts.map