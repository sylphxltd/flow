import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { CodebaseIndexer } from '../utils/codebase-indexer.js';
import { CLIError } from '../utils/error-handler.js';
import { searchService } from '../utils/unified-search-service.js';

export const codebaseSearchCommand = new Command('search')
  .description('Search codebase files and source code')
  .argument('<query>', 'Search query - use natural language, function names, or technical terms')
  .option('-l, --limit <number>', 'Maximum number of results to return (default: 10)', '10')
  .option('--include-content', 'Include file content snippets in results (default: true)', 'true')
  .option('--extensions <exts...>', 'Filter by file extensions (e.g., .ts .tsx .js)')
  .option('--path <pattern>', 'Filter by path pattern (e.g., src/components)')
  .option('--exclude <patterns...>', 'Exclude paths containing these patterns')
  .action(async (query, options) => {
    try {
      console.log('');
      console.log(chalk.cyan.bold('▸ Search Codebase'));
      console.log(chalk.gray(`  Query: "${query}"`));

      const spinner = ora('Searching...').start();
      await searchService.initialize();

      const result = await searchService.searchCodebase(query, {
        limit: Number.parseInt(options.limit),
        include_content: options.includeContent !== 'false',
        file_extensions: options.extensions,
        path_filter: options.path,
        exclude_paths: options.exclude,
      });

      spinner.stop();

      const output = searchService.formatResultsForCLI(result.results, query, result.totalIndexed);
      console.log(output);
      console.log('');
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

export const codebaseReindexCommand = new Command('reindex')
  .description('Reindex all codebase files')
  .action(async () => {
    try {
      console.log('');
      console.log(chalk.cyan.bold('▸ Reindex Codebase'));

      const spinner = ora('Scanning and indexing files...').start();

      const indexer = new CodebaseIndexer();
      const embeddingProvider = await (
        await import('../utils/embeddings.js')
      ).getDefaultEmbeddingProvider();

      await indexer.indexCodebase({ embeddingProvider });

      spinner.succeed(chalk.green('Indexing complete'));
      console.log('');
    } catch (error) {
      throw new CLIError(`Codebase reindex failed: ${(error as Error).message}`);
    }
  });

export const codebaseStatusCommand = new Command('status')
  .description('Get codebase search system status')
  .action(async () => {
    try {
      console.log('');
      console.log(chalk.cyan.bold('▸ Codebase Status'));

      await searchService.initialize();
      const status = await searchService.getStatus();

      if (status.codebase.indexed) {
        console.log(chalk.green('\n✓ Indexed and ready'));
        console.log(chalk.gray(`  Files: ${status.codebase.fileCount}`));
        if (status.codebase.indexedAt) {
          console.log(
            chalk.gray(`  Last indexed: ${new Date(status.codebase.indexedAt).toLocaleString()}`)
          );
        }
      } else {
        console.log(chalk.yellow('\n⚠ Not indexed'));
        console.log(chalk.gray('  Run: sylphx-flow codebase reindex'));
      }

      console.log(chalk.cyan('\n▸ Available Commands'));
      console.log(chalk.gray('  • codebase search <query>'));
      console.log(chalk.gray('  • codebase reindex'));
      console.log(chalk.gray('  • codebase status'));
      console.log('');
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

export const codebaseCommand = new Command('codebase')
  .description('Manage codebase indexing and search')
  .addCommand(codebaseSearchCommand)
  .addCommand(codebaseReindexCommand)
  .addCommand(codebaseStatusCommand);
