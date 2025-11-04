/**
 * @sylphx/code-tui
 * Terminal User Interface (TUI) for Sylphx AI - Powered by Ink + React
 */

export { default as App } from './App.js';

// Re-export main screens for external use if needed
export { default as Chat } from './screens/Chat.js';
export { default as Dashboard } from './screens/Dashboard.js';
export { default as ModelSelection } from './screens/ModelSelection.js';
export { default as ProviderManagement } from './screens/ProviderManagement.js';
export { default as CommandPalette } from './screens/CommandPalette.js';
export { default as Logs } from './screens/Logs.js';

// Version
export const version = '0.1.0';
