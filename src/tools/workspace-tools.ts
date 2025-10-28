import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { cryptoUtils } from '../utils/security.js';

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
}