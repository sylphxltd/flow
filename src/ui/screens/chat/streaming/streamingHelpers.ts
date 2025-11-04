/**
 * Streaming Helpers
 * Utility functions for streaming message management
 */

/**
 * Map streaming part status to tool display status
 */
export function mapPartStatusToTool(
  status: 'active' | 'completed' | 'error' | 'abort'
): 'running' | 'completed' | 'failed' {
  if (status === 'active') return 'running';
  if (status === 'error' || status === 'abort') return 'failed';
  return 'completed';
}
