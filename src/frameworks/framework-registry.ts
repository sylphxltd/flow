import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

// Framework directories
const FRAMEWORKS_DIR = 'src/frameworks/definitions';
const CORE_DIR = join(FRAMEWORKS_DIR, 'core');
const STRATEGIC_DIR = join(FRAMEWORKS_DIR, 'strategic');
const TECHNICAL_DIR = join(FRAMEWORKS_DIR, 'technical');
const USER_CENTRIC_DIR = join(FRAMEWORKS_DIR, 'user-centric');
const OPERATIONAL_DIR = join(FRAMEWORKS_DIR, 'operational');
const CUSTOM_DIR = join(FRAMEWORKS_DIR, 'custom');

// Ensure framework directories exist
function ensureFrameworkDirectories(): void {
  const dirs = [
    FRAMEWORKS_DIR,
    CORE_DIR,
    STRATEGIC_DIR,
    TECHNICAL_DIR,
    USER_CENTRIC_DIR,
    OPERATIONAL_DIR,
    CUSTOM_DIR
  ];

  dirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}

// Framework type definition
export interface ReasoningFramework {
  id: string;
  name: string;
  description: string;
  category: 'strategic' | 'analytical' | 'technical' | 'user-centric' | 'operational' | 'creative' | 'risk';
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
    ensureFrameworkDirectories();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load all frameworks from directories
    await this.loadFrameworksFromDirectory(CORE_DIR);
    await this.loadFrameworksFromDirectory(STRATEGIC_DIR);
    await this.loadFrameworksFromDirectory(TECHNICAL_DIR);
    await this.loadFrameworksFromDirectory(USER_CENTRIC_DIR);
    await this.loadFrameworksFromDirectory(OPERATIONAL_DIR);
    await this.loadFrameworksFromDirectory(CUSTOM_DIR);

    this.initialized = true;
    console.log(`Framework registry initialized with ${this.frameworks.size} frameworks`);
  }

  private async loadFrameworksFromDirectory(directory: string): Promise<void> {
    if (!existsSync(directory)) return;

    const files = readdirSync(directory).filter(file => file.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = join(directory, file);
        const content = readFileSync(filePath, 'utf8');
        const framework = JSON.parse(content) as ReasoningFramework;

        // Validate framework schema
        this.validateFramework(framework);

        this.frameworks.set(framework.id, framework);
      } catch (error) {
        console.error(`Error loading framework from ${file}:`, error);
      }
    }
  }

  private validateFramework(framework: any): void {
    // Basic validation - in production, use JSON Schema validation
    if (!framework.id || !framework.name || !framework.structure || !framework.prompts) {
      throw new Error(`Framework missing required fields: ${framework.id || 'unknown'}`);
    }

    if (!Array.isArray(framework.structure) || framework.structure.length < 2) {
      throw new Error(`Framework structure must be an array with at least 2 sections: ${framework.id}`);
    }

    if (!Array.isArray(framework.prompts) || framework.prompts.length < 2) {
      throw new Error(`Framework prompts must be an array with at least 2 items: ${framework.id}`);
    }
  }

  register(framework: ReasoningFramework): void {
    this.validateFramework(framework);
    this.frameworks.set(framework.id, framework);

    // Save to appropriate directory based on category
    const directory = this.getDirectoryForCategory(framework.category);
    const filePath = join(directory, `${framework.id}.json`);
    writeFileSync(filePath, JSON.stringify(framework, null, 2), 'utf8');
  }

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
    return this.getAll().filter(f => f.category === category);
  }

  getByQualityLevel(quality: string): ReasoningFramework[] {
    if (!this.initialized) {
      throw new Error('Framework registry not initialized. Call initialize() first.');
    }
    return this.getAll().filter(f => f.metadata.quality_level === quality);
  }

  search(query: string, filters?: {
    category?: string;
    difficulty?: string;
    quality_level?: string;
    tags?: string[];
  }): ReasoningFramework[] {
    if (!this.initialized) {
      throw new Error('Framework registry not initialized. Call initialize() first.');
    }

    let results = this.getAll();

    // Text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(f =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.description.toLowerCase().includes(lowerQuery) ||
        f.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply filters
    if (filters?.category) {
      results = results.filter(f => f.category === filters.category);
    }

    if (filters?.difficulty) {
      results = results.filter(f => f.difficulty === filters.difficulty);
    }

    if (filters?.quality_level) {
      results = results.filter(f => f.metadata.quality_level === filters.quality_level);
    }

    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter(f =>
        filters.tags.some(tag => f.tags.includes(tag))
      );
    }

    return results;
  }

  getRecommendationsForSituation(situation: string, context?: string): Array<{
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
      const searchText = `${framework.description} ${framework.when_to_use.join(' ')} ${framework.tags.join(' ')}`.toLowerCase();

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
          reason
        });
      }
    }

    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Top 3 recommendations
  }

  private getDirectoryForCategory(category: string): string {
    switch (category) {
      case 'strategic': return STRATEGIC_DIR;
      case 'technical': return TECHNICAL_DIR;
      case 'user-centric': return USER_CENTRIC_DIR;
      case 'operational': return OPERATIONAL_DIR;
      default: return CUSTOM_DIR;
    }
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
      byCategory: frameworks.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byQuality: frameworks.reduce((acc, f) => {
        acc[f.metadata.quality_level] = (acc[f.metadata.quality_level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byDifficulty: frameworks.reduce((acc, f) => {
        acc[f.difficulty] = (acc[f.difficulty] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

// Global registry instance
export const frameworkRegistry = new FrameworkRegistry();