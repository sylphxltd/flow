import chalk from 'chalk';
import { loadAIConfig, getProvider, createAIStream, processStream, createHeadlessDisplay, getOrCreateSession, showModelToolSupportError, addMessage, getSessionRepository, getDatabase } from '@sylphx/code-core';

/**
 * Headless mode - execute prompt and get response
 */
export async function runHeadless(prompt: string, options: any): Promise<void> {
  // Initialize database before any session operations
  try {
    await getDatabase();
  } catch (error) {
    console.error(chalk.red('✗ Failed to initialize database:'), error);
    process.exit(1);
  }

  // Get or create session
  const session = await getOrCreateSession(options.continue || false);
  if (!session) {
    process.exit(1);
  }

  // Get provider and model
  const providerInstance = getProvider(session.provider);
  const configResult = await loadAIConfig();
  if (configResult._tag === 'Failure') {
    console.error(chalk.red('✗ Failed to load config'));
    process.exit(1);
  }

  const config = configResult.value;
  const providerConfig = config.providers?.[session.provider];
  if (!providerConfig) {
    console.error(chalk.red(`✗ Provider ${session.provider} not configured`));
    process.exit(1);
  }

  // Check if provider is properly configured
  if (!providerInstance.isConfigured(providerConfig)) {
    console.error(chalk.red(`✗ ${providerInstance.name} is not properly configured`));
    process.exit(1);
  }

  const model = providerInstance.createClient(providerConfig, session.model);

  // Add user message to session (in-memory and database)
  const updatedSession = addMessage(session, 'user', prompt);

  // Save user message to database
  const repository = await getSessionRepository();
  await repository.addMessage(
    session.id,
    'user',
    [{ type: 'text', content: prompt }]
  );

  // Show user message (unless quiet)
  if (!options.quiet) {
    console.error(chalk.dim(`\n${session.provider} · ${session.model}\n`));
  }

  try {
    // Convert session messages to AI SDK format
    const messages = updatedSession.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Create display callbacks
    const display = createHeadlessDisplay(options.quiet || false);

    // Create AI stream
    const stream = createAIStream({
      model,
      messages,
    });

    // Process stream with unified handler
    const { fullResponse } = await processStream(stream, {
      onTextDelta: display.onTextDelta,
      onToolCall: display.onToolCall,
      onToolResult: display.onToolResult,
      onComplete: display.onComplete,
    });

    if (options.verbose) {
      console.error(chalk.dim(`\n[Stream complete. Response length: ${fullResponse.length}]`));
    }

    // If no output, model may not support multi-step tool calling
    if (!display.hasOutput() || fullResponse.length === 0) {
      showModelToolSupportError();
      process.exit(1);
    }

    // Add assistant message to session and save to database
    const finalSession = addMessage(updatedSession, 'assistant', fullResponse);

    // Save assistant message to database
    await repository.addMessage(
      finalSession.id,
      'assistant',
      [{ type: 'text', content: fullResponse }]
    );

    if (options.verbose) {
      console.error(chalk.dim(`\nSession: ${finalSession.id}`));
      console.error(chalk.dim(`Messages: ${finalSession.messages.length}\n`));
    }
  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error instanceof Error ? error.message : String(error));

    // Provide helpful context for common errors
    if (error instanceof Error && 'statusCode' in error && (error as any).statusCode === 401) {
      console.error(chalk.yellow('\nThis usually means:'));
      console.error(chalk.dim('  • Invalid or missing API key'));
      console.error(chalk.dim('  • API key has expired'));
      console.error(chalk.dim('  • Authentication credentials not found\n'));
      console.error(chalk.green('To fix: Configure your provider settings'));
    }

    if (options.verbose && error instanceof Error) {
      console.error(chalk.dim('\nStack trace:'));
      console.error(chalk.dim(error.stack));
    }
    process.exit(1);
  }
}
