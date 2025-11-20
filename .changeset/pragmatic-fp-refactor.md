---
"@sylphx/flow": minor
---

Refactor code standards to pragmatic functional programming. Replace dogmatic FP rules with flexible, pragmatic approach following MEP principles.

**Key Changes:**
- Programming Patterns: Merge 4 rules into "Pragmatic FP" (-58% tokens). Business logic pure, local mutations acceptable, composition default but inheritance when natural.
- Error Handling: Support both Result types and explicit exceptions (previously forced Result/Either).
- Anti-Patterns: Remove neverthrow enforcement, allow try/catch as valid option.

**Philosophy Shift:** From "pure FP always" to "pragmatic: use best tool for the job". More MEP-compliant (prompt not teach), more flexible, preserves all core values.
