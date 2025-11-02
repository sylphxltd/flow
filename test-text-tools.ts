/**
 * Test text-based tool calling with Claude Code provider
 */

import { streamText, generateText } from 'ai';
import { z } from 'zod';
import { ClaudeCodeLanguageModel } from './src/providers/claude-code-language-model.js';

// Create model instance
const model = new ClaudeCodeLanguageModel({ modelId: 'sonnet' });

// Test with a simple calculator tool
async function testGenerateWithTools() {
  console.log('\n=== Testing generateText with text-based tools ===\n');

  const result = await generateText({
    model,
    prompt: 'What is 15 + 27?',
    tools: {
      calculator: {
        description: 'Perform basic arithmetic operations',
        parameters: z.object({
          operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The operation to perform'),
          a: z.number().describe('First number'),
          b: z.number().describe('Second number'),
        }),
        execute: async ({ operation, a, b }) => {
          console.log(`\n[Tool executed] calculator: ${operation}(${a}, ${b})`);
          switch (operation) {
            case 'add':
              return a + b;
            case 'subtract':
              return a - b;
            case 'multiply':
              return a * b;
            case 'divide':
              return a / b;
          }
        },
      },
    },
    maxSteps: 5,
  });

  console.log('\n=== Result ===');
  console.log('Text:', result.text);
  console.log('Steps:', result.steps.length);
  console.log('Usage:', result.usage);
  console.log('\n=== Tool Calls ===');
  for (const step of result.steps) {
    if (step.toolCalls && step.toolCalls.length > 0) {
      for (const toolCall of step.toolCalls) {
        console.log(`- ${toolCall.toolName}:`, JSON.stringify(toolCall.input));
      }
    }
    if (step.toolResults && step.toolResults.length > 0) {
      console.log('\n=== Tool Results ===');
      for (const toolResult of step.toolResults) {
        console.log(`- ${toolResult.toolName}:`, toolResult.output);
      }
    }
  }
}

async function testStreamWithTools() {
  console.log('\n=== Testing streamText with text-based tools ===\n');

  const result = streamText({
    model,
    prompt: 'Calculate 42 * 3 for me',
    tools: {
      calculator: {
        description: 'Perform basic arithmetic operations',
        parameters: z.object({
          operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The operation to perform'),
          a: z.number().describe('First number'),
          b: z.number().describe('Second number'),
        }),
        execute: async ({ operation, a, b }) => {
          console.log(`\n[Tool executed] calculator: ${operation}(${a}, ${b})`);
          switch (operation) {
            case 'add':
              return a + b;
            case 'subtract':
              return a - b;
            case 'multiply':
              return a * b;
            case 'divide':
              return a / b;
          }
        },
      },
    },
    maxSteps: 5,
  });

  console.log('\n=== Streaming Events ===');
  for await (const chunk of result.fullStream) {
    if (chunk.type === 'text-start') {
      console.log('[text-start]');
    } else if (chunk.type === 'text-delta') {
      process.stdout.write(chunk.text);
    } else if (chunk.type === 'text-end') {
      console.log('\n[text-end]');
    } else if (chunk.type === 'tool-input-start') {
      console.log(`[tool-input-start: ${chunk.toolName}]`);
    } else if (chunk.type === 'tool-input-delta') {
      process.stdout.write(chunk.delta);
    } else if (chunk.type === 'tool-input-end') {
      console.log('\n[tool-input-end]');
    } else if (chunk.type === 'tool-call') {
      console.log(`[tool-call: ${chunk.toolName}]`);
    } else if (chunk.type === 'tool-result') {
      console.log(`[tool-result: ${chunk.output}]`);
    }
  }

  console.log('\n=== Test Complete ===');
}

// Run tests
async function main() {
  try {
    await testGenerateWithTools();
    await testStreamWithTools();
    console.log('\n✅ All tests completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
