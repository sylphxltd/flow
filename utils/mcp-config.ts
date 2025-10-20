import * as Layer from 'effect/Layer';
import * as Effect from 'effect/Effect';
import { AiService } from '@effect/ai/AiService'; // Assume import from @effect/ai

// Define MCP tools as Effect-based services for AiService integration
const mcpMemoryService = Layer.effect(McpMemory, Effect.succeed({
  set: (key: string, value: any, namespace?: string) => Effect.promise(() => memoryStorage.set(key, value, namespace)),
  get: (key: string, namespace?: string) => Effect.promise(() => memoryStorage.get(key, namespace)),
  // ... other methods
}));

const mcpTimeService = Layer.effect(McpTime, Effect.succeed({
  getCurrentTime: (timezone: string) => Effect.sync(() => getCurrentTimeSync(timezone)),
  convertTime: (sourceTimezone: string, time: string, targetTimezone: string) => Effect.sync(() => convertTimeSync(sourceTimezone, time, targetTimezone)),
}));

const mcpProjectService = Layer.effect(McpProject, Effect.succeed({
  startup: (args: ProjectStartupArgs) => projectStartupToolEffect(args),
}));

// Merge layers for AiService
const mcpServicesLayer = Layer.mergeAll(mcpMemoryService, mcpTimeService, mcpProjectService);

// Provide to AiService
export const AiServiceWithMcp = Layer.provide(mcpServicesLayer)(AiService);

export const configMcpForAi = Runtime.layerMcpConfig(AiServiceWithMcp);

// Error mapping
export const mapMcpError = (error: unknown): Effect.Effect<string> => {
  if (error instanceof Error) {
    return Effect.succeed(`MCP Error: ${error.message}`);
  }
  return Effect.succeed('Unknown MCP error');
};
