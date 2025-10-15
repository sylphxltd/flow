import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced logging utility
class Logger {
  private static logLevel = process.env.LOG_LEVEL || 'info';
  
  static info(message: string, ...args: any[]) {
    if (['info', 'debug'].includes(this.logLevel)) {
      console.log(`ℹ️  ${message}`, ...args);
    }
  }
  
  static debug(message: string, ...args: any[]) {
    if (this.logLevel === 'debug') {
      console.log(`🐛 ${message}`, ...args);
    }
  }
  
  static warn(message: string, ...args: any[]) {
    console.warn(`⚠️  ${message}`, ...args);
  }
  
  static error(message: string, error?: Error | any) {
    console.error(`❌ ${message}`);
    if (error) {
      console.error(`   Error details:`, error instanceof Error ? error.message : error);
      if (error instanceof Error && error.stack) {
        console.error(`   Stack trace:`, error.stack);
      }
    }
  }
  
  static success(message: string, ...args: any[]) {
    console.log(`✅ ${message}`, ...args);
  }
}

// Configuration interface
interface ServerConfig {
  name: string;
  version: string;
  description: string;
  docsPath?: string;
  enableCaching?: boolean;
  cacheTimeout?: number;
}

// Default configuration
const DEFAULT_CONFIG: ServerConfig = {
  name: "rules-mcp-server",
  version: "1.0.0",
  description: "This MCP server provides access to type-safe development rules for modern web development. Universal core principles: Enforce single responsibility, keep files/functions concise (<300 lines/file, <50 lines/function), use immutability, validate inputs/security at boundaries, plan with peer review/CI, avoid globals/mutables/hardcoded secrets. Tools are registered for each rule file. Each tool is named 'read_[category]_[rule_name]' (e.g., 'read_core_general') and returns the full rule content when called (parameterless). Always call the relevant tool to review the rule before applying it in your work.",
  enableCaching: true,
  cacheTimeout: 300000 // 5 minutes
};

// Enhanced rule discovery with fallback paths
class RuleDiscovery {
  private static instance: RuleDiscovery;
  private ruleCache = new Map<string, { content: string; timestamp: number }>();
  private availableRules = new Map<string, string[]>();
  private docsPaths: string[] = [];
  
  private constructor(private config: ServerConfig) {
    this.initializePaths();
  }
  
  static getInstance(config?: ServerConfig): RuleDiscovery {
    if (!RuleDiscovery.instance) {
      RuleDiscovery.instance = new RuleDiscovery(config || DEFAULT_CONFIG);
    }
    return RuleDiscovery.instance;
  }
  
  private initializePaths() {
    const baseDir = __dirname;
    this.docsPaths = [
      path.join(baseDir, '..', 'docs', 'archived', 'old_rules'),
      path.join(baseDir, '..', 'docs', 'rules'),
      path.join(process.cwd(), 'docs', 'archived', 'old_rules'),
      path.join(process.cwd(), 'docs', 'rules'),
      this.config.docsPath || ''
    ].filter(Boolean);
  }
  
  async discoverRules(): Promise<Map<string, string[]>> {
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
      } catch (error) {
        Logger.warn(`Failed to access docs path: ${docsPath}`, error);
      }
    }
    
    Logger.success(`Rule discovery complete. Found ${this.availableRules.size} categories`);
    return this.availableRules;
  }
  
  private async scanCategory(categoryPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(categoryPath);
      return files
        .filter(file => file.endsWith('.mdc') || file.endsWith('.md'))
        .map(file => file.replace(/\.(mdc|md)$/, ''));
    } catch (error) {
      Logger.warn(`Failed to scan category: ${categoryPath}`, error);
      return [];
    }
  }
  
  async getRuleContent(category: string, ruleName: string): Promise<string> {
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
        } catch (error) {
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
  
  getAvailableRules(): Map<string, string[]> {
    return new Map(this.availableRules);
  }
  
  clearCache() {
    this.ruleCache.clear();
    Logger.info("Rule cache cleared");
  }
}

// Enhanced error handling wrapper
function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      Logger.error(`Error in ${context}`, error);
      throw error;
    }
  };
}

// Initialize server with enhanced configuration
Logger.info("🚀 Starting Rules MCP Server...");
Logger.info(`📋 Description: ${DEFAULT_CONFIG.description.substring(0, 100)}...`);

const server = new McpServer({
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

          server.registerTool(
            toolName,
            {
              title: `Read ${ruleName} Rule (${category})`,
              description: description,
              inputSchema: z.object({}) as any
            },
            withErrorHandling(async (args: any, extra: any) => {
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
            }, `tool execution for ${toolName}`)
          );
          
          toolCount++;
          Logger.debug(`✅ Registered tool: ${toolName}`);
        } catch (error) {
          errorCount++;
          Logger.error(`Failed to register tool: read_${category}_${ruleName}`, error);
        }
      }
    }
    
    Logger.success(`🎉 Tool registration complete: ${toolCount} tools registered, ${errorCount} errors`);
    
    // Register utility tools
    await registerUtilityTools();
    
  } catch (error) {
    Logger.error("Critical error during tool registration", error);
    throw error;
  }
}

// Register utility tools for server management
async function registerUtilityTools() {
  Logger.info("🔧 Registering utility tools...");
  
  // Tool to list all available rules
  server.registerTool(
    "list_rules",
    {
      title: "List All Available Rules",
      description: "List all available rule categories and their rules",
      inputSchema: z.object({}) as any
    },
    withErrorHandling(async () => {
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
    }, "list_rules tool")
  );
  
  // Tool to clear cache
  server.registerTool(
    "clear_cache",
    {
      title: "Clear Rule Cache",
      description: "Clear the internal rule cache to force fresh loading",
      inputSchema: z.object({}) as any
    },
    withErrorHandling(async () => {
      Logger.info("🗑️  Tool called: clear_cache");
      ruleDiscovery.clearCache();
      return {
        content: [{
          type: "text",
          text: "Rule cache cleared successfully"
        }]
      };
    }, "clear_cache tool")
  );
  
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

export default server;