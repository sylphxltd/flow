#!/usr/bin/env node
import {
  LibSQLMemoryStorage
} from "./chunk-YAGG6WK2.js";

// src/servers/sylphx-flow-mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// src/tools/memory-tools.ts
import { z } from "zod";
var memoryStorage = new LibSQLMemoryStorage();
var Logger = {
  info: (message) => console.error(`[INFO] ${message}`),
  success: (message) => console.error(`[SUCCESS] ${message}`),
  error: (message, error) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  }
};
async function memorySet(args) {
  try {
    const { key, value, namespace = "default" } = args;
    const parsedValue = JSON.parse(value);
    await memoryStorage.set(key, parsedValue, namespace);
    Logger.info(`Stored memory: ${namespace}:${key}`);
    return {
      content: [
        {
          type: "text",
          text: `\u2705 Stored memory: ${namespace}:${key}`
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error("Error storing memory", error);
    return {
      content: [
        {
          type: "text",
          text: `\u274C Error storing memory: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
async function memoryGet(args) {
  try {
    const { key, namespace = "default" } = args;
    const memory = await memoryStorage.get(key, namespace);
    if (!memory) {
      return {
        content: [
          {
            type: "text",
            text: `\u274C Memory not found: ${namespace}:${key}`
          }
        ],
        isError: true
      };
    }
    const age = Date.now() - memory.timestamp;
    Logger.info(`Retrieved memory: ${namespace}:${key}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              key: `${namespace}:${key}`,
              value: memory.value,
              namespace: memory.namespace,
              timestamp: memory.timestamp,
              created_at: memory.created_at,
              updated_at: memory.updated_at,
              age_seconds: Math.floor(age / 1e3)
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error("Error retrieving memory", error);
    return {
      content: [
        {
          type: "text",
          text: `\u274C Error retrieving memory: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
async function memorySearch(args) {
  try {
    const { pattern, namespace } = args;
    const allEntries = await memoryStorage.getAll();
    const results = allEntries.filter((entry) => {
      const matchesPattern = entry.key.toLowerCase().includes(pattern.toLowerCase()) || entry.namespace.toLowerCase().includes(pattern.toLowerCase()) || JSON.stringify(entry.value).toLowerCase().includes(pattern.toLowerCase());
      const matchesNamespace = !namespace || entry.namespace === namespace;
      return matchesPattern && matchesNamespace;
    });
    Logger.info(`Searched memory: "${pattern}" (${results.length} results)`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              pattern,
              namespace: namespace || "all",
              count: results.length,
              results: results.map((entry) => ({
                key: entry.key,
                namespace: entry.namespace,
                value: entry.value,
                timestamp: entry.timestamp,
                updated_at: entry.updated_at
              }))
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error("Error searching memory", error);
    return {
      content: [
        {
          type: "text",
          text: `\u274C Error searching memory: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
async function memoryList(args) {
  try {
    const { namespace } = args;
    const entries = await memoryStorage.getAll();
    Logger.info(`Listed memory: ${entries.length} entries`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              namespace: namespace || "all",
              count: entries.length,
              entries: entries.map((entry) => ({
                key: entry.key,
                namespace: entry.namespace,
                value: entry.value,
                timestamp: entry.timestamp,
                updated_at: entry.updated_at
              }))
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error("Error listing memory", error);
    return {
      content: [
        {
          type: "text",
          text: `\u274C Error listing memory: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
async function memoryDelete(args) {
  try {
    const { key, namespace = "default" } = args;
    const deleted = await memoryStorage.delete(key, namespace);
    if (!deleted) {
      return {
        content: [
          {
            type: "text",
            text: `\u274C Memory not found: ${namespace}:${key}`
          }
        ],
        isError: true
      };
    }
    Logger.info(`Deleted memory: ${namespace}:${key}`);
    return {
      content: [
        {
          type: "text",
          text: `\u2705 Deleted memory: ${namespace}:${key}`
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error("Error deleting memory", error);
    return {
      content: [
        {
          type: "text",
          text: `\u274C Error deleting memory: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
async function memoryClear(args) {
  try {
    const { namespace } = args;
    await memoryStorage.clear(namespace);
    Logger.info(`Cleared memory: ${namespace || "all"}`);
    return {
      content: [
        {
          type: "text",
          text: `\u2705 Cleared memory: ${namespace || "all namespaces"}`
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error("Error clearing memory", error);
    return {
      content: [
        {
          type: "text",
          text: `\u274C Error clearing memory: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
async function memoryStats() {
  try {
    const stats = await memoryStorage.getStats();
    Logger.info("Retrieved memory stats");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total_entries: stats.totalEntries,
              namespaces: stats.namespaces,
              oldest_entry: stats.oldestEntry,
              newest_entry: stats.newestEntry,
              database_path: ".sylphx-flow/memory.db"
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error("Error getting memory stats", error);
    return {
      content: [
        {
          type: "text",
          text: `\u274C Error getting memory stats: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
function registerMemoryTools(server2) {
  server2.registerTool(
    "memory_set",
    {
      description: "Store a value in persistent memory for agent coordination",
      inputSchema: {
        key: z.string().describe("Memory key (e.g., 'swarm/coder/status')"),
        value: z.string().describe("Value to store (will be JSON stringified)"),
        namespace: z.string().optional().describe("Optional namespace for organization")
      }
    },
    memorySet
  );
  server2.registerTool(
    "memory_get",
    {
      description: "Retrieve a value from persistent memory",
      inputSchema: {
        key: z.string().describe("Memory key to retrieve"),
        namespace: z.string().optional().describe("Optional namespace")
      }
    },
    memoryGet
  );
  server2.registerTool(
    "memory_search",
    {
      description: "Search memory entries by pattern",
      inputSchema: {
        pattern: z.string().describe("Search pattern (matches keys, namespaces, and values)"),
        namespace: z.string().optional().describe("Optional namespace to limit search")
      }
    },
    memorySearch
  );
  server2.registerTool(
    "memory_list",
    {
      description: "List all memory entries",
      inputSchema: {
        namespace: z.string().optional().describe("Optional namespace to filter by")
      }
    },
    memoryList
  );
  server2.registerTool(
    "memory_delete",
    {
      description: "Delete a memory entry",
      inputSchema: {
        key: z.string().describe("Memory key to delete"),
        namespace: z.string().optional().describe("Optional namespace")
      }
    },
    memoryDelete
  );
  server2.registerTool(
    "memory_clear",
    {
      description: "Clear memory entries",
      inputSchema: {
        namespace: z.string().optional().describe("Optional namespace to clear (omits to clear all)")
      }
    },
    memoryClear
  );
  server2.registerTool(
    "memory_stats",
    {
      description: "Get memory storage statistics",
      inputSchema: {}
    },
    memoryStats
  );
}

// src/tools/project-startup-tool.ts
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync as writeFileSync2 } from "fs";
import { join as join2 } from "path";
import { z as z2 } from "zod";

// src/utils/template-engine.ts
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
var TemplateEngine = class {
  templatesDir;
  constructor(templatesDir = "src/templates") {
    this.templatesDir = templatesDir;
  }
  loadTemplate(templateName) {
    const templatePath = join(this.templatesDir, `${templateName}-template.md`);
    return readFileSync(templatePath, "utf8");
  }
  replaceVariables(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      result = result.replace(regex, String(value));
    }
    result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_, condition, content) => {
      const value = data[condition];
      return value && value !== "false" && value !== "0" && value !== "" ? content : "";
    });
    result = result.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (_, arrayName, content) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) {
        return "";
      }
      return array.map((item, index) => {
        let itemContent = content;
        itemContent = itemContent.replace(/{{this}}/g, String(item));
        itemContent = itemContent.replace(/{{@index}}/g, String(index));
        return itemContent;
      }).join("\n");
    });
    return result;
  }
  generateTemplate(templateName, data) {
    const template = this.loadTemplate(templateName);
    return this.replaceVariables(template, data);
  }
  createFile(templateName, data, outputPath) {
    const content = this.generateTemplate(templateName, data);
    writeFileSync(outputPath, content, "utf8");
  }
  generateAllProjectTemplates(projectData) {
    const templates = {};
    const templateNames = ["spec", "progress", "plan", "tasks", "validation", "reviews"];
    for (const templateName of templateNames) {
      templates[templateName] = this.generateTemplate(templateName, projectData);
    }
    return templates;
  }
};

// src/tools/project-startup-tool.ts
var Logger2 = {
  info: (message) => console.error(`[INFO] ${message}`),
  success: (message) => console.error(`[SUCCESS] ${message}`),
  error: (message, error) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  }
};
function generateProjectDetails(projectType, projectName) {
  const descriptions = {
    feature: `New feature implementation for ${projectName}`,
    bugfix: `Bug fix for ${projectName} issue`,
    hotfix: `Critical hotfix for ${projectName}`,
    refactor: `Code refactoring for ${projectName}`,
    migration: `Migration project for ${projectName}`
  };
  const requirements = {
    feature: [
      "Define feature specifications",
      "Implement core functionality",
      "Write comprehensive tests",
      "Update documentation",
      "Code review and validation"
    ],
    bugfix: [
      "Identify root cause",
      "Implement fix",
      "Add regression tests",
      "Verify fix resolves issue",
      "Update documentation if needed"
    ],
    hotfix: [
      "Implement immediate fix",
      "Test critical path",
      "Deploy hotfix",
      "Schedule proper fix follow-up"
    ],
    refactor: [
      "Analyze current code structure",
      "Plan refactoring approach",
      "Implement refactored code",
      "Ensure all tests pass",
      "Update documentation"
    ],
    migration: [
      "Analyze current system",
      "Plan migration strategy",
      "Implement migration code",
      "Test migration process",
      "Deploy and verify"
    ]
  };
  const objectives = {
    feature: `Successfully implement the ${projectName} feature with full functionality and testing`,
    bugfix: `Resolve the ${projectName} issue completely and prevent recurrence`,
    hotfix: `Quickly address critical ${projectName} issue to restore system stability`,
    refactor: `Improve code quality and maintainability for ${projectName}`,
    migration: `Successfully migrate ${projectName} to new system with minimal disruption`
  };
  const scopes = {
    feature: "Implementation of new feature including frontend, backend, tests, and documentation",
    bugfix: "Fix for specific issue including root cause analysis and prevention measures",
    hotfix: "Minimal change to address critical issue with immediate deployment",
    refactor: "Code structure improvements without changing external behavior",
    migration: "Complete migration of existing functionality to new system or platform"
  };
  return {
    description: descriptions[projectType] || `Project for ${projectName}`,
    requirements: requirements[projectType] || [
      "Define requirements",
      "Implement solution",
      "Test and validate"
    ],
    objective: objectives[projectType] || `Complete ${projectName} project successfully`,
    scope: scopes[projectType] || "Project scope to be defined"
  };
}
function runGitCommand(command) {
  try {
    const output = execSync(command, { encoding: "utf8", cwd: process.cwd() });
    return { success: true, output: output.trim(), error: "" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, output: "", error: errorMessage };
  }
}
function ensureDirectoryExists(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    Logger2.info(`Created directory: ${dirPath}`);
  }
}
function createFile(filePath, content) {
  writeFileSync2(filePath, content, "utf8");
  Logger2.info(`Created file: ${filePath}`);
}
function registerProjectStartupTool(server2) {
  server2.registerTool(
    "project_startup",
    {
      description: "Initialize a new project with comprehensive templates and workspace structure",
      inputSchema: {
        project_type: z2.enum(["feature", "bugfix", "hotfix", "refactor", "migration"]).describe("Type of project"),
        project_name: z2.string().describe("Name of the project (use letters, numbers, hyphens, underscores only)"),
        create_branch: z2.boolean().optional().describe("Whether to create a git branch (default: true)")
      }
    },
    projectStartupTool
  );
}
function projectStartupTool(args) {
  try {
    const { project_type, project_name, create_branch = true } = args;
    const generatedDetails = generateProjectDetails(project_type, project_name);
    const { description, requirements, objective, scope } = generatedDetails;
    if (!/^[a-zA-Z0-9-_]+$/.test(project_name)) {
      return {
        content: [
          {
            type: "text",
            text: `\u274C Invalid project name: "${project_name}". Use only letters, numbers, hyphens, and underscores.`
          }
        ],
        isError: true
      };
    }
    const branchName = `${project_type}/${project_name}`;
    const workspaceDir = join2("specs", project_type, project_name);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    Logger2.info(`\u{1F680} Starting project initialization: ${branchName}`);
    let branchResult = { success: true, output: "", error: "" };
    if (create_branch) {
      const currentBranch = runGitCommand("git rev-parse --abbrev-ref HEAD");
      if (currentBranch.success && currentBranch.output !== "main") {
        return {
          content: [
            {
              type: "text",
              text: `\u274C Not on main branch. Current branch: ${currentBranch.output}. Please switch to main first.`
            }
          ],
          isError: true
        };
      }
      branchResult = runGitCommand(`git checkout -b ${branchName}`);
      if (!branchResult.success) {
        return {
          content: [
            {
              type: "text",
              text: `\u274C Failed to create branch "${branchName}": ${branchResult.error}`
            }
          ],
          isError: true
        };
      }
      Logger2.success(`\u2705 Created and checked out branch: ${branchName}`);
    }
    ensureDirectoryExists(workspaceDir);
    const projectData = {
      PROJECT_NAME: project_name,
      PROJECT_TYPE: project_type,
      DESCRIPTION: description,
      REQUIREMENTS: requirements,
      TIMESTAMP: timestamp,
      BRANCH_NAME: branchName,
      // Progress specific
      CURRENT_PHASE: "Phase 1: Requirements Analysis",
      LAST_UPDATED: (/* @__PURE__ */ new Date()).toISOString(),
      NEXT_ACTION: "Complete requirements specification and proceed to Phase 2",
      STATUS: "Not Started",
      // Phase 1-8: Not Started (Phase 1 is current but 0% complete)
      PHASE_1_STATUS: "In Progress",
      PHASE_1_COMPLETE: "0",
      PHASE_1_UPDATED: (/* @__PURE__ */ new Date()).toISOString(),
      PHASE_1_NOTES: "Starting requirements analysis (0% complete)",
      PHASE_2_STATUS: "Not Started",
      PHASE_2_COMPLETE: "0",
      PHASE_2_UPDATED: (/* @__PURE__ */ new Date()).toISOString(),
      PHASE_2_NOTES: "Awaiting research and clarification",
      PHASE_3_STATUS: "Not Started",
      PHASE_3_COMPLETE: "0",
      PHASE_3_UPDATED: (/* @__PURE__ */ new Date()).toISOString(),
      PHASE_3_NOTES: "Awaiting design phase",
      PHASE_4_STATUS: "Not Started",
      PHASE_4_COMPLETE: "0",
      PHASE_4_UPDATED: (/* @__PURE__ */ new Date()).toISOString(),
      PHASE_4_NOTES: "Awaiting task breakdown",
      PHASE_5_STATUS: "Not Started",
      PHASE_5_COMPLETE: "0",
      PHASE_5_UPDATED: (/* @__PURE__ */ new Date()).toISOString(),
      PHASE_5_NOTES: "Awaiting validation",
      PHASE_6_STATUS: "Not Started",
      PHASE_6_COMPLETE: "0",
      PHASE_6_UPDATED: (/* @__PURE__ */ new Date()).toISOString(),
      PHASE_6_NOTES: "Awaiting implementation",
      PHASE_7_STATUS: "Not Started",
      PHASE_7_COMPLETE: "0",
      PHASE_7_UPDATED: (/* @__PURE__ */ new Date()).toISOString(),
      PHASE_7_NOTES: "Awaiting testing and review",
      PHASE_8_STATUS: "Not Started",
      PHASE_8_COMPLETE: "0",
      PHASE_8_UPDATED: (/* @__PURE__ */ new Date()).toISOString(),
      PHASE_8_NOTES: "Awaiting final merge",
      // Plan specific
      OBJECTIVE: objective || `Implement ${project_name}`,
      SCOPE: scope || "To be defined",
      // Tasks specific
      CRITICAL_PATH: "To be defined during task breakdown",
      PARALLEL_OPPORTUNITIES: "To be identified during planning",
      RESOURCE_CONFLICTS: "To be resolved during planning",
      INTEGRATION_POINTS: "To be identified during design",
      // Validation specific
      VALIDATED_BY: "To be assigned",
      VALIDATION_DATE: timestamp,
      OVERALL_STATUS: "Pending",
      // Reviews specific
      REVIEW_PERIOD: `${timestamp} onwards`,
      TOTAL_REVIEWS: "0",
      QUALITY_SCORE: "0",
      REVIEW_DATE: timestamp,
      REVIEWER: "To be assigned",
      REVIEW_SCOPE: "Full implementation review",
      IMPLEMENTATION_STATUS: "Not Started",
      // Validation specific
      VALIDATOR: "To be assigned",
      VALIDATION_SCOPE: "Full project validation",
      REQUIREMENTS_COVERAGE_STATUS: "Pending",
      ACCEPTANCE_CRITERIA_MAPPED: "Pending",
      SUCCESS_CRITERIA_MEASURABLE: "Pending",
      SCOPE_CREEP_PREVENTION: "Pending",
      ARCHITECTURE_ALIGNMENT: "Pending",
      INTEGRATION_POINTS_VERIFIED: "Pending",
      DESIGN_CONFLICTS_RESOLVED: "Pending",
      TECHNICAL_FEASIBILITY: "Pending",
      TASK_COMPLETENESS: "Pending",
      DEPENDENCY_MAPPING_ACCURACY: "Pending",
      RESOURCE_ALLOCATION_ADEQUATE: "Pending",
      CRITICAL_PATH_IDENTIFIED: "Pending",
      TDD_STRATEGY_DEFINED: "Pending",
      // Task verification
      TASK_1_ID: "TASK-001",
      TASK_1_DESC: "To be defined",
      TASK_1_STATUS: "Not Started",
      TASK_1_COMPLETION: "0",
      TASK_1_DELIVERABLE: "To be defined",
      TASK_1_QUALITY: "Pending",
      TASK_2_ID: "TASK-002",
      TASK_2_DESC: "To be defined",
      TASK_2_STATUS: "Not Started",
      TASK_2_COMPLETION: "0",
      TASK_2_DELIVERABLE: "To be defined",
      TASK_2_QUALITY: "Pending",
      TASK_3_ID: "TASK-003",
      TASK_3_DESC: "To be defined",
      TASK_3_STATUS: "Not Started",
      TASK_3_COMPLETION: "0",
      TASK_3_DELIVERABLE: "To be defined",
      TASK_3_QUALITY: "Pending",
      OVERALL_TASK_COMPLETION: "0",
      ALL_TASKS_COMPLETED: "No",
      // Git analysis
      TOTAL_COMMITS: "0",
      COMMITS_PER_TASK: "0",
      COMMIT_QUALITY: "Pending",
      BRANCH_STRATEGY_COMPLIANCE: "Pending"
    };
    const templateEngine = new TemplateEngine();
    const templates = templateEngine.generateAllProjectTemplates(projectData);
    const filesCreated = [];
    for (const [templateName, content] of Object.entries(templates)) {
      const filePath = join2(workspaceDir, `${templateName}.md`);
      createFile(filePath, content);
      filesCreated.push(`${templateName}.md`);
    }
    if (create_branch) {
      const addResult = runGitCommand("git add .");
      const commitResult = runGitCommand(
        `git commit -m "feat(${project_name}): initialize project workspace and comprehensive templates"`
      );
      if (!addResult.success || !commitResult.success) {
        Logger2.error("Warning: Failed to create initial commit");
      } else {
        Logger2.success("\u2705 Created initial commit with project templates");
      }
    }
    Logger2.success(`\u2705 Project "${project_name}" initialized successfully!`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              project: {
                type: project_type,
                name: project_name,
                branch: branchName,
                workspace: workspaceDir,
                description,
                requirements,
                objective,
                scope
              },
              setup: {
                branch_created: create_branch && branchResult.success,
                workspace_created: true,
                templates_created: filesCreated,
                initial_commit: create_branch
              },
              next_steps: [
                `1. Review and update specs/${project_type}/${project_name}/spec.md with detailed requirements`,
                "2. Fill in project-specific data in all template files",
                "3. Proceed with Phase 1: SPECIFY & CLARIFY",
                "4. Follow the workflow in progress.md"
              ]
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger2.error("Error in project startup", error);
    return {
      content: [
        {
          type: "text",
          text: `\u274C Error initializing project: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

// src/tools/time-tools.ts
import { z as z3 } from "zod";
var Logger3 = {
  info: (message) => console.error(`[INFO] ${message}`),
  success: (message) => console.error(`[SUCCESS] ${message}`),
  error: (message, error) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  }
};
function isValidTimezone(timezone) {
  try {
    Intl.DateTimeFormat(void 0, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
function isValidTimeFormat(time) {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}
function getCurrentTime(args) {
  try {
    const { timezone } = args;
    if (!isValidTimezone(timezone)) {
      return {
        content: [
          {
            type: "text",
            text: `\u274C Invalid timezone: ${timezone}. Please use a valid IANA timezone name (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo').`
          }
        ],
        isError: true
      };
    }
    const now = /* @__PURE__ */ new Date();
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "long",
      hour12: false
    });
    const parts = timeFormatter.formatToParts(now);
    const formatObject = {};
    for (const part of parts) {
      formatObject[part.type] = part.value;
    }
    const time24 = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(now);
    const isoString = now.toLocaleString("sv-SE", { timeZone: timezone });
    Logger3.info(`Retrieved current time for timezone: ${timezone}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              timezone,
              current_time: {
                date: `${formatObject.month} ${formatObject.day}, ${formatObject.year}`,
                time_24h: time24,
                time_with_seconds: timeFormatter.format(now),
                timezone_name: formatObject.timeZoneName,
                iso_format: `${isoString.replace(" ", "T")}Z`,
                unix_timestamp: Math.floor(now.getTime() / 1e3)
              }
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger3.error("Error getting current time", error);
    return {
      content: [
        {
          type: "text",
          text: `\u274C Error getting current time: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
function convertTime(args) {
  try {
    const { source_timezone, time, target_timezone } = args;
    if (!isValidTimezone(source_timezone)) {
      return {
        content: [
          {
            type: "text",
            text: `\u274C Invalid source timezone: ${source_timezone}. Please use a valid IANA timezone name.`
          }
        ],
        isError: true
      };
    }
    if (!isValidTimezone(target_timezone)) {
      return {
        content: [
          {
            type: "text",
            text: `\u274C Invalid target timezone: ${target_timezone}. Please use a valid IANA timezone name.`
          }
        ],
        isError: true
      };
    }
    if (!isValidTimeFormat(time)) {
      return {
        content: [
          {
            type: "text",
            text: `\u274C Invalid time format: ${time}. Please use 24-hour format (HH:MM).`
          }
        ],
        isError: true
      };
    }
    const [hours, minutes] = time.split(":").map(Number);
    const now = /* @__PURE__ */ new Date();
    const sourceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    const sourceFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: source_timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const sourceParts = sourceFormatter.formatToParts(sourceDate);
    const sourceFormatObject = {};
    for (const part of sourceParts) {
      sourceFormatObject[part.type] = part.value;
    }
    const targetFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: target_timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "long",
      hour12: false
    });
    const targetTime24 = new Intl.DateTimeFormat("en-US", {
      timeZone: target_timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(sourceDate);
    const targetParts = targetFormatter.formatToParts(sourceDate);
    const targetFormatObject = {};
    for (const part of targetParts) {
      targetFormatObject[part.type] = part.value;
    }
    const targetDate = new Date(sourceDate.toLocaleString("en-US", { timeZone: target_timezone }));
    const timeDiffMs = targetDate.getTime() - sourceDate.getTime();
    const timeDiffHours = Math.round(timeDiffMs / (1e3 * 60 * 60));
    Logger3.info(`Converted time from ${source_timezone} to ${target_timezone}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              conversion: {
                source: {
                  timezone: source_timezone,
                  time,
                  formatted: sourceFormatter.format(sourceDate)
                },
                target: {
                  timezone: target_timezone,
                  time_24h: targetTime24,
                  formatted: targetFormatter.format(sourceDate),
                  date: `${targetFormatObject.month} ${targetFormatObject.day}, ${targetFormatObject.year}`,
                  timezone_name: targetFormatObject.timeZoneName
                },
                time_difference_hours: timeDiffHours
              }
            },
            null,
            2
          )
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger3.error("Error converting time", error);
    return {
      content: [
        {
          type: "text",
          text: `\u274C Error converting time: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}
function registerTimeTools(server2) {
  server2.registerTool(
    "get_current_time",
    {
      description: "Get current time in a specific timezone or system timezone",
      inputSchema: {
        timezone: z3.string().describe("IANA timezone name (e.g., 'America/New_York', 'Europe/London')")
      }
    },
    getCurrentTime
  );
  server2.registerTool(
    "convert_time",
    {
      description: "Convert time between timezones",
      inputSchema: {
        source_timezone: z3.string().describe("Source IANA timezone name"),
        time: z3.string().describe("Time in 24-hour format (HH:MM)"),
        target_timezone: z3.string().describe("Target IANA timezone name")
      }
    },
    convertTime
  );
}

// src/servers/sylphx-flow-mcp-server.ts
var DEFAULT_CONFIG = {
  name: "sylphx_flow",
  version: "1.0.0",
  description: "Sylphx Flow MCP server providing coordination tools for AI agents. Persistent SQLite-based storage with namespace support for agent coordination and state management."
};
var Logger4 = {
  info: (message) => console.error(`[INFO] ${message}`),
  success: (message) => console.error(`[SUCCESS] ${message}`),
  error: (message, error) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  }
};
Logger4.info("\u{1F680} Starting Sylphx Flow MCP Server...");
Logger4.info(`\u{1F4CB} Description: ${DEFAULT_CONFIG.description.substring(0, 100)}...`);
var server = new McpServer({
  name: DEFAULT_CONFIG.name,
  version: DEFAULT_CONFIG.version,
  description: DEFAULT_CONFIG.description
});
registerMemoryTools(server);
registerTimeTools(server);
registerProjectStartupTool(server);
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    Logger4.success("\u2705 MCP Server connected and ready");
  } catch (error) {
    Logger4.error("Failed to start MCP server", error);
    process.exit(1);
  }
}
process.on("SIGINT", () => {
  Logger4.info("\u{1F6D1} Shutting down MCP server...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  Logger4.info("\u{1F6D1} Shutting down MCP server...");
  process.exit(0);
});
main().catch((error) => {
  Logger4.error("Fatal error starting server", error);
  process.exit(1);
});
