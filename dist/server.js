import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs/promises";
import fsSync from "fs";
import path from "path";
// Dynamically get categories
const rulesDir = path.join(process.cwd(), "docs/rules");
const categories = fsSync.readdirSync(rulesDir).filter(dir => fsSync.statSync(path.join(rulesDir, dir)).isDirectory());
// Function to extract description from frontmatter
function extractDescription(fileContent) {
    const frontmatterMatch = fileContent.match(/---\s*\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const descriptionMatch = frontmatter.match(/description:\s*(.+)/);
        return descriptionMatch ? descriptionMatch[1].trim() : 'A development rule';
    }
    return 'A development rule';
}
// Build universal description from core rules
let universalDescription = "This MCP server provides access to type-safe development rules for modern web development. Universal core principles: ";
const coreDir = path.join(rulesDir, "core");
if (fsSync.existsSync(coreDir)) {
    const coreFiles = fsSync.readdirSync(coreDir).filter(f => f.endsWith('.mdc'));
    const coreSummaries = coreFiles.map(file => {
        const filePath = path.join(coreDir, file);
        const fileContent = fsSync.readFileSync(filePath, "utf-8");
        return extractDescription(fileContent);
    });
    universalDescription += coreSummaries.join('; ') + ". ";
}
universalDescription += "General practices: Enforce single responsibility, keep files/functions concise (<300 lines/file, <50 lines/function), use immutability, validate inputs/security at boundaries, plan with peer review/CI, avoid globals/mutables/hardcoded secrets. Tools are dynamically registered for each rule file in docs/rules/. Each tool is named 'read_[category]_[rule_name]' (e.g., 'read_core_general') and returns the full rule content when called (parameterless). Always call the relevant tool to review the rule before applying it in your work.";
const server = new McpServer({
    name: "rules-mcp-server",
    version: "1.0.0",
    description: universalDescription
});
// Dynamically register one tool per .mdc file
categories.forEach((category) => {
    const categoryDir = path.join(rulesDir, category);
    if (!fsSync.existsSync(categoryDir))
        return;
    const files = fsSync.readdirSync(categoryDir).filter(f => f.endsWith('.mdc'));
    files.forEach((file) => {
        const ruleName = file.replace('.mdc', '');
        const toolName = `read_${category}_${ruleName}`;
        const filePath = path.join(categoryDir, file);
        const fileContent = fsSync.readFileSync(filePath, "utf-8");
        const ruleDescription = extractDescription(fileContent);
        const description = `${ruleDescription}. IMPORTANT: Before implementing any changes or code related to this rule, always review the full content returned by this tool to ensure compliance. If you do not remember the details, call this tool first and read the content before proceeding.`;
        server.registerTool(toolName, {
            title: `Read ${ruleName} Rule (${category})`,
            description: description,
            inputSchema: z.object({})
        }, async (args, extra) => {
            try {
                const content = await fs.readFile(filePath, "utf-8");
                return { content: [{ type: "text", text: content }] };
            }
            catch (err) {
                return { content: [{ type: "text", text: `Rule not found: ${category}/${file}` }] };
            }
        });
    });
});
export default server;
