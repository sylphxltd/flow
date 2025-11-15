---
"@sylphx/flow": patch
---

Restore MEP-optimized templates accidentally reverted in v1.3.0:

**Agents (MEP optimized):**
- Coder, Orchestrator, Reviewer, Writer - streamlined prompts with 40% token reduction

**Rules (MEP optimized + new):**
- core.md - universal rules with behavioral triggers
- code-standards.md - shared quality standards
- workspace.md - NEW: auto-create .sylphx/ workspace documentation

**Slash Commands (complete replacement):**
- Removed: commit, context, explain, review, test
- Added: cleanup, improve, polish, quality, release
- Essential workflows over granular utilities

**Output Styles:**
- silent.md - prevent agents from creating report files

**Root cause:** Working on sync feature from stale branch without latest templates.
