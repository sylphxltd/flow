import { tool } from 'ai';
import { z } from 'zod';

// Test 1: Simple tool from documentation
const weatherTool = tool({
  description: 'Get the weather in a location',
  parameters: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});

console.log('Tool 1 created:', weatherTool);

// Test 2: Tool with generic function
function createWeatherTool() {
  return tool({
    description: 'Get weather',
    parameters: z.object({
      location: z.string(),
    }),
    execute: async (params) => {
      return { location: params.location, temp: 72 };
    },
  });
}

const weatherTool2 = createWeatherTool();
console.log('Tool 2 created:', weatherTool2);

// Test 3: Tool with explicit types
function createTypedTool<TParams, TResult>(
  params: z.ZodSchema<TParams>,
  exec: (params: TParams) => Promise<TResult>
) {
  return tool({
    description: 'Test',
    parameters: params,
    execute: exec,
  });
}

const weatherTool3 = createTypedTool(
  z.object({ location: z.string() }),
  async (params) => ({ location: params.location, temp: 72 })
);

console.log('Tool 3 created:', weatherTool3);
