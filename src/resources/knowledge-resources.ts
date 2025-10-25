/**
 * Knowledge Resources - 知識庫資源
 * 提供知識庫內容嘅存取功能
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export interface KnowledgeResource {
  uri: string;
  title: string;
  description: string;
  content: string;
  category: 'stacks' | 'guides' | 'universal' | 'data';
}

/**
 * 獲取所有知識庫資源
 */
export function getAllKnowledgeResources(): KnowledgeResource[] {
  return [
    // Stack-specific patterns
    {
      uri: 'knowledge://stacks/react-app',
      title: 'React App',
      description: 'React application patterns, hooks, components, and best practices',
      content: '', // Content will be loaded from files
      category: 'stacks',
    },
    {
      uri: 'knowledge://stacks/nextjs-app',
      title: 'Next.js App',
      description: 'Next.js patterns, routing, API routes, and deployment strategies',
      content: '',
      category: 'stacks',
    },
    {
      uri: 'knowledge://stacks/node-api',
      title: 'Node.js API',
      description: 'Node.js API patterns, middleware, authentication, and database integration',
      content: '',
      category: 'stacks',
    },

    // Data patterns
    {
      uri: 'knowledge://data/sql',
      title: 'SQL Patterns',
      description: 'SQL queries, indexing, migrations, and database optimization',
      content: '',
      category: 'data',
    },

    // Architecture guides
    {
      uri: 'knowledge://guides/saas-template',
      title: 'SaaS Template',
      description: 'SaaS application architecture, multi-tenancy, and scaling patterns',
      content: '',
      category: 'guides',
    },
    {
      uri: 'knowledge://guides/tech-stack',
      title: 'Tech Stack Guide',
      description: 'Technology selection, architecture decisions, and stack composition',
      content: '',
      category: 'guides',
    },
    {
      uri: 'knowledge://guides/ui-ux',
      title: 'UI/UX Patterns',
      description: 'User interface patterns, UX principles, and frontend architecture',
      content: '',
      category: 'guides',
    },

    // Universal concerns
    {
      uri: 'knowledge://universal/security',
      title: 'Security',
      description:
        'Security best practices, authentication, authorization, and vulnerability prevention',
      content: '',
      category: 'universal',
    },
    {
      uri: 'knowledge://universal/performance',
      title: 'Performance',
      description: 'Performance optimization, caching, monitoring, and scaling strategies',
      content: '',
      category: 'universal',
    },
    {
      uri: 'knowledge://universal/testing',
      title: 'Testing',
      description: 'Testing strategies, unit tests, integration tests, and quality assurance',
      content: '',
      category: 'universal',
    },
    {
      uri: 'knowledge://universal/deployment',
      title: 'Deployment',
      description: 'Deployment strategies, CI/CD, infrastructure, and monitoring',
      content: '',
      category: 'universal',
    },
  ];
}

/**
 * 根據 URI 獲取知識庫內容
 */
export function getKnowledgeContent(uri: string): string {
  const resources = getAllKnowledgeResources();
  const resource = resources.find((r) => r.uri === uri);

  if (!resource) {
    throw new Error(`Knowledge resource not found: ${uri}`);
  }

  // 呢度可以從實際檔案加載內容，而家為簡化返回基本資訊
  const category = uri.split('/')[2];
  const _name = uri.split('/').pop();

  return `# ${resource.title}

**URI:** ${uri}
**Category:** ${category}
**Description:** ${resource.description}

*Note: This is a placeholder implementation. In a full implementation, this would load the actual content from knowledge files.*`;
}
