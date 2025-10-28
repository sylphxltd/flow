/**
 * Workspace Reasoning Tools - 工作區推理工具
 * All tools for structured reasoning and decision-making
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { frameworkRegistry } from './framework-registry.js';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const WORKSPACE_DIR = '.sylphx-flow/workspace';
const REASONING_DIR = join(WORKSPACE_DIR, 'reasoning');

interface ReasoningStartArgs {
  title: string;
  framework: string;
  problem_description: string;
  context?: string;
}

interface ReasoningAnalyzeArgs {
  reasoning_id?: string;
  section: string;
  analysis: string;
  insights?: string[];
}

interface ReasoningFrameworksArgs {
  category?: string;
  difficulty?: string;
  search?: string;
  quality_level?: string;
}

interface ReasoningConcludeArgs {
  reasoning_id?: string;
  conclusions: string;
  recommendations: string[];
  confidence_level: 'low' | 'medium' | 'high';
  next_steps?: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function ensureReasoningDir(): string {
  if (!existsSync(REASONING_DIR)) {
    mkdirSync(REASONING_DIR, { recursive: true });
  }
  return REASONING_DIR;
}

function generateReasoningId(): string {
  return `reasoning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function ensureFrameworkRegistryInitialized(): Promise<void> {
  if (!frameworkRegistry.isInitialized()) {
    await frameworkRegistry.initialize();
  }
}

// ============================================================================
// REASONING TOOLS
// ============================================================================

/**
 * Register reasoning start tool
 */
