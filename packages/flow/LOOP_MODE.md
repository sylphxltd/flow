# 🔄 Loop Mode - Autonomous Continuous Execution

Loop mode enables autonomous, periodic task execution with intelligent exit conditions and error handling.

## 🎯 Use Cases

### 1. Continuous Monitoring
```bash
# Monitor code quality every 5 minutes
bun dev:flow "check code for issues and report" --loop 300

# Watch test status
bun dev:flow "run tests and report failures" --loop 60 --until-success
```

### 2. Auto-fixing
```bash
# Continuously fix linting issues
bun dev:flow "fix all linting errors" --loop 30 --until-stable

# Auto-format on changes
bun dev:flow "format all code files" --loop 60 --max-runs 3
```

### 3. Incremental Work
```bash
# Work on large task in chunks
bun dev:flow "continue refactoring auth system" --loop 120 --max-runs 10

# Progressive documentation
bun dev:flow "update outdated docs" --loop 300 --until-stable
```

### 4. CI/CD Integration
```bash
# Periodic deployment checks
bun dev:flow "check deployment status and fix issues" --loop 60 --on-error stop

# Automated code reviews
bun dev:flow "review recent commits and provide feedback" --loop 3600
```

---

## 📚 API Reference

### Basic Syntax
```bash
bun dev:flow "<task>" --loop <seconds> [options]
```

### Core Options

#### `--loop <seconds>`
Enable loop mode with N second interval between runs.

**Examples:**
```bash
--loop 60      # Run every 60 seconds
--loop 300     # Run every 5 minutes
--loop 3600    # Run every hour
```

**Minimum:** 5 seconds (prevents tight loops)
**Default:** No loop (single execution)

---

#### `--max-runs <count>`
Maximum iterations before exit (safety limit).

**Examples:**
```bash
--max-runs 10     # Stop after 10 iterations
--max-runs 100    # Stop after 100 iterations
```

**Default:** 100
**Range:** 1-∞

---

#### `--until-success`
Exit loop when task succeeds (exit code 0).

**Use case:** Retry until tests pass, build succeeds, etc.

**Example:**
```bash
bun dev:flow "run tests" --loop 30 --until-success
# Keeps running every 30s until all tests pass
```

---

#### `--until-stable`
Exit loop when output unchanged from previous run.

**Use case:** Iterative fixes until no more changes needed.

**Example:**
```bash
bun dev:flow "fix linting" --loop 20 --until-stable
# Keeps fixing until output identical (nothing left to fix)
```

---

#### `--on-error <strategy>`
Error handling strategy when execution fails.

**Values:**
- `continue` (default) - Log error, continue to next iteration
- `stop` - Stop loop immediately on error
- `retry` - Retry immediately without waiting

**Examples:**
```bash
--on-error continue   # Default: keep going
--on-error stop       # Stop on first error
--on-error retry      # Retry immediately
```

---

## 💡 Usage Examples

### Example 1: Test Fixer
```bash
bun dev:flow "run tests and fix failures" \
  --loop 30 \
  --until-success \
  --max-runs 5 \
  --on-error continue

# What happens:
# Iteration 1: Tests fail → Fix attempt
# Wait 30s...
# Iteration 2: Tests fail → Fix attempt
# Wait 30s...
# Iteration 3: Tests pass → SUCCESS, exit loop
```

### Example 2: Code Quality Enforcer
```bash
bun dev:flow "check and fix code quality issues" \
  --loop 60 \
  --until-stable \
  --max-runs 10

# What happens:
# Iteration 1: Found 15 issues → Fixed 12
# Wait 60s...
# Iteration 2: Found 3 issues → Fixed 3
# Wait 60s...
# Iteration 3: Found 0 issues → Output identical, STABLE, exit
```

### Example 3: Deployment Monitor
```bash
bun dev:flow "check deployment status and rollback if needed" \
  --loop 120 \
  --on-error stop

# What happens:
# Runs every 2 minutes
# If error occurs → Stop immediately (don't auto-retry deployments)
```

### Example 4: Documentation Sync
```bash
bun dev:flow "update docs to match code changes" \
  --loop 3600 \
  --until-stable

# What happens:
# Runs every hour
# Stops when docs fully synced (no changes detected)
```

