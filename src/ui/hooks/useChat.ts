/**
 * Chat Hook
 * Handle AI chat with streaming support and tool execution
 */

import { streamText } from 'ai';
import { useAppStore } from '../stores/app-store.js';
import { getProvider } from '../../providers/index.js';
import { getAISDKTools } from '../../tools/index.js';

const SYSTEM_PROMPT = `You are a helpful coding assistant with access to filesystem and shell tools. You help users with programming tasks, code review, debugging, and software development.

Key capabilities:
- Write clean, functional code
- Read and write files using tools
- Execute shell commands
- Search for files and content
- Explain complex concepts clearly
- Debug issues systematically
- Follow best practices

Available tools:
- read_file: Read file contents
- write_file: Write content to files
- list_directory: List files in directories
- file_stats: Get file information
- execute_bash: Run shell commands
- get_cwd: Get current working directory
- glob_files: Search files by pattern
- grep_content: Search content in files

Use tools proactively to help users with their tasks.`;

export function useChat() {
  const aiConfig = useAppStore((state) => state.aiConfig);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const sessions = useAppStore((state) => state.sessions);
  const addMessage = useAppStore((state) => state.addMessage);
  const setError = useAppStore((state) => state.setError);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  /**
   * Send message and stream response
   */
  const sendMessage = async (
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ) => {
    if (!currentSession || !currentSessionId) {
      setError('No active session');
      return;
    }

    const provider = currentSession.provider;
    const modelName = currentSession.model;
    const providerConfig = aiConfig?.providers?.[provider];

    if (!providerConfig?.apiKey) {
      setError('API key not configured');
      return;
    }

    try {
      // Add user message
      addMessage(currentSessionId, 'user', message);

      // Get all messages for context
      const messages = [
        ...currentSession.messages,
        { role: 'user' as const, content: message, timestamp: Date.now() },
      ];

      // Get model using provider registry
      const providerInstance = getProvider(provider);
      const model = providerInstance.createClient(providerConfig.apiKey, modelName);

      // Get all available tools
      const tools = getAISDKTools();

      // Stream response with tools
      const result = await streamText({
        model,
        system: SYSTEM_PROMPT,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        tools,
        toolChoice: 'auto', // Let model decide when to use tools
        onStepFinish: (step) => {
          // Log tool execution for debugging
          if (step.toolCalls && step.toolCalls.length > 0) {
            console.log('[Tool Calls]:', step.toolCalls.map((c) => c.toolName).join(', '));
          }
        },
      });

      let fullResponse = '';

      for await (const chunk of result.textStream) {
        fullResponse += chunk;
        onChunk(chunk);
      }

      // Add assistant message to session
      addMessage(currentSessionId, 'assistant', fullResponse);
      onComplete();
    } catch (error) {
      console.error('[Chat Error]:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      onComplete();
    }
  };

  return {
    sendMessage,
    currentSession,
  };
}
