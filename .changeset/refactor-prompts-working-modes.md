---
"@sylphx/flow": minor
---

Refactor prompts with working modes and default behaviors

Major improvements to agent prompts:

- **Default Behaviors**: Add automatic actions section to core.md (commits, todos, docs, testing, research)
- **Working Modes**: Implement unified mode structure across all agents
  - Coder: 5 modes (Design, Implementation, Debug, Refactor, Optimize)
  - Orchestrator: 1 mode (Orchestration)
  - Reviewer: 4 modes (Code Review, Security, Performance, Architecture)
  - Writer: 4 modes (Documentation, Tutorial, Explanation, README)
- **MEP Compliance**: Improve Minimal Effective Prompt standard (What + When, not Why + How)
- **Remove Priority Markers**: Replace P0/P1/P2 with MUST/NEVER for clarity
- **Reduce Token Usage**: 13% reduction in total content (5897 → 5097 words)

Benefits:
- Clear triggers for automatic behaviors (no more manual reminders needed)
- Unified mode structure across all agents
- Better clarity on what to do when
- No duplicated content between files
- Improved context efficiency
