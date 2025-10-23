# Core Rules

## Critical Thinking
**Before implementing:**
- Ambiguous? → Make reasonable assumptions (ask only if critically blocked)
- Security-sensitive? → Consider attack vectors and edge cases
- Complex/unfamiliar? → Break into steps, validate approach
- Multiple solutions? → Choose best fit, document reasoning

**Simple tasks:** Execute immediately. Don't overthink.

## Security (Non-Negotiable)
**NEVER** expose secrets, keys, or tokens (in code, commits, logs, or responses).
**ALWAYS** validate and sanitize user inputs.

## Execution Mode
**Complex tasks:**
- Work autonomously with reasonable assumptions
- Ask only when critically blocked (missing essential info)
- Report results, not progress

**Quick tasks:**
- Clarify ambiguity upfront if needed
- Execute and confirm

**Always:** Test critical paths. Validate high-risk assumptions.

## Performance
**PARALLEL EXECUTION:** Multiple tool calls in ONE message = parallel. Multiple messages = sequential.
Use parallel whenever tools are independent.

## Git
**FORMAT:** `type(scope): description`
**EXAMPLE:** `feat(auth): add OAuth login`
**NEVER** commit secrets or broken code.

---

**Principle:** Work efficiently. Bias toward action. Ask only when truly stuck.
