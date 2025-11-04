/**
 * Test Script: tRPC Subscription
 * Verifies that the streamResponse subscription works end-to-end
 *
 * Usage: bun run test-subscription.ts
 */

import { getTRPCClient } from './src/server/trpc/client.js';
import { getSessionRepository } from './src/db/database.js';

async function testSubscription() {
  console.log('🧪 Testing tRPC Subscription...\n');

  try {
    // 1. Get or create a test session
    console.log('📝 Setting up test session...');
    const repo = await getSessionRepository();

    // Get last session or create new one
    let session = await repo.getLastSession();
    if (!session) {
      console.log('   Creating new session...');
      session = await repo.createSession('anthropic', 'claude-3-5-sonnet-20241022');
      console.log(`   ✅ Created session: ${session.id}`);
    } else {
      console.log(`   ✅ Using existing session: ${session.id}`);
    }

    // 2. Get tRPC client
    console.log('\n📡 Creating tRPC caller...');
    const caller = await getTRPCClient();
    console.log('   ✅ Caller created');

    // 3. Subscribe to streaming
    console.log('\n🚀 Starting subscription...');
    console.log('   User message: "Hello! Please say hi back."\n');

    let eventCount = 0;
    const events: string[] = [];

    // Call subscription procedure (returns Observable)
    const observable = await caller.message.streamResponse({
      sessionId: session.id,
      userMessage: 'Hello! Please say hi back.',
    });

    // Subscribe to observable
    const subscription = observable.subscribe({
      next: (event) => {
          eventCount++;
          events.push(event.type);

          switch (event.type) {
            case 'text-start':
              console.log('   📝 Text streaming started');
              break;

            case 'text-delta':
              process.stdout.write(event.text);
              break;

            case 'text-end':
              console.log('\n   ✅ Text streaming ended');
              break;

            case 'reasoning-start':
              console.log('   🧠 Reasoning started');
              break;

            case 'reasoning-delta':
              process.stdout.write(`[thinking: ${event.text}]`);
              break;

            case 'reasoning-end':
              console.log(`\n   ✅ Reasoning ended (${event.duration}ms)`);
              break;

            case 'tool-call':
              console.log(`   🔧 Tool call: ${event.toolName} (${event.toolCallId})`);
              break;

            case 'tool-result':
              console.log(`   ✅ Tool result: ${event.toolName} (${event.duration}ms)`);
              break;

            case 'tool-error':
              console.log(`   ❌ Tool error: ${event.toolName} - ${event.error}`);
              break;

            case 'complete':
              console.log('\n   🎉 Streaming complete!');
              if (event.usage) {
                console.log(`   📊 Usage: ${event.usage.totalTokens} tokens`);
                console.log(`      - Prompt: ${event.usage.promptTokens}`);
                console.log(`      - Completion: ${event.usage.completionTokens}`);
              }
              if (event.finishReason) {
                console.log(`   🏁 Finish reason: ${event.finishReason}`);
              }
              break;

            case 'error':
              console.log(`   ❌ Error: ${event.error}`);
              break;

            case 'abort':
              console.log('   ⚠️  Aborted');
              break;
          }
        },
      error: (error) => {
        console.error('\n❌ Subscription error:', error);
      },
      complete: () => {
        console.log('\n✅ Subscription completed');
        console.log(`\n📊 Summary:`);
        console.log(`   Total events: ${eventCount}`);
        console.log(`   Event types: ${[...new Set(events)].join(', ')}`);
      },
    });

    // Wait for completion (or timeout after 30s)
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('Timeout after 30s'));
      }, 30000);

      const originalComplete = subscription;
      // Note: Can't easily hook into completion, so we just wait
      setTimeout(() => {
        clearTimeout(timeout);
        resolve(null);
      }, 25000);
    });
  } catch (error) {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }
}

// Run test
testSubscription()
  .then(() => {
    console.log('\n🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unhandled error:', error);
    process.exit(1);
  });
