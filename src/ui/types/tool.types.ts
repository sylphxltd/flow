/**
 * Tool Display Types
 * Shared types for tool display system
 *
 * This file contains only type definitions with no imports,
 * allowing it to be safely imported from anywhere.
 */

import type { FC } from 'react';

/**
 * Tool display props (for custom components)
 */
export interface ToolDisplayProps {
  name: string;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  startTime?: number;
  args?: unknown;
  result?: unknown;
  error?: string;
}

/**
 * Tool configuration
 * Simply a React component that renders the tool display
 */
export type ToolConfig = FC<ToolDisplayProps>;
