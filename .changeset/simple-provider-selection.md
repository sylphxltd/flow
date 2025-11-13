---
"@sylphx/flow": minor
---

Simplify provider selection - always ask, never save defaults

**Breaking Change**: Removed smart defaults for provider/agent selection

**Before:**
- Initial setup saved default provider
- Runtime choices were automatically saved
- Smart defaults applied on next run
- Complex conditional logic with useDefaults flags

**After:**
- Initial setup only configures API keys
- Always prompts for provider/agent each run
- No automatic saving of runtime choices
- Simple: want to skip prompts? Use `--provider` / `--agent` args

**Migration:**
Users who relied on saved defaults should now:
- Use `--provider default --agent coder` in scripts
- Or accept the prompt on each run

**Example:**
```bash
# Always prompts (new default behavior)
sylphx-flow "your prompt"

# Skip prompts with args
sylphx-flow --provider default --agent coder "your prompt"
```

This change reduces code complexity by 155 lines and makes behavior more predictable.
