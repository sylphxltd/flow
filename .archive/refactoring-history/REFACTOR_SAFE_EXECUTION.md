# 安全重構執行計劃

## 🛡️ 核心原則：功能不能壞

### 安全策略
1. **測試先行**：重構前先寫測試
2. **漸進遷移**：小步前進，不是大爆炸
3. **新舊並存**：新舊代碼共存，逐步替換
4. **隨時回滾**：每步都可以回滾
5. **持續驗證**：每次改動都測試

## 📋 執行步驟

### Step 0: 準備工作（必須完成）

#### 0.1 建立測試基礎
```bash
# 確保可以運行測試
bun test

# 確保可以 build
bun run build

# 確保可以運行
bun dist/index.js --help
```

#### 0.2 創建功能測試清單
手動測試每個功能，確保當前狀態正常：

**必測功能清單**：
- [ ] 啟動應用
- [ ] 輸入文字
- [ ] 發送消息
- [ ] 接收 AI 回應
- [ ] 使用 /compact 命令
- [ ] 使用 @file 標籤
- [ ] 文字換行
- [ ] 上下方向鍵導航
- [ ] 自動完成（文件和命令）
- [ ] ESC 取消串流

#### 0.3 Git 分支策略
```bash
# 創建 refactor 分支
git checkout -b refactor/feature-based

# 定期 commit，方便回滾
git commit -am "checkpoint: xxx"
```

### Step 1: Input Feature（最安全的起點）

#### 為什麼從 Input 開始？
- ✅ 最獨立（依賴少）
- ✅ 邏輯清晰（cursor、text ops）
- ✅ 易於測試（純函數多）
- ✅ 影響範圍小（只影響輸入）

#### 1.1 提取純函數（最安全）

**純函數 = 無副作用 = 最安全**

```typescript
// ✅ 第一步：提取 cursor 邏輯到新文件（不破壞舊代碼）
// src/features/input/utils/cursor.ts

/**
 * 向左移動游標
 * @pure 純函數，無副作用
 */
export const moveCursorLeft = (cursor: number): number => {
  return Math.max(0, cursor - 1);
};

/**
 * 向右移動游標
 * @pure 純函數，無副作用
 */
export const moveCursorRight = (text: string, cursor: number): number => {
  return Math.min(text.length, cursor + 1);
};

// 測試（確保邏輯正確）
// src/features/input/utils/cursor.test.ts
describe('cursor', () => {
  it('moveCursorLeft', () => {
    expect(moveCursorLeft(5)).toBe(4);
    expect(moveCursorLeft(0)).toBe(0); // 邊界
  });

  it('moveCursorRight', () => {
    expect(moveCursorRight('hello', 2)).toBe(3);
    expect(moveCursorRight('hello', 5)).toBe(5); // 邊界
  });
});
```

**策略**：
1. ✅ 新建文件（不動舊代碼）
2. ✅ 提取邏輯到新文件
3. ✅ 寫測試確保正確
4. ✅ 測試通過後，舊代碼慢慢改用新函數

#### 1.2 逐步替換（保持功能）

```typescript
// ❌ 不要這樣（一次性大改）
// 刪除舊代碼，全部重寫

// ✅ 要這樣（漸進替換）
// Step 1: 新舊並存
import * as Cursor from '@/features/input/utils/cursor';

const handleLeftArrow = () => {
  // 舊代碼註釋掉（保留備份）
  // setCursor(c => Math.max(0, c - 1));

  // 使用新函數
  setCursor(c => Cursor.moveCursorLeft(c));
};

// Step 2: 測試通過後，刪除註釋
// Step 3: 所有替換完成後，刪除舊代碼
```

#### 1.3 測試驗證（每步都測）

**每次改動後必做**：
```bash
# 1. 單元測試
bun test src/features/input

# 2. Build 測試
bun run build

# 3. 手動測試
bun dist/index.js
# - 測試輸入
# - 測試方向鍵
# - 測試換行
# - 測試自動完成

# 4. 通過才 commit
git add .
git commit -m "refactor(input): extract cursor utils"
```

### Step 2: 其他 Features（同樣策略）

每個 feature 都遵循相同流程：
1. 提取純函數（新文件）
2. 寫測試
3. 漸進替換
4. 測試驗證
5. Commit

