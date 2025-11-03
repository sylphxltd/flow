# 🔍 系統性代碼優化計劃

## 目標
一次過發現和優化整個項目的所有問題，包括：
- 代碼重複 (DRY violations)
- 邏輯複雜度
- 架構問題
- 性能問題
- 類型安全

## 策略：自動化 + 系統化

### Phase 1: 自動化分析 (使用工具發現問題)

#### 1.1 重複代碼檢測
```bash
# 安裝 jscpd (Copy/Paste Detector)
bun add -D jscpd

# 掃描所有重複代碼
npx jscpd src/ --min-lines 3 --min-tokens 30 --format "markdown" --output "./reports/duplication.md"
```

**發現**：
- 重複的函數
- 重複的邏輯塊
- 相似的模式

---

#### 1.2 循環依賴分析
```bash
# 安裝 madge
bun add -D madge

# 檢測循環依賴
npx madge --circular --extensions ts src/

# 生成依賴圖
npx madge --image dependency-graph.svg src/
```

**發現**：
- 循環依賴
- 緊耦合的模塊
- 依賴結構問題

---

#### 1.3 代碼複雜度分析
```bash
# 使用 TypeScript 編譯器 API 分析
# 或者手動檢查
```

**發現**：
- 過長的函數 (>50 lines)
- 過深的嵌套 (>3 levels)
- 認知複雜度高的代碼

---

#### 1.4 未使用代碼檢測
```bash
# 安裝 ts-prune
bun add -D ts-prune

# 檢測未使用的 exports
npx ts-prune
```

**發現**：
- 未使用的函數
- 未使用的類型
- 死代碼

---

### Phase 2: 模式掃描 (系統性檢查)

#### 2.1 DRY Violations (已完成 ✅)
- [x] findPackageRoot
- [x] validateLimit
- [x] normalizeQuery
- [x] formatSessionDisplay
- [x] formatBytes/formatFileSize

#### 2.2 待掃描模式

**A. 相似的函數簽名**
```bash
# 找出相似的函數名
grep -rn "export function format" src/ --include="*.ts" | grep -v test
grep -rn "export function validate" src/ --include="*.ts" | grep -v test
grep -rn "export function parse" src/ --include="*.ts" | grep -v test
grep -rn "export function build" src/ --include="*.ts" | grep -v test
grep -rn "export function create" src/ --include="*.ts" | grep -v test
grep -rn "export function get" src/ --include="*.ts" | grep -v test
```

**B. 重複的常量/配置**
```bash
# 找出魔法數字和字符串
grep -rn "const.*=.*[0-9]" src/ --include="*.ts" | grep -v test
grep -rn "= '[^']*'" src/ --include="*.ts" | head -50
```

**C. 相似的錯誤處理**
```bash
# 找出 try-catch 模式
grep -rn "try {" src/ --include="*.ts" -A 5
```

**D. 相似的類型定義**
```bash
# 找出相似的 interface/type
grep -rn "export interface" src/ --include="*.ts"
grep -rn "export type" src/ --include="*.ts"
```

---

### Phase 3: 架構層面優化

#### 3.1 檢查分層
```
src/
├── core/           # 核心工具 (不依賴 features)
├── features/       # 業務邏輯 (可能互相依賴)
├── ui/            # UI 層 (依賴 features)
├── commands/      # 命令層 (依賴 features)
└── utils/         # 通用工具 (應該移到 core?)
```

**問題識別**：
- utils/ 應該整合到 core/ 嗎？
- features 之間的依賴是否合理？
- 有沒有違反分層原則？

#### 3.2 依賴方向檢查
```bash
# 檢查誰依賴誰
grep -rn "from.*features" src/core/ --include="*.ts"  # ❌ core 不該依賴 features
grep -rn "from.*ui" src/features/ --include="*.ts"    # ❌ features 不該依賴 ui
```

---

### Phase 4: 代碼質量優化

#### 4.1 函數長度
```bash
# 找出超長函數 (>50 lines)
# 需要手動審查或使用 AST 工具
```

#### 4.2 認知複雜度
- if/else 嵌套過深
- 過多的條件判斷
- 過長的函數鏈

#### 4.3 命名一致性
```bash
# 檢查命名模式
grep -rn "function.*Data" src/ --include="*.ts"
grep -rn "function.*Info" src/ --include="*.ts"
grep -rn "function.*Options" src/ --include="*.ts"
```

---

### Phase 5: 性能優化

#### 5.1 不必要的計算
- 重複計算
- 可以緩存的結果
- 不必要的循環

#### 5.2 大文件拆分
```bash
# 找出超大文件
find src/ -name "*.ts" -type f -exec wc -l {} \; | sort -rn | head -20
```

---

## 執行計劃

### Week 1: 自動化分析
- [ ] 安裝並運行所有分析工具
- [ ] 生成報告
- [ ] 優先級排序

### Week 2: 高優先級修復
- [ ] 循環依賴
- [ ] 剩餘的 DRY violations
- [ ] 架構問題

### Week 3: 中優先級優化
- [ ] 代碼複雜度
- [ ] 函數拆分
- [ ] 類型安全加強

### Week 4: 低優先級清理
- [ ] 死代碼移除
- [ ] 命名一致性
- [ ] 文檔完善

---

## 工具集

### 必裝工具
```json
{
  "devDependencies": {
    "jscpd": "^4.0.0",        // 重複代碼檢測
    "madge": "^7.0.0",        // 循環依賴檢測
    "ts-prune": "^0.10.0",    // 未使用代碼檢測
    "eslint": "^8.0.0",       // 代碼質量
    "prettier": "^3.0.0"      // 代碼格式
  }
}
```

### 配置文件

**jscpd.json**
```json
{
  "threshold": 0,
  "reporters": ["html", "markdown", "console"],
  "ignore": ["**/*.test.ts", "**/node_modules/**"],
  "format": ["typescript"],
  "minLines": 3,
  "minTokens": 30,
  "output": "./reports"
}
```

**madge.json**
```json
{
  "detectiveOptions": {
    "ts": {
      "skipTypeImports": true
    }
  }
}
```

---

## 成功標準

### 代碼質量指標
- [ ] 0 循環依賴
- [ ] <1% 代碼重複率
- [ ] 0 未使用的 exports
- [ ] 所有函數 <50 lines
- [ ] 認知複雜度 <15

### 測試覆蓋率
- [ ] 核心工具 100%
- [ ] Features 100%
- [ ] Utils 100%

### 架構健康
- [ ] 清晰的分層
- [ ] 單向依賴
- [ ] 模塊化設計

---

## 下一步

1. **立即執行**: 運行自動化分析工具
2. **生成報告**: 獲得全面的問題清單
3. **優先級排序**: 按影響和難度排序
4. **系統性修復**: 一個一個解決，保持測試通過
5. **持續監控**: 建立 CI/CD 檢查防止退化
