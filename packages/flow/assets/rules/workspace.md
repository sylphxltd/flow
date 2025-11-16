---
name: Workspace Documentation
description: .sylphx/ workspace - SSOT for context, architecture, decisions
---

# WORKSPACE DOCUMENTATION

## Core Behavior

**Task start:** `.sylphx/` missing → create structure with templates. Exists → read context.md, spot-check critical VERIFY markers.

**During work:** Note changes. Defer updates until before commit.

**Before commit:** Update all .sylphx/ files. All VERIFY markers valid. No contradictions. Outdated → delete.

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

---

## Templates

### context.md

Internal only. Public → README.md.

```markdown
# Project Context

## What (Internal)
[Project scope, boundaries, target]

Example: CLI for AI agent orchestration. Scope: Local execution, file config, multi-agent. Target: TS developers. Out: Cloud, training, UI.

## Why (Business/Internal)
[Business context, motivation, market gap]

Example: Market gap in TS-native AI tooling. Python-first tools dominate. Opportunity: Capture web dev market.

## Key Constraints
<!-- Non-negotiable constraints affecting code decisions -->
- Technical: [e.g., "Bundle <5MB (Vercel edge)", "Node 18+ (ESM-first)"]
- Business: [e.g., "Zero telemetry (enterprise security)", "Offline-capable (China market)"]
- Legal: [e.g., "GDPR compliant (EU market)", "Apache 2.0 license only"]

## Boundaries
**In scope:** [What we build]
**Out of scope:** [What we explicitly don't]

## SSOT References
<!-- VERIFY: package.json -->
- Dependencies: `package.json`
```

Update: Scope/constraints/boundaries change.

---

### architecture.md

```markdown
# Architecture

## System Overview
[1-2 paragraphs: structure, data flow, key decisions]

Example: Event-driven CLI. Commands → Agent orchestrator → Specialized agents → Tools. File-based config, no server.

## Key Components
<!-- VERIFY: src/path/ -->
- **Name** (`src/path/`): [Responsibility]

Example:
- **Agent Orchestrator** (`src/orchestrator/`): Task decomposition, delegation, synthesis
- **Code Agent** (`src/agents/coder/`): Code generation, testing, git operations

## Design Patterns

### Pattern: [Name]
**Why:** [Problem solved]
**Where:** `src/path/`
**Trade-off:** [Gained vs lost]

Example:
### Pattern: Factory for agents
**Why:** Dynamic agent creation based on task type
**Where:** `src/factory/`
**Trade-off:** Flexibility vs complexity. Added indirection but easy to add agents.

## Boundaries
**In scope:** [Core functionality]
**Out of scope:** [Explicitly excluded]
```

Update: Architecture changes, pattern adopted, major refactor.

---

### glossary.md

```markdown
# Glossary

## [Term]
**Definition:** [Concise]
**Usage:** `src/path/`
**Context:** [When/why matters]

Example:
## Agent Enhancement
**Definition:** Merging base agent definition with rules
**Usage:** `src/core/enhance-agent.ts`
**Context:** Loaded at runtime before agent execution. Rules field stripped for Claude Code compatibility.
```

Update: New project-specific term. Skip: General programming concepts.

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

**Create ADR when ANY:**
- Changes database schema
- Adds/removes major dependency (runtime, not dev)
- Changes auth/authz mechanism
- Affects >3 files in different features
- Security/compliance decision
- Multiple valid approaches exist

**Skip:** Framework patterns, obvious fixes, config changes, single-file changes, dev dependencies.

---

## SSOT Discipline

Never duplicate. Always reference.

```markdown
<!-- VERIFY: path/to/file -->
[Topic]: See `path/to/file`
```

**Duplication triggers:**
- Listing dependencies → Reference package.json
- Describing config → Reference config file
- Listing versions → Reference package.json
- How-to steps → Reference code or docs site

**When to duplicate:**
- WHY behind choice + trade-off (with reference)
- Business constraint context (reference authority)

**Example:**
```markdown
<!-- VERIFY: package.json -->
Dependencies: `package.json`

<!-- VERIFY: biome.json -->
Linting: Biome. WHY: Single tool for format+lint. Trade-off: Smaller plugin ecosystem vs simplicity. (ADR-003)
```

---

## Update Strategy

**During work:** Note changes (comment/mental).

**Before commit:**
- Architecture change → Update architecture.md or create ADR
- New constraint discovered → Update context.md
- Project-specific term introduced → Add to glossary.md
- Pattern adopted → Document in architecture.md (WHY + trade-off)
- Outdated content → Delete

Single batch update. Reduces context switching.

---

## Content Rules

### ✅ Include
- **context.md:** Business context you can't find in code. Constraints affecting decisions. Explicit scope boundaries.
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

**On read:** Spot-check critical VERIFY markers in context.md.

**Before commit:** Check all VERIFY markers → files exist. Content matches code. Wrong → fix. Outdated → delete.

**Drift detection:**
- VERIFY → non-existent file
- Docs describe missing pattern
- Code has undocumented pattern
- Contradiction between .sylphx/ and code

**Resolution:**
```
WHAT/HOW conflict → Code wins, update docs
WHY conflict → Docs win if still valid, else update both
Both outdated → Research current state, fix both
```

**Fix patterns:**
- File moved → Update VERIFY path
- Implementation changed → Update docs. Major change + alternatives existed → Create ADR
- Constraint violated → Fix code (if constraint valid) or update constraint (if context changed) + document WHY

---

## Red Flags

Delete immediately:

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

**Outdated docs worse than no docs. When in doubt, delete.**
