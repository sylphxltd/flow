---
name: Workspace Documentation
description: .sylphx/ shared workspace - auto-create, maintain SSOT, verify on every read
---

# WORKSPACE DOCUMENTATION

## On First Task

`.sylphx/` missing → Create structure + populate templates.
`.sylphx/` exists → Read all → Verify accuracy → Update or delete outdated.

---

## Structure

```
.sylphx/
├── context.md          # WHAT, WHY, WHO
├── architecture.md     # System design, patterns (WHY chosen)
├── glossary.md        # Project-specific terms only
└── decisions/         # ADRs (<200 words)
    ├── README.md
    └── NNN-title.md
```

---

## Templates

### context.md

```markdown
# Project Context

## What
[1-2 sentence description]

## Why
[Problem solved, user need]

## Who
[Target users, use cases]

## Status
[Phase, current version]

## Key Constraints
- [Non-negotiable 1]
- [Non-negotiable 2]

## Source of Truth
<!-- VERIFY: package.json -->
- Dependencies: `package.json`
- Config: [list files]
- Build: `package.json` scripts
```

### architecture.md

```markdown
# Architecture

## System Overview
[High-level description, 1-2 paragraphs]

## Key Components
<!-- VERIFY: src/path/ -->
- **Component** (`src/path/`): Purpose

## Design Patterns

### Pattern: [Name]
**Why:** [Rationale]
**Where:** `src/path/to/code.ts`
**Trade-off:** [Gained vs lost]

## Data Flow
[Macro: input → processing → output]
See `src/[entry].ts` for implementation.

## Boundaries
**In scope:** [What it does]
**Out of scope:** [What it doesn't]
```

### glossary.md

```markdown
# Glossary

## [Term]
**Definition:** [Clear, concise]
**Usage:** `src/path/to/usage.ts`
**Context:** [When/why matters]

---

[Project-specific terms only]
```

### decisions/NNN-title.md

```markdown
# NNN. [Verb + Object]

**Status:** ✅ Accepted
**Date:** YYYY-MM-DD

## Context
[Problem requiring decision, 1-2 sentences]

## Decision
[What was decided, 1 sentence]

## Rationale
- [Key benefit 1]
- [Key benefit 2]

## Consequences
**Positive:** [Gains]
**Negative:** [Drawbacks]

## References
<!-- VERIFY: src/path.ts -->
- Implementation: `src/path.ts`
- Related: #123, ADR-XXX
```

Keep <200 words.

---

## SSOT Discipline

**Reference, never duplicate.**

❌ Bad:
```markdown
Dependencies: react 19.2.0, zod 4.1.12
Linting: no-unused-vars, prefer-const
```

✅ Good:
```markdown
<!-- VERIFY: package.json -->
Dependencies: See `package.json`

<!-- VERIFY: biome.json -->
Linting: Biome (`biome.json`)

## Why Biome
Decision: ADR-003. Single tool for format + lint.
Trade-off: Smaller ecosystem vs convenience.
```

**Format:** `<!-- VERIFY: path -->` before references.

---

## Maintenance

### Every Task Start

Read .sylphx/ → Verify accuracy → Update or delete.

New understanding → Update immediately.
Architectural decision → Create ADR.
New project term → Add to glossary.
Outdated info → Delete.

### Before Commit

Understanding changed? → Update .sylphx/
Made architectural change? → Document ADR.
Deprecated approach? → Mark superseded or delete.

Verify: No contradictions. All `<!-- VERIFY: -->` markers valid.

---

## Content Rules

**Include (Macro WHY):**
- Project purpose, context, constraints
- Architectural decisions (WHY chosen)
- System boundaries
- Key patterns (WHY used, trade-offs)
- Project-specific terms

**Exclude (Belongs in Code):**
- API docs → JSDoc
- Implementation details → Code comments
- Config values → Config files
- Dependency versions → package.json
- How-to guides → Code
- Step-by-step processes → Code

**Principle:** Code or config? Don't duplicate here.

---

## Red Flags → Delete Immediately

- "We plan to..." (speculation)
- "Currently using..." (use present tense or delete)
- Contradicts actual code
- References non-existent files
- Duplicates package.json/config
- Explains HOW instead of WHY
- Generic advice (not project-specific)

---

## Decision Flow

**Create ADR when:**
- 2+ significant alternatives
- Long-term impact
- Non-obvious trade-offs
- Future devs will ask "why?"

**Skip ADR for:**
- Obvious choices
- Temporary decisions
- Implementation details
- Trivial choices

**Quick test:** Matters in 6 months? → ADR. No → Skip.

---

## Examples

### Good context.md

```markdown
# Project Context

## What
AI-powered CLI for autonomous development workflows.

## Why
Enable delegating complex multi-step tasks to AI that can plan, execute, verify autonomously.

## Who
Developers using Claude/AI for coding.

## Status
Active development - v1.2.0

## Key Constraints
- No breaking changes without major version
- Research mandatory before implementation
- All modules need .test.ts and .bench.ts
- Clean commits only

## Source of Truth
<!-- VERIFY: packages/flow/package.json -->
- Dependencies: `packages/flow/package.json`
- Build: `package.json` scripts
- TypeScript: `packages/flow/tsconfig.json`
```

### Good architecture.md

```markdown
# Architecture

## System Overview
CLI loads agent prompts from markdown, composes with rules/output-styles, orchestrates workflows.

## Key Components
<!-- VERIFY: src/core/ -->
- **Agent Loader** (`src/core/agent-loader.ts`): Parses markdown
- **Agent Manager** (`src/core/agent-manager.ts`): Orchestration

## Design Patterns

### Pattern: Markdown-as-Config
**Why:** Human-readable, version-controlled, easy iteration
**Where:** `assets/**/*.md` with frontmatter
**Trade-off:** Parsing overhead vs flexibility (chose flexibility)

### Pattern: Minimal Effective Prompting
**Why:** Trust LLM, reduce tokens 40%, increase clarity
**Where:** All prompts (v1.2.0 refactor)
**Trade-off:** Less teaching vs more effective triggering
**Decision:** ADR-002
```

### Good ADR

```markdown
# 002. Minimal Effective Prompt Philosophy

**Status:** ✅ Accepted
**Date:** 2024-11-15

## Context
Prompts were verbose, reducing effectiveness and increasing cost.

## Decision
Adopt MEP: Trust LLM, WHAT+WHEN not HOW+WHY, condensed.

## Rationale
- 40% token reduction
- Better LLM performance
- Easier maintenance

## Consequences
**Positive:** Lower cost, better results
**Negative:** Less explicit for humans

## References
<!-- VERIFY: commit c7795c0f -->
- Implementation: `assets/**/*.md`
- Refactor: c7795c0f
```

---

## Summary

**On first task:** .sylphx/ missing → Create with templates → Populate.

**Every task:** Read → Verify → Update/delete.

**During work:** New understanding → Update immediately.

**Content:** WHY (context, decisions) not HOW (implementation).

**Reference:** Link to SSOT, never duplicate.

**Prime Directive: Outdated docs worse than no docs. When in doubt, delete.**
