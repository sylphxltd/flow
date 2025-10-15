import { Command } from 'commander';
import { CommandConfig } from '../types';
export declare function createCommand(config: CommandConfig): Command;
export declare const COMMON_OPTIONS: readonly [{
    readonly flags: "--agent <type>";
    readonly description: "Force specific agent";
}, {
    readonly flags: "--verbose";
    readonly description: "Show detailed output";
}, {
    readonly flags: "--dry-run";
    readonly description: "Show what would be done without making changes";
}, {
    readonly flags: "--clear";
    readonly description: "Clear obsolete items before processing";
}, {
    readonly flags: "--merge";
    readonly description: "Merge all items into a single file";
}];
