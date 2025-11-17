---
name: Workspace Documentation
description: .sylphx/ workspace - SSOT for context, architecture, decisions
---

# WORKSPACE DOCUMENTATION

## Core Behavior

<!-- P1 --> **Task start**: `.sylphx/` missing → create structure. Exists → read context.md.

<!-- P2 --> **During work**: Note changes mentally. Batch updates before commit.

<!-- P1 --> **Before commit**: Update .sylphx/ files if architecture/constraints/decisions changed. Delete outdated content.

<reasoning>
Outdated docs worse than no docs. Defer updates to reduce context switching.
</reasoning>

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

**Missing → create with templates below.**

---

## Templates

### context.md

<instruction priority="P2">
Internal context only. Public info → README.md.
</instruction>

```markdown
# Project Context

## What (Internal)
[Project scope, boundaries, target]

<example>
CLI for AI agent orchestration.
Scope: Local execution, file config, multi-agent.
Target: TS developers.
Out: Cloud, training, UI.
</example>

## Why (Business/Internal)
[Business context, motivation, market gap]

<example>
Market gap in TS-native AI tooling. Python-first tools dominate.
Opportunity: Capture web dev market.
</example>

## Key Constraints
<!-- Non-negotiable constraints affecting code decisions -->
- Technical: [e.g., "Bundle <5MB (Vercel edge)", "Node 18+ (ESM-first)"]
- Business: [e.g., "Zero telemetry (enterprise security)", "Offline-capable (China market)"]
- Legal: [e.g., "GDPR compliant (EU market)", "Apache 2.0 license only"]

## Boundaries
**In scope:** [What we build]
**Out of scope:** [What we explicitly don't]

## SSOT References
- Dependencies: `package.json`
- Config: `[config file]`
```

**Update when**: Scope/constraints/boundaries change.

---

### architecture.md

```markdown
# Architecture

## System Overview
[1-2 paragraphs: structure, data flow, key decisions]

<example>
Event-driven CLI. Commands → Agent orchestrator → Specialized agents → Tools.
File-based config, no server.
</example>

## Key Components
- **[Name]** (`src/path/`): [Responsibility]

<example>
- **Agent Orchestrator** (`src/orchestrator/`): Task decomposition, delegation, synthesis
- **Code Agent** (`src/agents/coder/`): Code generation, testing, git operations
</example>

## Design Patterns

### Pattern: [Name]
**Why:** [Problem solved]
**Where:** `src/path/`
**Trade-off:** [Gained vs lost]

<example>
### Pattern: Factory for agents
**Why:** Dynamic agent creation based on task type
**Where:** `src/factory/`
**Trade-off:** Flexibility vs complexity. Added indirection but easy to add agents.
</example>

## Boundaries
**In scope:** [Core functionality]
**Out of scope:** [Explicitly excluded]
```

**Update when**: Architecture changes, pattern adopted, major refactor.

---

### glossary.md

```markdown
# Glossary

## [Term]
**Definition:** [Concise]
**Usage:** `src/path/`
**Context:** [When/why matters]

<example>
## Agent Enhancement
**Definition:** Merging base agent definition with rules
**Usage:** `src/core/enhance-agent.ts`
**Context:** Loaded at runtime before agent execution. Rules field stripped for Claude Code compatibility.
</example>
```

**Update when**: New project-specific term introduced.

**Skip**: General programming concepts.

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
- Implementation: `src/path/`
- Supersedes: ADR-XXX (if applicable)
```

**<200 words total.**

<instruction priority="P2">
**Create ADR when ANY:**
- Changes database schema
- Adds/removes major dependency (runtime, not dev)
- Changes auth/authz mechanism
- Affects >3 files in different features
- Security/compliance decision
- Multiple valid approaches exist

**Skip:** Framework patterns, obvious fixes, config changes, single-file changes, dev dependencies.
</instruction>

---

## SSOT Discipline

<!-- P1 --> Never duplicate. Always reference.

```markdown
[Topic]: See `path/to/file`
```

<example type="good">
Dependencies: `package.json`
Linting: Biome. WHY: Single tool for format+lint. Trade-off: Smaller plugin ecosystem vs simplicity. (ADR-003)
</example>

<example type="bad">
Dependencies: react@18.2.0, next@14.0.0, ...
(Duplicates package.json - will drift)
</example>

**Duplication triggers:**
- Listing dependencies → Reference package.json
- Describing config → Reference config file
- Listing versions → Reference package.json
- How-to steps → Reference code or docs site

**When to duplicate:**
- WHY behind choice + trade-off (with reference)
- Business constraint context (reference authority)

---

## Update Strategy

<workflow priority="P1">
**During work:** Note changes (mental/comment).

**Before commit:**
1. Architecture changed → Update architecture.md or create ADR
2. New constraint discovered → Update context.md
3. Project term introduced → Add to glossary.md
4. Pattern adopted → Document in architecture.md (WHY + trade-off)
5. Outdated content → Delete

Single batch update. Reduces context switching.
</workflow>

---

## Content Rules

### ✅ Include
- **context.md:** Business context not in code. Constraints affecting decisions. Explicit scope boundaries.
- **architecture.md:** WHY this pattern. Trade-offs of major decisions. System-level structure.
- **glossary.md:** Project-specific terms. Domain language.
- **ADRs:** Significant decisions with alternatives.

### ❌ Exclude
- Public marketing → README.md
- API reference → JSDoc/TSDoc
- Implementation details → Code comments
- Config values → Config files
- Dependency list → package.json
- Tutorial steps → Code examples or docs site
- Generic best practices → Core rules

**Boundary test:** Can user learn this from README? → Exclude. Does code show WHAT but not WHY? → Include.

---

## Verification

<checklist priority="P1">
**Before commit:**
- [ ] Files referenced exist (spot-check critical paths)
- [ ] Content matches code (no contradictions)
- [ ] Outdated content deleted
</checklist>

**Drift detection:**
- Docs describe missing pattern
- Code has undocumented pattern
- Contradiction between .sylphx/ and code

**Resolution:**
```
WHAT/HOW conflict → Code wins, update docs
WHY conflict → Docs win if still valid, else update both
Both outdated → Research current state, fix both
```

<example type="drift">
Drift: architecture.md says "Uses Redis for sessions"
Code: No Redis, using JWT
Resolution: Code wins → Update architecture.md: "Uses JWT for sessions (stateless auth)"
</example>

**Fix patterns:**
- File moved → Update path reference
- Implementation changed → Update docs. Major change + alternatives existed → Create ADR
- Constraint violated → Fix code (if constraint valid) or update constraint (if context changed) + document WHY

---

## Red Flags

<!-- P1 --> Delete immediately:

- ❌ "We plan to..." / "In the future..." (speculation)
- ❌ "Currently using X" implying change (state facts: "Uses X")
- ❌ Contradicts code
- ❌ References non-existent files
- ❌ Duplicates package.json/config values
- ❌ Explains HOW not WHY
- ❌ Generic advice ("follow best practices")
- ❌ Outdated after refactor

---

## Prime Directive

<!-- P0 --> **Outdated docs worse than no docs. When in doubt, delete.**
