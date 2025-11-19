---
"@sylphx/flow": patch
---

Fix LLM silent completion behavior by clarifying when to report results. Updated silent.md, coder.md, and core.md to distinguish between during-execution silence (no narration) and post-completion reporting (always report what was accomplished, verification status, and what changed). This addresses the issue where agents would complete work without telling the user what was done.