順序（按風險從低到高）：
1. ✅ Input（最安全）
2. ✅ Streaming（較獨立）
3. ✅ Attachments（較獨立）
4. ✅ Autocomplete（依賴 input）
5. ✅ Commands（依賴多）
6. ✅ Chat（最後，協調所有 features）

## 🚨 回滾策略

### 如果出問題怎麼辦？

#### 小問題（某個函數有 bug）
```bash
# 1. 註釋掉新代碼
# 2. 取消註釋舊代碼
# 3. 測試通過
# 4. 修復新代碼
# 5. 再次替換
```

#### 大問題（整個 feature 有問題）
```bash
# 回滾到上一個 checkpoint
git log --oneline  # 找到上一個好的 commit
git reset --hard <commit-hash>
```

#### 災難性問題（完全搞砸）
```bash
# 放棄整個分支，回到 main
git checkout main
git branch -D refactor/feature-based
# 重新開始，吸取教訓
```

## ✅ 檢查清單（每個 Feature）

### 重構前
- [ ] 手動測試現有功能（記錄行為）
- [ ] 創建 Git checkpoint
- [ ] 確定重構範圍（只改這個 feature）

### 重構中
- [ ] 新建文件（不動舊代碼）
- [ ] 提取純函數
- [ ] 寫單元測試
- [ ] 測試通過
- [ ] 漸進替換舊代碼
- [ ] 每次替換後測試

### 重構後
- [ ] 單元測試全通過
- [ ] Build 成功
- [ ] 手動測試所有功能
- [ ] 對比重構前的行為（一致）
- [ ] Git commit
- [ ] 刪除舊代碼（可選，可以先保留）

## 📊 示例：Input Feature 完整流程

### Phase 1: 提取 cursor.ts（純函數）

```typescript
// ✅ 新建：src/features/input/utils/cursor.ts
export const moveCursorLeft = (cursor: number): number =>
  Math.max(0, cursor - 1);

export const moveCursorRight = (text: string, cursor: number): number =>
  Math.min(text.length, cursor + 1);

export const moveCursorToStart = (): number => 0;

export const moveCursorToEnd = (text: string): number => text.length;

export const moveCursorUp = (
  lines: string[],
  currentLine: number,
  column: number
): { line: number; column: number } => {
  if (currentLine === 0) return { line: 0, column };
  const newLine = currentLine - 1;
  const newColumn = Math.min(column, lines[newLine].length);
  return { line: newLine, column: newColumn };
};

export const moveCursorDown = (
  lines: string[],
  currentLine: number,
  column: number
): { line: number; column: number } => {
  if (currentLine === lines.length - 1) {
    return { line: currentLine, column };
  }
  const newLine = currentLine + 1;
  const newColumn = Math.min(column, lines[newLine].length);
  return { line: newLine, column: newColumn };
};
```

### Phase 2: 寫測試

```typescript
// src/features/input/utils/cursor.test.ts
import { describe, it, expect } from 'vitest';
import * as Cursor from './cursor';

describe('cursor movements', () => {
  describe('moveCursorLeft', () => {
    it('should move cursor left by 1', () => {
      expect(Cursor.moveCursorLeft(5)).toBe(4);
    });

    it('should not move past 0', () => {
      expect(Cursor.moveCursorLeft(0)).toBe(0);
    });
  });

  describe('moveCursorRight', () => {
    it('should move cursor right by 1', () => {
      expect(Cursor.moveCursorRight('hello', 2)).toBe(3);
    });

    it('should not move past text length', () => {
      expect(Cursor.moveCursorRight('hello', 5)).toBe(5);
    });
  });

  describe('moveCursorUp', () => {
    const lines = ['line1', 'line2222', 'line3'];

    it('should move up one line', () => {
      const result = Cursor.moveCursorUp(lines, 1, 3);
      expect(result).toEqual({ line: 0, column: 3 });
    });

    it('should adjust column if new line is shorter', () => {
      const result = Cursor.moveCursorUp(lines, 1, 6);
      expect(result).toEqual({ line: 0, column: 5 }); // line1 只有 5 個字符
    });

    it('should not move past first line', () => {
      const result = Cursor.moveCursorUp(lines, 0, 2);
      expect(result).toEqual({ line: 0, column: 2 });
    });
  });
});
```

