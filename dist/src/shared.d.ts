import cliProgress from 'cli-progress';
export interface AgentConfig {
    name: string;
    dir: string;
    extension: string;
    stripYaml: boolean;
    flatten: boolean;
    description: string;
}
export interface ProcessResult {
    file: string;
    status: string;
    action: string;
}
export interface CommonOptions {
    agent?: string;
    verbose?: boolean;
    dryRun?: boolean;
    clear?: boolean;
    merge?: boolean;
}
export declare const COLORS: {
    readonly red: "\u001B[31m";
    readonly green: "\u001B[32m";
    readonly yellow: "\u001B[33m";
    readonly blue: "\u001B[34m";
    readonly reset: "\u001B[0m";
};
export declare const log: (message: string, color?: keyof typeof COLORS) => void;
export declare const getSupportedAgents: <T extends string>(configs: Record<T, AgentConfig>) => T[];
export declare const getAgentConfig: <T extends string>(configs: Record<T, AgentConfig>, agent: T) => AgentConfig;
export declare function promptForAgent<T extends string>(configs: Record<T, AgentConfig>, toolName: string): Promise<T>;
export declare function detectAgentTool<T extends string>(configs: Record<T, AgentConfig>, defaultAgent: T): T;
export declare function getLocalFileInfo(filePath: string): {
    content: string;
    exists: true;
} | null;
export declare function collectFiles(rootDir: string, extensions: string[], relativePrefix?: string): string[];
export declare function stripYamlFrontMatter(content: string): string;
export declare function getDescriptionForFile(filePath?: string, type?: 'rules' | 'agents'): string;
export declare function processFile(filePath: string, targetDir: string, fileExtension: string, processContent: (content: string) => string, flatten: boolean, results: ProcessResult[], progressBar: InstanceType<typeof cliProgress.SingleBar>, pathPrefix?: string): Promise<boolean>;
export declare function createStatusTable(title: string, items: ProcessResult[]): void;
export declare function displayResults(results: ProcessResult[], targetDir: string, agentName: string, operation: 'Sync' | 'Install'): void;
export declare function processBatch<T extends string>(files: string[], targetDir: string, fileExtension: string, processContent: (content: string) => string, flatten: boolean, results: ProcessResult[], pathPrefix?: string, batchSize?: number): Promise<void>;
export declare function createMergedContent(files: string[], processContent: (content: string, filePath?: string) => string, title: string, pathPrefix?: string): string;
export declare function clearObsoleteFiles<T extends string>(targetDir: string, expectedFiles: Set<string>, fileExtensions: string[], results: ProcessResult[]): void;
