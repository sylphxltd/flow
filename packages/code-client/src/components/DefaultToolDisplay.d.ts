/**
 * Default Tool Display Factory
 * Creates a tool display component with custom formatters
 * Generic - does not know about specific tools
 */
import React from 'react';
import type { ArgsFormatter, ResultFormatter } from '../utils/tool-formatters.js';
import type { ToolDisplayProps } from '@sylphx/code-client';
/**
 * Factory function to create a default tool display component
 *
 * @param displayName - Tool display name
 * @param formatArgs - Function to format tool arguments
 * @param formatResult - Function to format tool results
 * @returns A React component for displaying the tool
 */
export declare function createDefaultToolDisplay(displayName: string, formatArgs: ArgsFormatter, formatResult: ResultFormatter): React.FC<ToolDisplayProps>;
//# sourceMappingURL=DefaultToolDisplay.d.ts.map