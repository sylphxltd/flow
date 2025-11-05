/**
 * Command Registry
 * All available commands with their definitions and implementations
 */

import agentCommand from './definitions/agent.command.js';
import bashesCommand from './definitions/bashes.command.js';
import compactCommand from './definitions/compact.command.js';
import contextCommand from './definitions/context.command.js';
import { dashboardCommand } from './definitions/dashboard.command.js';
import helpCommand from './definitions/help.command.js';
import logsCommand from './definitions/logs.command.js';
import modelCommand from './definitions/model.command.js';
import newCommand from './definitions/new.command.js';
import notificationsCommand from './definitions/notifications.command.js';
// Import all command definitions
import providerCommand from './definitions/provider.command.js'; // .tsx compiles to .js
import rulesCommand from './definitions/rules.command.js';
import sessionsCommand from './definitions/sessions.command.js';
import surveyCommand from './definitions/survey.command.js';
import type { Command } from './types.js';

/**
 * All registered commands
 */
export const commands: Command[] = [
  dashboardCommand,
  providerCommand,
  modelCommand,
  agentCommand,
  rulesCommand,
  compactCommand,
  notificationsCommand,
  logsCommand,
  helpCommand,
  surveyCommand,
  contextCommand,
  sessionsCommand,
  newCommand,
  bashesCommand,
];

/**
 * Get command by ID
 */
export function getCommand(id: string): Command | undefined {
  return commands.find((cmd) => cmd.id === id);
}

/**
 * Get command by label (e.g., '/model')
 */
export function getCommandByLabel(label: string): Command | undefined {
  return commands.find((cmd) => cmd.label === label);
}
