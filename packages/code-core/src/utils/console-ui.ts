/**
 * Modern console UI utilities
 * Progressive output with beautiful formatting
 */

import chalk from 'chalk';

export const ui = {
  // Headers
  header: (text: string) => {
    console.log('');
    console.log(chalk.cyan.bold(`▸ ${text}`));
  },

  subheader: (text: string) => {
    console.log(chalk.gray(`  ${text}`));
  },

  // Status messages
  success: (text: string) => {
    console.log(chalk.green(`✓ ${text}`));
  },

  error: (text: string) => {
    console.log(chalk.red(`✗ ${text}`));
  },

  warning: (text: string) => {
    console.log(chalk.yellow(`⚠ ${text}`));
  },

  info: (text: string) => {
    console.log(chalk.cyan(`ℹ ${text}`));
  },

  // Progress
  step: (text: string) => {
    console.log(chalk.gray(`  • ${text}`));
  },

  loading: (text: string) => {
    console.log(chalk.cyan(`⏳ ${text}`));
  },

  // Fields
  field: (label: string, value: string, secret = false) => {
    const displayValue = secret ? '•'.repeat(Math.min(8, value.length)) : value;
    console.log(`  ${chalk.gray(label)}: ${chalk.white(displayValue)}`);
  },

  // Dividers
  divider: () => {
    console.log(chalk.gray('  ─'.repeat(40)));
  },

  spacer: () => {
    console.log('');
  },

  // Lists
  list: (items: string[]) => {
    items.forEach((item) => {
      console.log(chalk.gray(`  • ${item}`));
    });
  },

  // Input prompt (for simple inputs)
  prompt: (label: string, required = false) => {
    const indicator = required ? chalk.red('*') : '';
    return `${chalk.cyan('❯')} ${label}${indicator}: `;
  },

  // Section
  section: (title: string, content: () => void) => {
    console.log('');
    console.log(chalk.cyan.bold(`▸ ${title}`));
    content();
  },
};
