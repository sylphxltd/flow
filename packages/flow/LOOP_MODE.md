# 🔄 Loop Mode - Continuous Autonomous Execution

Loop mode讓LLM持續執行同一個任務，自動保留context，直到你手動停止。

## 🎯 核心概念

**簡單講：Keep working on X until I stop you**

```bash
bun dev:flow "處理github所有issue" --loop 60
```

**行為:**
1. 執行task (fresh start)
2. 等60秒
3. 用 `--continue` 再執行 (preserve context)
4. 等60秒
5. 再 `--continue` 執行
6. ... 無限循環直到 Ctrl+C 或 max-runs

---

## 🚀 基本用法

### 最簡單 - 無限loop
```bash
bun dev:flow "task" --loop 60
# 每60秒執行一次，直到你按Ctrl+C
```

### 加safety limit
```bash
bun dev:flow "task" --loop 60 --max-runs 20
# 最多執行20次就停
```

---

## 💡 Use Cases

### 1. GitHub Issue處理
```bash
bun dev:flow "check github issues and handle them one by one" --loop 300
# 每5分鐘檢查一次，持續處理issue
```

### 2. Code Review
```bash
bun dev:flow "review recent commits and provide feedback" --loop 3600
# 每小時review新既commits
```

### 3. 文檔更新
```bash
bun dev:flow "check if docs need update and fix them" --loop 1800
# 每30分鐘同步文檔
```

### 4. 測試修復
```bash
bun dev:flow "run tests, if fail try to fix" --loop 60 --max-runs 10
# 最多試10次，每次等60秒
```

### 5. 增量重構
```bash
bun dev:flow "continue refactoring legacy code" --loop 600 --max-runs 6
# 每10分鐘工作一次，總共工作1小時
```

---

## 📚 API Reference

### `--loop <seconds>`
啟用loop mode，設定間隔時間（秒）

**最小值:** 5秒 (防止太頻繁)
**推薦值:**
- 快速任務: 30-60秒
- 標準任務: 60-300秒
- 重型任務: 600-3600秒

**例子:**
```bash
--loop 60      # 每60秒
--loop 300     # 每5分鐘
--loop 3600    # 每1小時
```

---

### `--max-runs <count>`
最大執行次數（可選，default: 無限）

用途：防止忘記關loop，或者設定工作時間上限

**例子:**
```bash
--max-runs 10     # 最多10次
--max-runs 100    # 最多100次
```

---

## 🎨 Output Format

### Loop開始
```
━━━ 🔄 Loop Mode Activated

  Interval: 60s
  Max runs: ∞
  Stop: Ctrl+C or max-runs limit
```

### 每次iteration
```
🔄 Loop iteration 3/∞
Started: 14:32:15

[... task execution ...]

⏳ Waiting 60s until next run... (completed: 3/∞)
```

### Loop結束
```
⚠️  Interrupt received - finishing current iteration...

━━━ 🏁 Loop Summary

  Total iterations: 5
  Successful: 4
  Errors: 1
  Duration: 5m 30s
```

---

## 🛡️ Safety Features

### 1. Graceful Shutdown
按 `Ctrl+C` 會優雅地停止：
- 完成當前iteration
- 顯示summary
- Clean up resources

### 2. Error Resilience
遇到error會繼續執行（唔會停）：
```
⚠️  Task encountered error (continuing...)
Error: API rate limit

⏳ Waiting 60s until next run...
```

### 3. Auto-headless Mode
Loop mode自動啟用headless模式：
- 無interactive prompts
- 純output
- 適合background execution

### 4. Context Persistence
**First iteration:** Fresh start
**2nd+ iterations:** Auto `--continue` (LLM builds on previous work)

這樣LLM可以持續改進，唔會重複做同樣野。

---

## 📊 工作時間計算

| Interval | Max Runs | Total Time |
|----------|----------|------------|
| 60s | 10 | ~10分鐘 |
| 60s | 30 | ~30分鐘 |
| 60s | 60 | ~1小時 |
| 300s (5分) | 12 | ~1小時 |
| 600s (10分) | 6 | ~1小時 |
| 3600s (1小時) | 8 | ~8小時 |

---

## 🎯 Best Practices

### ✅ DO

