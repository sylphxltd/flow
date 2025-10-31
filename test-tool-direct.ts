import type { Tool } from 'ai';
import { zodSchema } from 'ai';
import { z } from 'zod';

// Test: Create Tool object directly
const weatherTool: Tool<{ location: string }, { location: string; temperature: number }> = {
  description: 'Get the weather in a location',
  inputSchema: zodSchema(z.object({
    location: z.string().describe('The location to get the weather for'),
  })),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
};

console.log('Tool created:', weatherTool);