export function registerReasoningStart(server: McpServer): void {
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
          status: 'in_progress',
          sections: frameworkInfo.structure.map(section => ({
            name: section.name,
            description: section.description,
            completed: false,
            analysis: '',
            insights: []
          }))
        };

        const reasoningDir = ensureReasoningDir();
        const reasoningPath = join(reasoningDir, `${reasoningId}.md`);

        // Create markdown file
        const content = generateReasoningMarkdown(reasoningData, frameworkInfo);
        writeFileSync(reasoningPath, content, 'utf8');

        return {
          content: [{
            type: 'text',
            text: `✅ Started reasoning session: ${reasoningId}\n\n📋 **Framework:** ${frameworkInfo.name}\n🎯 **Problem:** ${problem_description}\n\n**Next Steps:**\n1. Use \`reasoning_analyze\` to work through each section\n2. Use \`reasoning_conclude\` to finalize conclusions\n\n📁 **File saved to:** ${reasoningPath}`
          }],
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

/**
 * Register reasoning analyze tool
 */
export function registerReasoningAnalyze(server: McpServer): void {
  server.registerTool(
    'reasoning_analyze',
    {
      description: 'Add structured analysis to a specific section of your reasoning framework',
      inputSchema: {
        reasoning_id: z.string().optional().describe('Reasoning session ID (default: most recent)'),
        section: z.string().describe('Section name to analyze'),
        analysis: z.string().describe('Your detailed analysis for this section'),
        insights: z.array(z.string()).optional().describe('Key insights discovered during analysis'),
      },
    },
    async (args: ReasoningAnalyzeArgs): Promise<CallToolResult> => {
      try {
        const { reasoning_id, section, analysis, insights } = args;

        // Find reasoning file
        let reasoningFile: string;
        if (reasoning_id) {
          reasoningFile = join(ensureReasoningDir(), `${reasoning_id}.md`);
        } else {
          // Find most recent reasoning file
          const files = readFileSync(ensureReasoningDir(), { withFileTypes: true })
            .filter(file => file.isFile() && file.name.endsWith('.md'))
            .sort((a, b) => {
              const statA = a.statSync();
              const statB = b.statSync();
              return statB.mtime.getTime() - statA.mtime.getTime();
            });

          if (files.length === 0) {
            return {
              content: [{ type: 'text', text: 'No reasoning sessions found. Use reasoning_start to begin.' }],
              isError: true,
            };
          }
          reasoningFile = join(ensureReasoningDir(), files[0].name);
        }

        if (!existsSync(reasoningFile)) {
          return {
            content: [{ type: 'text', text: `Reasoning session not found: ${reasoning_id || 'latest'}` }],
            isError: true,
          };
        }

        // Update the file with new analysis
        const content = readFileSync(reasoningFile, 'utf8');
        const updatedContent = addAnalysisToSection(content, section, analysis, insights || []);
        writeFileSync(reasoningFile, updatedContent, 'utf8');

        return {
          content: [{
            type: 'text',
            text: `✅ Added analysis to section: **${section}**\n\n**Key Analysis Points:**\n${analysis.split('\n').slice(0, 3).map(point => `• ${point}`).join('\n')}\n\n${insights && insights.length > 0 ? `**Key Insights:**\n${insights.map(insight => `💡 ${insight}`).join('\n')}` : ''}\n\n*Continue with \`reasoning_analyze\` for other sections or use \`reasoning_conclude\` to finalize.*`
          }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error analyzing section: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

/**
 * Register reasoning frameworks tool
 */
export function registerReasoningFrameworks(server: McpServer): void {
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

        const frameworkText = frameworks.map(f =>
          `**${f.name}** (\`${f.id}\`)\n${f.description}\n- **Category:** ${f.category} | **Difficulty:** ${f.difficulty} | **Time:** ${f.estimated_time}\n- **When to use:** ${f.when_to_use.slice(0, 2).join(', ')}\n`
        ).join('\n');

        const statsText = `**Available:** ${stats.total} frameworks | **By category:** ${Object.entries(stats.byCategory).map(([cat, count]) => `${cat}: ${count}`).join(', ')} | By difficulty: ${Object.entries(stats.byDifficulty).map(([diff, count]) => `${diff}: ${count}`).join(', ')}`;

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

/**
 * Register reasoning conclude tool
 */
export function registerReasoningConclude(server: McpServer): void {
  server.registerTool(
    'reasoning_conclude',
    {
      description: 'Finalize reasoning session with conclusions and actionable recommendations',
      inputSchema: {
        reasoning_id: z.string().optional().describe('Reasoning session ID (default: most recent)'),
        conclusions: z.string().describe('Main conclusions from your analysis'),
        recommendations: z.array(z.string()).describe('Specific, actionable recommendations'),
        confidence_level: z.enum(['low', 'medium', 'high']).describe('Confidence level in conclusions'),
        next_steps: z.array(z.string()).optional().describe('Next steps to implement recommendations'),
      },
    },
    async (args: ReasoningConcludeArgs): Promise<CallToolResult> => {
      try {
        const { reasoning_id, conclusions, recommendations, confidence_level, next_steps } = args;

        // Find reasoning file (similar logic to reasoning_analyze)
        let reasoningFile: string;
        if (reasoning_id) {
          reasoningFile = join(ensureReasoningDir(), `${reasoning_id}.md`);
        } else {
          const files = readFileSync(ensureReasoningDir(), { withFileTypes: true })
            .filter(file => file.isFile() && file.name.endsWith('.md'))
            .sort((a, b) => {
              const statA = a.statSync();
              const statB = b.statSync();
              return statB.mtime.getTime() - statA.mtime.getTime();
            });

          if (files.length === 0) {
            return {
              content: [{ type: 'text', text: 'No reasoning sessions found. Use reasoning_start to begin.' }],
              isError: true,
            };
          }
          reasoningFile = join(ensureReasoningDir(), files[0].name);
        }

        if (!existsSync(reasoningFile)) {
          return {
            content: [{ type: 'text', text: `Reasoning session not found: ${reasoning_id || 'latest'}` }],
            isError: true,
          };
        }

        // Add conclusions to the file
        const content = readFileSync(reasoningFile, 'utf8');
        const conclusionSection = generateConclusionSection(conclusions, recommendations, confidence_level, next_steps || []);
        const updatedContent = content + '\n\n' + conclusionSection;
        writeFileSync(reasoningFile, updatedContent, 'utf8');

        const confidenceEmoji = confidence_level === 'high' ? '🟢' : confidence_level === 'medium' ? '🟡' : '🔴';

        return {
          content: [{
            type: 'text',
            text: `🎉 **Reasoning Session Complete** ${confidenceEmoji}\n\n**Conclusions:**\n${conclusions}\n\n**Recommendations:**\n${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}\n\n**Confidence Level:** ${confidence_level.toUpperCase()}\n\n${next_steps && next_steps.length > 0 ? `**Next Steps:**\n${next_steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}` : ''}\n\n*Reasoning session saved and ready for reference.*`
          }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error concluding reasoning session: ${errorMessage}` }],
          isError: true,
        };
      }
    }
  );
}

// ============================================================================
// HELPER FUNCTIONS FOR CONTENT GENERATION
// ============================================================================

function generateReasoningMarkdown(data: any, framework: any): string {
  return `# ${data.title}

**Framework:** ${framework.name}
**Problem:** ${data.problem_description}
**Created:** ${data.created_at}
**Status:** In Progress

---

## 📋 Framework Structure

${framework.structure.map((section: any, index: number) => `
### ${index + 1}. ${section.name} ${section.required ? '*' : ''}

${section.description}

*Status:* ⏳ Not started
`).join('\n')}

---

## 🎯 Usage Instructions

1. Use \`reasoning_analyze\` to complete each section in order
2. Provide detailed analysis for each section
3. Use \`reasoning_conclude\` when all sections are complete

*Required sections are marked with asterisks (*)`
}

function addAnalysisToSection(content: string, sectionName: string, analysis: string, insights: string[]): string {
  // This is a simplified version - in a real implementation, you'd parse the markdown
  // and update the specific section
  return content + `\n\n## Analysis: ${sectionName}\n\n${analysis}\n\n${insights.length > 0 ? `**Insights:**\n${insights.map(insight => `• ${insight}`).join('\n')}` : ''}`;
}

function generateConclusionSection(conclusions: string, recommendations: string[], confidence: string, nextSteps: string[]): string {
  return `---

## 🎯 Conclusions

${conclusions}

## 📋 Recommendations

${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## 📊 Confidence Level

**${confidence.toUpperCase()}** ${confidence === 'high' ? '🟢' : confidence === 'medium' ? '🟡' : '🔴'}

${nextSteps.length > 0 ? `
## 🚀 Next Steps

${nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}
` : ''}

---

*Reasoning session completed on ${new Date().toISOString()}*`;
}