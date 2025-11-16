---
"@sylphx/flow": patch
---

Fix workspace.md execution issues with realistic strategies

Critical fixes:
- Fixed cold start: Check exists → create if needed → read (was: read immediately, failing if missing)
- Changed to batch updates: Note during work, update before commit (was: update immediately, causing context switching)
- Realistic verification: Spot-check on read, full check before commit (was: check everything on every read)
- Objective ADR criteria: Specific measurable conditions (was: subjective "can reverse in <1 day?")
- Added concrete examples to all templates (was: generic placeholders causing confusion)

Additional improvements:
- Added SSOT duplication triggers (when to reference vs duplicate)
- Added content boundary test (README vs context.md decision criteria)
- Added detailed drift fix patterns with conditions
- Expanded red flags list
- Clarified update strategy with rationale

Result: Executable, realistic workspace management that LLM agents can actually follow.

Before: 265 lines with execution problems
After: 283 lines (+7%) with all critical issues fixed, higher information density
