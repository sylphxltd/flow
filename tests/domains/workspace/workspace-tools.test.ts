/**
 * Workspace Tools Tests
 * Tests for the 5 stateless workspace task management tools
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Import the workspace tools functions
import {
  registerWorkspaceCreateTask,
  registerWorkspaceReadTask,
  registerWorkspaceUpdateTask,
  registerWorkspaceListTasks,
  registerWorkspaceCompleteTask,
} from '../../../src/domains/workspace/tasks/tools.js';

// Mock MCP server
class MockMCPServer {
  private tools: Map<string, any> = new Map();

  registerTool(name: string, config: any, handler: any) {
    this.tools.set(name, { config, handler });
  }

  getTool(name: string) {
    return this.tools.get(name);
  }

  async callTool(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    return await tool.handler(args);
  }
}

describe('Workspace Tools - Stateless Design', () => {
  let mockServer: MockMCPServer;
  let originalCwd: string;
  let testDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `workspace-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Change to test directory
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Create fresh mock server
    mockServer = new MockMCPServer();

    // Register all workspace tools
    registerWorkspaceCreateTask(mockServer as any);
    registerWorkspaceReadTask(mockServer as any);
    registerWorkspaceUpdateTask(mockServer as any);
    registerWorkspaceListTasks(mockServer as any);
    registerWorkspaceCompleteTask(mockServer as any);
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);

    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('workspace_create_task', () => {
    it('should create a new task and return task_id', async () => {
      const result = await mockServer.callTool('workspace_create_task', {
        name: 'Test Task',
        goal: 'Test the task creation functionality',
        priority: 'high',
      });

      expect(result.content).toBeDefined();
      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('created');
      expect(response.task_id).toBeDefined();
      expect(response.task_id).toMatch(/^test-task-[a-z0-9]{6}$/);
      expect(response.path).toBe(`.sylphx-flow/workspace/tasks/${response.task_id}`);
    });

    it('should generate unique task IDs', async () => {
      const result1 = await mockServer.callTool('workspace_create_task', {
        name: 'Task One',
        goal: 'First task',
      });

      const result2 = await mockServer.callTool('workspace_create_task', {
        name: 'Task One',
        goal: 'Second task with same name',
      });

      const taskId1 = JSON.parse(result1.content[0].text).task_id;
      const taskId2 = JSON.parse(result2.content[0].text).task_id;

      expect(taskId1).not.toBe(taskId2);
    });

    it('should create STATUS.md with correct format', async () => {
      const result = await mockServer.callTool('workspace_create_task', {
        name: 'Format Test',
        goal: 'Test STATUS.md format',
        priority: 'medium',
      });

      const taskId = JSON.parse(result.content[0].text).task_id;
      const statusPath = join('.sylphx-flow/workspace/tasks', taskId, 'STATUS.md');

      expect(existsSync(statusPath)).toBe(true);

      const content = readFileSync(statusPath, 'utf8');

      // Check YAML frontmatter format
      expect(content).toContain('task_id: ' + taskId);
      expect(content).toContain('name: Format Test');
      expect(content).toContain('goal: Test STATUS.md format');
      expect(content).toContain('priority: medium');
      expect(content).toContain('phase: Investigation');
      expect(content).toContain('## Last Action');
      expect(content).toContain('Task created');
      expect(content).toContain('## Next Action');
    });

    it('should default to medium priority when not specified', async () => {
      const result = await mockServer.callTool('workspace_create_task', {
        name: 'Default Priority',
        goal: 'Test default priority',
      });

      const taskId = JSON.parse(result.content[0].text).task_id;
      const statusPath = join('.sylphx-flow/workspace/tasks', taskId, 'STATUS.md');
      const content = readFileSync(statusPath, 'utf8');

      expect(content).toContain('priority: medium');
    });

    it('should sanitize task name for task_id', async () => {
      const result = await mockServer.callTool('workspace_create_task', {
        name: 'Test Task!!! With @Special #Characters',
        goal: 'Test sanitization',
      });

      const taskId = JSON.parse(result.content[0].text).task_id;

      // Should be lowercase, alphanumeric + hyphens only
      expect(taskId).toMatch(/^[a-z0-9-]+$/);
      expect(taskId).toContain('test-task');
    });
  });

  describe('workspace_read_task', () => {
    let createdTaskId: string;

    beforeEach(async () => {
      // Create a task to read
      const result = await mockServer.callTool('workspace_create_task', {
        name: 'Read Test Task',
        goal: 'Test reading task state',
        priority: 'high',
      });

      createdTaskId = JSON.parse(result.content[0].text).task_id;
    });

    it('should read existing task state', async () => {
      const result = await mockServer.callTool('workspace_read_task', {
        task_id: createdTaskId,
      });

      const response = JSON.parse(result.content[0].text);

      expect(response.task_id).toBe(createdTaskId);
      expect(response.name).toBe('Read Test Task');
      expect(response.goal).toBe('Test reading task state');
      expect(response.phase).toBe('Investigation');
      expect(response.last_action).toBe('Task created');
      expect(response.next_action).toContain('requirements');
      expect(response.files).toEqual([]);
      expect(response.is_archived).toBe(false);
    });

    it('should return error for non-existent task', async () => {
      const result = await mockServer.callTool('workspace_read_task', {
        task_id: 'non-existent-task-id',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should list additional files in task directory', async () => {
      // Create additional file in task directory
      const taskDir = join('.sylphx-flow/workspace/tasks', createdTaskId);
      const designPath = join(taskDir, 'DESIGN.md');
      mkdirSync(taskDir, { recursive: true });
      require('fs').writeFileSync(designPath, '# Design Document');

      const result = await mockServer.callTool('workspace_read_task', {
        task_id: createdTaskId,
      });

      const response = JSON.parse(result.content[0].text);

      expect(response.files).toContain('DESIGN.md');
      expect(response.files).not.toContain('STATUS.md'); // STATUS.md excluded
    });
  });

  describe('workspace_update_task', () => {
    let taskId: string;

    beforeEach(async () => {
      const result = await mockServer.callTool('workspace_create_task', {
        name: 'Update Test',
        goal: 'Test task updates',
      });

      taskId = JSON.parse(result.content[0].text).task_id;
    });

    it('should update last_action and next_action', async () => {
      const result = await mockServer.callTool('workspace_update_task', {
        task_id: taskId,
        updates: {
          last_action: 'Completed investigation',
          next_action: 'Begin implementation',
        },
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('updated');

      // Verify the update
      const readResult = await mockServer.callTool('workspace_read_task', {
        task_id: taskId,
      });

      const state = JSON.parse(readResult.content[0].text);
      expect(state.last_action).toBe('Completed investigation');
      expect(state.next_action).toBe('Begin implementation');
    });

    it('should update phase', async () => {
      await mockServer.callTool('workspace_update_task', {
        task_id: taskId,
        updates: {
          phase: 'Implementation',
        },
      });

      const readResult = await mockServer.callTool('workspace_read_task', {
        task_id: taskId,
      });

      const state = JSON.parse(readResult.content[0].text);
      expect(state.phase).toBe('Implementation');
    });

    it('should append notes to Notes section', async () => {
      await mockServer.callTool('workspace_update_task', {
        task_id: taskId,
        updates: {
          notes: 'This is a test note',
        },
      });

      const statusPath = join('.sylphx-flow/workspace/tasks', taskId, 'STATUS.md');
      const content = readFileSync(statusPath, 'utf8');

      expect(content).toContain('## Notes');
      expect(content).toContain('This is a test note');
    });

    it('should return updated fields in response', async () => {
      const result = await mockServer.callTool('workspace_update_task', {
        task_id: taskId,
        updates: {
          last_action: 'Test action',
          phase: 'Testing',
        },
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.updated_fields).toContain('last_action');
      expect(response.updated_fields).toContain('phase');
    });

    it('should return error for non-existent task', async () => {
      const result = await mockServer.callTool('workspace_update_task', {
        task_id: 'non-existent-id',
        updates: {
          phase: 'Testing',
        },
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('workspace_list_tasks', () => {
    beforeEach(async () => {
      // Create multiple tasks
      await mockServer.callTool('workspace_create_task', {
        name: 'Task 1',
        goal: 'First task',
        priority: 'high',
      });

      await mockServer.callTool('workspace_create_task', {
        name: 'Task 2',
        goal: 'Second task',
        priority: 'medium',
      });

      await mockServer.callTool('workspace_create_task', {
        name: 'Task 3',
        goal: 'Third task',
        priority: 'low',
      });
    });

    it('should list all active tasks by default', async () => {
      const result = await mockServer.callTool('workspace_list_tasks', {});

      const response = JSON.parse(result.content[0].text);

      expect(response.total).toBe(3);
      expect(response.tasks).toHaveLength(3);
      expect(response.tasks[0]).toHaveProperty('task_id');
      expect(response.tasks[0]).toHaveProperty('name');
      expect(response.tasks[0]).toHaveProperty('phase');
      expect(response.tasks[0]).toHaveProperty('created');
    });

    it('should filter by status (active)', async () => {
      const result = await mockServer.callTool('workspace_list_tasks', {
        status: 'active',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.total).toBe(3);
    });

    it('should limit number of results', async () => {
      const result = await mockServer.callTool('workspace_list_tasks', {
        limit: 2,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.tasks).toHaveLength(2);
      // Note: total also respects limit in current implementation
    });

    it('should return empty list when no tasks exist', async () => {
      // Clean up all tasks
      const tasksDir = join('.sylphx-flow/workspace/tasks');
      if (existsSync(tasksDir)) {
        rmSync(tasksDir, { recursive: true, force: true });
      }

      const result = await mockServer.callTool('workspace_list_tasks', {});

      const response = JSON.parse(result.content[0].text);
      expect(response.total).toBe(0);
      expect(response.tasks).toHaveLength(0);
    });
  });

  describe('workspace_complete_task', () => {
    let taskId: string;

    beforeEach(async () => {
      const result = await mockServer.callTool('workspace_create_task', {
        name: 'Complete Test',
        goal: 'Test task completion',
      });

      taskId = JSON.parse(result.content[0].text).task_id;
    });

    it('should archive task to archive directory', async () => {
      const result = await mockServer.callTool('workspace_complete_task', {
        task_id: taskId,
        summary: 'Task completed successfully',
      });

      const response = JSON.parse(result.content[0].text);

      expect(response.status).toBe('completed');
      expect(response.archived_to).toBe(`.sylphx-flow/workspace/archive/${taskId}`);

      // Verify task moved to archive
      const archivePath = join('.sylphx-flow/workspace/archive', taskId);
      expect(existsSync(archivePath)).toBe(true);

      // Verify task removed from active tasks
      const activePath = join('.sylphx-flow/workspace/tasks', taskId);
      expect(existsSync(activePath)).toBe(false);
    });

    it('should add completion summary to STATUS.md', async () => {
      await mockServer.callTool('workspace_complete_task', {
        task_id: taskId,
        summary: 'All objectives achieved',
      });

      const statusPath = join('.sylphx-flow/workspace/archive', taskId, 'STATUS.md');
      const content = readFileSync(statusPath, 'utf8');

      expect(content).toContain('## Completion');
      expect(content).toContain('All objectives achieved');
    });

    it('should add completion timestamp', async () => {
      await mockServer.callTool('workspace_complete_task', {
        task_id: taskId,
        summary: 'Completed',
      });

      const statusPath = join('.sylphx-flow/workspace/archive', taskId, 'STATUS.md');
      const content = readFileSync(statusPath, 'utf8');

      expect(content).toMatch(/\*\*Completed:\*\* \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return error for non-existent task', async () => {
      const result = await mockServer.callTool('workspace_complete_task', {
        task_id: 'non-existent-id',
        summary: 'Test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should list completed tasks separately', async () => {
      // Complete the task
      await mockServer.callTool('workspace_complete_task', {
        task_id: taskId,
        summary: 'Done',
      });

      // List active tasks - should be empty
      const activeResult = await mockServer.callTool('workspace_list_tasks', {
        status: 'active',
      });
      const activeResponse = JSON.parse(activeResult.content[0].text);
      expect(activeResponse.total).toBe(0);

      // List completed tasks - should have our task
      const completedResult = await mockServer.callTool('workspace_list_tasks', {
        status: 'completed',
      });
      const completedResponse = JSON.parse(completedResult.content[0].text);
      expect(completedResponse.total).toBe(1);
      expect(completedResponse.tasks[0].task_id).toBe(taskId);
    });
  });

  describe('Integration - Stateless Design', () => {
    it('should support concurrent task operations', async () => {
      // Create multiple tasks in parallel
      const createPromises = [
        mockServer.callTool('workspace_create_task', {
          name: 'Concurrent 1',
          goal: 'Test 1',
        }),
        mockServer.callTool('workspace_create_task', {
          name: 'Concurrent 2',
          goal: 'Test 2',
        }),
        mockServer.callTool('workspace_create_task', {
          name: 'Concurrent 3',
          goal: 'Test 3',
        }),
      ];

      const results = await Promise.all(createPromises);

      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        const response = JSON.parse(result.content[0].text);
        expect(response.status).toBe('created');
        expect(response.task_id).toBeDefined();
      });

      // All task IDs should be unique
      const taskIds = results.map((r) => JSON.parse(r.content[0].text).task_id);
      const uniqueIds = new Set(taskIds);
      expect(uniqueIds.size).toBe(3);
    });

    it('should persist state between operations', async () => {
      // Create task
      const createResult = await mockServer.callTool('workspace_create_task', {
        name: 'Persistence Test',
        goal: 'Test state persistence',
      });
      const taskId = JSON.parse(createResult.content[0].text).task_id;

      // Update task
      await mockServer.callTool('workspace_update_task', {
        task_id: taskId,
        updates: {
          phase: 'Implementation',
          last_action: 'Started coding',
          next_action: 'Continue implementation',
        },
      });

      // Read task - should have updates
      const readResult = await mockServer.callTool('workspace_read_task', {
        task_id: taskId,
      });
      const state = JSON.parse(readResult.content[0].text);

      expect(state.phase).toBe('Implementation');
      expect(state.last_action).toBe('Started coding');
      expect(state.next_action).toBe('Continue implementation');
    });
  });
});
