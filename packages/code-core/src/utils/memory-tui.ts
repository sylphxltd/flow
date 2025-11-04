import chalk from 'chalk';

import inquirer from 'inquirer';
import { DrizzleMemoryStorage, type MemoryEntry } from '../utils/drizzle-storage.js';

interface MemoryEntryChoice extends inquirer.ChoiceBase {
  value: MemoryEntry;
  name: string;
  short: string;
}

interface MemoryActionChoice extends inquirer.ChoiceBase {
  value: string;
  name: string;
  short: string;
}

interface MemoryFormData {
  namespace: string;
  key: string;
  value: string;
}

export class MemoryTUI {
  private memory: DrizzleMemoryStorage;
  private entries: MemoryEntry[] = [];
  private running = true;

  constructor() {
    this.memory = new DrizzleMemoryStorage();
  }

  async start(): Promise<void> {
    console.clear();
    console.log(chalk.cyan.bold('🧠 Memory Manager'));
    console.log(chalk.gray('Interactive memory management for Sylphx Flow\n'));

    await this.loadEntries();

    while (this.running) {
      try {
        await this.showMainMenu();
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        await inquirer.prompt([
          {
            type: 'input',
            name: 'continue',
            message: 'Press Enter to continue...',
          },
        ]);
      }
    }
  }

  private async loadEntries(): Promise<void> {
    try {
      this.entries = await this.memory.getAll();
      this.entries.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } catch (error) {
      console.error(chalk.red(`Failed to load entries: ${error}`));
      this.entries = [];
    }
  }

