/**
 * Interaction Types
 * Types for user input and interaction handling
 */

export interface SelectOption {
  label: string;
  description?: string;
  value?: string;
}

export interface Question {
  question: string;
  header: string;
  options: SelectOption[];
  multiSelect: boolean;
}
