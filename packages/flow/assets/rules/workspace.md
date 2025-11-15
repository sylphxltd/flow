---
name: Workspace Documentation
description: .sylphx/ workspace - SSOT for context, architecture, decisions
---

# WORKSPACE DOCUMENTATION

## Core Behavior

**First task:** `.sylphx/` missing → create structure. Exists → verify accuracy, update/delete outdated.

**Every task start:** Read all `.sylphx/` files. Verify `<!-- VERIFY: -->` markers. Fix or delete wrong info immediately.

**During work:** New understanding/decision/term → update `.sylphx/` immediately.

**Before commit:** `.sylphx/` matches code. No contradictions. All markers valid.

---

## File Structure

```
.sylphx/
  context.md       # What, Why, Who, Constraints
  architecture.md  # System overview, patterns (WHY), boundaries
  glossary.md      # Project-specific terms only
  decisions/
    README.md      # ADR index
    NNN-title.md   # Individual ADRs
```

Missing on first task → create with minimal templates below.

---

## Templates

### context.md

```markdown
# Project Context

## What
[1-2 sentences]

## Why
[Problem solved]

## Who
[Users, use cases]

## Status
[Phase, version]

## Key Constraints
- [Non-negotiable 1]
- [Non-negotiable 2]

## Source of Truth
<!-- VERIFY: package.json -->
- Dependencies: `package.json`
- [Other SSOT references]
```

**Update when:** Scope/purpose/constraints change.

---

### architecture.md

```markdown
# Architecture

## System Overview
[1-2 paragraphs]

## Key Components
<!-- VERIFY: src/path/ -->
- **Name** (`src/path/`): [Responsibility]

## Design Patterns

### Pattern: [Name]
**Why:** [Problem solved]
**Where:** `src/path/`
**Trade-off:** [Gained vs lost]

## Boundaries
**In scope:** [What it does]
**Out of scope:** [What it doesn't]
```

**Update when:** Architecture changes, pattern adopted, major refactor.

---

### glossary.md

```markdown
# Glossary

## [Term]
**Definition:** [Concise]
**Usage:** `src/path/`
**Context:** [When/why matters]
```

**Update when:** New project-specific term introduced.
**Skip:** General programming concepts.

---

### decisions/NNN-title.md

```markdown
# NNN. [Verb + Object]

**Status:** ✅ Accepted
**Date:** YYYY-MM-DD

## Context
[Problem. 1-2 sentences.]

## Decision
[What decided. 1 sentence.]

## Rationale
- [Key benefit 1]
- [Key benefit 2]

## Consequences
**Positive:** [Benefits]
**Negative:** [Drawbacks]

## References
<!-- VERIFY: src/path/ -->
- Implementation: `src/path/`
- Supersedes: ADR-XXX (if applicable)
```

**<200 words total.**

**Create when:**
- 2+ significant alternatives
- Long-term impact
- Non-obvious trade-offs
- "Why did they do this?" question

**Don't create for:** Obvious/temporary/trivial choices.

**Quick test:** Matters in 6 months? → ADR. Otherwise skip.

---

## SSOT Discipline

Never duplicate. Always reference.

Reference format:
```markdown
<!-- VERIFY: path/to/file -->
[Topic]: See `path/to/file`
```

**Examples:**
```markdown
<!-- VERIFY: package.json -->
Dependencies: See `package.json`

<!-- VERIFY: biome.json -->
Linting: Biome (config in `biome.json`)
Why Biome: Single tool for format+lint. Trade-off: Smaller ecosystem. (ADR-003)
```

Marker `<!-- VERIFY: -->` = reminder to check on file changes.

---

## Update Triggers

**New understanding** → Update context.md or architecture.md
**Architectural decision** → Create ADR
**Project-specific term** → Add to glossary.md
**Pattern adopted** → Document in architecture.md (WHY + trade-off)
**Constraint discovered** → Add to context.md
**Outdated info found** → Delete or fix immediately

---

## Content Rules

### ✅ Include (WHY)
- Project purpose, context
- Architectural decisions (WHY chosen)
- System boundaries
- Key patterns (WHY, trade-offs)
- Project-specific terms
- Non-obvious constraints

### ❌ Exclude (Elsewhere)
- API docs → JSDoc
- Implementation → Code comments
- Config values → Config files
- Versions → package.json
- How-to → Code
- Step-by-step → Code

**If in code/config, don't duplicate.**

---

## Red Flags

Scan every read. Delete immediately:

- ❌ "We plan to..." / "In the future..." (speculation)
- ❌ "Currently using..." (implies change)
- ❌ Contradicts code
- ❌ References non-existent files
- ❌ Duplicates package.json/config
- ❌ Explains HOW not WHY
- ❌ Generic advice

---

## Verification

**On every `.sylphx/` read:**
- Check `<!-- VERIFY: -->` markers → files exist?
- Content accurate vs code?
- Wrong → fix. Outdated → update/delete.

**Monthly or after major changes:**
- Verify all file references exist
- Check no duplication of package.json/config
- Verify all markers valid
- Delete outdated sections

---

## Prime Directive

**Outdated docs worse than no docs. When in doubt, delete.**
