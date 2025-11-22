/**
 * Banner Display Utilities
 * Welcome messages and branding
 */

import chalk from 'chalk';
import boxen from 'boxen';

/**
 * Display welcome banner
 */
export function showWelcome(): void {
  console.log(
    boxen(
      `${chalk.cyan.bold('Sylphx Flow')} ${chalk.dim('- AI-Powered Development Framework')}\n` +
      `${chalk.dim('Auto-initialization • Smart upgrades • One-click launch')}`,
      {
        padding: 1,
        margin: { bottom: 1 },
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );
}
