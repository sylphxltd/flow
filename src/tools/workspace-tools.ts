import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { cryptoUtils } from '../utils/security.js';

// ============================================================================
// STATELESS WORKSPACE TOOLS
// ============================================================================
//
// Design Philosophy:
// - No global state (.active file removed)
// - All operations require explicit task_id parameter
// - Agent tracks task_id in their own context
// - Concurrent-safe by design (multiple agents can work on different tasks)
// - Simplified STATUS.md format (removed: progress %, checklist, questions, blockers)
// - Discovery via workspace_list_tasks() instead of implicit "current task"
//
// ============================================================================

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const WORKSPACE_DIR = '.sylphx-flow/workspace';
const TASKS_DIR = join(WORKSPACE_DIR, 'tasks');
const ARCHIVE_DIR = join(WORKSPACE_DIR, 'archive');

interface TaskInfo {
  task_id: string;
  name: string;
  phase: string;
  created: string;
  last_updated: string;
}

interface TaskState {
  task_id: string;
  name: string;
  goal: string;
  phase: string;
  last_action: string;
  next_action: string;
  created: string;
  files: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateTaskId(name: string): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);

  const random = cryptoUtils.generateSecureRandom(3).substring(0, 6);
  return `${cleanName}-${random}`;
}

function ensureWorkspaceExists(): void {
  if (!existsSync(WORKSPACE_DIR)) {
    mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
  if (!existsSync(TASKS_DIR)) {
    mkdirSync(TASKS_DIR, { recursive: true });
  }
  if (!existsSync(ARCHIVE_DIR)) {
    mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}

function taskExists(taskId: string, archived = false): boolean {
  const dir = archived ? ARCHIVE_DIR : TASKS_DIR;
  return existsSync(join(dir, taskId));
}

function parseStatusFile(taskId: string, archived = false): TaskState | null {
  const dir = archived ? ARCHIVE_DIR : TASKS_DIR;
  const statusPath = join(dir, taskId, 'STATUS.md');

  if (!existsSync(statusPath)) {
    return null;
  }

  const content = readFileSync(statusPath, 'utf8');
  const lines = content.split('\n');

  const result: TaskState = {
    task_id: taskId,
    name: '',
    goal: '',
    phase: 'Investigation',
    last_action: '',
    next_action: '',
    created: '',
    files: [],
  };

  // Parse frontmatter and fields
  let inFrontmatter = false;
  for (const line of lines) {
    if (line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      continue;
    }

    if (inFrontmatter) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        switch (key) {
          case 'task_id':
            result.task_id = value;
            break;
          case 'name':
            result.name = value;
            break;
          case 'goal':
            result.goal = value;
            break;
          case 'phase':
            result.phase = value;
            break;
          case 'created':
            result.created = value;
            break;
        }
      }
    } else {
      // Parse content sections
      if (line.startsWith('## Last Action')) {
        const nextLineIdx = lines.indexOf(line) + 1;
        if (nextLineIdx < lines.length) {
          result.last_action = lines[nextLineIdx].trim();
        }
      } else if (line.startsWith('## Next Action')) {
        const nextLineIdx = lines.indexOf(line) + 1;
        if (nextLineIdx < lines.length) {
          result.next_action = lines[nextLineIdx].trim();
        }
      }
    }
  }

  // Discover files in task directory
  const taskDir = join(dir, taskId);
  if (existsSync(taskDir)) {
    result.files = readdirSync(taskDir).filter(f => f !== 'STATUS.md');
  }

  return result;
}

// ============================================================================
// STATELESS TOOLS (5 core tools)
// ============================================================================

// Tool 1: workspace_create_task
interface WorkspaceCreateTaskArgs {
  name: string;
  goal: string;
  priority?: 'high' | 'medium' | 'low';
}

