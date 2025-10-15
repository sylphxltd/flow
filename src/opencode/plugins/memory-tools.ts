import { type Plugin, tool } from "@opencode-ai/plugin"

// Simple in-memory storage for coordination between agents
const memoryStore = new Map<string, any>()

export const MemoryToolsPlugin: Plugin = async () => {
  return {
    tool: {
      // Store a value in memory
      memory_set: tool({
        description: "Store a value in shared memory for agent coordination",
        args: {
          key: tool.schema.string().describe("Memory key (e.g., 'swarm/coder/status')"),
          value: tool.schema.string().describe("Value to store (will be JSON stringified)"),
          namespace: tool.schema.string().optional().describe("Optional namespace for organization"),
        },
        async execute(args: any) {
          try {
            const fullKey = args.namespace ? `${args.namespace}:${args.key}` : args.key
            const parsedValue = JSON.parse(args.value)
            memoryStore.set(fullKey, {
              value: parsedValue,
              timestamp: Date.now(),
              namespace: args.namespace || 'default'
            })
            return `✅ Stored memory: ${fullKey}`
          } catch (error: any) {
            return `❌ Error storing memory: ${error.message}`
          }
        },
      }),

      // Retrieve a value from memory
      memory_get: tool({
        description: "Retrieve a value from shared memory",
        args: {
          key: tool.schema.string().describe("Memory key to retrieve"),
          namespace: tool.schema.string().optional().describe("Optional namespace"),
        },
        async execute(args: any) {
          try {
            const fullKey = args.namespace ? `${args.namespace}:${args.key}` : args.key
            const memory = memoryStore.get(fullKey)
            
            if (!memory) {
              return `❌ Memory not found: ${fullKey}`
            }
            
            return JSON.stringify({
              key: fullKey,
              value: memory.value,
              timestamp: memory.timestamp,
              namespace: memory.namespace,
              age: Date.now() - memory.timestamp
            }, null, 2)
          } catch (error: any) {
            return `❌ Error retrieving memory: ${error.message}`
          }
        },
      }),

      // Search memory keys by pattern
      memory_search: tool({
        description: "Search memory keys by pattern",
        args: {
          pattern: tool.schema.string().describe("Search pattern (supports wildcards)"),
          namespace: tool.schema.string().optional().describe("Optional namespace to limit search"),
        },
        async execute(args: any) {
          try {
            const searchPattern = args.namespace ? `${args.namespace}:${args.pattern}` : args.pattern
            const regex = new RegExp(searchPattern.replace(/\*/g, '.*'))
            
            const results = Array.from(memoryStore.entries())
              .filter(([key]) => regex.test(key))
              .map(([key, memory]) => ({
                key,
                value: memory.value,
                timestamp: memory.timestamp,
                namespace: memory.namespace,
                age: Date.now() - memory.timestamp
              }))
            
            return JSON.stringify({
              pattern: searchPattern,
              count: results.length,
              results: results
            }, null, 2)
          } catch (error: any) {
            return `❌ Error searching memory: ${error.message}`
          }
        },
      }),

      // List all memory keys
      memory_list: tool({
        description: "List all memory keys, optionally filtered by namespace",
        args: {
          namespace: tool.schema.string().optional().describe("Optional namespace to filter"),
        },
        async execute(args: any) {
          try {
            const entries = Array.from(memoryStore.entries())
              .filter(([, memory]) => !args.namespace || memory.namespace === args.namespace)
            
            return JSON.stringify({
              namespace: args.namespace || 'all',
              count: entries.length,
              keys: entries.map(([key, memory]) => ({
                key,
                namespace: memory.namespace,
                timestamp: memory.timestamp,
                age: Date.now() - memory.timestamp
              }))
            }, null, 2)
          } catch (error: any) {
            return `❌ Error listing memory: ${error.message}`
          }
        },
      }),

      // Delete memory
      memory_delete: tool({
        description: "Delete a memory entry",
        args: {
          key: tool.schema.string().describe("Memory key to delete"),
          namespace: tool.schema.string().optional().describe("Optional namespace"),
        },
        async execute(args: any) {
          try {
            const fullKey = args.namespace ? `${args.namespace}:${args.key}` : args.key
            const deleted = memoryStore.delete(fullKey)
            
            if (deleted) {
              return `✅ Deleted memory: ${fullKey}`
            } else {
              return `❌ Memory not found: ${fullKey}`
            }
          } catch (error: any) {
            return `❌ Error deleting memory: ${error.message}`
          }
        },
      }),

      // Clear all memory or specific namespace
      memory_clear: tool({
        description: "Clear all memory or specific namespace",
        args: {
          namespace: tool.schema.string().optional().describe("Optional namespace to clear"),
          confirm: tool.schema.boolean().describe("Confirmation required for clearing all memory"),
        },
        async execute(args: any) {
          try {
            if (!args.namespace && !args.confirm) {
              return `❌ Confirmation required. Set confirm: true to clear all memory.`
            }
            
            if (args.namespace) {
              // Clear specific namespace
              const keysToDelete = Array.from(memoryStore.entries())
                .filter(([, memory]) => memory.namespace === args.namespace)
                .map(([key]) => key)
              
              keysToDelete.forEach(key => memoryStore.delete(key))
              return `✅ Cleared ${keysToDelete.length} memories from namespace: ${args.namespace}`
            } else {
              // Clear all memory
              const count = memoryStore.size
              memoryStore.clear()
              return `✅ Cleared all ${count} memory entries`
            }
          } catch (error: any) {
            return `❌ Error clearing memory: ${error.message}`
          }
        },
      }),
    },
  }
}