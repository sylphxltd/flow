import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { type ProjectData, TemplateEngine } from '../utils/template-engine.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const Logger = {
  info: (message: string) => console.error(`[INFO] ${message}`),
  success: (message: string) => console.error(`[SUCCESS] ${message}`),
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function runGitCommand(command: string): { success: boolean; output: string; error: string } {
  try {
    const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
    return { success: true, output: output.trim(), error: '' };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, output: '', error: errorMessage };
  }
}

function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    Logger.info(`Created directory: ${dirPath}`);
  }
}

function createFile(filePath: string, content: string): void {
  writeFileSync(filePath, content, 'utf8');
  Logger.info(`Created file: ${filePath}`);
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export interface ProjectStartupArgs {
  project_type: 'feature' | 'bugfix' | 'hotfix' | 'refactor' | 'migration';
  project_name: string;
  description?: string;
  requirements?: string[];
  create_branch?: boolean;
  objective?: string;
  scope?: string;
  timeline?: string;
  budget?: string;
}

export function registerProjectStartupTool(server: McpServer) {
  server.registerTool(
    'project_startup',
    {
      description: 'Initialize a new project with comprehensive templates and workspace structure',
      inputSchema: {
        project_type: z
          .enum(['feature', 'bugfix', 'hotfix', 'refactor', 'migration'])
          .describe('Type of project'),
        project_name: z
          .string()
          .describe('Name of the project (use letters, numbers, hyphens, underscores only)'),
        description: z.string().optional().describe('Project description'),
        requirements: z.array(z.string()).optional().describe('List of project requirements'),
        create_branch: z
          .boolean()
          .optional()
          .describe('Whether to create a git branch (default: true)'),
        objective: z.string().optional().describe('Project objective'),
        scope: z.string().optional().describe('Project scope'),
        timeline: z.string().optional().describe('Project timeline'),
        budget: z.string().optional().describe('Project budget'),
      },
    },
    projectStartupTool
  );
}

export function projectStartupTool(args: ProjectStartupArgs): CallToolResult {
  try {
    const {
      project_type,
      project_name,
      description = '',
      requirements = [],
      create_branch = true,
      objective = '',
      scope = '',
      timeline = '',
      budget = '',
    } = args;

    // Validate project name
    if (!/^[a-zA-Z0-9-_]+$/.test(project_name)) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Invalid project name: "${project_name}". Use only letters, numbers, hyphens, and underscores.`,
          },
        ],
        isError: true,
      };
    }

    const branchName = `${project_type}/${project_name}`;
    const workspaceDir = join('specs', project_type, project_name);
    const timestamp = new Date().toISOString().split('T')[0];

    Logger.info(`🚀 Starting project initialization: ${branchName}`);

    // Step 1: Create and checkout git branch
    let branchResult = { success: true, output: '', error: '' };
    if (create_branch) {
      // Check if we're on main branch
      const currentBranch = runGitCommand('git rev-parse --abbrev-ref HEAD');
      if (currentBranch.success && currentBranch.output !== 'main') {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Not on main branch. Current branch: ${currentBranch.output}. Please switch to main first.`,
            },
          ],
          isError: true,
        };
      }

      // Create and checkout new branch
      branchResult = runGitCommand(`git checkout -b ${branchName}`);
      if (!branchResult.success) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Failed to create branch "${branchName}": ${branchResult.error}`,
            },
          ],
          isError: true,
        };
      }
      Logger.success(`✅ Created and checked out branch: ${branchName}`);
    }

    // Step 2: Create workspace directory structure
    ensureDirectoryExists(workspaceDir);

    // Step 3: Prepare template data
    const projectData: ProjectData = {
      PROJECT_NAME: project_name,
      PROJECT_TYPE: project_type,
      DESCRIPTION: description,
      REQUIREMENTS: requirements,
      TIMESTAMP: timestamp,
      BRANCH_NAME: branchName,

      // Progress specific
      CURRENT_PHASE: 'Phase 1: SPECIFY & CLARIFY',
      LAST_UPDATED: new Date().toISOString(),
      NEXT_ACTION: 'Complete requirements specification and proceed to Phase 2',
      STATUS: 'Not Started',

      // Plan specific
      OBJECTIVE: objective || `Implement ${project_name}`,
      SCOPE: scope || 'To be defined',
      TIMELINE: timeline || 'To be defined',
      BUDGET: budget || 'To be defined',

      // Tasks specific
      CRITICAL_PATH: 'To be defined during task breakdown',
      PARALLEL_OPPORTUNITIES: 'To be identified during planning',
      RESOURCE_CONFLICTS: 'To be resolved during planning',
      INTEGRATION_POINTS: 'To be identified during design',

      // Validation specific
      VALIDATED_BY: 'To be assigned',
      VALIDATION_DATE: timestamp,
      OVERALL_STATUS: 'Pending',

      // Reviews specific
      REVIEW_PERIOD: `${timestamp} onwards`,
      TOTAL_REVIEWS: '0',
      QUALITY_SCORE: '0',
    };

    // Step 4: Generate all templates
    const templateEngine = new TemplateEngine();
    const templates = templateEngine.generateAllProjectTemplates(projectData);

    // Step 5: Create all template files
    const filesCreated = [];
    for (const [templateName, content] of Object.entries(templates)) {
      const filePath = join(workspaceDir, `${templateName}.md`);
      createFile(filePath, content);
      filesCreated.push(`${templateName}.md`);
    }

    // Step 6: Initial commit
    if (create_branch) {
      const addResult = runGitCommand('git add .');
      const commitResult = runGitCommand(
        `git commit -m "feat(${project_name}): initialize project workspace and comprehensive templates"`
      );

      if (!addResult.success || !commitResult.success) {
        Logger.error('Warning: Failed to create initial commit');
      } else {
        Logger.success('✅ Created initial commit with project templates');
      }
    }

    Logger.success(`✅ Project "${project_name}" initialized successfully!`);

    return {
      content: [
        {
          type: 'text',
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
                scope,
                timeline,
                budget,
              },
              setup: {
                branch_created: create_branch && branchResult.success,
                workspace_created: true,
                templates_created: filesCreated,
                initial_commit: create_branch,
              },
              next_steps: [
                `1. Review and update specs/${project_type}/${project_name}/spec.md with detailed requirements`,
                '2. Fill in project-specific data in all template files',
                '3. Proceed with Phase 1: SPECIFY & CLARIFY',
                '4. Follow the workflow in progress.md',
              ],
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error('Error in project startup', error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error initializing project: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