1. **設定合理interval**
   ```bash
   --loop 60    # 大部分情況OK
   --loop 300   # 非緊急任務
   ```

2. **用max-runs做safety**
   ```bash
   --max-runs 50   # 防止無限loop
   ```

3. **Task要明確**
   ```bash
   # Good
   "check new github issues and reply to them"

   # Bad (太模糊)
   "do stuff"
   ```

4. **測試先用小值**
   ```bash
   --loop 10 --max-runs 3   # 先測試30秒
   ```

### ❌ DON'T

1. **唔好用極短interval**
   ```bash
   --loop 5    # 太頻繁，浪費資源
   ```

2. **唔好無max-runs跑production**
   ```bash
   # 危險 - 可能永遠run
   --loop 60

   # 安全
   --loop 60 --max-runs 100
   ```

3. **唔好做destructive操作**
   ```bash
   # 危險！
   "delete old files" --loop 60
   ```

---

## 🐛 Troubleshooting

### Q: Loop跑得太快
**A:** 增加interval
```bash
--loop 120   # instead of --loop 30
```

### Q: Loop永遠唔停
**A:** 加max-runs safety limit
```bash
--loop 60 --max-runs 50
```

### Q: 想睇detail output
**A:** 加verbose flag
```bash
--loop 60 --verbose
```

### Q: Task一直fail
**A:** Check error message，可能係：
- API rate limit → 增加interval
- 權限問題 → Fix permissions
- Task本身有問題 → Test without loop first

---

## 🚀 Advanced Patterns

### Pattern 1: Time-boxed Work
```bash
# Work for exactly 1 hour (60 iterations × 60s)
bun dev:flow "work on feature X" --loop 60 --max-runs 60
```

### Pattern 2: Progressive Task
```bash
# Iterate through large task
bun dev:flow "continue migrating to new API" --loop 180 --max-runs 20
# Each iteration makes progress, LLM remembers where it left off
```

### Pattern 3: Monitoring & Auto-fix
```bash
# Check health and auto-fix issues
bun dev:flow "check system health and fix issues if found" --loop 300
```

### Pattern 4: Staged Execution
```bash
# Stage 1: Quick pass (10 mins)
bun dev:flow "quick fixes" --loop 30 --max-runs 20

# Stage 2: Deep work (1 hour)
bun dev:flow "continue deep refactoring" --loop 300 --max-runs 12
```

---

## 💡 Pro Tips

### Tip 1: Task Phrasing
```bash
# Good: Progressive phrasing
"continue working on X, pick up where you left off"

# Better: Context-aware
"check status of X, continue if not done, report if complete"
```

### Tip 2: Interval Selection
```bash
# Quick iteration (testing, monitoring)
--loop 30

# Standard work (most tasks)
--loop 60-120

# Heavy tasks (reviews, analysis)
--loop 300-600

# Periodic checks (CI/CD, health)
--loop 1800-3600
```

### Tip 3: Safety Nets
```bash
# Always set max-runs for important tasks
bun dev:flow "deploy changes" --loop 60 --max-runs 3

# Use longer intervals for destructive operations
bun dev:flow "cleanup old data" --loop 3600 --max-runs 5
```

---

## 📊 Performance

**Memory:** ~50-100MB per iteration (cleaned up after)
**CPU:** Depends on task complexity
**API:** Respects rate limits automatically
**Network:** Each iteration makes API calls

---

## 🔧 Technical Details

### Context Management
```typescript
// Implementation
Iteration 1: options.continue = false  // Fresh
Iteration 2+: options.continue = true  // Build on previous
```

### State Tracking
```typescript
{
  iteration: number;      // Current iteration
  startTime: Date;        // When loop started
  successCount: number;   // Successful runs
  errorCount: number;     // Failed runs
}
```

### Exit Conditions
1. User interrupt (Ctrl+C) - Highest priority
2. Max-runs reached
3. Fatal error (rare)

---

## 📝 Changelog

### v1.0.0 (Simplified)
- Core loop functionality
- Auto-continue from 2nd iteration
- Graceful shutdown
- Progress tracking
- Error resilience

**Removed complexity:**
- ~~until-success~~
- ~~until-stable~~
- ~~on-error strategies~~

**Why:** Keep it simple - just "keep working until I stop you"
