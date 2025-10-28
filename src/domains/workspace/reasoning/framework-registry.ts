import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

// Framework directories - automatically detect correct path
function getFrameworksDir(): string {
  // Try new workspace path first
  if (existsSync('src/domains/workspace/frameworks')) {
    return 'src/domains/workspace/frameworks';
  }
  // Try legacy development path
  if (existsSync('src/frameworks/definitions')) {
    return 'src/frameworks/definitions';
  }
  // Fall back to production path (frameworks copied to dist/)
  if (existsSync('domains/workspace/frameworks')) {
    return 'domains/workspace/frameworks';
  }
  if (existsSync('frameworks/definitions')) {
    return 'frameworks/definitions';
  }
  // Try dist/frameworks (when running from project root)
  if (existsSync('dist/domains/workspace/frameworks')) {
    return 'dist/domains/workspace/frameworks';
  }
  if (existsSync('dist/frameworks/definitions')) {
    return 'dist/frameworks/definitions';
  }
  // Default to new development path (will show warning if not found)
  return 'src/domains/workspace/frameworks';
}

// Note: Framework definitions are static source files managed by developers
// Do not auto-create framework directories - frameworks should be explicitly added

// Framework type definition
export interface ReasoningFramework {
  id: string;
  name: string;
  description: string;
  category:
    | 'strategic'
    | 'analytical'
    | 'technical'
    | 'user-centric'
    | 'operational'
    | 'creative'
    | 'risk';
  subcategory?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_time: string;
  structure: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  prompts: string[];
  when_to_use: string[];
  when_not_to_use?: string[];
  examples: Array<{
    title: string;
    description: string;
  }>;
  tags: string[];
  metadata: {
    version: string;
    author: string;
    quality_level: 'core' | 'extended' | 'experimental' | 'custom';
    created_date?: string;
    last_updated?: string;
    validation_status?: {
      validated_by: string;
      validation_date: string;
      validation_notes?: string;
      effectiveness_rating?: number;
    };
    usage_stats?: {
      total_uses: number;
      user_satisfaction: number;
      completion_rate: number;
    };
  };
  prerequisites?: string[];
  related_frameworks?: string[];
}

// Framework registry class
export class FrameworkRegistry {
  private frameworks: Map<string, ReasoningFramework> = new Map();
  private initialized = false;

  constructor() {
    // Framework definitions are static source files - no auto-creation needed
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load all frameworks from source definitions directory
    const frameworksDir = getFrameworksDir();
    await this.loadFrameworksFromDirectory(frameworksDir);

    this.initialized = true;
    console.log(`Framework registry initialized with ${this.frameworks.size} frameworks`);
  }

