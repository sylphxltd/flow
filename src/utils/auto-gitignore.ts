/**
 * Intelligent auto .gitignore manager - 智能自動 .gitignore 管理器
 * 分析現有 gitignore，智能添加/更新 Sylphx Flow 相關規則
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Sylphx Flow 需要嘅所有規則 (可以隨時擴展)
const SYLPHX_FLOW_RULES = [
  '# Sylphx Flow Database Files (Auto-managed)',
  '# Ignore ALL cache database files (temporary)',
  '.sylphx-flow/cache.db*',
  '# Ignore memory database temporary files, but keep memory.db itself',
  '.sylphx-flow/memory.db-*',
];

export const autoGitignore = {
  /**
   * 智能分析並更新 gitignore
   */
  initialize(): void {
    const gitignorePath = path.join(process.cwd(), '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(gitignorePath, 'utf-8');
      const result = this.analyzeAndUpdateGitignore(content);

      if (result.needsUpdate) {
        fs.writeFileSync(gitignorePath, result.newContent);
      }
    } catch (error) {
      // 靜默失敗，唔好影響用戶體驗
    }
  },

  /**
   * 分析 gitignore 內容，決定需要做咩更新
   */
  analyzeAndUpdateGitignore(content: string): { needsUpdate: boolean; newContent: string } {
    const lines = content.split('\n');
    const newLines: string[] = [];
    let inSylphxSection = false;
    let sylphxRulesFound: string[] = [];

    // 分析現有內容
    for (const line of lines) {
      const trimmed = line.trim();

      // 檢測 Sylphx Flow section
      if (trimmed === '# Sylphx Flow Database Files (Auto-managed)') {
        inSylphxSection = true;
        continue; // 跳過 section header，我哋會重新生成
      }

      // 如果喺 Sylphx section 裡面，但遇到其他 section，就結束
      if (
        inSylphxSection &&
        trimmed &&
        !trimmed.startsWith('#') &&
        !trimmed.includes('Sylphx Flow')
      ) {
        inSylphxSection = false;
      }

      // 收集現有嘅 Sylphx rules
      if (inSylphxSection && trimmed && !trimmed.startsWith('#')) {
        sylphxRulesFound.push(trimmed);
        continue; // 跳過舊 rules，我哋會重新生成
      }

      // 保留非 Sylphx section 嘅內容
      if (!inSylphxSection) {
        newLines.push(line);
      }
    }

    // 檢查是否需要更新
    const currentRules = sylphxRulesFound.sort();
    const expectedRules = SYLPHX_FLOW_RULES.filter((rule) => !rule.startsWith('#')).sort();
    const needsUpdate =
      currentRules.length !== expectedRules.length ||
      !currentRules.every((rule, i) => rule === expectedRules[i]);

    if (!needsUpdate) {
      return { needsUpdate: false, newContent: content };
    }

    // 生成新內容
    const finalLines = [...newLines];

    // 移除尾部空行
    while (finalLines.length > 0 && finalLines[finalLines.length - 1].trim() === '') {
      finalLines.pop();
    }

    // 添加 Sylphx Flow section
    finalLines.push('', ...SYLPHX_FLOW_RULES, '');

    return {
      needsUpdate: true,
      newContent: finalLines.join('\n'),
    };
  },
};
