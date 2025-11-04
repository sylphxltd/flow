import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Simple template data interface
export interface TemplateData {
  [key: string]: string | number | boolean | string[];
}

/**
 * Simple template engine for basic variable replacement
 * For complex templates, consider using Handlebars or Mustache
 */
export class TemplateEngine {
  private templatesDir: string;
  private mode: 'coordinator' | 'implementer';

  constructor(templatesDir: string, mode: 'coordinator' | 'implementer' = 'coordinator') {
    this.templatesDir = templatesDir;
    this.mode = mode;
  }

  /**
   * Load template from file system
   */
  private loadTemplate(templateName: string): string {
    // Shared templates are in shared folder
    const sharedTemplates = ['spec', 'plan', 'validation', 'reviews'];

    if (sharedTemplates.includes(templateName)) {
      const templatePath = join(this.templatesDir, 'shared', `${templateName}-template.md`);
      return readFileSync(templatePath, 'utf8');
    }

    // Mode-specific templates are in mode folder
    const templatePath = join(this.templatesDir, this.mode, `${templateName}-template.md`);
    return readFileSync(templatePath, 'utf8');
  }

  /**
   * Render template with data - simple variable replacement only
   */
  render(templateName: string, data: TemplateData): string {
    const template = this.loadTemplate(templateName);
    return this.replaceVariables(template, data);
  }

  /**
   * Replace simple variables {{VARIABLE}}
   */
  private replaceVariables(template: string, data: TemplateData): string {
    let result = template;

    // Replace simple variables {{VARIABLE}}
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    // Handle simple conditionals {{#if CONDITION}} ... {{/if}}
    result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (_, condition, content) => {
      const value = data[condition];
      return value && value !== 'false' && value !== '0' && value !== '' ? content : '';
    });

    // Handle simple loops {{#each ARRAY}} ... {{/each}}
    result = result.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (_, arrayName, content) => {
      const array = data[arrayName];
      if (!Array.isArray(array)) {
        return '';
      }

      return array
        .map((item) => {
          const itemData = { item: String(item) };
          let itemResult = content;
          for (const [key, value] of Object.entries(itemData)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            itemResult = itemResult.replace(regex, value);
          }
          return itemResult;
        })
        .join('\n');
    });

    return result;
  }

  /**
   * Render template string directly (without loading from file)
   */
  renderString(template: string, data: TemplateData): string {
    return this.replaceVariables(template, data);
  }
}