  private async loadFrameworksFromDirectory(directory: string): Promise<void> {
    if (!existsSync(directory)) {
      console.warn(
        `Warning: Framework directory '${directory}' not found. This may indicate a development setup issue.`
      );
      return;
    }

    // Recursively find all JSON files in subdirectories
    function findJsonFiles(dir: string): string[] {
      const files: string[] = [];
      const items = readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = join(dir, item.name);
        if (item.isDirectory()) {
          files.push(...findJsonFiles(fullPath));
        } else if (item.isFile() && item.name.endsWith('.json')) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const files = findJsonFiles(directory);

    for (const filePath of files) {
      try {
        const content = readFileSync(filePath, 'utf8');
        const framework = JSON.parse(content) as ReasoningFramework;

        // Validate framework schema
        this.validateFramework(framework);

        this.frameworks.set(framework.id, framework);
      } catch (error) {
        console.error(`Error loading framework from ${filePath}:`, error);
      }
    }
  }

  private validateFramework(framework: any): void {
    // Basic validation - in production, use JSON Schema validation
    if (!framework.id || !framework.name || !framework.structure || !framework.prompts) {
      throw new Error(`Framework missing required fields: ${framework.id || 'unknown'}`);
    }

    if (!Array.isArray(framework.structure) || framework.structure.length < 2) {
      throw new Error(
        `Framework structure must be an array with at least 2 sections: ${framework.id}`
      );
    }

    if (!Array.isArray(framework.prompts) || framework.prompts.length < 2) {
      throw new Error(`Framework prompts must be an array with at least 2 items: ${framework.id}`);
    }
  }

  // Note: register method removed since we don't support custom frameworks
  // All frameworks are predefined in src/frameworks/definitions/

  get(id: string): ReasoningFramework | undefined {
    if (!this.initialized) {
      throw new Error('Framework registry not initialized. Call initialize() first.');
    }
    return this.frameworks.get(id);
  }

  getAll(): ReasoningFramework[] {
    if (!this.initialized) {
      throw new Error('Framework registry not initialized. Call initialize() first.');
    }
    return Array.from(this.frameworks.values());
  }

  getByCategory(category: string): ReasoningFramework[] {
    if (!this.initialized) {
      throw new Error('Framework registry not initialized. Call initialize() first.');
    }
    return this.getAll().filter((f) => f.category === category);
  }

  getByQualityLevel(quality: string): ReasoningFramework[] {
    if (!this.initialized) {
      throw new Error('Framework registry not initialized. Call initialize() first.');
    }
    return this.getAll().filter((f) => f.metadata.quality_level === quality);
  }

  search(
    query: string,
    filters?: {
      category?: string;
      difficulty?: string;
      quality_level?: string;
      tags?: string[];
    }
  ): ReasoningFramework[] {
    if (!this.initialized) {
      throw new Error('Framework registry not initialized. Call initialize() first.');
    }

    let results = this.getAll();

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (f) =>
          f.name.toLowerCase().includes(lowerQuery) ||
          f.description.toLowerCase().includes(lowerQuery) ||
          f.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply filters
    if (filters?.category) {
      results = results.filter((f) => f.category === filters.category);
    }

    if (filters?.difficulty) {
      results = results.filter((f) => f.difficulty === filters.difficulty);
    }

    if (filters?.quality_level) {
      results = results.filter((f) => f.metadata.quality_level === filters.quality_level);
    }

    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter((f) => filters.tags.some((tag) => f.tags.includes(tag)));
    }

    return results;
  }

  getRecommendationsForSituation(
    situation: string,
    context?: string
  ): Array<{
    framework: ReasoningFramework;
    confidence: number;
    reason: string;
  }> {
    if (!this.initialized) {
      throw new Error('Framework registry not initialized. Call initialize() first.');
    }

    // Simple recommendation logic - in production, use AI/ML
    const allFrameworks = this.getAll();
    const situationLower = situation.toLowerCase();
    const contextLower = context?.toLowerCase() || '';

    const recommendations: Array<{
      framework: ReasoningFramework;
      confidence: number;
      reason: string;
    }> = [];

    for (const framework of allFrameworks) {
      let score = 0;
      let reason = '';

      // Check if situation keywords match framework description or when_to_use
      const searchText =
        `${framework.description} ${framework.when_to_use.join(' ')} ${framework.tags.join(' ')}`.toLowerCase();

      if (searchText.includes('strategic') && situationLower.includes('strategy')) {
        score += 3;
        reason = 'Matches strategic decision making needs';
      }

      if (searchText.includes('risk') && situationLower.includes('risk')) {
        score += 3;
        reason = 'Designed for risk assessment scenarios';
      }

      if (searchText.includes('design') && situationLower.includes('design')) {
        score += 2;
        reason = 'Suitable for design-related decisions';
      }

      if (searchText.includes('decision') && situationLower.includes('decision')) {
        score += 2;
        reason = 'General decision-making framework';
      }

      if (score > 0) {
        recommendations.push({
          framework,
          confidence: Math.min(score / 3, 1), // Normalize to 0-1
          reason,
        });
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 3); // Top 3 recommendations
  }

  // Get statistics about frameworks
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    byQuality: Record<string, number>;
    byDifficulty: Record<string, number>;
  } {
    if (!this.initialized) {
      throw new Error('Framework registry not initialized. Call initialize() first.');
    }

    const frameworks = this.getAll();

    return {
      total: frameworks.length,
      byCategory: frameworks.reduce(
        (acc, f) => {
          acc[f.category] = (acc[f.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      byQuality: frameworks.reduce(
        (acc, f) => {
          acc[f.metadata.quality_level] = (acc[f.metadata.quality_level] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      byDifficulty: frameworks.reduce(
        (acc, f) => {
          acc[f.difficulty] = (acc[f.difficulty] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }
}

// Global registry instance
export const frameworkRegistry = new FrameworkRegistry();
