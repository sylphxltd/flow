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
   * 清理現有的 .gitignore，移除重複和空區塊
   */
  private cleanExistingGitignore(content: string): string {
    const lines = content.split('\n');
    const cleanedLines: string[] = [];
    let inDatabaseSection = false;
    let skipEmptyDatabaseSections = true;

    for (const line of lines) {
      const trimmed = line.trim();

      // 檢測數據庫區塊開始
      if (trimmed === '# Sylphx Flow Database Files (Auto-managed)') {
        if (inDatabaseSection) {
          // 跳過重複的數據庫區塊
          skipEmptyDatabaseSections = true;
          continue;
        }
        inDatabaseSection = true;
        skipEmptyDatabaseSections = false;
      }

      // 如果在數據庫區塊中，但遇到下一個主要區塊，則結束
      if (
        inDatabaseSection &&
        trimmed &&
        !trimmed.startsWith('#') &&
        !trimmed.includes('Sylphx Flow')
      ) {
        inDatabaseSection = false;
      }

      // 跳過空的數據庫區塊
      if (skipEmptyDatabaseSections && inDatabaseSection) {
        continue;
      }

      if (!skipEmptyDatabaseSections) {
        cleanedLines.push(line);
      }
    }

    return cleanedLines.join('\n');
  }

  /**
   * 確保數據庫規則存在於 .gitignore 中
   */
  ensureDatabaseRules(): void {
    try {
      // 如果 .gitignore 不存在，什麼都不做 - 讓用戶自己創建
      if (!fs.existsSync(this.gitignorePath)) {
        console.error('[INFO] No .gitignore found, skipping database rules');
        return;
      }

      let content = fs.readFileSync(this.gitignorePath, 'utf-8');

      // 清理現有的重複數據庫區塊
      content = this.cleanExistingGitignore(content);

      // 檢查是否已經有數據庫規則區塊
      if (content.includes('# Sylphx Flow Database Files (Auto-managed)')) {
        console.error('[INFO] Database rules already exist in .gitignore');
        return;
      }

      // 簡化的數據庫規則 - 用 folder level pattern
      const databaseRules = [
        '',
        '# Sylphx Flow Database Files (Auto-managed)',
        '# Ignore ALL cache database files (temporary)',
        '.sylphx-flow/cache.db*',
        '# Ignore memory database temporary files, but keep memory.db itself',
        '.sylphx-flow/memory.db-*',
        '.sylphx-flow/memory.db.*',
        '# Database journal files (all databases)',
        '*.db-journal',
        '*.db-wal',
        '*.sqlite-journal',
        '*.sqlite-wal',
      ];

      // 添加規則到文件末尾
      const newContent = content.endsWith('\n') ? content : content + '\n';
      const updatedContent = newContent + databaseRules.join('\n') + '\n';

      fs.writeFileSync(this.gitignorePath, updatedContent, 'utf-8');
      console.error(`[INFO] Added database rules to .gitignore`);
    } catch (error) {
      console.error('[WARN] Failed to update .gitignore:', (error as Error).message);
    }
  }

  /**
   * 初始化自動 .gitignore 管理
   */
  initialize(): void {
    this.ensureDatabaseRules();
  }
}

// 導出單例實例
export const autoGitignore = new AutoGitignoreManager();
