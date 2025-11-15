---
"@sylphx/flow": patch
---

Fix sync to dynamically scan templates instead of hardcoding (CRITICAL):
- Now scans assets/ directory at runtime for agents, slash commands, and rules
- Prevents sync from breaking when templates change
- Old commands (commit, context, explain, review, test) now correctly detected as unknown files
- New commands (cleanup, improve, polish, quality, release) properly recognized as Flow templates
