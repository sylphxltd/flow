/**
 * Agent Types
 * Defines agents with custom system prompts and metadata
 */
/**
 * Agent metadata from front matter
 */
export interface AgentMetadata {
    name: string;
    description: string;
}
/**
 * Agent definition
 */
export interface Agent {
    id: string;
    metadata: AgentMetadata;
    systemPrompt: string;
    isBuiltin: boolean;
    filePath?: string;
}
/**
 * Agent source location
 */
export interface AgentSource {
    type: 'global' | 'project' | 'builtin';
    path: string;
}
//# sourceMappingURL=agent.types.d.ts.map