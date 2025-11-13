# Loop Mode

Loop mode enables truly autonomous AI agents that continuously execute the same task with context preservation until you manually stop them or reach a configured limit.

## Core Concept

**Simple: Keep working on X until I stop you**

```bash
sylphx-flow "process all GitHub issues" --loop
```

## How It Works

1. **First iteration**: Execute task (fresh start)
2. **2nd+ iterations**: Immediately execute with `--continue` (preserve context)
3. **Continue**: Repeat indefinitely or until max-runs
4. **Stop**: Ctrl+C (graceful) or max-runs limit

## Basic Usage

### Default (Zero Wait Time)

```bash
sylphx-flow "task" --loop
# Execute continuously with no wait between iterations
```

**Why zero wait?**
- LLM tasks typically take 2-5 minutes
- Task execution time is already a natural interval
- No wasted idle time

### With Wait Time

```bash
sylphx-flow "task" --loop 120
# Wait 120 seconds between each iteration
```

**When to use wait time:**
- Rate limiting: Prevent hitting API limits
- Resource management: Give system time to recover
- Polling: Check for changes periodically
- Natural pacing: Space out operations

### Add Safety Limit

```bash
sylphx-flow "task" --loop 60 --max-runs 20
# Stop after 20 iterations
```

## Use Cases

### 1. GitHub Issue Handling

```bash
sylphx-flow "check github issues and handle them one by one" --loop 300
# Check every 5 minutes, continuously process issues
```

### 2. Code Review

```bash
sylphx-flow "review recent commits and provide feedback" --loop 3600
# Review new commits every hour
```

### 3. Documentation Updates

```bash
sylphx-flow "check if docs need update and fix them" --loop 1800
# Sync documentation every 30 minutes
```

### 4. Test Fixing

```bash
sylphx-flow "run tests, if fail try to fix" --loop 60 --max-runs 10
# Try up to 10 times, wait 60 seconds each time
```

### 5. Incremental Refactoring

```bash
sylphx-flow "continue refactoring legacy code" --loop 600 --max-runs 6
# Work every 10 minutes, total 1 hour
```

## API Reference

### `--loop [seconds]`

Enable loop mode with optional wait time between iterations.

**Default:** 0 seconds (no wait - execute immediately after previous task completes)

**Examples:**
```bash
--loop         # No wait (immediate re-execution)
--loop 0       # Same as above
--loop 60      # Wait 60 seconds between iterations
--loop 300     # Wait 5 minutes between iterations
--loop 3600    # Wait 1 hour between iterations
```

**Recommended values:**
- No wait: 0 seconds (default - for continuous work)
- Quick polling: 30-60 seconds
- Standard polling: 60-300 seconds (1-5 minutes)
- Long polling: 600-3600 seconds (10-60 minutes)

### `--max-runs <count>`

Maximum number of iterations (optional, default: infinite).

**Purpose:** Prevent forgetting to stop loop, or set work time limit.

**Examples:**
```bash
--max-runs 10     # Maximum 10 iterations
--max-runs 100    # Maximum 100 iterations
```

## Output Format

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

### Loop End
```
⚠️  Interrupt received - finishing current iteration...

━━━ 🏁 Loop Summary

  Total iterations: 5
  Successful: 4
  Errors: 1
  Duration: 5m 30s
```

## Safety Features

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

## Best Practices

### ✅ DO

1. **Use default (0s) for most cases**
   ```bash
   --loop              # No wait - continuous execution
   --loop 60           # Add wait time if needed
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
   --loop 60

   # Better for continuous work
   --loop       # No wait - task execution time is the interval
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

## Troubleshooting

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

## Advanced Patterns

### Pattern 1: Time-boxed Work

```bash
# Work for exactly 1 hour (60 iterations × 60s)
sylphx-flow "work on feature X" --loop 60 --max-runs 60
```

### Pattern 2: Progressive Task

```bash
# Iterate through large task
sylphx-flow "continue migrating to new API" --loop 180 --max-runs 20
# Each iteration makes progress, LLM remembers where it left off
```

### Pattern 3: Monitoring & Auto-fix

```bash
# Check health and auto-fix issues
sylphx-flow "check system health and fix issues if found" --loop 300
```

### Pattern 4: Staged Execution

```bash
# Stage 1: Quick pass (10 mins)
sylphx-flow "quick fixes" --loop 30 --max-runs 20

# Stage 2: Deep work (1 hour)
sylphx-flow "continue deep refactoring" --loop 300 --max-runs 12
```

## Pro Tips

### Tip 1: Task Phrasing

```bash
# Good: Progressive phrasing
"continue working on X, pick up where you left off"

# Better: Context-aware
"check status of X, continue if not done, report if complete"
```

### Tip 2: File Input Support

```bash
# Load prompt from file for longer instructions
sylphx-flow "@long-task.txt" --loop 300 --max-runs 10
```

## See Also

- [File Input Support](/features/file-input)
- [Smart Configuration](/features/smart-config)
- [CLI Commands Reference](/api/cli-commands)
