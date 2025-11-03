/**
 * Example: Claude Code Session Management with Rewind Detection
 *
 * This example demonstrates how to:
 * 1. Reuse Claude Code sessions across multiple calls
 * 2. Automatically detect message rewind/edit
 * 3. Handle session tracking properly
 */

import { generateText } from 'ai';
import { claudeCode } from '../src/providers/index.js';

interface SessionState {
  sessionId?: string;
  messageCount: number;
  messageFingerprints: string[];
}

// Simulate a conversation with session tracking
async function main() {
  // Initialize session state
  let sessionState: SessionState = {
    messageCount: 0,
    messageFingerprints: [],
  };

  console.log('=== Example 1: Normal Conversation ===\n');

  // First message
  console.log('👤 User: Hello');
  const result1 = await generateText({
    model: claudeCode('sonnet'),
    messages: [{ role: 'user', content: 'Hello' }],
  });
  console.log('🤖 Assistant:', result1.text);

  // Update session state
  sessionState = extractSessionState(result1);
  console.log('\n📊 Session State:', sessionState);

  // Second message (reuses session)
  console.log('\n👤 User: What is 2+2?');
  const result2 = await generateText({
    model: claudeCode('sonnet'),
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: result1.text },
      { role: 'user', content: 'What is 2+2?' },
    ],
    providerOptions: {
      'claude-code': {
        sessionId: sessionState.sessionId,
        lastProcessedMessageCount: sessionState.messageCount,
        messageFingerprints: sessionState.messageFingerprints,
      },
    },
  });
  console.log('🤖 Assistant:', result2.text);

  // Update session state
  sessionState = extractSessionState(result2);
  console.log('\n📊 Session State:', sessionState);

  console.log('\n\n=== Example 2: Rewind Detection ===\n');

  // Simulate user rewinding and changing message
  console.log('👤 User rewound and changed last message to: "What is 3+3?"');
  const result3 = await generateText({
    model: claudeCode('sonnet'),
    messages: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: result1.text },
      { role: 'user', content: 'What is 3+3?' }, // ← Changed!
    ],
    providerOptions: {
      'claude-code': {
        sessionId: sessionState.sessionId,
        lastProcessedMessageCount: sessionState.messageCount,
        messageFingerprints: sessionState.messageFingerprints,
      },
    },
  });

  // Check for warnings
  if (result3.warnings && result3.warnings.length > 0) {
    console.log('\n⚠️  Warning:', result3.warnings[0]);
    console.log('✅ Provider detected inconsistency and created new session');
  }

  console.log('\n🤖 Assistant:', result3.text);

  // Update session state (note: sessionId may have changed)
  const newSessionState = extractSessionState(result3);
  console.log('\n📊 New Session State:', newSessionState);

  if (newSessionState.sessionId !== sessionState.sessionId) {
    console.log('✅ Session ID changed - new session was created');
  }

  console.log('\n\n=== Example 3: Streaming with Rewind Detection ===\n');

  const { streamText } = await import('ai');

  console.log('👤 User: Tell me a joke');
  const streamResult = await streamText({
    model: claudeCode('sonnet'),
    messages: [{ role: 'user', content: 'Tell me a joke' }],
  });

  console.log('🤖 Assistant: ');
  let streamSessionState: SessionState = {
    messageCount: 0,
    messageFingerprints: [],
  };

  for await (const chunk of streamResult.fullStream) {
    if (chunk.type === 'text-delta') {
      process.stdout.write(chunk.textDelta);
    } else if (chunk.type === 'finish') {
      const metadata = chunk.providerMetadata?.['claude-code'];
      streamSessionState = {
        sessionId: metadata?.sessionId,
        messageCount: metadata?.messageCount || 0,
        messageFingerprints: metadata?.messageFingerprints || [],
      };

      if (metadata?.forcedNewSession) {
        console.log('\n\n⚠️  Message history changed - new session created');
      }
    }
  }

  console.log('\n\n📊 Stream Session State:', streamSessionState);
}

/**
 * Helper function to extract session state from result
 */
function extractSessionState(result: any): SessionState {
  const headers = result.response?.headers || {};
  return {
    sessionId: headers['x-claude-code-session-id'],
    messageCount: parseInt(headers['x-claude-code-message-count'] || '0'),
    messageFingerprints: JSON.parse(headers['x-claude-code-message-fingerprints'] || '[]'),
  };
}

// Run example
main().catch(console.error);
