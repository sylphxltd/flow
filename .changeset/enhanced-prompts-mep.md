---
"@sylphx/flow": minor
---

Enhanced agent system prompts with Minimal Effective Prompt principles:

- **Workflow Standards**: Added continuous atomic commits, semver discipline (minor-first), TypeScript release workflow with changeset + CI, and proactive pre-commit cleanup
- **Research-First Mindset**: Enforced research before implementation to prevent outdated approaches
- **Silent Mode Fix**: Prevented agents from creating report files to compensate for not speaking
- **Proactive Cleanup**: Added mandatory pre-commit hygiene - refactor, remove unused code, delete outdated docs, fix tech debt
- **MEP Refactor**: Refactored all prompts (coder, orchestrator, reviewer, writer, core, code-standards, silent) using Minimal Effective Prompt principles - trust LLM, WHAT+WHEN not HOW+WHY, condition→action format, ~40% token reduction

Prime directive: Never accumulate misleading artifacts. Research is mandatory. Tests and benchmarks required (.test.ts, .bench.ts).
