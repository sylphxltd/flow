---
"@sylphx/flow": patch
---

Add comprehensive debug logging to trace sync file operations:

- **Deletion verification**: Check file exists before/after unlink to verify actual deletion
- **Installation logging**: Show force flag status, file paths, and write verification
- **Force flag propagation**: Log when force mode is activated for agents and slash commands

This diagnostic release helps identify why sync appears successful but git shows no changes.
