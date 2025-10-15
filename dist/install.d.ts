#!/usr/bin/env node
export declare function installAgents(options: {
    agent?: string;
    verbose?: boolean;
    dryRun?: boolean;
    clear?: boolean;
    merge?: boolean;
}): Promise<void>;
