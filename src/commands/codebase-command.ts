import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { ReindexMonitor } from '../components/reindex-progress.js';
import { CodebaseIndexer } from '../services/search/codebase-indexer.js';
import { getDefaultEmbeddingProvider } from '../services/search/embeddings.js';
import { getSearchService } from '../services/search/unified-search-service.js';
import { CLIError } from '../utils/error-handler.js';

export const codebaseSearchCommand = new Command('search')
  .description('Search codebase files and source code')
  .argument('<query>', 'Search query - use natural language, function names, or technical terms')
  .option('-l, --limit <number>', 'Maximum number of results to return', '10')
  .option('--include-content', 'Include file content snippets in results', true)
  .option('--extensions <exts...>', 'Filter by file extensions (e.g., .ts .tsx .js)')
  .option('--path <pattern>', 'Filter by path pattern (e.g., src/components)')
  .option('--exclude <patterns...>', 'Exclude paths containing these patterns')
  .action(async (query, options) => {
    try {
      console.log('');
      console.log(chalk.cyan.bold('▸ Search Codebase'));
      console.log(chalk.gray(`  Query: "${query}"`));

      const spinner = ora('Searching...').start();
      const searchService = getSearchService();
      await searchService.initialize();

      const result = await searchService.searchCodebase(query, {
        limit: Number.parseInt(options.limit) || 10,
        include_content: options.includeContent !== false,
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
      const indexer = new CodebaseIndexer();

      // Check if API key exists - only use embeddings if key is present
      const hasApiKey = !!process.env.OPENAI_API_KEY;
      const embeddingProvider = hasApiKey ? await getDefaultEmbeddingProvider() : undefined;
      const mode: 'tfidf-only' | 'semantic' = hasApiKey ? 'semantic' : 'tfidf-only';

      // Create monitor for progress display
      const monitor = new ReindexMonitor();

      // Start the UI
      monitor.start(0); // Will update total when we know file count

      let totalFiles = 0;
      let phase: 'tokenizing' | 'calculating' | 'completed' = 'tokenizing';

      // Set initial mode
      monitor.updateProgress({ mode });

      const result = await indexer.indexCodebase({
        force: true, // Reindex should always force rebuild
        embeddingProvider,
        onProgress: (progress) => {
          // Track total files on first progress update
          if (totalFiles === 0 && progress.total > 0) {
            totalFiles = progress.total;
          }

          // Update Ink UI only (stderr output was interfering with Ink rendering)
          monitor.updateProgress({
            current: progress.current,
            total: progress.total,
            fileName: progress.fileName,
            status: progress.status,
            phase,
          });
        },
      });

      // Handle cache hit - simulate progress to show 100%
      if (result.stats.cacheHit) {
        monitor.updateProgress({
          current: result.stats.totalFiles,
          total: result.stats.totalFiles,
          fileName: '',
          status: 'completed',
          phase: 'tokenizing',
        });

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 300));
      } else {
        // Update to calculating phase
        phase = 'calculating';
        monitor.updateProgress({ phase: 'calculating' });

        // Small delay to show calculating phase
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Show completion with stats
      monitor.updateProgress({
        phase: 'completed',
        stats: {
          documentsProcessed: result.stats.totalFiles,
          uniqueTerms: result.tfidfIndex.idf.size,
        },
      });

      // Give time to see the completion message
      await new Promise((resolve) => setTimeout(resolve, 2000));

      monitor.stop();
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

      const searchService = getSearchService();
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
