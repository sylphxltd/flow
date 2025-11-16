---
name: Workspace Documentation
description: .sylphx/ workspace - SSOT for context, architecture, decisions
---

# WORKSPACE DOCUMENTATION

## Core Behavior

**First task:** `.sylphx/` missing → create structure. Exists → verify accuracy, delete outdated.

**Task start:** Read `.sylphx/context.md`. Verify VERIFY markers. Drift → fix immediately (see Drift Resolution).

**During work:** New understanding/decision/term → update `.sylphx/` immediately.

**Before commit:** `.sylphx/` matches code. No contradictions. All markers valid.

---

## File Structure

```
.sylphx/
  context.md       # Internal context, constraints, boundaries
  architecture.md  # System overview, patterns (WHY), trade-offs
  glossary.md      # Project-specific terms only
  decisions/
    README.md      # ADR index
    NNN-title.md   # Individual ADRs
```

Missing → create with templates below.

---

## Templates

### context.md

Internal context only. Public info → README.md.

```markdown
# Project Context

## What (Internal)
[Project scope, internal boundaries, target use cases]

## Why (Business/Internal)
[Business context, internal motivation, market gap]

## Key Constraints
<!-- Non-negotiable constraints affecting code decisions -->
- Technical: [e.g., "Bundle <5MB (Vercel edge)"]
- Business: [e.g., "Zero telemetry (enterprise security)"]
- Legal: [e.g., "GDPR compliant (EU market)"]

## Boundaries
**In scope:** [What we build]
**Out of scope:** [What we don't]

## SSOT References
<!-- VERIFY: package.json -->
- Dependencies: `package.json`
```

Update when: Scope/constraints/boundaries change.

---

### architecture.md

```markdown
# Architecture

## System Overview
[1-2 paragraphs: structure, data flow, key decisions]

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

Update when: Architecture changes, pattern adopted, major refactor.

---

### glossary.md

```markdown
# Glossary

## [Term]
**Definition:** [Concise]
**Usage:** `src/path/`
**Context:** [When/why matters]
```

Update when: New project-specific term. Skip: General programming concepts.

---

### decisions/NNN-title.md

```markdown
# NNN. [Verb + Object]

**Status:** ✅ Accepted | 🚧 Proposed | ❌ Rejected | 📦 Superseded
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

**Create ADR when:**
- Difficult to reverse (schema, architecture)
- Affects >3 major components
- Security/compliance decision
- 2+ significant alternatives
- Team will ask "why?"

**Don't create for:** Framework patterns, best practices, temporary solutions, single-file changes.

**Decision tree:**
```
Can reverse in <1 day? → No ADR
Clear best practice? → No ADR
Affects architecture? → ADR
Trade-offs worth documenting? → ADR
```

---

## SSOT Discipline

Never duplicate. Always reference.

```markdown
<!-- VERIFY: path/to/file -->
[Topic]: See `path/to/file`
```

**Example:**
```markdown
<!-- VERIFY: package.json -->
Dependencies: `package.json`

<!-- VERIFY: biome.json -->
Linting: Biome. WHY: Single tool for format+lint. Trade-off: Smaller ecosystem. (ADR-003)
```

VERIFY marker = check on file changes.

---

## Update Triggers

New understanding → context.md/architecture.md. Architectural decision → ADR. Project term → glossary.md. Pattern adopted → architecture.md (WHY + trade-off). Constraint → context.md. Outdated → delete/fix immediately.

---

## Content Rules

### ✅ Include (WHY + Internal)
- context.md: Business context, constraints, scope
- architecture.md: Design decisions (WHY), patterns, trade-offs
- glossary.md: Project-specific terms
- ADRs: Significant decisions with alternatives

### ❌ Exclude (Elsewhere)
- Public info → README.md
- API docs → JSDoc/TSDoc
- Implementation → Code comments
- Config → Config files
- Versions/deps → package.json
- How-to → Code/docs site

Internal context only. No duplication.

---

## Red Flags

Delete immediately:

- ❌ "We plan to..." / "In the future..."
- ❌ "Currently using..."
- ❌ Contradicts code
- ❌ Non-existent file references
- ❌ Duplicates package.json/config
- ❌ Explains HOW not WHY
- ❌ Generic advice

---

## Verification

**Every `.sylphx/` read:** VERIFY markers valid. Content matches code. Wrong → fix immediately.

**Automated:**
```bash
bun run verify-docs  # Check all VERIFY markers
```

---

## Drift Resolution

**Detection triggers:**
- VERIFY marker → non-existent file
- Docs describe missing pattern
- Code has undocumented pattern
- Contradiction between .sylphx/ and code

**Resolution hierarchy:**
```
Code vs Docs:
├─ WHAT/HOW → Code wins, update docs
├─ WHY → Docs win if valid, else update both
└─ Both outdated → Research, fix both
```

**Fix immediately:** Code evolved → update docs. Docs outdated → update/delete. File moved → update markers. Who detects = who fixes.

**Document:** Architectural change → ADR. Pattern change → architecture.md. Constraint change → context.md.

**Examples:**
- File moved → update marker path
- Implementation changed → update docs + ADR
- Constraint violated → fix code or update constraint

---

## Prime Directive

**Outdated docs worse than no docs. When in doubt, delete.**