### Example 5: Progressive Refactoring
```bash
bun dev:flow "refactor legacy code module by module" \
  --loop 300 \
  --max-runs 20 \
  --until-stable

# What happens:
# Works on refactoring in 5-minute chunks
# Max 20 iterations (1h 40m total)
# Stops early if refactoring complete
```

---

## 🎨 Output Format

### Loop Start
```
━━━ 🔄 Loop Mode Activated

  Interval: 60s
  Max runs: 10
  Exit: Until success
  On error: continue
```

### Each Iteration
```
🔄 Loop iteration 3/10
Started: 14:32:15

[... task execution ...]

⏳ Waiting 60s until next run... (completed: 3/10)
```

### Loop End
```
✓ Success condition met - stopping loop

━━━ 🏁 Loop Summary

  Total iterations: 3
  Successful: 3
  Errors: 0
  Duration: 2m 45s
```

---

## 🛡️ Safety Features

### 1. Graceful Shutdown
Press `Ctrl+C` to stop loop gracefully:
```
⚠️  Interrupt received - finishing current iteration...

━━━ 🏁 Loop Summary
  ...
```

### 2. Auto-limits
- **Default max-runs:** 100 iterations
- **Minimum interval:** 5 seconds
- **Error threshold:** Stops after 5 consecutive errors

### 3. Rate Limiting
Loop mode respects API rate limits and includes built-in delays.

### 4. Resource Management
- Automatic cleanup between iterations
- Memory management for long-running loops

---

## 🔧 Technical Details

### Context Persistence
- First iteration: Fresh start
- Subsequent iterations: Auto-enable `--continue` flag
- LLM builds on previous work across iterations

### Headless Mode
- Loop mode automatically enables headless mode (`--print`)
- No interactive prompts during execution
- All output logged for review

### Exit Conditions (Priority Order)
1. User interrupt (Ctrl+C)
2. `--until-success` met
3. `--until-stable` met
4. `--max-runs` reached
5. 5 consecutive errors

---

## ⚠️ Best Practices

### DO ✅
- Set reasonable intervals (60s+ for most tasks)
- Use `--max-runs` to prevent infinite loops
- Use `--until-success` for retry logic
- Use `--until-stable` for iterative fixes
- Test with `--max-runs 3` first

### DON'T ❌
- Don't use very short intervals (<10s) without reason
- Don't forget `--max-runs` for production use
- Don't use `--on-error retry` without `--max-runs`
- Don't run expensive operations in tight loops

---

## 🐛 Troubleshooting

### Loop runs too fast
```bash
# Increase interval
--loop 120  # instead of --loop 10
```

### Loop never exits
```bash
# Add max-runs safety limit
--loop 60 --max-runs 20
```

### Task fails every iteration
```bash
# Check error strategy
--on-error stop  # Stop to investigate
```

### Need to see what's happening
```bash
# Add verbose flag
--loop 60 --verbose
```

---

## 🚀 Advanced Patterns

### Pattern 1: Multi-stage Loop
```bash
# Stage 1: Quick fixes (3 runs)
bun dev:flow "quick fixes" --loop 20 --max-runs 3 --until-stable

# Stage 2: Deep fixes (10 runs)
bun dev:flow "deep fixes" --loop 60 --max-runs 10 --until-success
```

### Pattern 2: Time-boxed Work
```bash
# Work for exactly 30 minutes (30 iterations × 60s)
bun dev:flow "work on feature X" --loop 60 --max-runs 30
```

### Pattern 3: Conditional Exit
```bash
# Try up to 5 times, stop on success
bun dev:flow "flaky test runner" --loop 10 --max-runs 5 --until-success
```

---

## 📊 Performance Considerations

| Interval | Use Case | Notes |
|----------|----------|-------|
| 5-30s | Quick tasks, monitoring | High frequency |
| 60-300s | Standard tasks | Most common |
| 600-3600s | Heavy tasks, periodic checks | Low frequency |

**Memory:** ~50MB per iteration (cleaned up after)
**CPU:** Depends on task complexity
**API:** Respects rate limits automatically

---

## 📝 Changelog

### v1.0.0
- Initial loop mode implementation
- Basic interval and max-runs
- Exit conditions (success, stable)
- Error handling strategies
- Graceful shutdown support
