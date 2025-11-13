import boxen from 'boxen';
import chalk from 'chalk';
import gradient from 'gradient-string';
import {
  selectAndValidateTarget,
  previewDryRun,
  installComponents,
  type InitOptions,
} from './init-core.js';

/**
 * Legacy init with full UI - used by setup command for backward compatibility
 * The flow command uses init-core functions directly for better integration
 */
export async function runInit(options: InitOptions): Promise<void> {
  // Create ASCII art title
  const title = `
███████╗██╗   ██╗██╗     ██████╗ ██╗  ██╗██╗  ██╗    ███████╗██╗      ██████╗ ██╗    ██╗
██╔════╝╚██╗ ██╔╝██║     ██╔══██╗██║  ██║╚██╗██╔╝    ██╔════╝██║     ██╔═══██╗██║    ██║
███████╗ ╚████╔╝ ██║     ██████╔╝███████║ ╚███╔╝     █████╗  ██║     ██║   ██║██║ █╗ ██║
╚════██║  ╚██╔╝  ██║     ██╔═══╝ ██╔══██║ ██╔██╗     ██╔══╝  ██║     ██║   ██║██║███╗██║
███████║   ██║   ███████╗██║     ██║  ██║██╔╝ ██╗    ██║     ███████╗╚██████╔╝╚███╔███╔╝
╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝
`;

  console.log(gradient(['cyan', 'blue'])(title));
  console.log(chalk.dim.cyan('                          Project Initialization\n'));

  // Select and validate target using core function
  const targetId = await selectAndValidateTarget(options);

  // Dry run preview
  if (options.dryRun) {
    console.log(
      boxen(
        chalk.yellow('⚠ Dry Run Mode') + chalk.dim('\nNo changes will be made to your project'),
        {
          padding: 1,
          margin: { top: 0, bottom: 1, left: 0, right: 0 },
          borderStyle: 'round',
          borderColor: 'yellow',
        }
      )
    );

    await previewDryRun(targetId, options);

    console.log(
      '\n' +
        boxen(chalk.green.bold('✓ Dry run complete'), {
          padding: { top: 0, bottom: 0, left: 2, right: 2 },
          margin: 0,
          borderStyle: 'round',
          borderColor: 'green',
        }) +
        '\n'
    );
    return;
  }

  console.log(chalk.cyan.bold('\n━━━ Installing Core Components ━━━\n'));

  // Install components using core function
  const result = await installComponents(targetId, options);

  // Success summary
  console.log(
    '\n' +
      boxen(
        chalk.green.bold('✓ Setup complete!') +
          '\n\n' +
          chalk.dim(`Target: ${result.targetName}`) +
          '\n\n' +
          chalk.cyan('Ready to code with Sylphx Flow'),
        {
          padding: 1,
          margin: 0,
          borderStyle: 'round',
          borderColor: 'green',
        }
      ) +
      '\n'
  );
}

/**
 * LEGACY: init command has been integrated into the flow command.
 * Use `flow --init-only` instead of standalone `init` command.
 *
 * This export is kept for backward compatibility but will be removed in future versions.
 * The runInit() function is the core implementation used by flow command.
 */
