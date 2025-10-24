/**
 * Auto .gitignore manager - 自動 .gitignore 管理器
 * 運行時自動添加必要的數據庫規則，無需手動管理
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export class AutoGitignoreManager {
  private gitignorePath: string;

  constructor() {
    this.gitignorePath = path.join(process.cwd(), '.gitignore');
  }

  /**
   * 確保數據庫規則存在於 .gitignore 中
   */
  ensureDatabaseRules(): void {
    try {
      // 如果 .gitignore 不存在，創建一個基本的
      if (!fs.existsSync(this.gitignorePath)) {
        this.createBasicGitignore();
      }

      const content = fs.readFileSync(this.gitignorePath, 'utf-8');
      const lines = content.split('\n');
      const existingRules = new Set(
        lines.map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
      );

      // 需要添加的數據庫規則
      const databaseRules = [
        '# Sylphx Flow Database Files (Auto-managed)',
        '# Cache database (temporary, should NOT be committed)',
        '.sylphx-flow/cache.db',
        '.sylphx-flow/cache.db-*',
        '.sylphx-flow/cache.db-shm',
        '.sylphx-flow/cache.db-wal',
        '# Memory database backups and temporary files',
        '.sylphx-flow/memory.db.backup*',
        '.sylphx-flow/memory.db.tmp*',
        '.sylphx-flow/memory.db-shm',
        '.sylphx-flow/memory.db-wal',
        '# Old/backup databases',
        '.sylphx-flow/*.db.old',
        '.sylphx-flow/*.db.backup*',
        '# Database journal files',
        '*.db-journal',
        '*.db-wal',
        '*.sqlite-journal',
        '*.sqlite-wal',
      ];

      // 檢查是否需要添加規則
      const missingRules = databaseRules.filter(
        (rule) => !existingRules.has(rule.replace(/#.*$/, '').trim())
      );

      if (missingRules.length > 0) {
        // 添加缺失的規則
        const newContent = content.endsWith('\n') ? content : content + '\n';
        const updatedContent = newContent + '\n' + missingRules.join('\n') + '\n';

        fs.writeFileSync(this.gitignorePath, updatedContent, 'utf-8');
        console.error(`[INFO] Added ${missingRules.length} database rules to .gitignore`);
      }
    } catch (error) {
      console.error('[WARN] Failed to update .gitignore:', (error as Error).message);
    }
  }

  /**
   * 創建基本的 .gitignore 文件
   */
  private createBasicGitignore(): void {
    const basicContent = `# Sylphx Flow - Auto-generated .gitignore
# This file is automatically managed by Sylphx Flow

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Temporary files
*.tmp
*.log
node_modules/

# Claude Flow generated files
.claude/settings.local.json
.mcp.json
claude-flow.config.json
.swarm/
.hive-mind/
.claude-flow/
memory/
coordination/
memory/claude-flow-data.json
memory/sessions/*
!memory/sessions/README.md
memory/agents/*
!memory/agents/README.md
coordination/memory_bank/*
coordination/subtasks/*
coordination/orchestration/*
claude-flow

## Vector search indexes (generated at runtime)
*.hnsw
*.meta.json
.sylphx-flow/search-cache/

## Build artifacts and temporary files
dist/lancedb.*.node
package-lock.json
*.tgz

## Unused vector storage implementations
src/utils/hnsw-vector-storage.ts
src/utils/simple-vector-storage.ts

# Removed Windows wrapper files per user request
hive-mind-prompt-*.txt
.secrets/
`;

    fs.writeFileSync(this.gitignorePath, basicContent, 'utf-8');
    console.error('[INFO] Created basic .gitignore file');
  }

  /**
   * 清理舊的或重複的數據庫規則
   */
  cleanupOldRules(): void {
    try {
      if (!fs.existsSync(this.gitignorePath)) {
        return;
      }

      const content = fs.readFileSync(this.gitignorePath, 'utf-8');
      const lines = content.split('\n');

      // 移除重複的非註釋行
      const seen = new Set<string>();
      const cleanedLines: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed && !trimmed.startsWith('#')) {
          if (seen.has(trimmed)) {
            continue; // 跳過重複
          }
          seen.add(trimmed);
        }

        cleanedLines.push(line);
      }

      const cleanedContent = cleanedLines.join('\n');

      if (cleanedContent !== content) {
        fs.writeFileSync(this.gitignorePath, cleanedContent, 'utf-8');
        console.error('[INFO] Cleaned up duplicate .gitignore rules');
      }
    } catch (error) {
      console.error('[WARN] Failed to cleanup .gitignore:', (error as Error).message);
    }
  }

  /**
   * 初始化自動 .gitignore 管理
   */
  initialize(): void {
    this.cleanupOldRules();
    this.ensureDatabaseRules();
  }
}

// 導出單例實例
export const autoGitignore = new AutoGitignoreManager();
