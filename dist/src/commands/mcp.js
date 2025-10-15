"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpCommand = void 0;
const error_handler_1 = require("../utils/error-handler");
async function startMCPServer() {
    console.log('🔌 Starting MCP server transport...');
    try {
        const { StdioServerTransport } = await Promise.resolve().then(() => __importStar(require('@modelcontextprotocol/sdk/server/stdio')));
        const server = (await Promise.resolve().then(() => __importStar(require('../../server')))).default;
        const transport = new StdioServerTransport();
        console.log('🔗 Connecting server to transport...');
        await server.connect(transport);
        console.log('✨ MCP server connected and running');
        process.stdin.resume();
    }
    catch (error) {
        throw new error_handler_1.CLIError(`Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`, 'MCP_SERVER_ERROR');
    }
}
exports.mcpCommand = {
    name: 'mcp',
    description: 'Start the MCP server',
    options: [],
    handler: startMCPServer
};
