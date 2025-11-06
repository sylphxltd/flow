/**
 * Session Service
 * Centralized session management for headless mode
 *
 * NOTE: This should be moved to code-server (application layer)
 * Kept here temporarily for backwards compatibility
 */
import chalk from 'chalk';
import { loadAIConfig, getConfiguredProviders } from '../config/ai-config.js';
import { getProvider } from './providers/index.js';
import { fetchModels } from '../utils/ai-model-fetcher.js';
/**
 * Get default model for a provider
 * Priority: config defaultModel > first available model
 */
export async function getDefaultModel(providerId, providerConfig) {
    // Try config first
    const configModel = providerConfig.defaultModel;
    if (configModel) {
        return configModel;
    }
    // Fetch first available model
    try {
        const models = await fetchModels(providerId, providerConfig);
        return models[0]?.id || null;
    }
    catch {
        return null;
    }
}
/**
 * Get or create session for headless mode
 *
 * @param repository - Session repository instance (from AppContext)
 * @param continueSession - Whether to continue last session or create new one
 */
export async function getOrCreateSession(repository, continueSession) {
    const cwd = process.cwd();
    const configResult = await loadAIConfig(cwd);
    if (configResult._tag === 'Failure') {
        console.error(chalk.red('✗ Failed to load AI config'));
        return null;
    }
    const config = configResult.value;
    const configuredProviders = await getConfiguredProviders(cwd);
    if (configuredProviders.length === 0) {
        console.error(chalk.yellow('\n⚠️  No AI provider configured\n'));
        console.error(chalk.dim('Run: sylphx code (to configure AI)\n'));
        return null;
    }
    const providerId = config.defaultProvider ?? configuredProviders[0];
    if (!providerId) {
        console.error(chalk.yellow('\n⚠️  No provider configured\n'));
        return null;
    }
    const providerConfig = config.providers?.[providerId];
    if (!providerConfig) {
        console.error(chalk.yellow('\n⚠️  Provider not configured\n'));
        return null;
    }
    // Check if provider is properly configured
    const provider = getProvider(providerId);
    if (!provider.isConfigured(providerConfig)) {
        console.error(chalk.yellow(`\n⚠️  ${provider.name} is not properly configured\n`));
        console.error(chalk.dim('Run: sylphx code (to configure AI)\n'));
        return null;
    }
    // Try to continue last session
    if (continueSession) {
        const lastSession = await repository.getLastSession();
        if (lastSession) {
            console.error(chalk.dim(`Continuing session: ${lastSession.id}`));
            console.error(chalk.dim(`Messages: ${lastSession.messages.length}\n`));
            return lastSession;
        }
        console.error(chalk.yellow('No previous session found, creating new one\n'));
    }
    // Get default model (last used or first available)
    const modelName = await getDefaultModel(providerId, providerConfig);
    if (!modelName) {
        console.error(chalk.yellow('\n⚠️  No models available for this provider\n'));
        return null;
    }
    // Create new session in database
    return await repository.createSession(providerId, modelName);
}
/**
 * Show error message for models without tool support
 */
export function showModelToolSupportError() {
    console.error(chalk.red('\n✗ No text response received from model\n'));
    console.error(chalk.yellow('The model may have called tools but did not generate a final text response.'));
    console.error(chalk.yellow('This usually means:\n'));
    console.error(chalk.dim('  • The current model does not fully support multi-step tool calling'));
    console.error(chalk.dim('  • Some models can call tools but cannot process results and respond\n'));
    console.error(chalk.green('Recommended models with full tool support:'));
    console.error(chalk.green('  • anthropic/claude-3.5-sonnet'));
    console.error(chalk.green('  • anthropic/claude-3.5-haiku'));
    console.error(chalk.green('  • openai/gpt-4o'));
    console.error(chalk.green('  • google/gemini-2.0-flash-exp\n'));
    console.error(chalk.dim('💡 Tip: Ask questions that don\'t require tools, or switch to a model above'));
    console.error(chalk.dim('To configure: Run `sylphx code` (TUI mode) then type /provider\n'));
}
//# sourceMappingURL=session-service.js.map