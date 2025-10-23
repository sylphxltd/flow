import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTemplatesDir } from '../utils/paths.js';
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

export function generateRandomSuffix(): string {
  // Generate a random 8-character string (lowercase letters and numbers)
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `-${result}`;
}

export function generateCommitMessage(projectType: string, projectName: string): string {
  // Map project types to conventional commit types
  const commitTypeMap: Record<string, string> = {
    feature: 'feat',
    bugfix: 'fix',
    hotfix: 'fix',
    refactor: 'refactor',
    migration: 'feat',
  };

  const commitType = commitTypeMap[projectType] || 'feat';
  const scope = projectType; // Use project type as scope

  return `${commitType}(${scope}): initialize ${projectName} workspace and comprehensive templates`;
}

function generateProjectDetails(
  projectType: string,
  projectName: string
): {
  description: string;
  requirements: string[];
  objective: string;
  scope: string;
} {
  // Generate intelligent defaults based on project type and name
  const descriptions = {
    feature: `New feature implementation for ${projectName}`,
    bugfix: `Bug fix for ${projectName} issue`,
    hotfix: `Critical hotfix for ${projectName}`,
    refactor: `Code refactoring for ${projectName}`,
    migration: `Migration project for ${projectName}`,
  };

  const requirements = {
    feature: [
      'Define feature specifications',
      'Implement core functionality',
      'Write comprehensive tests',
      'Update documentation',
      'Code review and validation',
    ],
    bugfix: [
      'Identify root cause',
      'Implement fix',
      'Add regression tests',
      'Verify fix resolves issue',
      'Update documentation if needed',
    ],
    hotfix: [
      'Implement immediate fix',
      'Test critical path',
      'Deploy hotfix',
      'Schedule proper fix follow-up',
    ],
    refactor: [
      'Analyze current code structure',
      'Plan refactoring approach',
      'Implement refactored code',
      'Ensure all tests pass',
      'Update documentation',
    ],
    migration: [
      'Analyze current system',
      'Plan migration strategy',
      'Implement migration code',
      'Test migration process',
      'Deploy and verify',
    ],
  };

  const objectives = {
    feature: `Successfully implement the ${projectName} feature with full functionality and testing`,
    bugfix: `Resolve the ${projectName} issue completely and prevent recurrence`,
    hotfix: `Quickly address critical ${projectName} issue to restore system stability`,
    refactor: `Improve code quality and maintainability for ${projectName}`,
    migration: `Successfully migrate ${projectName} to new system with minimal disruption`,
  };

  const scopes = {
    feature: 'Implementation of new feature including frontend, backend, tests, and documentation',
    bugfix: 'Fix for specific issue including root cause analysis and prevention measures',
    hotfix: 'Minimal change to address critical issue with immediate deployment',
    refactor: 'Code structure improvements without changing external behavior',
    migration: 'Complete migration of existing functionality to new system or platform',
  };

  return {
    description:
      descriptions[projectType as keyof typeof descriptions] || `Project for ${projectName}`,
    requirements: requirements[projectType as keyof typeof requirements] || [
      'Define requirements',
      'Implement solution',
      'Test and validate',
    ],
    objective:
      objectives[projectType as keyof typeof objectives] ||
      `Complete ${projectName} project successfully`,
    scope: scopes[projectType as keyof typeof scopes] || 'Project scope to be defined',
  };
}

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
  create_branch?: boolean;
  mode?: 'coordinator' | 'implementer';
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
        create_branch: z
          .boolean()
          .optional()
          .describe('Whether to create a git branch (default: true)'),
        mode: z
          .enum(['coordinator', 'implementer'])
          .optional()
          .describe(
            'Execution mode: coordinator (delegation-based) or implementer (direct execution). Default: coordinator'
          ),
      },
    },
    projectStartupTool
  );
}

