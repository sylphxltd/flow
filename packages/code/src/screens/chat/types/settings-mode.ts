/**
 * Settings Mode Types
 * Defines the structure for interactive settings UI in the input section
 */

export type SettingsMode =
  | {
      type: 'provider-selection';
      action: 'use' | 'configure';
      step: 'select-provider' | 'configure-provider';
      selectedProvider?: string;
    }
  | {
      type: 'model-selection';
      step: 'select-model';
    }
  | {
      type: 'agent-selection';
      step: 'select-agent';
    }
  | {
      type: 'rules-selection';
      step: 'select-rules';
    }
  | null;

/**
 * Settings context for command execution
 * This replaces sendMessage/waitForInput for settings commands
 */
export interface SettingsContext {
  // Direct store mutations (no session creation)
  updateProvider: (provider: string, config: any) => void;
  updateModel: (model: string) => void;
  setAIConfig: (config: any) => void;
  saveConfig: (config: any) => Promise<void>;

  // Navigation
  setSettingsMode: (mode: SettingsMode) => void;
  exitSettings: () => void;

  // State access
  getAIConfig: () => any;
  getCurrentSession: () => any;
}
