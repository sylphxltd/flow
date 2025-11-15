---
"@sylphx/flow": patch
---

Fix agent enhancement by preserving rules field in frontmatter (CRITICAL):
- convertToClaudeCodeFormat was stripping the rules field
- Enhancement logic needs rules field to know which rules to load
- Now preserves rules array in transformed frontmatter
- Fixes: only core.md was being loaded, code-standards and workspace were ignored
