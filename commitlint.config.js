export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修復bug
        'docs',     // 文檔變更
        'style',    // 代碼格式化
        'refactor', // 重構
        'perf',     // 性能優化
        'test',     // 測試
        'chore',    // 構建過程或輔助工具的變動
        'ci',       // CI配置
        'build',    // 構建系統
        'revert'    // 回滾
      ]
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100]
  }
};