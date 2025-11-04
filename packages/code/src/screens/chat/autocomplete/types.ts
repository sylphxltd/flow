/**
 * Autocomplete Types
 * Shared types for file and command autocomplete
 */

// Re-export FileFilterResult from fileAutocomplete
export type { FileFilterResult as FilteredFileInfo } from './fileAutocomplete.js';

// Command is already typed from commands/types.js
export type { Command as FilteredCommand } from '../../../commands/types.js';
