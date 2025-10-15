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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const fs = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// Static list of known rules
const KNOWN_RULES = {
    ai: ['ai-sdk-integration'],
    backend: ['serverless', 'trpc'],
    core: ['functional', 'general', 'perfect-execution', 'planning-first', 'serena-integration', 'testing', 'typescript'],
    data: ['drizzle', 'id-generation', 'redis'],
    devops: ['biome', 'observability'],
    framework: ['flutter', 'nextjs', 'react', 'sveltekit', 'zustand'],
    misc: ['response-language', 'tool-usage'],
    security: ['security-auth'],
    ui: ['pandacss']
};
const universalDescription = "This MCP server provides access to type-safe development rules for modern web development. Universal core principles: Enforce single responsibility, keep files/functions concise (<300 lines/file, <50 lines/function), use immutability, validate inputs/security at boundaries, plan with peer review/CI, avoid globals/mutables/hardcoded secrets. Tools are registered for each rule file. Each tool is named 'read_[category]_[rule_name]' (e.g., 'read_core_general') and returns the full rule content when called (parameterless). Always call the relevant tool to review the rule before applying it in your work.";
console.log("🚀 Starting Rules MCP Server...");
console.log(`📋 Description: ${universalDescription.substring(0, 100)}...`);
const server = new mcp_js_1.McpServer({
    name: "rules-mcp-server",
    version: "1.0.0",
    description: universalDescription
});
console.log("✅ MCP Server instance created");
// Function to get rule content from local docs folder
async function getRuleContent(category, ruleName) {
    try {
        // Path to the docs folder (same level as dist folder when installed)
        const docsPath = path_1.default.join(__dirname, '..', 'docs', 'rules', category, `${ruleName}.mdc`);
        const content = await fs.readFile(docsPath, 'utf-8');
        return content;
    }
    catch (error) {
        return `Rule not found: ${category}/${ruleName}.mdc`;
    }
}
// Register tools statically
console.log("🔧 Registering tools...");
let toolCount = 0;
Object.entries(KNOWN_RULES).forEach(([category, rules]) => {
    rules.forEach((ruleName) => {
        const toolName = `read_${category}_${ruleName}`;
        const description = `Read the ${ruleName} rule from the ${category} category. IMPORTANT: Before implementing any changes or code related to this rule, always review the full content returned by this tool to ensure compliance. If you do not remember the details, call this tool first and read the content before proceeding.`;
        server.registerTool(toolName, {
            title: `Read ${ruleName} Rule (${category})`,
            description: description,
            inputSchema: zod_1.z.object({})
        }, async (args, extra) => {
            console.log(`📖 Tool called: ${toolName}`);
            try {
                const content = await getRuleContent(category, ruleName);
                console.log(`✅ Successfully loaded rule: ${category}/${ruleName} (${content.length} chars)`);
                return {
                    content: [{
                            type: "text",
                            text: content
                        }]
                };
            }
            catch (err) {
                console.error(`❌ Error loading rule: ${category}/${ruleName}: ${err.message}`);
                return {
                    content: [{
                            type: "text",
                            text: `Error loading rule: ${category}/${ruleName}: ${err.message}`
                        }],
                    isError: true
                };
            }
        });
        toolCount++;
        console.log(`✅ Registered tool: ${toolName}`);
    });
});
console.log(`🎉 Total tools registered: ${toolCount}`);
console.log("🚀 Rules MCP Server ready!");
exports.default = server;
