/**
 * Business logic for Claude Code target setup
 * Pure functions separated from I/O
 *
 * DESIGN RATIONALE:
 * - Business logic testable without file system
 * - Pure functions for settings transformation
 * - Side effects isolated
 * - Clear separation of concerns
 */

import type { ConfigError } from '../../core/functional/error-types.js';
import { configError } from '../../core/functional/error-types.js';
import type { Result } from '../../core/functional/result.js';
import { failure, success, tryCatch } from '../../core/functional/result.js';

/**
 * Claude Code settings structure
 */
export interface ClaudeCodeSettings {
  hooks?: Record<
    string,
    Array<{
      hooks: Array<{
        type: string;
        command: string;
      }>;
    }>
  >;
  [key: string]: unknown;
}

export interface HookConfig {
  sessionCommand?: string;
  messageCommand?: string;
  notificationCommand?: string;
}

/**
 * Generate hook commands based on how CLI was invoked
 * Detects invocation method and generates matching commands
 */
export const generateHookCommands = async (targetId: string): Promise<HookConfig> => {
  const { detectInvocation, generateHookCommand, loadInvocationMethod } = await import(
    '../../utils/cli-invocation.js'
  );

  // Try to load saved invocation method, fall back to detection
  const savedMethod = await loadInvocationMethod();
  const method = savedMethod || detectInvocation();

  return {
    sessionCommand: generateHookCommand('session', targetId, method),
    messageCommand: generateHookCommand('message', targetId, method),
    notificationCommand: generateHookCommand('notification', targetId, method),
  };
};

/**
 * Default hook commands (fallback)
 * Now using unified hook command for all content (rules, output styles, system info)
 */
export const DEFAULT_HOOKS: HookConfig = {
  sessionCommand: 'npx -y @sylphx/flow hook --type session --target claude-code',
  messageCommand: 'npx -y @sylphx/flow hook --type message --target claude-code',
  notificationCommand: 'npx -y @sylphx/flow hook --type notification --target claude-code',
};

/**
 * Parse JSON settings (pure)
 */
export const parseSettings = (content: string): Result<ClaudeCodeSettings, ConfigError> => {
  return tryCatch(
    () => JSON.parse(content) as ClaudeCodeSettings,
    (error) =>
      configError('Failed to parse Claude Code settings', {
        cause: error instanceof Error ? error : undefined,
      })
  );
};

/**
 * Build hook configuration (pure)
 */
export const buildHookConfiguration = (
  config: HookConfig = DEFAULT_HOOKS
): ClaudeCodeSettings['hooks'] => {
  const sessionCommand = config.sessionCommand || DEFAULT_HOOKS.sessionCommand!;
  const messageCommand = config.messageCommand || DEFAULT_HOOKS.messageCommand!;
  const notificationCommand = config.notificationCommand || DEFAULT_HOOKS.notificationCommand!;

  return {
    SessionStart: [
      {
        hooks: [
          {
            type: 'command',
            command: sessionCommand,
          },
        ],
      },
    ],
    UserPromptSubmit: [
      {
        hooks: [
          {
            type: 'command',
            command: messageCommand,
          },
        ],
      },
    ],
    Notification: [
      {
        matcher: '',
        hooks: [
          {
            type: 'command',
            command: notificationCommand,
          },
        ],
      },
    ],
  };
};

/**
 * Merge settings with new hooks (pure)
 */
export const mergeSettings = (
  existingSettings: ClaudeCodeSettings,
  hookConfig: HookConfig = DEFAULT_HOOKS
): ClaudeCodeSettings => {
  const newHooks = buildHookConfiguration(hookConfig);

  return {
    ...existingSettings,
    hooks: {
      ...(existingSettings.hooks || {}),
      ...newHooks,
    },
  };
};

/**
 * Create settings with hooks (pure)
 */
export const createSettings = (hookConfig: HookConfig = DEFAULT_HOOKS): ClaudeCodeSettings => {
  return {
    hooks: buildHookConfiguration(hookConfig),
  };
};

/**
 * Serialize settings to JSON (pure)
 */
export const serializeSettings = (settings: ClaudeCodeSettings): string => {
  return JSON.stringify(settings, null, 2);
};

/**
 * Get success message (pure)
 */
export const getSuccessMessage = (): string => {
  return 'Claude Code hooks configured: SessionStart (static info) + UserPromptSubmit (dynamic info)';
};

/**
 * Process settings: parse existing or create new, merge hooks, serialize (pure)
 */
export const processSettings = (
  existingContent: string | null,
  hookConfig: HookConfig = DEFAULT_HOOKS
): Result<string, ConfigError> => {
  if (existingContent === null || existingContent.trim() === '') {
    // No existing settings, create new
    const settings = createSettings(hookConfig);
    return success(serializeSettings(settings));
  }

  // Parse existing settings
  const parseResult = parseSettings(existingContent);
  if (parseResult._tag === 'Failure') {
    // If parsing fails, create new settings
    const settings = createSettings(hookConfig);
    return success(serializeSettings(settings));
  }

  // Merge with existing
  const merged = mergeSettings(parseResult.value, hookConfig);
  return success(serializeSettings(merged));
};

/**
 * Validate hook configuration (pure)
 */
export const validateHookConfig = (config: HookConfig): Result<HookConfig, ConfigError> => {
  if (config.sessionCommand !== undefined && config.sessionCommand.trim() === '') {
    return failure(configError('Session command cannot be empty'));
  }

  if (config.messageCommand !== undefined && config.messageCommand.trim() === '') {
    return failure(configError('Message command cannot be empty'));
  }

  return success(config);
};
