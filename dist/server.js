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
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
// Enhanced logging utility
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
// Default configuration
const DEFAULT_CONFIG = {
    name: "rules-mcp-server",
    version: "1.0.0",
    description: "This MCP server provides access to type-safe development rules for modern web development. Universal core principles: Enforce single responsibility, keep files/functions concise (<300 lines/file, <50 lines/function), use immutability, validate inputs/security at boundaries, plan with peer review/CI, avoid globals/mutables/hardcoded secrets. Tools are registered for each rule file. Each tool is named 'read_[category]_[rule_name]' (e.g., 'read_core_general') and returns the full rule content when called (parameterless). Always call the relevant tool to review the rule before applying it in your work.",
    enableCaching: true,
    cacheTimeout: 300000 // 5 minutes
};
// Enhanced rule discovery with fallback paths
class RuleDiscovery {
    config;
    static instance;
    ruleCache = new Map();
    availableRules = new Map();
    docsPaths = [];
    constructor(config) {
        this.config = config;
        this.initializePaths();
    }
    static getInstance(config) {
        if (!RuleDiscovery.instance) {
            RuleDiscovery.instance = new RuleDiscovery(config || DEFAULT_CONFIG);
        }
        return RuleDiscovery.instance;
    }
    initializePaths() {
        const baseDir = __dirname;
        this.docsPaths = [
            path.join(baseDir, '..', 'docs', 'archived', 'old_rules'),
            path.join(baseDir, '..', 'docs', 'rules'),
            path.join(process.cwd(), 'docs', 'archived', 'old_rules'),
            path.join(process.cwd(), 'docs', 'rules'),
            this.config.docsPath || ''
        ].filter(Boolean);
    }
    async discoverRules() {
        Logger.info("Discovering available rules...");
        for (const docsPath of this.docsPaths) {
            try {
                await fs.access(docsPath);
                Logger.debug(`Checking docs path: ${docsPath}`);
                const categories = await fs.readdir(docsPath, { withFileTypes: true });
                for (const category of categories) {
                    if (category.isDirectory()) {
                        const categoryPath = path.join(docsPath, category.name);
                        const rules = await this.scanCategory(categoryPath);
                        if (rules.length > 0) {
                            const existingRules = this.availableRules.get(category.name) || [];
                            const uniqueRules = Array.from(new Set([...existingRules, ...rules]));
                            this.availableRules.set(category.name, uniqueRules);
                            Logger.debug(`Found ${rules.length} rules in category: ${category.name}`);
                        }
                    }
                }
            }
            catch (error) {
                Logger.warn(`Failed to access docs path: ${docsPath}`, error);
            }
        }
        Logger.success(`Rule discovery complete. Found ${this.availableRules.size} categories`);
        return this.availableRules;
    }
    async scanCategory(categoryPath) {
        try {
            const files = await fs.readdir(categoryPath);
            return files
                .filter(file => file.endsWith('.mdc') || file.endsWith('.md'))
                .map(file => file.replace(/\.(mdc|md)$/, ''));
        }
        catch (error) {
            Logger.warn(`Failed to scan category: ${categoryPath}`, error);
            return [];
        }
    }
    async getRuleContent(category, ruleName) {
        const cacheKey = `${category}/${ruleName}`;
        // Check cache first
        if (this.config.enableCaching) {
            const cached = this.ruleCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < (this.config.cacheTimeout || 300000)) {
                Logger.debug(`Cache hit for rule: ${cacheKey}`);
                return cached.content;
            }
        }
        // Try to find and read the rule file
        for (const docsPath of this.docsPaths) {
            const rulePath = path.join(docsPath, category, `${ruleName}.mdc`);
            const fallbackPath = path.join(docsPath, category, `${ruleName}.md`);
            for (const filePath of [rulePath, fallbackPath]) {
                try {
                    await fs.access(filePath);
                    const content = await fs.readFile(filePath, 'utf-8');
                    // Cache the content
                    if (this.config.enableCaching) {
                        this.ruleCache.set(cacheKey, {
                            content,
                            timestamp: Date.now()
                        });
                    }
                    Logger.debug(`Successfully loaded rule: ${cacheKey} from ${filePath}`);
                    return content;
                }
                catch (error) {
                    Logger.debug(`Rule not found at: ${filePath}`);
                }
            }
        }
        // Rule not found - return helpful error message
        const availableRules = this.availableRules.get(category) || [];
        const suggestions = availableRules.length > 0
            ? `\nAvailable rules in '${category}': ${availableRules.join(', ')}`
            : `\nNo rules found in category '${category}'`;
        return `Rule not found: ${category}/${ruleName}${suggestions}`;
    }
    getAvailableRules() {
        return new Map(this.availableRules);
    }
    clearCache() {
        this.ruleCache.clear();
        Logger.info("Rule cache cleared");
    }
}
// Enhanced error handling wrapper
function withErrorHandling(fn, context) {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            Logger.error(`Error in ${context}`, error);
            throw error;
        }
    };
}
// Initialize server with enhanced configuration
Logger.info("🚀 Starting Rules MCP Server...");
Logger.info(`📋 Description: ${DEFAULT_CONFIG.description.substring(0, 100)}...`);
const server = new mcp_js_1.McpServer({
    name: DEFAULT_CONFIG.name,
    version: DEFAULT_CONFIG.version,
    description: DEFAULT_CONFIG.description
});
Logger.success("✅ MCP Server instance created");
// Initialize rule discovery
const ruleDiscovery = RuleDiscovery.getInstance(DEFAULT_CONFIG);
// Enhanced tool registration with error recovery
async function registerTools() {
    Logger.info("🔧 Registering tools...");
    try {
        const availableRules = await ruleDiscovery.discoverRules();
        let toolCount = 0;
        let errorCount = 0;
        for (const [category, rules] of Array.from(availableRules.entries())) {
            for (const ruleName of rules) {
                try {
                    const toolName = `read_${category}_${ruleName}`;
                    const description = `Read the ${ruleName} rule from the ${category} category. IMPORTANT: Before implementing any changes or code related to this rule, always review the full content returned by this tool to ensure compliance. If you do not remember the details, call this tool first and read the content before proceeding.`;
                    server.registerTool(toolName, {
                        title: `Read ${ruleName} Rule (${category})`,
                        description: description,
                        inputSchema: zod_1.z.object({})
                    }, withErrorHandling(async (args, extra) => {
                        Logger.info(`📖 Tool called: ${toolName}`);
                        const content = await ruleDiscovery.getRuleContent(category, ruleName);
                        if (content.startsWith('Rule not found:')) {
                            Logger.warn(`Rule not found: ${category}/${ruleName}`);
                            return {
                                content: [{
                                        type: "text",
                                        text: content
                                    }],
                                isError: true
                            };
                        }
                        Logger.success(`Successfully loaded rule: ${category}/${ruleName} (${content.length} chars)`);
                        return {
                            content: [{
                                    type: "text",
                                    text: content
                                }]
                        };
                    }, `tool execution for ${toolName}`));
                    toolCount++;
                    Logger.debug(`✅ Registered tool: ${toolName}`);
                }
                catch (error) {
                    errorCount++;
                    Logger.error(`Failed to register tool: read_${category}_${ruleName}`, error);
                }
            }
        }
        Logger.success(`🎉 Tool registration complete: ${toolCount} tools registered, ${errorCount} errors`);
        // Register utility tools
        await registerUtilityTools();
    }
    catch (error) {
        Logger.error("Critical error during tool registration", error);
        throw error;
    }
}
// Register utility tools for server management
async function registerUtilityTools() {
    Logger.info("🔧 Registering utility tools...");
    // Tool to list all available rules
    server.registerTool("list_rules", {
        title: "List All Available Rules",
        description: "List all available rule categories and their rules",
        inputSchema: zod_1.z.object({})
    }, withErrorHandling(async () => {
        Logger.info("📋 Tool called: list_rules");
        const rules = ruleDiscovery.getAvailableRules();
        let output = "Available Rules:\n\n";
        for (const [category, ruleList] of Array.from(rules.entries())) {
            output += `📁 ${category}:\n`;
            ruleList.forEach(rule => {
                output += `  • ${rule}\n`;
            });
            output += "\n";
        }
        return {
            content: [{
                    type: "text",
                    text: output
                }]
        };
    }, "list_rules tool"));
    // Tool to clear cache
    server.registerTool("clear_cache", {
        title: "Clear Rule Cache",
        description: "Clear the internal rule cache to force fresh loading",
        inputSchema: zod_1.z.object({})
    }, withErrorHandling(async () => {
        Logger.info("🗑️  Tool called: clear_cache");
        ruleDiscovery.clearCache();
        return {
            content: [{
                    type: "text",
                    text: "Rule cache cleared successfully"
                }]
        };
    }, "clear_cache tool"));
    Logger.success("✅ Utility tools registered");
}
// Graceful shutdown handling
process.on('SIGINT', () => {
    Logger.info("🛑 Received SIGINT, shutting down gracefully...");
    process.exit(0);
});
process.on('SIGTERM', () => {
    Logger.info("🛑 Received SIGTERM, shutting down gracefully...");
    process.exit(0);
});
// Unhandled error handling
process.on('uncaughtException', (error) => {
    Logger.error("Uncaught Exception", error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    Logger.error("Unhandled Rejection", reason);
    process.exit(1);
});
// Initialize the server
registerTools()
    .then(() => {
    Logger.success("🚀 Rules MCP Server ready!");
})
    .catch((error) => {
    Logger.error("Failed to initialize server", error);
    process.exit(1);
});
exports.default = server;
