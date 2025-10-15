import path from 'path';
import { readJSONCFile, writeJSONCFile } from './jsonc.js';
/**
 * MCP server configurations
 */
export const MCP_SERVERS = {
    memory: {
        name: 'rules_memory',
        description: 'Rules memory MCP server for agent coordination',
        config: {
            type: 'local',
            command: ['npx', '-y', '@sylphxltd/rules', 'mcp']
        }
    },
    everything: {
        name: 'mcp_everything',
        description: 'MCP Everything server - comprehensive tool collection',
        config: {
            type: 'local',
            command: ['npx', '-y', '@modelcontextprotocol/server-everything']
        }
    }
};
/**
 * Get the opencode.jsonc file path
 */
function getOpenCodeConfigPath(cwd) {
    return path.join(cwd, 'opencode.jsonc');
}
/**
 * Read the current opencode.jsonc configuration
 */
async function readOpenCodeConfig(cwd) {
    const configPath = getOpenCodeConfigPath(cwd);
    try {
        const { existsSync } = await import('fs');
        if (!existsSync(configPath)) {
            return {};
        }
        return await readJSONCFile(configPath);
    }
    catch (error) {
        console.warn(`Warning: Could not read opencode.jsonc: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return {};
    }
}
/**
 * Write the opencode.jsonc configuration
 */
async function writeOpenCodeConfig(cwd, config) {
    const configPath = getOpenCodeConfigPath(cwd);
    const schema = 'https://opencode.ai/config.json';
    await writeJSONCFile(configPath, config, schema);
}
/**
 * Add MCP servers to the opencode.jsonc configuration
 */
export async function addMCPServers(cwd, serverTypes) {
    const config = await readOpenCodeConfig(cwd);
    // Initialize mcp section if it doesn't exist
    if (!config.mcp) {
        config.mcp = {};
    }
    let addedCount = 0;
    // Add each requested server
    for (const serverType of serverTypes) {
        const server = MCP_SERVERS[serverType];
        if (!server) {
            console.warn(`Warning: Unknown MCP server type: ${serverType}`);
            continue;
        }
        if (config.mcp[server.name]) {
            console.log(`ℹ️  MCP server already exists: ${server.name}`);
        }
        else {
            config.mcp[server.name] = server.config;
            console.log(`📦 Added MCP server: ${server.name} (${server.description})`);
            addedCount++;
        }
    }
    // Write the updated configuration
    await writeOpenCodeConfig(cwd, config);
    console.log(`✅ Updated opencode.jsonc with ${addedCount} new MCP server(s)`);
}
/**
 * Remove MCP servers from the opencode.jsonc configuration
 */
export async function removeMCPServers(cwd, serverTypes) {
    const config = await readOpenCodeConfig(cwd);
    if (!config.mcp) {
        console.log('ℹ️  No MCP servers configured');
        return;
    }
    let removedCount = 0;
    // Remove each requested server
    for (const serverType of serverTypes) {
        const server = MCP_SERVERS[serverType];
        if (!server) {
            console.warn(`Warning: Unknown MCP server type: ${serverType}`);
            continue;
        }
        if (config.mcp[server.name]) {
            delete config.mcp[server.name];
            console.log(`🗑️  Removed MCP server: ${server.name}`);
            removedCount++;
        }
        else {
            console.log(`ℹ️  MCP server not found: ${server.name}`);
        }
    }
    // Remove mcp section if it's empty
    if (Object.keys(config.mcp).length === 0) {
        delete config.mcp;
    }
    // Write the updated configuration
    await writeOpenCodeConfig(cwd, config);
    console.log(`✅ Updated opencode.jsonc (removed ${removedCount} MCP server(s))`);
}
/**
 * List currently configured MCP servers
 */
export async function listMCPServers(cwd) {
    const config = await readOpenCodeConfig(cwd);
    if (!config.mcp || Object.keys(config.mcp).length === 0) {
        console.log('ℹ️  No MCP servers configured');
        return;
    }
    console.log('📋 Currently configured MCP servers:');
    console.log('');
    for (const [name, serverConfig] of Object.entries(config.mcp)) {
        const command = serverConfig.command.join(' ');
        console.log(`  • ${name}: ${command}`);
        // Find the server type for additional info
        const serverInfo = Object.values(MCP_SERVERS).find(s => s.name === name);
        if (serverInfo) {
            console.log(`    ${serverInfo.description}`);
        }
        console.log('');
    }
}
/**
 * Parse MCP server types from command line arguments
 */
export function parseMCPServerTypes(args) {
    const servers = [];
    for (const arg of args) {
        if (arg in MCP_SERVERS) {
            servers.push(arg);
        }
        else {
            console.warn(`Warning: Unknown MCP server '${arg}'. Available: ${Object.keys(MCP_SERVERS).join(', ')}`);
        }
    }
    return servers;
}
