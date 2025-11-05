/**
 * Notifications Completions
 * Static notification action and type options
 */

export interface CompletionOption {
  id: string;
  label: string;
  value: string;
}

/**
 * Get notification action options (static)
 */
export function getActionCompletions(): CompletionOption[] {
  return [
    { id: 'show', label: 'show', value: 'show' },
    { id: 'enable', label: 'enable', value: 'enable' },
    { id: 'disable', label: 'disable', value: 'disable' },
  ];
}

/**
 * Get notification type options (static)
 */
export function getTypeCompletions(): CompletionOption[] {
  return [
    { id: 'os', label: 'os', value: 'os' },
    { id: 'terminal', label: 'terminal', value: 'terminal' },
    { id: 'sound', label: 'sound', value: 'sound' },
    { id: 'all', label: 'all', value: 'all' },
  ];
}
