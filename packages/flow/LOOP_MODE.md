# 🔄 Loop Mode - Continuous Autonomous Execution

Loop mode enables the LLM to continuously execute the same task, automatically preserving context, until you manually stop it.

## 🎯 Core Concept

**Simple: Keep working on X until I stop you**

```bash
bun dev:flow "process all GitHub issues" --loop
```

**Behavior:**
1. Execute task (fresh start)
2. Immediately execute with `--continue` (preserve context)
3. Immediately execute with `--continue` again
4. ... infinite loop until Ctrl+C or max-runs

**With wait time:**
```bash
bun dev:flow "check for new issues" --loop 300
```
1. Execute task
2. Wait 300 seconds (5 minutes)
3. Execute with `--continue`
4. Wait 300 seconds
5. ... continue until stopped

---

## 🚀 Basic Usage

### Simplest - Use default (no wait time)
```bash
bun dev:flow "task" --loop
# Execute continuously with no wait between iterations
```

### Specify wait time
```bash
bun dev:flow "task" --loop 120
# Wait 120 seconds between each iteration
```

### Add safety limit
```bash
bun dev:flow "task" --loop 60 --max-runs 20
# Stop after 20 iterations
```

### Combined usage
```bash
# Default interval + max runs
bun dev:flow "task" --loop --max-runs 10

# Custom interval + max runs
bun dev:flow "task" --loop 300 --max-runs 5
```

---

## 💡 Use Cases

### 1. GitHub Issue Handling
```bash
bun dev:flow "check github issues and handle them one by one" --loop 300
# Check every 5 minutes, continuously process issues
```

### 2. Code Review
```bash
bun dev:flow "review recent commits and provide feedback" --loop 3600
# Review new commits every hour
```

### 3. Documentation Updates
```bash
bun dev:flow "check if docs need update and fix them" --loop 1800
# Sync documentation every 30 minutes
```

### 4. Test Fixing
```bash
bun dev:flow "run tests, if fail try to fix" --loop 60 --max-runs 10
# Try up to 10 times, wait 60 seconds each time
```

### 5. Incremental Refactoring
```bash
bun dev:flow "continue refactoring legacy code" --loop 600 --max-runs 6
# Work every 10 minutes, total 1 hour
```

---

## 📚 API Reference

### `--loop [seconds]`
Enable loop mode with optional wait time between iterations

**Default:** 0 seconds (no wait - execute immediately after previous task completes)

**When to use wait time:**
- Rate limiting: Prevent hitting API limits
- Resource management: Give system time to recover
- Polling: Check for changes periodically
- Natural pacing: Space out operations

**Recommended values:**
- No wait: 0 seconds (default - for continuous work)
- Quick polling: 30-60 seconds
- Standard polling: 60-300 seconds (1-5 minutes)
- Long polling: 600-3600 seconds (10-60 minutes)

**Examples:**
```bash
--loop         # No wait (immediate re-execution after task completes)
--loop 0       # Same as above
--loop 60      # Wait 60 seconds between iterations
--loop 300     # Wait 5 minutes between iterations
--loop 3600    # Wait 1 hour between iterations
```

**Note:** `[seconds]` is optional - defaults to 0 (no wait time)

**Why 0s default?**
- LLM tasks typically take 2-5 minutes
- Task execution time is already a natural interval
- No wasted idle time
- Add wait time only when needed (rate limits, polling, etc.)

---

### `--max-runs <count>`
Maximum number of iterations (optional, default: infinite)

Purpose: Prevent forgetting to stop loop, or set work time limit

**Examples:**
```bash
--max-runs 10     # Maximum 10 iterations
--max-runs 100    # Maximum 100 iterations
```

---

## 🎨 Output Format

### Loop Start
```
━━━ 🔄 Loop Mode Activated

  Wait time: 0s
  Max runs: ∞
  Stop: Ctrl+C or max-runs limit
```

### Each Iteration
```
🔄 Loop iteration 3/∞
Started: 14:32:15

[... task execution ...]

⏳ Waiting 0s until next run... (completed: 3/∞)
```
or with wait time:
```
⏳ Waiting 60s until next run... (completed: 3/∞)
```

### Loop End
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
Press `Ctrl+C` to stop gracefully:
- Complete current iteration
- Display summary
- Clean up resources

### 2. Error Resilience
Continues execution when encountering errors (won't stop):
```
⚠️  Task encountered error (continuing...)
Error: API rate limit

⏳ Waiting 60s until next run...
```

### 3. Auto-headless Mode
Loop mode automatically enables headless mode:
- No interactive prompts
- Output only
- Suitable for background execution

### 4. Context Persistence
**First iteration:** Fresh start
**2nd+ iterations:** Auto `--continue` (LLM builds on previous work)

This allows the LLM to continuously improve without repeating the same work.

---

## 📊 Work Time Calculation

**Note:** These estimates assume ~2-3 minutes average task execution time + wait time between iterations.

| Wait Time | Max Runs | Approx Total Time |
|-----------|----------|-------------------|
| 0s (no wait) | 10 | ~20-30 minutes (task time only) |
| 0s (no wait) | 30 | ~1-1.5 hours (task time only) |
| 60s wait | 10 | ~30-40 minutes (task + wait) |
| 60s wait | 30 | ~1.5-2 hours (task + wait) |
| 300s (5min) | 12 | ~2-3 hours |
| 600s (10min) | 6 | ~1.5-2 hours |
| 3600s (1 hour) | 8 | ~8-9 hours |

---

## 🎯 Best Practices

### ✅ DO

1. **Use default (0s) for most cases**
   ```bash
   --loop              # No wait - continuous execution
   --loop 60           # Add wait time if needed (e.g., API rate limits, polling)
   ```

2. **Use max-runs for safety**
   ```bash
   --max-runs 50       # Prevent infinite loop
   ```

3. **Clear task definition**
   ```bash
   # Good
   "check new github issues and reply to them"

   # Bad (too vague)
   "do stuff"
   ```

4. **Test with small max-runs first**
   ```bash
   --loop --max-runs 3   # Test with 3 iterations first
   ```

### ❌ DON'T

1. **Don't add wait time unnecessarily**
   ```bash
   # Unnecessary - task already takes time
   --loop 60    # Only use if you need wait time for specific reason (rate limits, polling)

   # Better for continuous work
   --loop       # No wait - task execution time is the natural interval
   ```

2. **Don't run production without max-runs**
   ```bash
   # Dangerous - may run forever
   --loop

   # Safe
   --loop --max-runs 100
   ```

3. **Don't do destructive operations**
   ```bash
   # Dangerous!
   "delete old files" --loop
   ```

---

## 🐛 Troubleshooting

### Q: Loop runs too fast
**A:** Increase interval
```bash
--loop 120   # instead of --loop 30
```

### Q: Loop never stops
**A:** Add max-runs safety limit
```bash
--loop 60 --max-runs 50
```

### Q: Want detailed output
**A:** Add verbose flag
```bash
--loop 60 --verbose
```

### Q: Task keeps failing
**A:** Check error message, could be:
- API rate limit → Increase interval
- Permission issues → Fix permissions
- Task itself has problems → Test without loop first

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

### Tip 4: File Input Support
```bash
# Load prompt from file for longer instructions
bun dev:flow "@long-task.txt" --loop 300 --max-runs 10

# Use absolute path
bun dev:flow "@/path/to/prompt.txt" --loop 60
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
- File input support for prompts

**Removed complexity:**
- ~~until-success~~
- ~~until-stable~~
- ~~on-error strategies~~

**Why:** Keep it simple - just "keep working until I stop you"
