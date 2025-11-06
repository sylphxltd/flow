/**
 * Rule Types
 * Defines shared system prompt rules that apply to all agents
 */
/**
 * Rule metadata from front matter
 */
export interface RuleMetadata {
    name: string;
    description: string;
    enabled?: boolean;
}
/**
 * Rule definition
 */
export interface Rule {
    id: string;
    metadata: RuleMetadata;
    content: string;
    isBuiltin: boolean;
    filePath?: string;
}
//# sourceMappingURL=rule.types.d.ts.map