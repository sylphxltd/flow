/**
 * Context Command
 * Display context window usage
 */

import type { Command } from '../types.js';

export const contextCommand: Command = {
  id: 'context',
  label: '/context',
  description: 'Display context window usage and token breakdown',
  execute: async (context) => {
    const { countTokens, formatTokenCount } = await import('@sylphx/code-core');
    const { getSystemPrompt } = await import('@sylphx/code-core');
    const { getAISDKTools } = await import('@sylphx/code-core');

    const currentSession = context.getCurrentSession();
    if (!currentSession) {
      return 'No active session. Start chatting first to see context usage.';
    }

    const modelName = currentSession.model;

    // Get model-specific context limit
    const getContextLimit = (model: string): number => {
      // Default limits for common models
      if (model.includes('gpt-4')) {
        if (model.includes('32k') || model.includes('turbo')) return 128000;
        if (model.includes('vision')) return 128000;
        return 8192; // Original GPT-4
      }
      if (model.includes('gpt-3.5')) {
        if (model.includes('16k')) return 16385;
        return 4096; // Original GPT-3.5
      }
      // Claude models
      if (model.includes('claude-3')) {
        if (model.includes('opus')) return 200000;
        if (model.includes('sonnet')) return 200000;
        if (model.includes('haiku')) return 200000;
      }
      // Default fallback
      return 200000;
    };

    const contextLimit = getContextLimit(modelName);

    // Calculate token counts
    context.addLog(
      `[Context] Calculating token counts for ${modelName} (limit: ${formatTokenCount(contextLimit)})...`
    );

    // System prompt tokens - use the actual system prompt that gets sent
    const systemPrompt = getSystemPrompt();
    const systemPromptTokens = await countTokens(systemPrompt, modelName);

    // Also calculate breakdown of system prompt components for debugging
    const { getEnabledRulesContent } = await import('@sylphx/code-core');
    const { getCurrentSystemPrompt } = await import('@sylphx/code-core');
    const BASE_SYSTEM_PROMPT = `You are Sylphx, an AI development assistant.`;

    const systemPromptBreakdown: Record<string, number> = {};
    try {
      systemPromptBreakdown['Base prompt'] = await countTokens(BASE_SYSTEM_PROMPT, modelName);

      const rulesContent = getEnabledRulesContent();
      if (rulesContent) {
        systemPromptBreakdown['Rules'] = await countTokens(rulesContent, modelName);
      }

      const agentPrompt = getCurrentSystemPrompt();
      systemPromptBreakdown['Agent prompt'] = await countTokens(agentPrompt, modelName);
    } catch (error) {
      context.addLog(`[Context] Failed to calculate system prompt breakdown: ${error}`);
    }

    // System tools tokens (calculate individual tool tokens)
    const tools = getAISDKTools();
    const toolTokens: Record<string, number> = {};
    let toolsTokensTotal = 0;

    for (const [toolName, toolDef] of Object.entries(tools)) {
      // Create a more accurate representation of how tools are sent to the AI
      // Tools are typically sent as function definitions with name, description, and parameters
      const toolRepresentation = {
        name: toolName,
        description: toolDef.description || '',
        parameters: toolDef.parameters || {},
      };
      const toolJson = JSON.stringify(toolRepresentation, null, 0); // No spaces for compact representation
      const tokens = await countTokens(toolJson, modelName);
      toolTokens[toolName] = tokens;
      toolsTokensTotal += tokens;
    }

    // Messages tokens - include attachments and parts for accurate calculation
    let messagesTokens = 0;
    for (const msg of currentSession.messages) {
      let msgText = msg.content;

      // Add attachment content if present (as it would be sent to AI)
      if (msg.attachments && msg.attachments.length > 0) {
        try {
          const { readFile } = await import('node:fs/promises');
          const fileContents = await Promise.all(
            msg.attachments.map(async (att) => {
              try {
                const content = await readFile(att.path, 'utf8');
                return { path: att.relativePath, content };
              } catch {
                return { path: att.relativePath, content: '[Error reading file]' };
              }
            })
          );

          const fileContentsText = fileContents
            .map((f) => `\n\n<file path="${f.path}">\n${f.content}\n</file>`)
            .join('');

          msgText += fileContentsText;
        } catch (error) {
          // If we can't read attachments, just count the content we have
          console.warn('[Context] Failed to read attachments for token count:', error);
        }
      }

      const msgTokens = await countTokens(msgText, modelName);
      messagesTokens += msgTokens;
    }

    // Calculate totals and percentages
    const usedTokens = systemPromptTokens + toolsTokensTotal + messagesTokens;
    const freeTokens = contextLimit - usedTokens;
    const autocompactBuffer = Math.floor(contextLimit * 0.225); // 22.5%
    const realFreeTokens = freeTokens - autocompactBuffer;

    const usedPercent = ((usedTokens / contextLimit) * 100).toFixed(1);
    const systemPromptPercent = ((systemPromptTokens / contextLimit) * 100).toFixed(1);
    const toolsPercent = ((toolsTokensTotal / contextLimit) * 100).toFixed(1);
    const messagesPercent = ((messagesTokens / contextLimit) * 100).toFixed(1);
    const freePercent = ((realFreeTokens / contextLimit) * 100).toFixed(1);
    const bufferPercent = ((autocompactBuffer / contextLimit) * 100).toFixed(1);

    // Create visual bar chart (30 blocks for better resolution)
    const createBarChart = (): string[] => {
      const totalBlocks = 30;
      const systemPromptBlocks = Math.floor((systemPromptTokens / contextLimit) * totalBlocks);
      const toolsBlocks = Math.floor((toolsTokensTotal / contextLimit) * totalBlocks);
      const messagesBlocks = Math.floor((messagesTokens / contextLimit) * totalBlocks);
      const usedBlocks = systemPromptBlocks + toolsBlocks + messagesBlocks;
      const freeBlocks = totalBlocks - usedBlocks;

      // Line 1: System prompt (blue)
      const line1 = '█'.repeat(systemPromptBlocks) + '░'.repeat(totalBlocks - systemPromptBlocks);

      // Line 2: Tools (green)
      const line2 =
        '░'.repeat(systemPromptBlocks) +
        '█'.repeat(toolsBlocks) +
        '░'.repeat(totalBlocks - systemPromptBlocks - toolsBlocks);

      // Line 3: Messages (yellow)
      const line3 =
        '░'.repeat(systemPromptBlocks + toolsBlocks) +
        '█'.repeat(messagesBlocks) +
        '░'.repeat(freeBlocks);

      return [line1, line2, line3];
    };

    const [bar1, bar2, bar3] = createBarChart();

    // Format tool list with tokens (sorted by size)
    const toolList = Object.entries(toolTokens)
      .sort((a, b) => b[1] - a[1])
      .map(([name, tokens]) => `    ${name}: ${formatTokenCount(tokens)} tokens`)
      .join('\n');

    // Format system prompt breakdown
    const systemPromptBreakdownText = Object.entries(systemPromptBreakdown)
      .map(([name, tokens]) => `    ${name}: ${formatTokenCount(tokens)} tokens`)
      .join('\n');

    // Format output with clean visual hierarchy
    const output = `
Context Usage: ${formatTokenCount(usedTokens)}/${formatTokenCount(contextLimit)} tokens (${usedPercent}%)
Model: ${modelName}

Visual Breakdown:
  ${bar1}  System prompt: ${formatTokenCount(systemPromptTokens)} (${systemPromptPercent}%)
  ${bar2}  Tools:         ${formatTokenCount(toolsTokensTotal)} (${toolsPercent}%)
  ${bar3}  Messages:      ${formatTokenCount(messagesTokens)} (${messagesPercent}%)

Available Space:
  • Free: ${formatTokenCount(realFreeTokens)} tokens (${freePercent}%)
  • Buffer: ${formatTokenCount(autocompactBuffer)} tokens (${bufferPercent}%)

System Prompt Breakdown:
${systemPromptBreakdownText}

System Tools (${Object.keys(tools).length} total):
${toolList}
`.trim();

    return output;
  },
};

export default contextCommand;
