/**
 * Knowledge Resources - 知識庫資源
 * 動態掃描文件夾並讀取 frontmatter 來提供知識庫內容
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { getKnowledgeDir } from '../utils/paths.js';

export interface KnowledgeResource {
  uri: string;
  title: string;
  description: string;
  content: string;
  category: 'stacks' | 'guides' | 'universal' | 'data';
  filePath?: string;
  lastModified?: string;
}

export interface KnowledgeFrontmatter {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  author?: string;
  lastUpdated?: string;
}

/**
 * 知識庫配置
 */
interface KnowledgeConfig {
  knowledgeDir: string;
  supportedExtensions: string[];
  cacheTimeout: number; // milliseconds
}

const DEFAULT_CONFIG: KnowledgeConfig = {
  knowledgeDir: getKnowledgeDir(),
  supportedExtensions: ['.md'],
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

/**
 * 知識庫掃描器
 */
class KnowledgeScanner {
  private cache = new Map<string, { data: KnowledgeResource[]; timestamp: number }>();
  private config: KnowledgeConfig;

  constructor(config: Partial<KnowledgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 掃描知識庫目錄並獲取所有資源
   */
  async scanKnowledgeResources(): Promise<KnowledgeResource[]> {
    const cacheKey = 'all_resources';
    const cached = this.cache.get(cacheKey);

    // 檢查緩存是否有效
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      logger.debug('Returning cached knowledge resources');
      return cached.data;
    }

    try {
      logger.info('Scanning knowledge directory', { dir: this.config.knowledgeDir });

      const resources: KnowledgeResource[] = [];
      const categories = await this.getCategories();

      // 並行掃描所有類別
      const scanPromises = categories.map(async (category) => {
        const categoryResources = await this.scanCategory(category);
        return categoryResources;
      });

      const categoryResults = await Promise.all(scanPromises);
      categoryResults.forEach((categoryResources) => {
        resources.push(...categoryResources);
      });

      // 緩存結果
      this.cache.set(cacheKey, {
        data: resources,
        timestamp: Date.now(),
      });

      logger.info('Knowledge scan completed', {
        totalResources: resources.length,
        categories: categories.length,
      });

      return resources;
    } catch (error) {
      logger.error('Failed to scan knowledge resources', {
        error: (error as Error).message,
        dir: this.config.knowledgeDir,
      });
      throw error;
    }
  }

  /**
   * 獲取所有類別
   */
  private async getCategories(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.config.knowledgeDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => !name.startsWith('.')); // 忽略隱藏文件夾
    } catch (error) {
      logger.warn('Failed to read knowledge directory', {
        error: (error as Error).message,
        dir: this.config.knowledgeDir,
      });
      return [];
    }
  }

  /**
   * 掃描特定類別
   */
  private async scanCategory(category: string): Promise<KnowledgeResource[]> {
    const categoryPath = path.join(this.config.knowledgeDir, category);
    const resources: KnowledgeResource[] = [];

    try {
      const files = await fs.readdir(categoryPath);
      const markdownFiles = files.filter((file) =>
        this.config.supportedExtensions.some((ext) => file.endsWith(ext))
      );

      // 並行處理所有文件
      const filePromises = markdownFiles.map(async (file) => {
        const filePath = path.join(categoryPath, file);
        return this.processFile(filePath, category);
      });

      const fileResults = await Promise.allSettled(filePromises);
      fileResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          resources.push(result.value);
        } else if (result.status === 'rejected') {
          logger.warn('Failed to process knowledge file', {
            file: markdownFiles[index],
            error: result.reason,
          });
        }
      });

      logger.debug('Category scan completed', {
        category,
        filesFound: markdownFiles.length,
        resourcesProcessed: resources.length,
      });

      return resources;
    } catch (error) {
      logger.warn('Failed to scan category', {
        category,
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * 處理單個文件
   */
  private async processFile(filePath: string, category: string): Promise<KnowledgeResource | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const frontmatter = this.parseFrontmatter(content);

      if (!frontmatter) {
        logger.warn('No frontmatter found in file', { filePath });
        return null;
      }

      // 生成 URI
      const fileName = path.basename(filePath, path.extname(filePath));
      const uri = `knowledge://${category}/${fileName}`;

      // 獲取文件統計信息
      const stats = await fs.stat(filePath);

      const resource: KnowledgeResource = {
        uri,
        title: frontmatter.name,
        description: frontmatter.description,
        content: this.extractMainContent(content),
        category: this.mapCategory(category),
        filePath,
        lastModified: stats.mtime.toISOString(),
      };

      logger.debug('Knowledge resource processed', {
        uri,
        title: resource.title,
        category: resource.category,
      });

      return resource;
    } catch (error) {
      logger.error('Failed to process knowledge file', {
        filePath,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * 解析 frontmatter
   */
  private parseFrontmatter(content: string): KnowledgeFrontmatter | null {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return null;
    }

    try {
      // 簡單的 YAML 解析（可以考慮使用 js-yaml 庫）
      const frontmatterText = match[1];
      const frontmatter: Partial<KnowledgeFrontmatter> = {};

      // 解析 key: value 格式
      frontmatterText.split('\n').forEach((line) => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          let value = line.substring(colonIndex + 1).trim();

          // 移除引號
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }

          (frontmatter as any)[key] = value;
        }
      });

      // 驗證必需字段
      if (!frontmatter.name || !frontmatter.description) {
        return null;
      }

      return frontmatter as KnowledgeFrontmatter;
    } catch (error) {
      logger.warn('Failed to parse frontmatter', {
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * 提取主要內容（移除 frontmatter）
   */
  private extractMainContent(content: string): string {
    const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
    return content.replace(frontmatterRegex, '').trim();
  }

  /**
   * 映射類別
   */
  private mapCategory(folderName: string): 'stacks' | 'guides' | 'universal' | 'data' {
    const categoryMap: Record<string, 'stacks' | 'guides' | 'universal' | 'data'> = {
      stacks: 'stacks',
      guides: 'guides',
      universal: 'universal',
      data: 'data',
      database: 'data',
      architecture: 'guides',
      patterns: 'guides',
    };

    return categoryMap[folderName.toLowerCase()] || 'guides';
  }

  /**
   * 根據 URI 獲取完整內容
   */
  async getKnowledgeContent(uri: string): Promise<string> {
    try {
      const resources = await this.scanKnowledgeResources();
      const resource = resources.find((r) => r.uri === uri);

      if (!resource) {
        throw new Error(`Knowledge resource not found: ${uri}`);
      }

      if (!resource.filePath) {
        throw new Error(`No file path for resource: ${uri}`);
      }

      // 讀取完整文件內容
      const fullContent = await fs.readFile(resource.filePath, 'utf-8');
      const mainContent = this.extractMainContent(fullContent);

      return mainContent;
    } catch (error) {
      logger.error('Failed to get knowledge content', {
        uri,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * 清除緩存
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Knowledge cache cleared');
  }
}

// 全局掃描器實例
const knowledgeScanner = new KnowledgeScanner();

/**
 * 獲取所有知識庫資源（動態掃描）
 */
export async function getAllKnowledgeResources(): Promise<KnowledgeResource[]> {
  return knowledgeScanner.scanKnowledgeResources();
}

/**
 * 根據 URI 獲取知識庫內容
 */
export async function getKnowledgeContent(uri: string): Promise<string> {
  return knowledgeScanner.getKnowledgeContent(uri);
}

/**
 * 根據類別獲取知識庫資源
 */
export async function getKnowledgeResourcesByCategory(
  category: 'stacks' | 'guides' | 'universal' | 'data'
): Promise<KnowledgeResource[]> {
  const allResources = await getAllKnowledgeResources();
  return allResources.filter((resource) => resource.category === category);
}

/**
 * 搜索知識庫資源
 */
export async function searchKnowledgeResources(
  query: string,
  options?: {
    category?: 'stacks' | 'guides' | 'universal' | 'data';
    limit?: number;
  }
): Promise<KnowledgeResource[]> {
  const allResources = await getAllKnowledgeResources();
  const queryLower = query.toLowerCase();

  let filtered = allResources.filter(
    (resource) =>
      resource.title.toLowerCase().includes(queryLower) ||
      resource.description.toLowerCase().includes(queryLower) ||
      resource.content.toLowerCase().includes(queryLower)
  );

  // 按類別過濾
  if (options?.category) {
    filtered = filtered.filter((resource) => resource.category === options.category);
  }

  // 限制結果數量
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * 清除知識庫緩存
 */
export function clearKnowledgeCache(): void {
  knowledgeScanner.clearCache();
}

/**
 * 註冊 MCP 工具
 */
export function registerKnowledgeTools(server: McpServer): void {
  // 獲取所有知識資源
  server.tool(
    'get-all-knowledge-resources',
    'Get all available knowledge resources',
    {
      category: z
        .enum(['stacks', 'guides', 'universal', 'data'])
        .optional()
        .describe('Filter by category'),
    },
    async ({ category }) => {
      try {
        const resources = category
          ? await getKnowledgeResourcesByCategory(category)
          : await getAllKnowledgeResources();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: resources.length,
                  resources: resources.map((r) => ({
                    uri: r.uri,
                    title: r.title,
                    description: r.description,
                    category: r.category,
                    lastModified: r.lastModified,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // 獲取知識內容
  server.tool(
    'get-knowledge-content',
    'Get full content of a knowledge resource',
    {
      uri: z.string().describe('Knowledge resource URI'),
    },
    async ({ uri }) => {
      try {
        const content = await getKnowledgeContent(uri);
        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // 搜索知識庫
  server.tool(
    'search-knowledge',
    'Search knowledge resources',
    {
      query: z.string().describe('Search query'),
      category: z
        .enum(['stacks', 'guides', 'universal', 'data'])
        .optional()
        .describe('Filter by category'),
      limit: z.number().optional().describe('Maximum results'),
    },
    async ({ query, category, limit }) => {
      try {
        const results = await searchKnowledgeResources(query, {
          category,
          limit,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query,
                  total: results.length,
                  results: results.map((r) => ({
                    uri: r.uri,
                    title: r.title,
                    description: r.description,
                    category: r.category,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );
}
