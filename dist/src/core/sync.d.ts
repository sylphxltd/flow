interface SyncOptions {
    agent?: string;
    verbose?: boolean;
    dryRun?: boolean;
    clear?: boolean;
    merge?: boolean;
}
export declare function syncRules(options: SyncOptions): Promise<void>;
export {};
