/**
 * Compact Command
 * Summarize current session and start fresh
 */

import type { Command } from '../types.js';

export const compactCommand: Command = {
  id: 'compact',
  label: '/compact',
  description: 'Summarize current session and create a new session with the summary',
  execute: async (context) => {
    const currentSession = context.getCurrentSession();

    if (!currentSession) {
      return 'No active session to compact.';
    }

    if (currentSession.messages.length === 0) {
      return 'Current session has no messages to compact.';
    }

    const aiConfig = context.getConfig();
    if (!aiConfig?.defaultProvider || !aiConfig?.defaultModel) {
      return 'No AI provider configured. Use /provider to configure a provider first.';
    }

    context.sendMessage('Analyzing conversation and creating detailed summary...');

    try {
      // Import necessary modules
      const { getProvider } = await import('@sylphx/code-core');
      const { streamText } = await import('ai');
      const { getSystemPrompt } = await import('@sylphx/code-core');

      // Get provider and model
      const provider = getProvider(currentSession.provider);
      const providerConfig = aiConfig.providers?.[currentSession.provider];

      if (!providerConfig || !provider.isConfigured(providerConfig)) {
        return `Provider ${currentSession.provider} is not properly configured.`;
      }

      const model = provider.createClient(providerConfig, currentSession.model);

      // Build conversation history for summarization
      const conversationHistory = currentSession.messages.map((msg) => {
        // Extract text content from MessagePart array
        const textParts = msg.content
          .filter((part) => part.type === 'text')
          .map((part: any) => part.content);
        let content = textParts.join('\n');

        // Include attachments info
        if (msg.attachments && msg.attachments.length > 0) {
          const attachmentsList = msg.attachments
            .map((att) => `[Attached: ${att.relativePath}]`)
            .join('\n');
          content += `\n${attachmentsList}`;
        }

        return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${content}`;
      }).join('\n\n---\n\n');

      // Create summarization prompt
      const summaryPrompt = `You are a conversation summarizer. Your task is to create a comprehensive, detailed summary of the following conversation that preserves ALL important information.

CRITICAL REQUIREMENTS:
1. DO NOT omit any important details, decisions, code snippets, file paths, commands, or configurations
2. Preserve technical accuracy - include exact function names, variable names, file paths, and command syntax
3. Maintain chronological flow of the conversation
4. Highlight key decisions, problems solved, and solutions implemented
5. Include all context that would be needed to continue this conversation naturally
6. Use clear markdown formatting with sections and bullet points
7. If code was discussed or written, include the essential parts or describe what was implemented
8. **CRITICAL**: If there is ongoing work or tasks in progress, create a section called "## Current Work" that describes:
   - What was being worked on when the conversation was compacted
   - What the next steps should be
   - Any pending tasks or unfinished work
   - The current state of the implementation

The summary will be used to start a fresh conversation while maintaining full context.

CONVERSATION TO SUMMARIZE:
${conversationHistory}

Please provide a detailed, structured summary now:`;

      // Call AI to generate summary
      const result = await streamText({
        model,
        messages: [
          {
            role: 'user',
            content: summaryPrompt,
          },
        ],
        maxTokens: 4096, // Allow longer summary
      });

      // Collect the full summary
      let summary = '';
      for await (const chunk of result.textStream) {
        summary += chunk;
      }

      if (!summary || summary.trim().length === 0) {
        return 'Failed to generate summary. Please try again.';
      }

      // Create new session with same provider/model
      const newSessionId = context.createSession(
        currentSession.provider,
        currentSession.model
      );

      // Switch to new session
      context.setCurrentSession(newSessionId);

      const messageCount = currentSession.messages.length;
      const sessionTitle = currentSession.title || 'Untitled session';

      // Format summary as a user message and trigger AI response
      const summaryMessage = `This session is being continued from a previous conversation that ran out of context. The conversation is summarized below:
${summary}`;

      // Send summary and automatically trigger AI response
      // This allows the LLM to acknowledge the summary and continue working
      await context.triggerAIResponse(summaryMessage);

      return `✓ Compacted session "${sessionTitle}" (${messageCount} messages)\n✓ Created new session with detailed summary\n✓ Switched to new session\n✓ AI is processing the summary and will continue working...`;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      context.addLog(`[Compact] Error: ${errorMsg}`);
      return `Failed to compact session: ${errorMsg}`;
    }
  },
};

export default compactCommand;