export function projectStartupTool(args: ProjectStartupArgs): CallToolResult {
  try {
    const { project_type, project_name, create_branch = true, mode = 'coordinator' } = args;

    // Generate project details automatically
    const generatedDetails = generateProjectDetails(project_type, project_name);
    const { description, requirements, objective, scope } = generatedDetails;

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

    const branchSuffix = generateRandomSuffix();
    const branchName = `${project_type}/${project_name}${branchSuffix}`;
    const workspaceDir = join('specs', project_type, `${project_name}${branchSuffix}`);
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
      PROJECT_ID: `${project_name}${branchSuffix}`, // Unique identifier

      // Progress specific
      CURRENT_PHASE: 'Phase 1: Requirements Analysis',
      LAST_UPDATED: new Date().toISOString(),
      NEXT_ACTION: 'Complete requirements specification and proceed to Phase 2',
      STATUS: 'Not Started',

      // Phase 1-8: Not Started (Phase 1 is current but 0% complete)
      PHASE_1_STATUS: 'In Progress',
      PHASE_1_COMPLETE: '0',
      PHASE_1_UPDATED: new Date().toISOString(),
      PHASE_1_NOTES: 'Starting requirements analysis (0% complete)',

      PHASE_2_STATUS: 'Not Started',
      PHASE_2_COMPLETE: '0',
      PHASE_2_UPDATED: new Date().toISOString(),
      PHASE_2_NOTES: 'Awaiting research and clarification',

      PHASE_3_STATUS: 'Not Started',
      PHASE_3_COMPLETE: '0',
      PHASE_3_UPDATED: new Date().toISOString(),
      PHASE_3_NOTES: 'Awaiting design phase',

      PHASE_4_STATUS: 'Not Started',
      PHASE_4_COMPLETE: '0',
      PHASE_4_UPDATED: new Date().toISOString(),
      PHASE_4_NOTES: 'Awaiting task breakdown',

      PHASE_5_STATUS: 'Not Started',
      PHASE_5_COMPLETE: '0',
      PHASE_5_UPDATED: new Date().toISOString(),
      PHASE_5_NOTES: 'Awaiting validation',

      PHASE_6_STATUS: 'Not Started',
      PHASE_6_COMPLETE: '0',
      PHASE_6_UPDATED: new Date().toISOString(),
      PHASE_6_NOTES: 'Awaiting implementation',

      PHASE_7_STATUS: 'Not Started',
      PHASE_7_COMPLETE: '0',
      PHASE_7_UPDATED: new Date().toISOString(),
      PHASE_7_NOTES: 'Awaiting testing and review',

      PHASE_8_STATUS: 'Not Started',
      PHASE_8_COMPLETE: '0',
      PHASE_8_UPDATED: new Date().toISOString(),
      PHASE_8_NOTES: 'Awaiting final merge',

      // Plan specific
      OBJECTIVE: objective || `Implement ${project_name}`,
      SCOPE: scope || 'To be defined',

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
      REVIEW_DATE: timestamp,
      REVIEWER: 'To be assigned',
      REVIEW_SCOPE: 'Full implementation review',
      IMPLEMENTATION_STATUS: 'Not Started',

      // Validation specific
      VALIDATOR: 'To be assigned',
      VALIDATION_SCOPE: 'Full project validation',
      REQUIREMENTS_COVERAGE_STATUS: 'Pending',
      ACCEPTANCE_CRITERIA_MAPPED: 'Pending',
      SUCCESS_CRITERIA_MEASURABLE: 'Pending',
      SCOPE_CREEP_PREVENTION: 'Pending',
      ARCHITECTURE_ALIGNMENT: 'Pending',
      INTEGRATION_POINTS_VERIFIED: 'Pending',
      DESIGN_CONFLICTS_RESOLVED: 'Pending',
      TECHNICAL_FEASIBILITY: 'Pending',
      TASK_COMPLETENESS: 'Pending',
      DEPENDENCY_MAPPING_ACCURACY: 'Pending',
      RESOURCE_ALLOCATION_ADEQUATE: 'Pending',
      CRITICAL_PATH_IDENTIFIED: 'Pending',
      TDD_STRATEGY_DEFINED: 'Pending',

      // Task verification
      TASK_1_ID: 'TASK-001',
      TASK_1_DESC: 'To be defined',
      TASK_1_STATUS: 'Not Started',
      TASK_1_COMPLETION: '0',
      TASK_1_DELIVERABLE: 'To be defined',
      TASK_1_QUALITY: 'Pending',

      TASK_2_ID: 'TASK-002',
      TASK_2_DESC: 'To be defined',
      TASK_2_STATUS: 'Not Started',
      TASK_2_COMPLETION: '0',
      TASK_2_DELIVERABLE: 'To be defined',
      TASK_2_QUALITY: 'Pending',

      TASK_3_ID: 'TASK-003',
      TASK_3_DESC: 'To be defined',
      TASK_3_STATUS: 'Not Started',
      TASK_3_COMPLETION: '0',
      TASK_3_DELIVERABLE: 'To be defined',
      TASK_3_QUALITY: 'Pending',

      OVERALL_TASK_COMPLETION: '0',
      ALL_TASKS_COMPLETED: 'No',

      // Git analysis
      TOTAL_COMMITS: '0',
      COMMITS_PER_TASK: '0',
      COMMIT_QUALITY: 'Pending',
      BRANCH_STRATEGY_COMPLIANCE: 'Pending',
    };

    // Step 4: Generate all templates with mode-specific templates
    const templatesDir = getTemplatesDir();
    const templateEngine = new TemplateEngine(templatesDir, mode);
    const templates = templateEngine.generateAllProjectTemplates(projectData);

    // Step 5: Create all template files
    const filesCreated: string[] = [];
    for (const [templateName, content] of Object.entries(templates)) {
      const filePath = join(workspaceDir, `${templateName}.md`);
      createFile(filePath, content);
      filesCreated.push(`${templateName}.md`);
    }

    // Step 6: Initial commit
    if (create_branch) {
      const addResult = runGitCommand('git add .');
      const commitResult = runGitCommand(
        `git commit -m "${generateCommitMessage(project_type, project_name)}"`
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
