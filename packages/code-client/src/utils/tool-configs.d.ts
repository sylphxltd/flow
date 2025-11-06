/**
 * Tool Display Configurations
 * Single source of truth for all tool display logic
 *
 * Two ways to configure tool display:
 * 1. Formatter config (simple): displayName + formatArgs + formatResult
 * 2. Custom component (advanced): complete control over rendering
 */
import type { ToolConfig } from '../types/tool.types.js';
export type { ToolDisplayProps, ToolConfig } from '../types/tool.types.js';
/**
 * Tool configurations registry
 * Add new tools here - single source of truth
 *
 * Examples:
 * - Default display: createDefaultToolDisplay('Name', formatArgs, formatResult)
 * - Custom component: MyCustomComponent
 */
export declare const toolConfigs: Record<string, ToolConfig>;
/**
 * Get tool display component
 */
export declare const getToolComponent: (toolName: string) => ToolConfig | null;
/**
 * Check if tool has a registered display component
 */
export declare const isBuiltInTool: (toolName: string) => boolean;
/**
 * Register a tool display component
 *
 * Examples:
 * ```ts
 * // Using factory for default display
 * registerTool('myTool', createDefaultToolDisplay(
 *   'My Tool',
 *   (args) => args.foo,
 *   (result) => ({ lines: [String(result)] })
 * ));
 *
 * // Using custom component
 * registerTool('myTool', MyCustomComponent);
 * ```
 */
export declare const registerTool: (toolName: string, component: ToolConfig) => void;
//# sourceMappingURL=tool-configs.d.ts.map