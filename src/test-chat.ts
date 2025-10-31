/**
 * Headless Chat Test
 * Test chat functionality without TUI
 */

import { streamText } from 'ai';
import { getProvider } from './providers/index.js';
import { getAISDKTools } from './tools/index.js';
import type { ProviderId } from './config/ai-config.js';
import { loadAIConfig } from './config/ai-config.js';

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

async function testChat() {
  // Load AI config
  const configResult = await loadAIConfig();

  if (configResult._tag === 'Failure') {
    console.error('❌ Failed to load AI config:', configResult.error.message);
    console.error('\nRun: sylphx code init');
    process.exit(1);
  }

  const config = configResult.value;

  if (!config.defaultProvider || !config.defaultModel) {
    console.error('❌ No default provider/model configured');
    console.error('\nRun: sylphx code init');
    process.exit(1);
  }

  const provider = config.defaultProvider;
  const modelName = config.defaultModel;
  const apiKey = config.providers?.[provider]?.apiKey;

  if (!apiKey) {
    console.error(`❌ No API key configured for ${provider}`);
    console.error('\nRun: sylphx code init');
    process.exit(1);
  }

  console.log('🚀 Starting headless chat test...\n');
  console.log(`Provider: ${provider}`);
  console.log(`Model: ${modelName}\n`);

  // Create model client
  const providerInstance = getProvider(provider);
  const model = providerInstance.createClient(apiKey, modelName);

  // Get tools
  const tools = getAISDKTools();
  console.log(`Tools available: ${Object.keys(tools).join(', ')}\n`);

  // Test 1: Simple message without tools
  console.log('📝 Test 1: Simple message (no tools)\n');
  const simpleMessage = 'Say hello in one sentence.';
  console.log(`👤 User: ${simpleMessage}\n`);

  try {
    const simpleResult = await streamText({
      model,
      messages: [{ role: 'user', content: simpleMessage }],
    });

    console.log('🤖 Assistant: ');
    let simpleResponse = '';
    for await (const chunk of simpleResult.textStream) {
      process.stdout.write(chunk);
      simpleResponse += chunk;
    }
    console.log(`\n✅ Simple test: ${simpleResponse.length} chars\n`);

    if (simpleResponse.length === 0) {
      console.error('❌ Model is not responding at all. Check API key and model availability.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Simple test failed:', error);
    process.exit(1);
  }

  // Test 2: Message with tools
  console.log('\n📝 Test 2: Message with tools\n');
  const userMessage = 'What is the current working directory? Use the get_cwd tool.';
  console.log(`👤 User: ${userMessage}\n`);

  try {
    const result = await streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      tools,
      maxSteps: 5,
      onStepFinish: (step) => {
        console.log('\n📋 Step finished:', {
          stepType: step.stepType,
          toolCalls: step.toolCalls?.length || 0,
          toolResults: step.toolResults?.length || 0,
          hasText: !!step.text,
          textLength: step.text?.length || 0,
        });

        // Log tool calls
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const call of step.toolCalls) {
            console.log(`  🔧 Tool Call: ${call.toolName}`);
            console.log(`     Args:`, JSON.stringify(call.args, null, 2));
          }
        }

        // Log tool results
        if (step.toolResults && step.toolResults.length > 0) {
          for (const result of step.toolResults) {
            console.log(`  ✅ Tool Result: ${result.toolName}`);
            console.log(`     Result:`, JSON.stringify(result.result, null, 2));
          }
        }

        // Log text if available
        if (step.text) {
          console.log(`  📝 Text: ${step.text.substring(0, 200)}${step.text.length > 200 ? '...' : ''}`);
        }
      },
    });

    console.log('\n🤖 Assistant: ');
    let fullResponse = '';
    let chunkCount = 0;

    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
      fullResponse += chunk;
      chunkCount++;
    }

    console.log('\n\n✅ Test completed successfully!');
    console.log(`\nFull response: ${fullResponse.length} chars (${chunkCount} chunks)`);

    if (fullResponse.length === 0) {
      console.warn('\n⚠️  Warning: Empty response! This might indicate:');
      console.warn('- Model did not generate text after tool execution');
      console.warn('- Tool execution failed silently');
      console.warn('- Model only used tools without generating text response');
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testChat();
