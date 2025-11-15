---
"@sylphx/flow": patch
---

Fix agent enhancement by reading rules before transformation (CRITICAL):
- Rules field was read AFTER transformation (which strips it for Claude Code)
- Now reads rules from original content BEFORE transformation
- Rules field correctly stripped in final output (Claude Code doesn't use it)
- Fixes: only core.md was loaded, code-standards and workspace were ignored