### Phase 3: 在舊代碼中使用（漸進替換）

```typescript
// src/ui/components/ControlledTextInput.tsx

// ✅ Import 新函數
import * as Cursor from '@/features/input/utils/cursor';

// ... 在 useInput handler 中

useInput((input, key) => {
  if (key.leftArrow && !disableUpDownArrows) {
    // ❌ 舊代碼（先註釋，保留備份）
    // const newCursor = Math.max(0, cursor - 1);
    // onCursorChange(newCursor);

    // ✅ 新代碼（使用純函數）
    const newCursor = Cursor.moveCursorLeft(cursor);
    onCursorChange(newCursor);
  }

  if (key.rightArrow && !disableUpDownArrows) {
    // ❌ 舊代碼
    // const newCursor = Math.min(value.length, cursor + 1);
    // onCursorChange(newCursor);

    // ✅ 新代碼
    const newCursor = Cursor.moveCursorRight(value, cursor);
    onCursorChange(newCursor);
  }

  // ... 其他邏輯
});
```

### Phase 4: 測試驗證

```bash
# 1. 單元測試
bun test src/features/input/utils/cursor.test.ts
# ✅ 5 passed

# 2. Build
bun run build
# ✅ Build complete!

# 3. 手動測試
bun dist/index.js
# 測試：
# - 左右方向鍵 ✅
# - 游標不會越界 ✅
# - 多行導航 ✅

# 4. Commit
git add .
git commit -m "refactor(input): extract cursor utils to pure functions

- Extract cursor movement logic to src/features/input/utils/cursor.ts
- Add comprehensive unit tests
- Replace cursor logic in ControlledTextInput with new functions
- All tests passing, manual testing confirms no regression"
```

### Phase 5: 繼續提取其他 utils

重複相同流程：
- wrapping.ts
- text-ops.ts
- keyboard.ts

## 🎯 成功標準

### 每個 Feature 完成時
- ✅ 單元測試覆蓋率 > 80%
- ✅ 所有手動測試通過
- ✅ Build 成功
- ✅ 無 regression（沒有功能倒退）
- ✅ 代碼更清晰
- ✅ Git history 清晰

### 整體重構完成時
- ✅ Chat.tsx < 200 行
- ✅ 所有 features 獨立可測試
- ✅ 純函數覆蓋率 > 90%
- ✅ 功能完全一致（無破壞）
- ✅ 新增功能更容易

## 💡 小技巧

### 1. 頻繁 Commit
```bash
# 不要攢一堆改動才 commit
# 每完成一小步就 commit

git commit -m "checkpoint: extract moveCursorLeft"
git commit -m "checkpoint: add tests for cursor.ts"
git commit -m "checkpoint: replace cursor logic in TextInput"
```

### 2. 保留舊代碼（註釋）
```typescript
// ❌ 不要立即刪除
// const newCursor = Math.max(0, cursor - 1);

// ✅ 先註釋，確認新代碼正常後再刪除
const newCursor = Cursor.moveCursorLeft(cursor);
```

### 3. 寫 TODO 注釋
```typescript
// TODO: [refactor] Replace with Cursor.moveCursorUp after testing
const newCursor = moveCursorUpPhysical(value, cursor, width);
```

### 4. 並行開發（可選）
```bash
# 如果有多人，可以並行重構不同 features
git checkout -b refactor/input-feature
git checkout -b refactor/streaming-feature

# 互不干擾，最後合併
```

## 🚀 準備開始

### 第一步（現在）
```bash
# 1. 確認當前功能正常
bun run build
bun dist/index.js
# 手動測試所有功能 ✅

# 2. 創建分支
git checkout -b refactor/feature-based

# 3. 創建目錄結構
mkdir -p src/features/input/{components,hooks,utils,store}

# 4. 開始提取第一個純函數
# 創建 src/features/input/utils/cursor.ts
```

### 開始嗎？

我會：
1. 從 cursor.ts 開始（最簡單）
2. 寫測試
3. 漸進替換
4. 每步驗證
5. 確保功能不壞

準備好了嗎？🚀
