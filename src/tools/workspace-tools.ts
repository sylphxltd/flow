import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { cryptoUtils } from '../utils/security.js';
import { frameworkRegistry, type ReasoningFramework } from '../frameworks/framework-registry.js';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const WORKSPACE_DIR = '.sylphx-flow/workspace';
const TASKS_DIR = join(WORKSPACE_DIR, 'tasks');
const ARCHIVE_DIR = join(WORKSPACE_DIR, 'archive');
const ACTIVE_FILE = join(WORKSPACE_DIR, '.active');

interface TaskInfo {
  task_id: string;
  task_name: string;
  phase: string;
  progress: number;
  created: string;
  last_updated: string;
  is_active: boolean;
}

interface ParsedStatus {
  task_id: string;
  task_name: string;
  phase: string;
  progress: number;
  last_action: string;
  next_action: string;
  checklist: Array<{ item: string; done: boolean }>;
  priority: string;
  open_questions: string[];
  blockers: string[];
  quick_links: Record<string, unknown>;
  created: string;
  last_updated: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateTaskId(shortName: string): string {
  const cleanName = shortName
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

function getActiveTaskId(): string | null {
  if (!existsSync(ACTIVE_FILE)) {
    return null;
  }
  const content = readFileSync(ACTIVE_FILE, 'utf8').trim();
  return content || null;
}

function setActiveTaskId(taskId: string): void {
  writeFileSync(ACTIVE_FILE, taskId, 'utf8');
}

function clearActive(): void {
  if (existsSync(ACTIVE_FILE)) {
    rmSync(ACTIVE_FILE);
  }
}

function taskExists(taskId: string, archived = false): boolean {
  const dir = archived ? ARCHIVE_DIR : TASKS_DIR;
  return existsSync(join(dir, taskId));
}

function parseStatusFile(taskId: string, archived = false): ParsedStatus | null {
  const dir = archived ? ARCHIVE_DIR : TASKS_DIR;
  const statusPath = join(dir, taskId, 'STATUS.md');
  
  if (!existsSync(statusPath)) {
    return null;
  }

  const content = readFileSync(statusPath, 'utf8');
  const lines = content.split('\n');

  const result: ParsedStatus = {
    task_id: taskId,
    task_name: '',
    phase: '',
    progress: 0,
    last_action: '',
    next_action: '',
    checklist: [],
    priority: '',
    open_questions: [],
    blockers: [],
    quick_links: {},
    created: '',
    last_updated: new Date().toISOString(),
  };

  let inChecklist = false;
  let inQuestions = false;
  let inBlockers = false;

  for (const line of lines) {
    if (line.startsWith('# Task:')) {
      result.task_name = line.substring(7).trim();
    } else if (line.startsWith('**Created:**')) {
      result.created = line.substring(12).trim();
    } else if (line.startsWith('**Phase:**')) {
      result.phase = line.substring(10).trim();
    } else if (line.startsWith('**Progress:**')) {
      const match = line.match(/(\d+)%/);
      if (match?.[1]) {
        result.progress = Number.parseInt(match[1], 10);
      }
    } else if (line.startsWith('**Last Action:**')) {
      result.last_action = line.substring(16).trim();
    } else if (line.startsWith('**Next Action:**')) {
      result.next_action = line.substring(16).trim();
    } else if (line.startsWith('**Priority:**')) {
      result.priority = line.substring(13).trim();
    } else if (line.startsWith('## Progress Checklist')) {
      inChecklist = true;
      inQuestions = false;
      inBlockers = false;
    } else if (line.startsWith('## Open Questions')) {
      inChecklist = false;
      inQuestions = true;
      inBlockers = false;
    } else if (line.startsWith('## Blockers')) {
      inChecklist = false;
      inQuestions = false;
      inBlockers = true;
    } else if (line.startsWith('##')) {
      inChecklist = false;
      inQuestions = false;
      inBlockers = false;
    } else if (inChecklist && (line.startsWith('- [ ]') || line.startsWith('- [x]'))) {
      const done = line.startsWith('- [x]');
      const item = line.substring(5).trim();
      result.checklist.push({ item, done });
    } else if (inQuestions && line.startsWith('- ')) {
      result.open_questions.push(line.substring(2).trim());
    } else if (inBlockers && line.startsWith('- ')) {
      result.blockers.push(line.substring(2).trim());
    }
  }

  return result;
}

// ============================================================================
// PHASE 1: CORE TOOLS (必须)
// ============================================================================

// Tool 1: workspace_init
export function registerWorkspaceInit(server: McpServer) {
  server.registerTool(
    'workspace_init',
    {
      description: 'Initialize workspace structure (first time use)',
      inputSchema: {},
    },
    (): CallToolResult => {
      try {
        ensureWorkspaceExists();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'initialized',
                  workspace_path: WORKSPACE_DIR,
                  structure_created: [TASKS_DIR, ARCHIVE_DIR],
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
          content: [{ type: 'text', text: `Error initializing workspace: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 2: workspace_get_active
export function registerWorkspaceGetActive(server: McpServer) {
  server.registerTool(
    'workspace_get_active',
    {
      description: 'Get current active task',
      inputSchema: {},
    },
    (): CallToolResult => {
      try {
        ensureWorkspaceExists();

        const taskId = getActiveTaskId();

        if (!taskId) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    task_id: null,
                    message: 'No active task',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const status = parseStatusFile(taskId);

        if (!status) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    task_id: taskId,
                    error: 'Active task file not found',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  task_id: status.task_id,
                  task_name: status.task_name,
                  created: status.created,
                  last_updated: status.last_updated,
                  phase: status.phase,
                  progress: status.progress,
                  next_action: status.next_action,
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
          content: [{ type: 'text', text: `Error getting active task: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 3: workspace_create_task
interface WorkspaceCreateTaskArgs {
  short_name: string;
  task_name: string;
  priority?: 'high' | 'medium' | 'low' | undefined;
  description?: string | undefined;
  set_active?: boolean | undefined;
}

export function registerWorkspaceCreateTask(server: McpServer) {
  server.registerTool(
    'workspace_create_task',
    {
      description: 'Create a new task in workspace',
      inputSchema: {
        short_name: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .describe('Short name for task ID generation'),
        task_name: z.string().describe('Full descriptive task name'),
        priority: z.enum(['high', 'medium', 'low']).optional().describe('Task priority (default: medium)'),
        description: z.string().optional().describe('Optional detailed description'),
        set_active: z.boolean().optional().describe('Set as active task (default: true)'),
      },
    },
    (args: WorkspaceCreateTaskArgs): CallToolResult => {
      try {
        const { short_name, task_name, priority = 'medium', description = '', set_active = true } = args;

        ensureWorkspaceExists();

        const taskId = generateTaskId(short_name);
        const taskDir = join(TASKS_DIR, taskId);

        if (existsSync(taskDir)) {
          return {
            content: [{ type: 'text', text: `Task ID collision: ${taskId}. Please retry.` }],
            isError: true,
          };
        }

        mkdirSync(taskDir, { recursive: true });

        const timestamp = new Date().toISOString();

        const statusContent = `# Task: ${task_name}
**Task ID:** ${taskId}
**Created:** ${timestamp}

## Current Status
**Phase:** Investigation
**Progress:** 0%
**Last Action:** Starting task
**Next Action:** Understand requirements and define approach

## Progress Checklist
- [ ] Understand requirements
- [ ] Design approach
- [ ] Implement
- [ ] Test
- [ ] Complete

## Key Information
**Goal:** ${description || '(Define clear goal)'}
**Priority:** ${priority}

## Quick Links
(Add links as you create files)

## Open Questions
(Add questions as they arise)

## Blockers
None
`;

        writeFileSync(join(taskDir, 'STATUS.md'), statusContent, 'utf8');

        if (set_active) {
          setActiveTaskId(taskId);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'created',
                  task_id: taskId,
                  path: taskDir,
                  files_created: ['STATUS.md'],
                  is_active: set_active,
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

// Tool 4: workspace_read_status
interface WorkspaceReadStatusArgs {
  task_id?: string | undefined;
}

export function registerWorkspaceReadStatus(server: McpServer) {
  server.registerTool(
    'workspace_read_status',
    {
      description: 'Read task status (defaults to active task)',
      inputSchema: {
        task_id: z.string().optional().describe('Task ID (default: current active task)'),
      },
    },
    (args: WorkspaceReadStatusArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        let { task_id } = args;

        if (!task_id) {
          const activeId = getActiveTaskId();
          if (!activeId) {
            return {
              content: [{ type: 'text', text: 'No active task. Use workspace_create_task to begin.' }],
              isError: true,
            };
          }
          task_id = activeId;
        }

        const isArchived = !taskExists(task_id, false) && taskExists(task_id, true);
        const status = parseStatusFile(task_id, isArchived);

        if (!status) {
          return {
            content: [{ type: 'text', text: `Task "${task_id}" not found.` }],
            isError: true,
          };
        }

        const taskDir = join(isArchived ? ARCHIVE_DIR : TASKS_DIR, task_id);
        const filesPresent = readdirSync(taskDir);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...status,
                  files_present: filesPresent,
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
          content: [{ type: 'text', text: `Error reading status: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 5: workspace_update_status
interface WorkspaceUpdateStatusArgs {
  task_id?: string | undefined;
  updates: {
    phase?: string | undefined;
    progress?: number | undefined;
    last_action?: string | undefined;
    next_action?: string | undefined;
    check_item?: string | undefined;
    uncheck_item?: string | undefined;
    add_question?: string | undefined;
    remove_question?: string | undefined;
    add_blocker?: string | undefined;
    remove_blocker?: string | undefined;
    add_quick_link?: {
      type: 'design' | 'code' | 'test' | 'other';
      path: string;
    } | undefined;
  };
}

export function registerWorkspaceUpdateStatus(server: McpServer) {
  server.registerTool(
    'workspace_update_status',
    {
      description: 'Update task STATUS.md fields',
      inputSchema: {
        task_id: z.string().optional().describe('Task ID (default: current active task)'),
        updates: z.object({
          phase: z.string().optional(),
          progress: z.number().min(0).max(100).optional(),
          last_action: z.string().optional(),
          next_action: z.string().optional(),
          check_item: z.string().optional(),
          uncheck_item: z.string().optional(),
          add_question: z.string().optional(),
          remove_question: z.string().optional(),
          add_blocker: z.string().optional(),
          remove_blocker: z.string().optional(),
          add_quick_link: z
            .object({
              type: z.enum(['design', 'code', 'test', 'other']),
              path: z.string(),
            })
            .optional(),
        }),
      },
    },
    (args: WorkspaceUpdateStatusArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        let { task_id } = args;

        if (!task_id) {
          const activeId = getActiveTaskId();
          if (!activeId) {
            return {
              content: [{ type: 'text', text: 'No active task to update.' }],
              isError: true,
            };
          }
          task_id = activeId;
        }

        if (!taskExists(task_id, false)) {
          return {
            content: [{ type: 'text', text: `Task "${task_id}" not found or is archived.` }],
            isError: true,
          };
        }

        const statusPath = join(TASKS_DIR, task_id, 'STATUS.md');
        let content = readFileSync(statusPath, 'utf8');
        const lines = content.split('\n');

        const updatedLines = lines.map((line) => {
          if (args.updates.phase && line.startsWith('**Phase:**')) {
            return `**Phase:** ${args.updates.phase}`;
          }
          if (args.updates.progress !== undefined && line.startsWith('**Progress:**')) {
            return `**Progress:** ${args.updates.progress}%`;
          }
          if (args.updates.last_action && line.startsWith('**Last Action:**')) {
            return `**Last Action:** ${args.updates.last_action}`;
          }
          if (args.updates.next_action && line.startsWith('**Next Action:**')) {
            return `**Next Action:** ${args.updates.next_action}`;
          }
          return line;
        });

        content = updatedLines.join('\n');

        if (args.updates.check_item) {
          const escaped = args.updates.check_item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          content = content.replace(new RegExp(`- \\[ \\] ${escaped}`), `- [x] ${args.updates.check_item}`);
        }

        if (args.updates.uncheck_item) {
          const escaped = args.updates.uncheck_item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          content = content.replace(new RegExp(`- \\[x\\] ${escaped}`), `- [ ] ${args.updates.uncheck_item}`);
        }

        if (args.updates.add_question) {
          content = content.replace(
            /## Open Questions\n([\s\S]*?)\n\n/,
            `## Open Questions\n$1- ${args.updates.add_question}\n\n`
          );
        }

        if (args.updates.add_blocker) {
          content = content.replace(/## Blockers\n([\s\S]*?)$/, `## Blockers\n$1- ${args.updates.add_blocker}\n`);
        }

        writeFileSync(statusPath, content, 'utf8');

        const updatedFields = Object.keys(args.updates).filter(
          (k) => args.updates[k as keyof typeof args.updates] !== undefined
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
          content: [{ type: 'text', text: `Error updating status: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// ============================================================================
// PHASE 2: DOCUMENT TOOLS (重要)
// ============================================================================

// Tool 6: workspace_create_file
interface WorkspaceCreateFileArgs {
  task_id?: string | undefined;
  file_type: 'DESIGN' | 'PLAN' | 'DECISIONS' | 'RESEARCH' | 'CUSTOM';
  file_name?: string | undefined;
  content?: string | undefined;
  auto_link?: boolean | undefined;
}

export function registerWorkspaceCreateFile(server: McpServer) {
  server.registerTool(
    'workspace_create_file',
    {
      description: 'Create file in task directory (DESIGN/PLAN/DECISIONS/RESEARCH)',
      inputSchema: {
        task_id: z.string().optional(),
        file_type: z.enum(['DESIGN', 'PLAN', 'DECISIONS', 'RESEARCH', 'CUSTOM']),
        file_name: z.string().optional().describe('Required for CUSTOM type'),
        content: z.string().optional().describe('File content (uses template if not provided)'),
        auto_link: z.boolean().optional().describe('Auto-add to STATUS.md Quick Links (default: true)'),
      },
    },
    (args: WorkspaceCreateFileArgs): CallToolResult => {
      try {
        const { file_type, file_name, content, auto_link = true } = args;

        let { task_id } = args;

        if (!task_id) {
          const activeId = getActiveTaskId();
          if (!activeId) {
            return {
              content: [{ type: 'text', text: 'No active task.' }],
              isError: true,
            };
          }
          task_id = activeId;
        }

        if (!taskExists(task_id, false)) {
          return {
            content: [{ type: 'text', text: `Task "${task_id}" not found.` }],
            isError: true,
          };
        }

        const taskDir = join(TASKS_DIR, task_id);
        const fileName =
          file_type === 'CUSTOM' ? file_name : `${file_type}.md`;

        if (!fileName) {
          return {
            content: [{ type: 'text', text: 'file_name required for CUSTOM type' }],
            isError: true,
          };
        }

        const filePath = join(taskDir, fileName);

        if (existsSync(filePath)) {
          return {
            content: [{ type: 'text', text: `File "${fileName}" already exists.` }],
            isError: true,
          };
        }

        const finalContent =
          content ||
          `# ${file_type}: ${task_id}\n\n(Add ${file_type.toLowerCase()} content here)\n`;

        writeFileSync(filePath, finalContent, 'utf8');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'created',
                  file_path: filePath,
                  quick_link_added: auto_link,
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
          content: [{ type: 'text', text: `Error creating file: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 7: workspace_add_decision
interface WorkspaceAddDecisionArgs {
  task_id?: string | undefined;
  decision: {
    title: string;
    rationale: string;
    alternatives: string[];
    impact: string;
    status: 'decided' | 'implemented' | 'revisit';
  };
}

export function registerWorkspaceAddDecision(server: McpServer) {
  server.registerTool(
    'workspace_add_decision',
    {
      description: 'Add decision to DECISIONS.md',
      inputSchema: {
        task_id: z.string().optional(),
        decision: z.object({
          title: z.string(),
          rationale: z.string(),
          alternatives: z.array(z.string()),
          impact: z.string(),
          status: z.enum(['decided', 'implemented', 'revisit']),
        }),
      },
    },
    (args: WorkspaceAddDecisionArgs): CallToolResult => {
      try {
        let { task_id } = args;

        if (!task_id) {
          const activeId = getActiveTaskId();
          if (!activeId) {
            return {
              content: [{ type: 'text', text: 'No active task.' }],
              isError: true,
            };
          }
          task_id = activeId;
        }

        if (!taskExists(task_id, false)) {
          return {
            content: [{ type: 'text', text: `Task "${task_id}" not found.` }],
            isError: true,
          };
        }

        const taskDir = join(TASKS_DIR, task_id);
        const decisionsPath = join(taskDir, 'DECISIONS.md');

        let content = '';
        let decisionId = 'D001';

        if (existsSync(decisionsPath)) {
          content = readFileSync(decisionsPath, 'utf8');
          const matches = content.match(/^## D(\d{3})/gm);
          if (matches) {
            const maxNum = Math.max(...matches.map((m) => Number.parseInt(m.substring(4), 10)));
            decisionId = `D${String(maxNum + 1).padStart(3, '0')}`;
          }
        } else {
          content = `# Decisions: ${task_id}\n\n`;
        }

        const { decision } = args;
        const newDecision = `
## ${decisionId}: ${decision.title}

**Date:** ${new Date().toISOString().split('T')[0]}
**Status:** ${decision.status}

### Rationale
${decision.rationale}

### Alternatives Considered
${decision.alternatives.map((alt) => `- ${alt}`).join('\n')}

### Impact
${decision.impact}

---
`;

        content += newDecision;
        writeFileSync(decisionsPath, content, 'utf8');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'added',
                  decision_id: decisionId,
                  file_path: decisionsPath,
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
          content: [{ type: 'text', text: `Error adding decision: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// ============================================================================
// PHASE 3: TASK MANAGEMENT (有用)
// ============================================================================

// Tool 8: workspace_list_tasks
interface WorkspaceListTasksArgs {
  status?: 'active' | 'completed' | 'all' | undefined;
}

export function registerWorkspaceListTasks(server: McpServer) {
  server.registerTool(
    'workspace_list_tasks',
    {
      description: 'List all tasks',
      inputSchema: {
        status: z.enum(['active', 'completed', 'all']).optional().describe('Filter by status (default: active)'),
      },
    },
    (args: WorkspaceListTasksArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        const { status = 'active' } = args;
        const activeTaskId = getActiveTaskId();
        const tasks: TaskInfo[] = [];

        const scanDir = (dir: string, isArchived: boolean) => {
          if (!existsSync(dir)) {
            return;
          }

          const entries = readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.isDirectory()) {
              const taskStatus = parseStatusFile(entry.name, isArchived);
              if (taskStatus) {
                tasks.push({
                  task_id: taskStatus.task_id,
                  task_name: taskStatus.task_name,
                  phase: taskStatus.phase,
                  progress: taskStatus.progress,
                  created: taskStatus.created,
                  last_updated: taskStatus.last_updated,
                  is_active: entry.name === activeTaskId,
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

        tasks.sort((a, b) => b.created.localeCompare(a.created));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  tasks,
                  total: tasks.length,
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

// Tool 9: workspace_switch_task
interface WorkspaceSwitchTaskArgs {
  task_id: string;
}

export function registerWorkspaceSwitchTask(server: McpServer) {
  server.registerTool(
    'workspace_switch_task',
    {
      description: 'Switch to different active task',
      inputSchema: {
        task_id: z.string().describe('Task ID to switch to'),
      },
    },
    (args: WorkspaceSwitchTaskArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        const { task_id } = args;

        if (!taskExists(task_id, false)) {
          if (taskExists(task_id, true)) {
            return {
              content: [{ type: 'text', text: `Task "${task_id}" is archived. Cannot switch to archived tasks.` }],
              isError: true,
            };
          }
          return {
            content: [{ type: 'text', text: `Task "${task_id}" not found.` }],
            isError: true,
          };
        }

        const fromTask = getActiveTaskId();
        setActiveTaskId(task_id);

        const newStatus = parseStatusFile(task_id);

        if (!newStatus) {
          return {
            content: [{ type: 'text', text: `Failed to read status for task "${task_id}".` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'switched',
                  from_task: fromTask,
                  to_task: task_id,
                  new_status: {
                    task_name: newStatus.task_name,
                    phase: newStatus.phase,
                    next_action: newStatus.next_action,
                  },
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
          content: [{ type: 'text', text: `Error switching task: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 10: workspace_complete_task
interface WorkspaceCompleteTaskArgs {
  task_id?: string | undefined;
  completion_notes?: string | undefined;
}

export function registerWorkspaceCompleteTask(server: McpServer) {
  server.registerTool(
    'workspace_complete_task',
    {
      description: 'Mark task as complete and archive',
      inputSchema: {
        task_id: z.string().optional().describe('Task ID (default: current active task)'),
        completion_notes: z.string().optional().describe('Completion notes'),
      },
    },
    (args: WorkspaceCompleteTaskArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        let { task_id } = args;
        const { completion_notes } = args;

        if (!task_id) {
          const activeId = getActiveTaskId();
          if (!activeId) {
            return {
              content: [{ type: 'text', text: 'No active task to complete.' }],
              isError: true,
            };
          }
          task_id = activeId;
        }

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

        content = content.replace(/\*\*Phase:\*\* .*/, '**Phase:** Completed');
        content = content.replace(/\*\*Progress:\*\* \d+%/, '**Progress:** 100%');

        const completedAt = new Date().toISOString();
        content += `\n\n**Completed:** ${completedAt}\n`;
        if (completion_notes) {
          content += `**Notes:** ${completion_notes}\n`;
        }

        writeFileSync(statusPath, content, 'utf8');

        renameSync(sourceDir, targetDir);

        const activeTaskId = getActiveTaskId();
        if (activeTaskId === task_id) {
          clearActive();
        }

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
// PHASE 4: ADVANCED FEATURES (可选)
// ============================================================================

// Tool 11: workspace_search
interface WorkspaceSearchArgs {
  query: string;
  scope?: 'all' | 'active' | 'completed' | undefined;
  file_types?: string[] | undefined;
}

export function registerWorkspaceSearch(server: McpServer) {
  server.registerTool(
    'workspace_search',
    {
      description: 'Search workspace content',
      inputSchema: {
        query: z.string().describe('Search query'),
        scope: z.enum(['all', 'active', 'completed']).optional().describe('Scope (default: all)'),
        file_types: z.array(z.string()).optional().describe('File types to search (e.g., ["STATUS", "DESIGN"])'),
      },
    },
    (args: WorkspaceSearchArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        const { query, scope = 'all', file_types = ['STATUS', 'DESIGN', 'DECISIONS', 'PLAN', 'RESEARCH'] } = args;

        const results: Array<{
          task_id: string;
          task_name: string;
          file: string;
          matches: Array<{ line: number; content: string; context: string }>;
        }> = [];
        const searchRegex = new RegExp(query, 'i');

        const searchDir = (dir: string, isArchived: boolean) => {
          if (!existsSync(dir)) {
            return;
          }

          const entries = readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            if (entry.isDirectory()) {
              const taskDir = join(dir, entry.name);
              const taskStatus = parseStatusFile(entry.name, isArchived);

              if (!taskStatus) {
                continue;
              }

              for (const fileType of file_types) {
                const filePath = join(taskDir, `${fileType}.md`);
                if (!existsSync(filePath)) {
                  continue;
                }

                const content = readFileSync(filePath, 'utf8');
                const lines = content.split('\n');

                const matches: Array<{ line: number; content: string; context: string }> = [];
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  if (line && searchRegex.test(line)) {
                    matches.push({
                      line: i + 1,
                      content: line,
                      context: lines.slice(Math.max(0, i - 1), i + 2).join('\n'),
                    });
                  }
                }

                if (matches.length > 0) {
                  results.push({
                    task_id: entry.name,
                    task_name: taskStatus.task_name,
                    file: `${fileType}.md`,
                    matches,
                  });
                }
              }
            }
          }
        };

        if (scope === 'active' || scope === 'all') {
          searchDir(TASKS_DIR, false);
        }
        if (scope === 'completed' || scope === 'all') {
          searchDir(ARCHIVE_DIR, true);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  results,
                  total_matches: results.reduce((sum, r) => sum + r.matches.length, 0),
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
          content: [{ type: 'text', text: `Error searching: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 12: workspace_get_context
interface WorkspaceGetContextArgs {
  task_id?: string | undefined;
  include_files?: string[] | undefined;
}

export function registerWorkspaceGetContext(server: McpServer) {
  server.registerTool(
    'workspace_get_context',
    {
      description: 'Get complete task context (for recovery after context compact)',
      inputSchema: {
        task_id: z.string().optional().describe('Task ID (default: current active task)'),
        include_files: z
          .array(z.string())
          .optional()
          .describe('Files to include (default: ["STATUS", "DESIGN", "DECISIONS"])'),
      },
    },
    (args: WorkspaceGetContextArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        let { task_id } = args;
        const { include_files = ['STATUS', 'DESIGN', 'DECISIONS'] } = args;

        if (!task_id) {
          const activeId = getActiveTaskId();
          if (!activeId) {
            return {
              content: [{ type: 'text', text: 'No active task.' }],
              isError: true,
            };
          }
          task_id = activeId;
        }

        const isArchived = !taskExists(task_id, false) && taskExists(task_id, true);
        const taskDir = join(isArchived ? ARCHIVE_DIR : TASKS_DIR, task_id);

        if (!existsSync(taskDir)) {
          return {
            content: [{ type: 'text', text: `Task "${task_id}" not found.` }],
            isError: true,
          };
        }

        const status = parseStatusFile(task_id, isArchived);

        if (!status) {
          return {
            content: [{ type: 'text', text: `Failed to read status for task "${task_id}".` }],
            isError: true,
          };
        }

        const context: Record<string, unknown> = {
          task_id,
          task_name: status.task_name,
          status,
        };

        for (const fileType of include_files) {
          const filePath = join(taskDir, `${fileType}.md`);
          if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf8');
            context[fileType.toLowerCase()] = content;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(context, null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting context: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// ============================================================================
// REASONING TOOLS - Advanced Cognitive Workflows
// ============================================================================

// Helper functions for modular framework system
async function ensureFrameworkRegistryInitialized(): Promise<void> {
  if (!frameworkRegistry['initialized']) {
    await frameworkRegistry.initialize();
  }
}

function formatFrameworkMarkdown(framework: ReasoningFramework, reasoningData: any): string {
  return `# ${reasoningData.title}

**Framework:** ${framework.name}
**Category:** ${framework.category}
**Difficulty:** ${framework.difficulty}
**Created:** ${reasoningData.created_at}
**Status:** ${reasoningData.status}

## Problem Statement
${reasoningData.problem_description}

${reasoningData.context ? `## Context\n${reasoningData.context}\n` : ''}

## Framework Structure
${framework.structure.map((section) => `### ${section.name}\n*${section.description}*`).join('\n\n')}

## Guiding Questions
${framework.prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join('\n')}

## When to Use This Framework
${framework.when_to_use.map((usage, index) => `${index + 1}. ${usage}`).join('\n')}

${framework.when_not_to_use ? `## When Not to Use\n${framework.when_not_to_use.map((usage, index) => `${index + 1}. ${usage}`).join('\n')}\n` : ''}

## Analysis Progress
*Sections will be populated as you work through the analysis...*

---
*Reasoning ID: ${reasoningData.id} | Framework: ${framework.id}*`;
}

// Generate unique reasoning ID
function generateReasoningId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `reasoning-${timestamp}-${random}`;
}

// Get reasoning directory path
function getReasoningDir(taskId: string): string {
  const taskDir = join(TASKS_DIR, taskId);
  const reasoningDir = join(taskDir, 'REASONING');
  if (!existsSync(reasoningDir)) {
    mkdirSync(reasoningDir, { recursive: true });
  }
  return reasoningDir;
}

// Tool 13: reasoning_start
interface ReasoningStartArgs {
  title: string;
  framework: keyof typeof REASONING_FRAMEWORKS;
  problem_description: string;
  context?: string;
}

export function registerReasoningStart(server: McpServer) {
  server.registerTool(
    'reasoning_start',
    {
      description: 'Start a structured reasoning session using a specific framework',
      inputSchema: {
        title: z.string().describe('Title for this reasoning session'),
        framework: z.string().describe('Framework ID (use reasoning_frameworks to see available options)'),
        problem_description: z.string().describe('Clear description of the problem or question to analyze'),
        context: z.string().optional().describe('Additional context or background information'),
      },
    },
    async (args: ReasoningStartArgs): Promise<CallToolResult> => {
      try {
        ensureWorkspaceExists();

        const activeId = getActiveTaskId();
        if (!activeId) {
          return {
            content: [{ type: 'text', text: 'No active task. Use workspace_create_task to begin.' }],
            isError: true,
          };
        }

        const { title, framework, problem_description, context } = args;
        const reasoningId = generateReasoningId();

        // Get framework from registry
        await ensureFrameworkRegistryInitialized();
        const frameworkInfo = frameworkRegistry.get(framework);

        if (!frameworkInfo) {
          return {
            content: [{
              type: 'text',
              text: `Framework '${framework}' not found. Available frameworks:\n${frameworkRegistry.getAll().map(f => `• ${f.id} - ${f.name}`).join('\n')}\n\nUse reasoning_frameworks to see all options with descriptions.`
            }],
            isError: true,
          };
        }

        const reasoningData = {
          id: reasoningId,
          title,
          framework,
          framework_name: frameworkInfo.name,
          problem_description,
          context: context || '',
          created_at: new Date().toISOString(),
          status: 'in_progress'
        };

        const reasoningDir = getReasoningDir(activeId);
        const reasoningPath = join(reasoningDir, `${reasoningId}.md`);

        // Create markdown file using modular framework formatter
        const markdown = formatFrameworkMarkdown(frameworkInfo, reasoningData);

        writeFileSync(reasoningPath, markdown, 'utf8');

        return {
          content: [
            {
              type: 'text',
              text: `✅ Started reasoning session: ${reasoningId}\n\n📋 **Framework:** ${frameworkInfo.name}\n🎯 **Problem:** ${problem_description}\n\n**Next Steps:**\n1. Use \`reasoning_analyze\` to work through each section\n2. Use \`reasoning_conclude\` to finalize conclusions\n\n📁 **File saved to:** ${reasoningPath}`,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error starting reasoning session: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 14: reasoning_analyze
interface ReasoningAnalyzeArgs {
  reasoning_id?: string;
  section: string;
  analysis: string;
  insights?: string[];
}

export function registerReasoningAnalyze(server: McpServer) {
  server.registerTool(
    'reasoning_analyze',
    {
      description: 'Add structured analysis to a specific section of your reasoning',
      inputSchema: {
        reasoning_id: z.string().optional().describe('Reasoning session ID (default: most recent)'),
        section: z.string().describe('Section name to analyze (from framework structure)'),
        analysis: z.string().describe('Your detailed analysis for this section'),
        insights: z.array(z.string()).optional().describe('Key insights or discoveries from this analysis'),
      },
    },
    (args: ReasoningAnalyzeArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        const activeId = getActiveTaskId();
        if (!activeId) {
          return {
            content: [{ type: 'text', text: 'No active task. Use workspace_create_task to begin.' }],
            isError: true,
          };
        }

        const { reasoning_id, section, analysis, insights } = args;
        const reasoningDir = getReasoningDir(activeId);

        // Find reasoning file
        let reasoningFile = '';
        if (reasoning_id) {
          reasoningFile = join(reasoningDir, `${reasoning_id}.md`);
        } else {
          // Find most recent reasoning file
          const files = readdirSync(reasoningDir)
            .filter((f: string) => f.endsWith('.md'))
            .sort((a, b) => {
              const statA = require('fs').statSync(join(reasoningDir, a));
              const statB = require('fs').statSync(join(reasoningDir, b));
              return statB.mtime.getTime() - statA.mtime.getTime();
            });

          if (files.length === 0) {
            return {
              content: [{ type: 'text', text: 'No reasoning sessions found. Use reasoning_start to begin.' }],
              isError: true,
            };
          }
          reasoningFile = join(reasoningDir, files[0]);
        }

        if (!existsSync(reasoningFile)) {
          return {
            content: [{ type: 'text', text: `Reasoning session not found: ${reasoning_id || 'latest'}` }],
            isError: true,
          };
        }

        // Read and update reasoning file
        const content = readFileSync(reasoningFile, 'utf8');
        const sectionPattern = new RegExp(`(### ${section})([\\s\\S]*?)(?=### |## |$)`, 'm');

        const newSectionContent = `### ${section}\n\n${analysis}\n${
          insights && insights.length > 0
            ? `\n**Key Insights:**\n${insights.map(insight => `💡 ${insight}`).join('\n')}\n`
            : ''
        }`;

        const updatedContent = content.replace(sectionPattern, newSectionContent);
        writeFileSync(reasoningFile, updatedContent, 'utf8');

        return {
          content: [
            {
              type: 'text',
              text: `✅ Added analysis to section: **${section}**\n\n**Key Analysis Points:**\n${analysis.split('\n').slice(0, 3).map(point => `• ${point}`).join('\n')}\n\n${insights && insights.length > 0 ? `**Key Insights:**\n${insights.map(insight => `💡 ${insight}`).join('\n')}` : ''}\n\n*Continue with \`reasoning_analyze\` for other sections or use \`reasoning_conclude\` to finalize.*`,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error analyzing reasoning: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 13: reasoning_frameworks
interface ReasoningFrameworksArgs {
  category?: string;
  difficulty?: string;
  search?: string;
  quality_level?: string;
}

export function registerReasoningFrameworks(server: McpServer) {
  server.registerTool(
    'reasoning_frameworks',
    {
      description: 'Browse and discover available reasoning frameworks',
      inputSchema: {
        category: z.string().optional().describe('Filter by category (strategic, analytical, technical, user-centric, operational, creative, risk)'),
        difficulty: z.string().optional().describe('Filter by difficulty level (beginner, intermediate, advanced)'),
        search: z.string().optional().describe('Search in names and descriptions'),
        quality_level: z.string().optional().describe('Filter by quality level (core, extended, experimental, custom)'),
      },
    },
    async (args: ReasoningFrameworksArgs): Promise<CallToolResult> => {
      try {
        await ensureFrameworkRegistryInitialized();

        const frameworks = frameworkRegistry.search(args.search || '', {
          category: args.category,
          difficulty: args.difficulty,
          quality_level: args.quality_level
        });

        const stats = frameworkRegistry.getStats();

        const frameworkText = frameworks.map(fw =>
`**${fw.name}** (${fw.id})
- **Category:** ${fw.category} | **Difficulty:** ${fw.difficulty} | **Quality:** ${fw.metadata.quality_level}
- **Description:** ${fw.description}
- **When to use:** ${fw.when_to_use.slice(0, 2).join(', ')}
- **Time estimate:** ${fw.estimated_time}
${fw.tags.length > 0 ? `- **Tags:** ${fw.tags.join(', ')}` : ''}
`
        ).join('\n\n');

        const statsText = `
**Framework Statistics:**
- Total frameworks: ${stats.total}
- By category: ${Object.entries(stats.byCategory).map(([cat, count]) => `${cat}: ${count}`).join(', ')}
- By quality: ${Object.entries(stats.byQuality).map(([qual, count]) => `${qual}: ${count}`).join(', ')}
- By difficulty: ${Object.entries(stats.byDifficulty).map(([diff, count]) => `${diff}: ${count}`).join(', ')}`;

        return {
          content: [{
            type: 'text',
            text: `# Available Reasoning Frameworks\n\n${frameworkText}\n\n${statsText}\n\n**Usage:**\n1. Start with \`reasoning_start\` using a framework ID\n2. Work through sections with \`reasoning_analyze\`\n3. Conclude with \`reasoning_conclude\`\n\n**Tip:** Use specific framework IDs like 'swot-analysis' or 'design-thinking'.`
          }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error listing frameworks: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// Tool 15: reasoning_conclude
interface ReasoningConcludeArgs {
  reasoning_id?: string;
  conclusions: string;
  recommendations: string[];
  confidence_level: 'low' | 'medium' | 'high';
  next_steps: string[];
}

export function registerReasoningConclude(server: McpServer) {
  server.registerTool(
    'reasoning_conclude',
    {
      description: 'Finalize reasoning session with conclusions and actionable recommendations',
      inputSchema: {
        reasoning_id: z.string().optional().describe('Reasoning session ID (default: most recent)'),
        conclusions: z.string().describe('Main conclusions from your analysis'),
        recommendations: z.array(z.string()).describe('Actionable recommendations based on conclusions'),
        confidence_level: z.enum(['low', 'medium', 'high']).describe('Confidence level in conclusions'),
        next_steps: z.array(z.string()).describe('Specific next steps to implement recommendations'),
      },
    },
    (args: ReasoningConcludeArgs): CallToolResult => {
      try {
        ensureWorkspaceExists();

        const activeId = getActiveTaskId();
        if (!activeId) {
          return {
            content: [{ type: 'text', text: 'No active task. Use workspace_create_task to begin.' }],
            isError: true,
          };
        }

        const { reasoning_id, conclusions, recommendations, confidence_level, next_steps } = args;
        const reasoningDir = getReasoningDir(activeId);

        // Find reasoning file (similar logic to reasoning_analyze)
        let reasoningFile = '';
        if (reasoning_id) {
          reasoningFile = join(reasoningDir, `${reasoning_id}.md`);
        } else {
          const files = readdirSync(reasoningDir)
            .filter((f: string) => f.endsWith('.md'))
            .sort((a, b) => {
              const statA = require('fs').statSync(join(reasoningDir, a));
              const statB = require('fs').statSync(join(reasoningDir, b));
              return statB.mtime.getTime() - statA.mtime.getTime();
            });

          if (files.length === 0) {
            return {
              content: [{ type: 'text', text: 'No reasoning sessions found. Use reasoning_start to begin.' }],
              isError: true,
            };
          }
          reasoningFile = join(reasoningDir, files[0]);
        }

        const content = readFileSync(reasoningFile, 'utf8');
        const timestamp = new Date().toISOString();

        const conclusionSection = `
## 🎯 Conclusions & Recommendations
**Completed:** ${timestamp}
**Confidence Level:** ${confidence_level.toUpperCase()}

### Main Conclusions
${conclusions}

### Recommendations
${recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

### Next Steps
${next_steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

### Decision
Based on this reasoning, the recommended approach is ready for implementation.

---
*Reasoning session completed and saved to workspace.*
`;

        const finalContent = content.replace('**Status:** in_progress', '**Status:** completed') + conclusionSection;
        writeFileSync(reasoningFile, finalContent, 'utf8');

        return {
          content: [
            {
              type: 'text',
              text: `✅ **Reasoning Session Completed**\n\n**Confidence:** ${confidence_level.toUpperCase()}\n**Conclusions:** ${conclusions}\n\n**Recommendations:**\n${recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}\n\n**Next Steps:**\n${next_steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\n*This reasoning is now documented in your workspace for future reference.*`,
            },
          ],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error concluding reasoning: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// ============================================================================
// REGISTRATION
// ============================================================================

export function registerAllWorkspaceTools(server: McpServer) {
  // Phase 1: Core tools (必须)
  registerWorkspaceInit(server);
  registerWorkspaceGetActive(server);
  registerWorkspaceCreateTask(server);
  registerWorkspaceReadStatus(server);
  registerWorkspaceUpdateStatus(server);

  // Phase 2: Document tools (重要)
  registerWorkspaceCreateFile(server);
  registerWorkspaceAddDecision(server);

  // Phase 3: Task management (有用)
  registerWorkspaceListTasks(server);
  registerWorkspaceSwitchTask(server);
  registerWorkspaceCompleteTask(server);

  // Phase 4: Advanced features (可选)
  registerWorkspaceSearch(server);
  registerWorkspaceGetContext(server);

  // Phase 5: Reasoning tools (高级认知工作流)
  registerReasoningStart(server);
  registerReasoningFrameworks(server);
  registerReasoningAnalyze(server);
  registerReasoningConclude(server);
}