export function registerWorkspaceCreateTask(server: McpServer) {
  server.registerTool(
    'workspace_create_task',
    {
      description: 'Create new task and return task_id (agent stores task_id in context)',
      inputSchema: {
        name: z.string().describe('Task name'),
        goal: z.string().describe('Clear goal statement'),
        priority: z.enum(['high', 'medium', 'low']).optional().describe('Task priority (default: medium)'),
      },
    },
    (args: WorkspaceCreateTaskArgs): CallToolResult => {
      try {
        const { name, goal, priority = 'medium' } = args;

        ensureWorkspaceExists();

        const taskId = generateTaskId(name);
        const taskDir = join(TASKS_DIR, taskId);

        if (existsSync(taskDir)) {
          return {
            content: [{ type: 'text', text: `Task ID collision: ${taskId}. Please retry.` }],
            isError: true,
          };
        }

        mkdirSync(taskDir, { recursive: true });

        const timestamp = new Date().toISOString();

        // New simplified STATUS.md format
        const statusContent = `---
task_id: ${taskId}
name: ${name}
goal: ${goal}
phase: Investigation
priority: ${priority}
created: ${timestamp}
---

## Last Action
Task created

## Next Action
Understand requirements and define approach

---

## Notes
(Free-form notes section - LLM can write anything here)
`;

        writeFileSync(join(taskDir, 'STATUS.md'), statusContent, 'utf8');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'created',
                  task_id: taskId,
                  path: taskDir,
                  message: 'Store this task_id in your context for all future operations',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error creating task: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 2: workspace_read_task
interface WorkspaceReadTaskArgs {
  task_id: string;
}

export function registerWorkspaceReadTask(server: McpServer) {
  server.registerTool(
    'workspace_read_task',
    {
      description: 'Read task state by ID (explicit task_id required)',
      inputSchema: {
        task_id: z.string().describe('Task ID to read'),
      },
    },
    (args: WorkspaceReadTaskArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        const { task_id } = args;

        const isArchived = !taskExists(task_id, false) && taskExists(task_id, true);
        const state = parseStatusFile(task_id, isArchived);

        if (!state) {
          return {
            content: [{ type: 'text', text: `Task "${task_id}" not found.` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...state,
                  is_archived: isArchived,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error reading task: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 3: workspace_update_task
interface WorkspaceUpdateTaskArgs {
  task_id: string;
  updates: {
    last_action?: string;
    next_action?: string;
    phase?: string;
    notes?: string;
  };
}

export function registerWorkspaceUpdateTask(server: McpServer) {
  server.registerTool(
    'workspace_update_task',
    {
      description: 'Update task state by ID (explicit task_id required)',
      inputSchema: {
        task_id: z.string().describe('Task ID to update'),
        updates: z.object({
          last_action: z.string().optional().describe('What was just completed'),
          next_action: z.string().optional().describe('What to do next (CRITICAL for resume)'),
          phase: z.string().optional().describe('Task phase'),
          notes: z.string().optional().describe('Additional notes (appended to Notes section)'),
        }),
      },
    },
    (args: WorkspaceUpdateTaskArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        const { task_id, updates } = args;

        if (!taskExists(task_id, false)) {
          return {
            content: [{ type: 'text', text: `Task "${task_id}" not found or is archived.` }],
            isError: true,
          };
        }

        const statusPath = join(TASKS_DIR, task_id, 'STATUS.md');
        let content = readFileSync(statusPath, 'utf8');

        // Update frontmatter fields
        if (updates.phase) {
          content = content.replace(/^phase: .+$/m, `phase: ${updates.phase}`);
        }

        // Update Last Action
        if (updates.last_action) {
          content = content.replace(
            /## Last Action\n[^\n]*/,
            `## Last Action\n${updates.last_action}`
          );
        }

        // Update Next Action
        if (updates.next_action) {
          content = content.replace(
            /## Next Action\n[^\n]*/,
            `## Next Action\n${updates.next_action}`
          );
        }

        // Append to Notes section
        if (updates.notes) {
          const timestamp = new Date().toISOString();
          const noteEntry = `\n### ${timestamp}\n${updates.notes}\n`;

          if (content.includes('## Notes')) {
            content = content.replace(
              /## Notes\n([\s\S]*?)(?=\n##|$)/,
              `## Notes\n$1${noteEntry}`
            );
          } else {
            content += `\n## Notes\n${noteEntry}`;
          }
        }

        writeFileSync(statusPath, content, 'utf8');

        const updatedFields = Object.keys(updates).filter(
          (k) => updates[k as keyof typeof updates] !== undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'updated',
                  task_id,
                  updated_fields: updatedFields,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error updating task: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 4: workspace_list_tasks
interface WorkspaceListTasksArgs {
  status?: 'active' | 'completed' | 'all';
  limit?: number;
}

export function registerWorkspaceListTasks(server: McpServer) {
  server.registerTool(
    'workspace_list_tasks',
    {
      description: 'List/discover all tasks (used for finding existing work)',
      inputSchema: {
        status: z.enum(['active', 'completed', 'all']).optional().describe('Filter by status (default: active)'),
        limit: z.number().optional().describe('Limit number of results'),
      },
    },
    (args: WorkspaceListTasksArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        const { status = 'active', limit } = args;
        const tasks: TaskInfo[] = [];

        const scanDir = (dir: string, isArchived: boolean) => {
          if (!existsSync(dir)) {
            return;
          }

          const entries = readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.isDirectory()) {
              const state = parseStatusFile(entry.name, isArchived);
              if (state) {
                tasks.push({
                  task_id: state.task_id,
                  name: state.name,
                  phase: state.phase,
                  created: state.created,
                  last_updated: state.created, // Could parse from file stats if needed
                });
              }
            }
          }
        };

        if (status === 'active' || status === 'all') {
          scanDir(TASKS_DIR, false);
        }
        if (status === 'completed' || status === 'all') {
          scanDir(ARCHIVE_DIR, true);
        }

        // Sort by created date (newest first)
        tasks.sort((a, b) => b.created.localeCompare(a.created));

        const result = limit ? tasks.slice(0, limit) : tasks;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  tasks: result,
                  total: result.length,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error listing tasks: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 5: workspace_complete_task
interface WorkspaceCompleteTaskArgs {
  task_id: string;
  summary: string;
}

export function registerWorkspaceCompleteTask(server: McpServer) {
  server.registerTool(
    'workspace_complete_task',
    {
      description: 'Complete and archive task by ID (explicit task_id required)',
      inputSchema: {
        task_id: z.string().describe('Task ID to complete'),
        summary: z.string().describe('Completion summary'),
      },
    },
    (args: WorkspaceCompleteTaskArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        const { task_id, summary } = args;

        if (!taskExists(task_id, false)) {
          return {
            content: [{ type: 'text', text: `Task "${task_id}" not found.` }],
            isError: true,
          };
        }

        const sourceDir = join(TASKS_DIR, task_id);
        const targetDir = join(ARCHIVE_DIR, task_id);

        const statusPath = join(sourceDir, 'STATUS.md');
        let content = readFileSync(statusPath, 'utf8');

        // Update to completed phase
        content = content.replace(/^phase: .+$/m, 'phase: Complete');

        // Add completion info
        const completedAt = new Date().toISOString();
        content += `\n---\n\n## Completion\n**Completed:** ${completedAt}\n**Summary:** ${summary}\n`;

        writeFileSync(statusPath, content, 'utf8');

        // Move to archive
        renameSync(sourceDir, targetDir);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'completed',
                  task_id,
                  archived_to: targetDir,
                  completed_at: completedAt,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error completing task: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// ============================================================================
// EXPORT ALL WORKSPACE TOOLS
// ============================================================================

export function registerWorkspaceTools(server: McpServer) {
  registerWorkspaceCreateTask(server);
  registerWorkspaceReadTask(server);
  registerWorkspaceUpdateTask(server);
  registerWorkspaceListTasks(server);
  registerWorkspaceCompleteTask(server);
}
