#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from 'fs/promises';
import * as path from 'path';
class MemoryStorage {
    data = new Map();
    memoryDir;
    filePath;
    constructor() {
        this.memoryDir = path.join(process.cwd(), '.memory');
        this.filePath = path.join(this.memoryDir, 'memory.json');
        // Ensure .memory directory exists
        fs.mkdir(this.memoryDir, { recursive: true }).catch(() => { });
        // Load existing data
        this.loadData();
    }
    getFullKey(key, namespace) {
        return `${namespace}:${key}`;
    }
    async loadData() {
        try {
            const data = await fs.readFile(this.filePath, 'utf8');
            const parsed = JSON.parse(data);
            this.data = new Map(Object.entries(parsed));
        }
        catch {
            // File doesn't exist or is invalid, start with empty storage
            this.data = new Map();
        }
    }
    async saveData() {
        try {
            const data = Object.fromEntries(this.data);
            await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
        }
        catch (error) {
            console.warn('Warning: Could not save memory data:', error);
        }
    }
    set(key, value, namespace = 'default') {
        const fullKey = this.getFullKey(key, namespace);
        const now = new Date().toISOString();
        const timestamp = Date.now();
        const existing = this.data.get(fullKey);
        this.data.set(fullKey, {
            key,
            namespace,
            value,
            timestamp,
            created_at: existing?.created_at || now,
            updated_at: now
        });
        // Save asynchronously (don't await to avoid blocking)
        this.saveData().catch(() => { });
    }
    get(key, namespace = 'default') {
        const fullKey = this.getFullKey(key, namespace);
        return this.data.get(fullKey) || null;
    }
    search(pattern, namespace) {
        const searchPattern = pattern.replace(/\*/g, '.*');
        const regex = new RegExp(searchPattern);
        const results = [];
        for (const entry of this.data.values()) {
            if (namespace && entry.namespace !== namespace) {
                continue;
            }
            if (regex.test(entry.key)) {
                results.push(entry);
            }
        }
        return results.sort((a, b) => b.timestamp - a.timestamp);
    }
    list(namespace) {
        const results = [];
        for (const entry of this.data.values()) {
            if (namespace && entry.namespace !== namespace) {
                continue;
            }
            results.push(entry);
        }
        return results.sort((a, b) => b.timestamp - a.timestamp);
    }
    delete(key, namespace = 'default') {
        const fullKey = this.getFullKey(key, namespace);
        const deleted = this.data.delete(fullKey);
        if (deleted) {
            this.saveData().catch(() => { });
        }
        return deleted;
    }
    clear(namespace) {
        let count = 0;
        if (namespace) {
            const keysToDelete = [];
            for (const [fullKey, entry] of this.data.entries()) {
                if (entry.namespace === namespace) {
                    keysToDelete.push(fullKey);
                }
            }
            for (const key of keysToDelete) {
                this.data.delete(key);
                count++;
            }
        }
        else {
            count = this.data.size;
            this.data.clear();
        }
        if (count > 0) {
            this.saveData().catch(() => { });
        }
        return count;
    }
    getStats() {
        const entries = Array.from(this.data.values());
        const namespaces = [...new Set(entries.map(entry => entry.namespace))];
        const namespaceStats = namespaces.map(ns => ({
            namespace: ns,
            count: entries.filter(entry => entry.namespace === ns).length
        }));
        const timestamps = entries.map(entry => entry.timestamp);
        const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
        const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;
        return {
            total_entries: entries.length,
            namespaces: namespaceStats,
            oldest_entry: oldestEntry,
            newest_entry: newestEntry
        };
    }
}
// ============================================================================
// LOGGER
// ============================================================================
class Logger {
    static logLevel = process.env.LOG_LEVEL || 'info';
    static info(message, ...args) {
        if (['info', 'debug'].includes(this.logLevel)) {
            console.log(`ℹ️  ${message}`, ...args);
        }
    }
    static debug(message, ...args) {
        if (this.logLevel === 'debug') {
            console.log(`🐛 ${message}`, ...args);
        }
    }
    static warn(message, ...args) {
        console.warn(`⚠️  ${message}`, ...args);
    }
    static error(message, error) {
        console.error(`❌ ${message}`);
        if (error) {
            console.error(`   Error details:`, error instanceof Error ? error.message : error);
            if (error instanceof Error && error.stack) {
                console.error(`   Stack trace:`, error.stack);
            }
        }
    }
    static success(message, ...args) {
        console.log(`✅ ${message}`, ...args);
    }
}
// ============================================================================
// MCP SERVER SETUP
// ============================================================================
const DEFAULT_CONFIG = {
    name: "memory-mcp-server",
    version: "1.0.0",
    description: "Persistent memory storage server for agent coordination using JSON file storage. Provides tools for storing, retrieving, searching, and managing memory entries with namespace support and full persistence."
};
Logger.info("🚀 Starting Memory MCP Server...");
Logger.info(`📋 Description: ${DEFAULT_CONFIG.description.substring(0, 100)}...`);
const server = new McpServer({
    name: DEFAULT_CONFIG.name,
    version: DEFAULT_CONFIG.version,
    description: DEFAULT_CONFIG.description
});
// Initialize memory storage
const memoryStorage = new MemoryStorage();
Logger.success("✅ Memory storage initialized");
// ============================================================================
// TOOL REGISTRATION
// ============================================================================
// Store a value in memory
server.registerTool("memory_set", {
    title: "Store Memory",
    description: "Store a value in persistent memory for agent coordination",
    inputSchema: z.object({
        key: z.string().describe("Memory key (e.g., 'swarm/coder/status')"),
        value: z.string().describe("Value to store (will be JSON stringified)"),
        namespace: z.string().optional().describe("Optional namespace for organization")
    })
}, async (args, extra) => {
    try {
        const { key, value, namespace = 'default' } = args;
        const parsedValue = JSON.parse(value);
        memoryStorage.set(key, parsedValue, namespace);
        Logger.info(`Stored memory: ${namespace}:${key}`);
        return {
            content: [{
                    type: "text",
                    text: `✅ Stored memory: ${namespace}:${key}`
                }]
        };
    }
    catch (error) {
        Logger.error("Error storing memory", error);
        return {
            content: [{
                    type: "text",
                    text: `❌ Error storing memory: ${error.message}`
                }],
            isError: true
        };
    }
});
// Retrieve a value from memory
server.registerTool("memory_get", {
    title: "Retrieve Memory",
    description: "Retrieve a value from persistent memory",
    inputSchema: z.object({
        key: z.string().describe("Memory key to retrieve"),
        namespace: z.string().optional().describe("Optional namespace")
    })
}, async (args, extra) => {
    try {
        const { key, namespace = 'default' } = args;
        const memory = memoryStorage.get(key, namespace);
        if (!memory) {
            return {
                content: [{
                        type: "text",
                        text: `❌ Memory not found: ${namespace}:${key}`
                    }],
                isError: true
            };
        }
        const age = Date.now() - memory.timestamp;
        Logger.info(`Retrieved memory: ${namespace}:${key}`);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        key: `${namespace}:${key}`,
                        value: memory.value,
                        timestamp: memory.timestamp,
                        created_at: memory.created_at,
                        updated_at: memory.updated_at,
                        namespace: memory.namespace,
                        age: age
                    }, null, 2)
                }]
        };
    }
    catch (error) {
        Logger.error("Error retrieving memory", error);
        return {
            content: [{
                    type: "text",
                    text: `❌ Error retrieving memory: ${error.message}`
                }],
            isError: true
        };
    }
});
// Search memory keys by pattern
server.registerTool("memory_search", {
    title: "Search Memory",
    description: "Search memory keys by pattern with optional namespace filtering",
    inputSchema: z.object({
        pattern: z.string().describe("Search pattern (supports * wildcards)"),
        namespace: z.string().optional().describe("Optional namespace to limit search")
    })
}, async (args, extra) => {
    try {
        const { pattern, namespace } = args;
        const results = memoryStorage.search(pattern, namespace);
        const processedResults = results.map(memory => ({
            key: `${memory.namespace}:${memory.key}`,
            value: memory.value,
            timestamp: memory.timestamp,
            created_at: memory.created_at,
            updated_at: memory.updated_at,
            namespace: memory.namespace,
            age: Date.now() - memory.timestamp
        }));
        Logger.info(`Searched memory: ${pattern} (${results.length} results)`);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        pattern: pattern,
                        namespace: namespace || 'all',
                        count: results.length,
                        results: processedResults
                    }, null, 2)
                }]
        };
    }
    catch (error) {
        Logger.error("Error searching memory", error);
        return {
            content: [{
                    type: "text",
                    text: `❌ Error searching memory: ${error.message}`
                }],
            isError: true
        };
    }
});
// List all memory keys
server.registerTool("memory_list", {
    title: "List Memory",
    description: "List all memory keys, optionally filtered by namespace",
    inputSchema: z.object({
        namespace: z.string().optional().describe("Optional namespace to filter")
    })
}, async (args, extra) => {
    try {
        const { namespace } = args;
        const entries = memoryStorage.list(namespace);
        const processedEntries = entries.map(memory => ({
            key: `${memory.namespace}:${memory.key}`,
            namespace: memory.namespace,
            timestamp: memory.timestamp,
            created_at: memory.created_at,
            updated_at: memory.updated_at,
            age: Date.now() - memory.timestamp
        }));
        Logger.info(`Listed memory: ${namespace || 'all'} (${entries.length} entries)`);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        namespace: namespace || 'all',
                        count: entries.length,
                        keys: processedEntries
                    }, null, 2)
                }]
        };
    }
    catch (error) {
        Logger.error("Error listing memory", error);
        return {
            content: [{
                    type: "text",
                    text: `❌ Error listing memory: ${error.message}`
                }],
            isError: true
        };
    }
});
// Delete memory
server.registerTool("memory_delete", {
    title: "Delete Memory",
    description: "Delete a specific memory entry",
    inputSchema: z.object({
        key: z.string().describe("Memory key to delete"),
        namespace: z.string().optional().describe("Optional namespace")
    })
}, async (args, extra) => {
    try {
        const { key, namespace = 'default' } = args;
        const deleted = memoryStorage.delete(key, namespace);
        if (deleted) {
            Logger.info(`Deleted memory: ${namespace}:${key}`);
            return {
                content: [{
                        type: "text",
                        text: `✅ Deleted memory: ${namespace}:${key}`
                    }]
            };
        }
        else {
            return {
                content: [{
                        type: "text",
                        text: `❌ Memory not found: ${namespace}:${key}`
                    }],
                isError: true
            };
        }
    }
    catch (error) {
        Logger.error("Error deleting memory", error);
        return {
            content: [{
                    type: "text",
                    text: `❌ Error deleting memory: ${error.message}`
                }],
            isError: true
        };
    }
});
// Clear all memory or specific namespace
server.registerTool("memory_clear", {
    title: "Clear Memory",
    description: "Clear all memory or specific namespace",
    inputSchema: z.object({
        namespace: z.string().optional().describe("Optional namespace to clear"),
        confirm: z.boolean().describe("Confirmation required for clearing all memory")
    })
}, async (args, extra) => {
    try {
        const { namespace, confirm } = args;
        if (!namespace && !confirm) {
            return {
                content: [{
                        type: "text",
                        text: `❌ Confirmation required. Set confirm: true to clear all memory.`
                    }],
                isError: true
            };
        }
        const count = memoryStorage.clear(namespace);
        if (namespace) {
            Logger.info(`Cleared memory namespace: ${namespace} (${count} entries)`);
            return {
                content: [{
                        type: "text",
                        text: `✅ Cleared ${count} memories from namespace: ${namespace}`
                    }]
            };
        }
        else {
            Logger.info(`Cleared all memory (${count} entries)`);
            return {
                content: [{
                        type: "text",
                        text: `✅ Cleared all ${count} memory entries`
                    }]
            };
        }
    }
    catch (error) {
        Logger.error("Error clearing memory", error);
        return {
            content: [{
                    type: "text",
                    text: `❌ Error clearing memory: ${error.message}`
                }],
            isError: true
        };
    }
});
// Get database statistics
server.registerTool("memory_stats", {
    title: "Memory Statistics",
    description: "Get statistics about the memory storage",
    inputSchema: z.object({})
}, async (args, extra) => {
    try {
        const stats = memoryStorage.getStats();
        Logger.info(`Retrieved memory statistics`);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        ...stats,
                        database_path: path.join(process.cwd(), '.memory', 'memory.json'),
                        age_days: stats.oldest_entry > 0 ? Math.floor((Date.now() - stats.oldest_entry) / (1000 * 60 * 60 * 24)) : 0
                    }, null, 2)
                }]
        };
    }
    catch (error) {
        Logger.error("Error getting memory statistics", error);
        return {
            content: [{
                    type: "text",
                    text: `❌ Error getting memory statistics: ${error.message}`
                }],
            isError: true
        };
    }
});
// ============================================================================
// ERROR HANDLING AND GRACEFUL SHUTDOWN
// ============================================================================
process.on('SIGINT', () => {
    Logger.info("🛑 Received SIGINT, shutting down gracefully...");
    process.exit(0);
});
process.on('SIGTERM', () => {
    Logger.info("🛑 Received SIGTERM, shutting down gracefully...");
    process.exit(0);
});
process.on('uncaughtException', (error) => {
    Logger.error("Uncaught Exception", error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    Logger.error("Unhandled Rejection", reason);
    process.exit(1);
});
// ============================================================================
// START SERVER
// ============================================================================
Logger.success("🚀 Memory MCP Server ready!");
Logger.info(`📍 Storage: ${path.join(process.cwd(), '.memory', 'memory.json')}`);
Logger.info(`🔧 Available tools: memory_set, memory_get, memory_search, memory_list, memory_delete, memory_clear, memory_stats`);
// Start the server with stdio transport
async function startServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    Logger.info("🔗 Server connected via stdio transport");
}
// Start the server
startServer().catch((error) => {
    Logger.error("Failed to start server", error);
    process.exit(1);
});
export default server;
