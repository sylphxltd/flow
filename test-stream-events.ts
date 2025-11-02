/**
 * Test to examine raw stream events from Claude Agent SDK
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

async function testStreamEvents() {
  console.log('\n=== Testing Claude Agent SDK Stream Events ===\n');

  const queryResult = query({
    prompt: 'What is 2+2? Think carefully.',
    options: {
      model: 'sonnet',
      maxThinkingTokens: 2000,
      settingSources: [],
      disallowedTools: ['Task', 'Bash', 'Glob', 'Grep', 'Read', 'Edit', 'Write'],
      includePartialMessages: true, // Enable streaming events
    },
  });

  for await (const event of queryResult) {
    console.log('\n--- Event ---');
    console.log('Type:', event.type);

    if (event.type === 'stream_event') {
      console.log('Stream Event:', JSON.stringify(event.event, null, 2));
    } else {
      console.log('Event data:', JSON.stringify(event, null, 2));
    }
  }

  console.log('\n=== Test Complete ===');
}

testStreamEvents().catch(console.error);
