/**
 * Knowledge CLI commands - 知識庫 CLI 命令
 * Knowledge base search and management functionality
 */

import { Command } from 'commander';
import { getKnowledgeContent } from '../resources/knowledge-resources.js';
import { CLIError } from '../utils/error-handler.js';
import { searchService } from '../utils/unified-search-service.js';

/**
 * Knowledge search command
 */
export const knowledgeSearchCommand = new Command('search')
  .description('Search knowledge base, documentation, and guides')
  .argument('<query>', 'Search query - use natural language, technology names, or topic keywords')
  .option('-l, --limit <number>', 'Maximum number of results to return (default: 10)', '10')
  .option('--include-content', 'Include full content in results (default: true)', 'true')
  .action(async (query, options) => {
    try {
      console.log(`📚 Searching knowledge base for: "${query}"`);

      await searchService.initialize();

      const result = await searchService.searchKnowledge(query, {
        limit: Number.parseInt(options.limit),
        include_content: options.includeContent !== 'false',
      });

      const output = searchService.formatResultsForCLI(result.results, query, result.totalIndexed);
      console.log(output);
    } catch (error) {
      throw new CLIError(`Knowledge search failed: ${(error as Error).message}`);
    }
  });

/**
 * Knowledge get command
 */
export const knowledgeGetCommand = new Command('get')
  .description('Get specific knowledge document by URI')
  .argument('<uri>', 'Knowledge URI to access (e.g., "knowledge://stacks/react-app")')
  .action(async (uri) => {
    try {
      const content = getKnowledgeContent(uri);
      console.log(content);
    } catch (error) {
      const errorMessage = `Knowledge get failed: ${(error as Error).message}`;

      // Show available URIs
      const availableURIs = await searchService.getAvailableKnowledgeURIs();
      if (availableURIs.length > 0) {
        console.log('\n**Available knowledge URIs:**');
        availableURIs.forEach((uri) => console.log(`• ${uri}`));
      }
      throw new CLIError(errorMessage);
    }
  });

/**
 * Knowledge list command
 */
export const knowledgeListCommand = new Command('list')
  .description('List all available knowledge resources')
  .option('--category <type>', 'Filter by category (stacks, guides, universal, data)')
  .action(async (options) => {
    try {
      await searchService.initialize();
      const availableURIs = await searchService.getAvailableKnowledgeURIs();

      if (availableURIs.length === 0) {
        console.log('📭 No knowledge documents available');
        return;
      }

      let filteredURIs = availableURIs;
      if (options.category) {
        filteredURIs = availableURIs.filter((uri) => uri.includes(`/${options.category}/`));
      }

      console.log(`📚 Available Knowledge Resources (${filteredURIs.length} documents):\n`);

      // Group by category
      const grouped = filteredURIs.reduce(
        (acc, uri) => {
          const category = uri.split('/')[2] || 'unknown';
          if (!acc[category]) { acc[category] = []; }
          acc[category].push(uri);
          return acc;
        },
        {} as Record<string, string[]>
      );

      Object.entries(grouped).forEach(([category, uris]) => {
        console.log(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
        uris.forEach((uri) => {
          const name = uri.split('/').pop() || 'Unknown';
          console.log(`• ${name} - ${uri}`);
        });
        console.log('');
      });

      console.log('**Usage:**');
      console.log('• sylphx knowledge search <query> - Search knowledge base');
      console.log('• sylphx knowledge get <uri> - Get specific document');
    } catch (error) {
      throw new CLIError(`Knowledge status failed: ${(error as Error).message}`);
    }
  });

/**
 * Knowledge status command
 */
export const knowledgeStatusCommand = new Command('status')
  .description('Get knowledge base system status')
  .action(async () => {
    try {
      console.log('\n### 📚 Knowledge Base Status\n');

      await searchService.initialize();
      const status = await searchService.getStatus();

      if (status.knowledge.indexed) {
        console.log('**Status:** ✓ Ready');
        console.log(`**Documents:** ${status.knowledge.documentCount} files`);
      } else if (status.knowledge.isIndexing) {
        console.log(`**Status:** 🔄 Building index (${status.knowledge.progress || 0}%)`);
        console.log('**Note:** Please wait a moment and try again');
      } else {
        console.log('**Status:** ⚠️ Not initialized');
        console.log('**Note:** Will auto-index on first search');
      }

      console.log('\n**Available Commands:**');
      console.log('• sylphx knowledge search <query> - Search knowledge base');
      console.log('• sylphx knowledge get <uri> - Get specific document');
    } catch (error) {
      throw new CLIError(`Knowledge list failed: ${(error as Error).message}`);
    }
  });

/**
 * Main knowledge command
 */
export const knowledgeCommand = new Command('knowledge').description(
  'Knowledge base search and management commands'
);

// Add subcommands
knowledgeCommand.addCommand(knowledgeSearchCommand);
knowledgeCommand.addCommand(knowledgeGetCommand);
knowledgeCommand.addCommand(knowledgeListCommand);
knowledgeCommand.addCommand(knowledgeStatusCommand);
