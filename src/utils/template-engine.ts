import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface TemplateData {
  [key: string]: string | number | boolean | string[];
}

export class TemplateEngine {
  private templatesDir: string;
  private mode: 'coordinator' | 'implementer';

  constructor(templatesDir: string, mode: 'coordinator' | 'implementer' = 'coordinator') {
    this.templatesDir = templatesDir;
    this.mode = mode;
  }

  private loadTemplate(templateName: string): string {
    // Shared templates (spec, plan, validation, reviews) are in shared folder
    const sharedTemplates = ['spec', 'plan', 'validation', 'reviews'];

    if (sharedTemplates.includes(templateName)) {
      const templatePath = join(this.templatesDir, 'shared', `${templateName}-template.md`);
      return readFileSync(templatePath, 'utf8');
    }

    // Mode-specific templates (tasks, progress) are in mode folder
    const templatePath = join(this.templatesDir, this.mode, `${templateName}-template.md`);
    return readFileSync(templatePath, 'utf8');
  }

  private replaceVariables(template: string, data: TemplateData): string {
    let result = template;

    // Replace simple variables {{VARIABLE}}
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    // Handle conditional blocks {{#if CONDITION}} ... {{/if}}
    result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_, condition, content) => {
      const value = data[condition];
      return value && value !== 'false' && value !== '0' && value !== '' ? content : '';
    });

    // Handle loops {{#each ARRAY}} ... {{/each}}
    result = result.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (_, arrayName, content) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) {
        return '';
      }

      return array
        .map((item, index) => {
          let itemContent = content;
          itemContent = itemContent.replace(/{{this}}/g, String(item));
          itemContent = itemContent.replace(/{{@index}}/g, String(index));
          return itemContent;
        })
        .join('\n');
    });

    return result;
  }

  generateTemplate(templateName: string, data: TemplateData): string {
    const template = this.loadTemplate(templateName);
    return this.replaceVariables(template, data);
  }

  createFile(templateName: string, data: TemplateData, outputPath: string): void {
    const content = this.generateTemplate(templateName, data);
    writeFileSync(outputPath, content, 'utf8');
  }

  generateAllProjectTemplates(projectData: ProjectData): { [key: string]: string } {
    const templates: { [key: string]: string } = {};

    const templateNames = ['spec', 'progress', 'plan', 'tasks', 'validation', 'reviews'];

    for (const templateName of templateNames) {
      templates[templateName] = this.generateTemplate(templateName, projectData);
    }

    return templates;
  }
}

export interface ProjectData extends TemplateData {
  PROJECT_NAME: string;
  PROJECT_TYPE: string;
  DESCRIPTION: string;
  REQUIREMENTS: string[];
  TIMESTAMP: string;
  BRANCH_NAME: string;
  PROJECT_ID: string;

  // Progress specific
  CURRENT_PHASE: string;
  NEXT_ACTION: string;
  STATUS: string;

  // Plan specific
  OBJECTIVE: string;
  SCOPE: string;

  // Tasks specific
  CRITICAL_PATH: string;
  PARALLEL_OPPORTUNITIES: string;
  RESOURCE_CONFLICTS: string;
  INTEGRATION_POINTS: string;

  // Validation specific
  VALIDATED_BY: string;
  VALIDATION_DATE: string;
  OVERALL_STATUS: string;

  // Reviews specific
  REVIEW_PERIOD: string;
  TOTAL_REVIEWS: string;
  QUALITY_SCORE: string;
}
