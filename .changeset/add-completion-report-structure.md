---
"@sylphx/flow": patch
---

Add structured completion report format to prompts

Added comprehensive 3-tier report structure to guide task completion reporting:

**Tier 1 - Always Required:**
- Summary, Changes, Commits, Tests, Documentation, Breaking Changes, Known Issues

**Tier 2 - When Relevant:**
- Dependencies, Tech Debt, Files Cleanup/Refactor, Next Actions

**Tier 3 - Major Changes Only:**
- Performance, Security, Migration, Verification, Rollback, Optimization Opportunities

Benefits:
- Forces LLM to remember completed work (must write report)
- Provides reviewable, structured output
- Prevents incomplete reporting
- Consistent format across all tasks

Includes detailed example for authentication refactoring showing proper usage of each section.
