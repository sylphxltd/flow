/**
 * Modern CLI prompts with progressive output
 */

import { createInterface } from 'node:readline';
import chalk from 'chalk';

export async function ask(question: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = defaultValue
    ? `${chalk.cyan('❯')} ${question} ${chalk.gray(`(${defaultValue})`)}: `
    : `${chalk.cyan('❯')} ${question}: `;

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

export async function askSecret(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = `${chalk.cyan('❯')} ${question}: `;

  return new Promise((resolve) => {
    // Hide input for secrets
    const stdin = process.stdin;
    const _onData = (char: Buffer) => {
      const str = char.toString('utf8');
      if (str === '\n' || str === '\r' || str === '\r\n') {
        (stdin as any).removeListener('data', _onData);
        process.stdout.write('\n');
        rl.close();
      } else {
        process.stdout.write('•');
      }
    };

    process.stdout.write(prompt);
    let input = '';
    stdin.on('data', (char) => {
      const str = char.toString('utf8');
      if (str === '\n' || str === '\r' || str === '\r\n') {
        process.stdout.write('\n');
        rl.close();
        resolve(input);
      } else if (str === '\x7f' || str === '\b') {
        // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += str;
        process.stdout.write('•');
      }
    });
    stdin.setRawMode(true);
    stdin.resume();
  }).finally(() => {
    const stdin = process.stdin;
    stdin.setRawMode(false);
    stdin.pause();
  });
}

export async function select<T extends string>(question: string, choices: T[]): Promise<T> {
  console.log(`${chalk.cyan('❯')} ${question}`);
  choices.forEach((choice, index) => {
    console.log(chalk.gray(`  ${index + 1}. ${choice}`));
  });

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(chalk.cyan(`  Select (1-${choices.length}): `), (answer) => {
      rl.close();
      const index = Number.parseInt(answer.trim(), 10) - 1;
      if (index >= 0 && index < choices.length) {
        resolve(choices[index]);
      } else {
        resolve(choices[0]);
      }
    });
  });
}

export async function confirm(question: string, defaultValue = true): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const prompt = `${chalk.cyan('❯')} ${question} ${chalk.gray(`(${defaultText})`)}: `;

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      const input = answer.trim().toLowerCase();
      if (input) {
        resolve(input === 'y' || input === 'yes');
      } else {
        resolve(defaultValue);
      }
    });
  });
}
