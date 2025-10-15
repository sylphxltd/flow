export interface ProcessResult {
    file: string;
    status: 'added' | 'updated' | 'current' | 'skipped';
    action: string;
}
export interface CommonOptions {
    agent?: string;
    dryRun?: boolean;
    clear?: boolean;
    merge?: boolean;
    verbose?: boolean;
    mcp?: string[] | null;
}
export interface AgentConfig {
    name: string;
    dir: string;
    extension: string;
    stripYaml: boolean;
    flatten: boolean;
    description: string;
}
export interface AgentConfigs {
    [key: string]: AgentConfig;
}
export declare function log(message: string, color?: string): void;
export declare function getSupportedAgents(configs: AgentConfigs): string[];
export declare function getAgentConfig(configs: AgentConfigs, agent: string): AgentConfig;
export declare function promptForAgent(configs: AgentConfigs, toolName: string): Promise<string>;
export declare function detectAgentTool(configs: AgentConfigs, defaultAgent?: string): string;
export declare function collectFiles(dir: string, extensions: string[]): string[];
export declare function getLocalFileInfo(filePath: string): {
    content: string;
    mtime: Date;
} | null;
export declare function clearObsoleteFiles(targetDir: string, expectedFiles: Set<string>, extensions: string[], results: ProcessResult[]): void;
export declare function createMergedContent(filePaths: string[], processContent: (content: string) => string, title: string, pathPrefix?: string): string;
export declare function processBatch(filePaths: string[], targetDir: string, extension: string, processContent: (content: string) => string, flatten: boolean, results: ProcessResult[], pathPrefix?: string): Promise<void>;
export declare function displayResults(results: ProcessResult[], targetDir: string, agentName: string, operation: string): void;
