#!/usr/bin/env node
export declare function syncRules(options: {
    agent?: string;
    verbose?: boolean;
    dryRun?: boolean;
    clear?: boolean;
    merge?: boolean;
}): Promise<void>;