  private async showMainMenu(): Promise<void> {
    if (this.entries.length === 0) {
      console.log(chalk.yellow('No memory entries found.'));

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '➕ Add new entry', value: 'add' },
            { name: '🔄 Refresh entries', value: 'refresh' },
            { name: '✗ Exit', value: 'exit' },
          ],
        },
      ]);

      if (action === 'add') {
        await this.showAddEntry();
      } else if (action === 'refresh') {
        await this.loadEntries();
      } else {
        this.running = false;
      }
      return;
    }

    const choices: MemoryActionChoice[] = [
      { name: '📝 View entry details', value: 'view', short: 'View' },
      { name: '✏️ Edit entry', value: 'edit', short: 'Edit' },
      { name: '➕ Add new entry', value: 'add', short: 'Add' },
      { name: '🗑️ Delete entry', value: 'delete', short: 'Delete' },
      { name: '🔍 Search entries', value: 'search', short: 'Search' },
      { name: '🔄 Refresh entries', value: 'refresh', short: 'Refresh' },
      { name: '✗ Exit', value: 'exit', short: 'Exit' },
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices,
      },
    ]);

    switch (action) {
      case 'view':
        await this.showViewEntry();
        break;
      case 'edit':
        await this.showEditEntry();
        break;
      case 'add':
        await this.showAddEntry();
        break;
      case 'delete':
        await this.showDeleteEntry();
        break;
      case 'search':
        await this.showSearchEntries();
        break;
      case 'refresh':
        await this.loadEntries();
        console.log(chalk.green('✓ Entries refreshed'));
        break;
      case 'exit':
        this.running = false;
        break;
    }
  }

  private async selectEntry(message: string, allowEmpty = false): Promise<MemoryEntry | null> {
    if (this.entries.length === 0) {
      if (allowEmpty) {
        return null;
      }
      throw new Error('No entries available');
    }

    const choices: MemoryEntryChoice[] = this.entries.map((entry, index) => ({
      value: entry,
      name: `${chalk.cyan(`${index + 1}.`)} ${chalk.bold(entry.namespace)}:${chalk.bold(entry.key)}`,
      short: `${entry.namespace}:${entry.key}`,
    }));

    if (allowEmpty) {
      choices.unshift({ name: '← Back to menu', value: null as any, short: 'Back' });
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message,
        choices,
        pageSize: 15,
      },
    ]);

    return selected;
  }

  private async showViewEntry(): Promise<void> {
    const entry = await this.selectEntry('Select entry to view:', true);
    if (!entry) {
      return;
    }

    console.clear();
    console.log(chalk.cyan.bold('📄 Entry Details'));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.blue.bold('Namespace:'), entry.namespace);
    console.log(chalk.blue.bold('Key:'), entry.key);
    console.log(chalk.blue.bold('Updated:'), entry.updated_at);

    console.log(chalk.blue.bold('\nValue:'));
    const valueStr = JSON.stringify(entry.value, null, 2);
    console.log(chalk.gray(valueStr));

    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      },
    ]);
  }

  private async showEditEntry(): Promise<void> {
    const entry = await this.selectEntry('Select entry to edit:', true);
    if (!entry) {
      return;
    }

    console.clear();
    console.log(chalk.yellow.bold('✏️ Edit Entry'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.blue('Editing:')} ${entry.namespace}:${entry.key}\n`);

    const formData: MemoryFormData = await inquirer.prompt([
      {
        type: 'input',
        name: 'namespace',
        message: 'Namespace:',
        default: entry.namespace,
        validate: (input) => input.trim().length > 0 || 'Namespace is required',
      },
      {
        type: 'input',
        name: 'key',
        message: 'Key:',
        default: entry.key,
        validate: (input) => input.trim().length > 0 || 'Key is required',
      },
      {
        type: 'editor',
        name: 'value',
        message: 'Value (JSON):',
        default: JSON.stringify(entry.value, null, 2),
        validate: (input) => {
          try {
            JSON.parse(input);
            return true;
          } catch {
            return 'Invalid JSON format';
          }
        },
      },
    ]);

    try {
      const parsedValue = JSON.parse(formData.value);
      await this.memory.set(formData.key, parsedValue, formData.namespace);

      // Remove old entry if namespace or key changed
      if (formData.namespace !== entry.namespace || formData.key !== entry.key) {
        await this.memory.delete(entry.key, entry.namespace);
      }

      await this.loadEntries();
      console.log(chalk.green(`✓ Updated ${formData.namespace}:${formData.key}`));
    } catch (error) {
      console.error(chalk.red(`Failed to update entry: ${error}`));
    }

    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      },
    ]);
  }

  private async showAddEntry(): Promise<void> {
    console.clear();
    console.log(chalk.green.bold('➕ Add New Entry'));
    console.log(chalk.gray('─'.repeat(50)));

    const formData: MemoryFormData = await inquirer.prompt([
      {
        type: 'input',
        name: 'namespace',
        message: 'Namespace:',
        default: 'default',
        validate: (input) => input.trim().length > 0 || 'Namespace is required',
      },
      {
        type: 'input',
        name: 'key',
        message: 'Key:',
        validate: (input) => input.trim().length > 0 || 'Key is required',
      },
      {
        type: 'editor',
        name: 'value',
        message: 'Value (JSON):',
        default: '{\n  \n}',
        validate: (input) => {
          try {
            JSON.parse(input);
            return true;
          } catch {
            return 'Invalid JSON format';
          }
        },
      },
    ]);

    try {
      const parsedValue = JSON.parse(formData.value);
      await this.memory.set(formData.key, parsedValue, formData.namespace);
      await this.loadEntries();
      console.log(chalk.green(`✓ Added ${formData.namespace}:${formData.key}`));
    } catch (error) {
      console.error(chalk.red(`Failed to add entry: ${error}`));
    }

    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      },
    ]);
  }

  private async showDeleteEntry(): Promise<void> {
    const entry = await this.selectEntry('Select entry to delete:', true);
    if (!entry) {
      return;
    }

    console.clear();
    console.log(chalk.red.bold('🗑️ Delete Entry'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`${chalk.blue('Entry:')} ${entry.namespace}:${entry.key}`);

    const valuePreview = JSON.stringify(entry.value);
    const preview =
      valuePreview.length > 100 ? `${valuePreview.substring(0, 100)}...` : valuePreview;
    console.log(`${chalk.blue('Value:')} ${chalk.gray(preview)}`);

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: chalk.yellow('Are you sure you want to delete this entry?'),
        default: false,
      },
    ]);

    if (confirmed) {
      try {
        await this.memory.delete(entry.key, entry.namespace);
        await this.loadEntries();
        console.log(chalk.green(`✓ Deleted ${entry.namespace}:${entry.key}`));
      } catch (error) {
        console.error(chalk.red(`Failed to delete entry: ${error}`));
      }
    } else {
      console.log(chalk.gray('Delete cancelled'));
    }

    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      },
    ]);
  }

  private async showSearchEntries(): Promise<void> {
    console.clear();
    console.log(chalk.magenta.bold('🔍 Search Entries'));
    console.log(chalk.gray('─'.repeat(50)));

    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Search query:',
        validate: (input) => input.trim().length > 0 || 'Search query is required',
      },
    ]);

    const filteredEntries = this.entries.filter(
      (entry) =>
        entry.namespace.toLowerCase().includes(query.toLowerCase()) ||
        entry.key.toLowerCase().includes(query.toLowerCase()) ||
        JSON.stringify(entry.value).toLowerCase().includes(query.toLowerCase())
    );

    if (filteredEntries.length === 0) {
      console.log(chalk.yellow('No entries found matching your search.'));
    } else {
      console.log(chalk.cyan(`\nFound ${filteredEntries.length} matching entries:\n`));

      filteredEntries.forEach((entry, index) => {
        const valuePreview = JSON.stringify(entry.value);
        const preview =
          valuePreview.length > 80 ? `${valuePreview.substring(0, 80)}...` : valuePreview;

        console.log(
          `${chalk.cyan(`${index + 1}.`)} ${chalk.bold(entry.namespace)}:${chalk.bold(entry.key)}`
        );
        console.log(`   ${chalk.gray(preview)}\n`);
      });
    }

    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: 'Press Enter to continue...',
      },
    ]);
  }
}

export const handleMemoryTui = async (): Promise<void> => {
  const tui = new MemoryTUI();
  await tui.start();
};
