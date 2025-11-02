/**
 * Test reasoning/thinking streaming with Claude Code provider
 */

import { streamText } from 'ai';
import { ClaudeCodeLanguageModel } from './src/providers/claude-code-language-model.js';

// Create model instance
const model = new ClaudeCodeLanguageModel({ modelId: 'sonnet' });

async function testReasoningStreaming() {
  console.log('\n=== Testing reasoning/thinking streaming ===\n');

  const result = streamText({
    model,
    prompt: 'What is the capital of France? Think carefully about your answer.',
    providerOptions: {
      'claude-code': {
        maxThinkingTokens: 5000,
      },
    },
  });

  console.log('Provider options set:', JSON.stringify({
    'claude-code': {
      maxThinkingTokens: 5000,
    },
  }, null, 2));

  console.log('\n=== Streaming Events ===');
  for await (const chunk of result.fullStream) {
    console.log('[TEST] Received chunk type:', chunk.type);
    if (chunk.type === 'reasoning-start') {
      console.log('\n[reasoning-start]');
    } else if (chunk.type === 'reasoning-delta') {
      console.log('[TEST] reasoning-delta chunk:', chunk);
      if (chunk.delta) {
        process.stdout.write(chunk.delta);
      }
    } else if (chunk.type === 'reasoning-end') {
      console.log('\n[reasoning-end]\n');
    } else if (chunk.type === 'text-start') {
      console.log('[text-start]');
    } else if (chunk.type === 'text-delta') {
      if (chunk.text) {
        process.stdout.write(chunk.text);
      }
    } else if (chunk.type === 'text-end') {
      console.log('\n[text-end]');
    }
  }

  console.log('\n=== Test Complete ===');
}

// Run test
async function main() {
  try {
    await testReasoningStreaming();
    console.log('\n✅ Reasoning test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
