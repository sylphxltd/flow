---
name: Workspace Documentation
description: .sylphx/ shared workspace - auto-create, maintain SSOT, verify on every read
---

# WORKSPACE DOCUMENTATION

## On First Task

**Check:** `.sylphx/` exists?

**No → Create structure:**
```bash
mkdir -p .sylphx/decisions
```

Create files with templates below. Populate with project-specific content.

**Yes → Verify:**
- Read all files
- Check accuracy vs actual code
- Update or delete outdated sections

---

## Structure & Templates

### .sylphx/context.md

**Create when:** First task, or when missing
**Update when:** Project scope/purpose/constraints change

```markdown
# Project Context

## What
[1-2 sentence description of what this project is]

## Why
[Problem being solved, user need addressed]

## Who
[Target users, primary use cases]

## Status
[Development phase: Alpha/Beta/Stable, current version]

## Key Constraints
- [Non-negotiable requirement 1]
- [Non-negotiable requirement 2]
- [Critical limitation or boundary]

## Source of Truth References
<!-- VERIFY: These files exist -->
- Tech stack: `package.json`
- Configuration: [list config files]
- Build/Scripts: `package.json` scripts
```

**Verify:** Referenced files exist. If not, update or remove reference.

---

### .sylphx/architecture.md

**Create when:** First task, or when missing
**Update when:** Architecture changes, patterns adopted, major refactoring

```markdown
# Architecture

## System Overview
[1-2 paragraph high-level description]

## Key Components
<!-- VERIFY: Paths exist -->
- **Component A** (`src/path/`): [Purpose, responsibility]
- **Component B** (`src/path/`): [Purpose, responsibility]

## Design Patterns

### Pattern: [Name]
**Why chosen:** [Rationale - problem it solves]
**Where used:** `src/path/to/implementation.ts`
**Trade-off:** [What gained vs what lost]

## Data Flow
[Macro-level: input → processing → output]
See `src/[entry-point].ts` for implementation.

## Boundaries
**In scope:** [What this project does]
**Out of scope:** [What it explicitly doesn't do]
```

**Verify:** All paths exist. Patterns still used. Trade-offs still accurate.

---

### .sylphx/glossary.md

**Create when:** First task, or when missing
**Update when:** New project-specific term introduced

```markdown
# Glossary

## [Term]
**Definition:** [Clear, concise definition]
**Usage:** `src/path/where/used.ts`
**Context:** [When/why this term matters]

---

[Only project-specific terms. No general programming concepts.]
```

**Verify:** Terms still used. Usage references exist.

---

### .sylphx/decisions/README.md

**Create when:** First ADR created
**Update when:** New ADR added

```markdown
# Architecture Decision Records

## Active Decisions
- [ADR-001: Title](./001-title.md) ✅ Accepted
- [ADR-002: Title](./002-title.md) ✅ Accepted

## Superseded
- [ADR-XXX: Old Title](./xxx-old.md) 🔄 Superseded by ADR-YYY

## Status Legend
- ✅ Accepted - Currently in effect
- ⏸️ Proposed - Under consideration
- ❌ Rejected - Not adopted
- 🔄 Superseded - Replaced by newer ADR
```

---

### .sylphx/decisions/NNN-title.md

**Create when:** Making architectural decision
**Update when:** Decision status changes or is superseded

```markdown
# NNN. [Title - Verb + Object, e.g., "Use Bun as Package Manager"]

**Status:** ✅ Accepted
**Date:** YYYY-MM-DD
**Deciders:** [Who made decision, or "Project maintainers"]

## Context
[Situation/problem requiring a decision. 1-2 sentences.]

## Decision
[What was decided. 1 sentence.]

## Rationale
[Why this decision over alternatives. Key benefits. 2-3 bullet points.]

## Consequences
**Positive:**
- [Benefit 1]
- [Benefit 2]

**Negative:**
- [Drawback 1]
- [Drawback 2]

## References
<!-- VERIFY: Links exist -->
- Implementation: `src/path/to/code.ts`
- Related PR: #123 (if applicable)
- Supersedes: ADR-XXX (if applicable)
```

**Keep <200 words total.**

---

## SSOT Discipline

**Never duplicate. Always reference.**

### ❌ Bad (Duplication - Will Drift)

```markdown
Dependencies:
- react 19.2.0
- zod 4.1.12

Linting rules:
- no-unused-vars
- prefer-const
```

### ✅ Good (Reference - SSOT Maintained)

```markdown
<!-- VERIFY: package.json exists -->
Dependencies: See `package.json`

<!-- VERIFY: biome.json exists -->
Linting: Biome (config in `biome.json`)

## Why Biome
- Decision: ADR-003
- Benefit: Single tool for format + lint
- Trade-off: Smaller ecosystem than ESLint
```

**Format for references:**
```markdown
<!-- VERIFY: path/to/file.ts -->
[Description]. See `path/to/file.ts`.
```

Verification marker reminds: when file changes, check if doc needs update.

---

## Maintenance Triggers

### On Every Task Start

```
1. Check .sylphx/ exists
   - No → Create with templates
   - Yes → Continue to verify

2. Read all .sylphx/ files

3. Verify accuracy:
   - Check <!-- VERIFY: --> markers
   - Confirm files exist
   - Check if still accurate vs code

4. Update or delete:
   - Wrong → Fix immediately
   - Outdated → Update or delete
   - Missing context → Add

5. Note gaps for later update
```

### During Task Execution

**Triggers to update:**

- **New understanding** → Update context.md or architecture.md
- **Architectural decision made** → Create ADR in decisions/
- **New project-specific term** → Add to glossary.md
- **Pattern adopted** → Document in architecture.md with WHY
- **Constraint discovered** → Add to context.md
- **Found outdated info** → Delete or update immediately

### Before Commit

```
1. Updated understanding? → Update .sylphx/
2. Made architectural change? → Create/update ADR
3. Deprecated approach? → Mark superseded or delete
4. Verify: No contradictions between .sylphx/ and code
5. Verify: All <!-- VERIFY: --> markers still valid
```

---

## Content Rules

### ✅ Include (Macro-Level WHY)

- Project purpose and context
- Architectural decisions (WHY chosen)
- System boundaries (in/out of scope)
- Key patterns (WHY used, trade-offs)
- Project-specific terminology
- Non-obvious constraints

### ❌ Exclude (Belongs Elsewhere)

- API documentation → JSDoc in code
- Implementation details → Code comments
- Configuration values → Config files
- Dependency versions → package.json
- Code examples → Actual code or tests
- How-to guides → Code comments
- Step-by-step processes → Code itself

**Principle:** If it's in code or config, don't duplicate it here.

---

## Red Flags (Delete Immediately)

Scan for these on every read:

- ❌ "We plan to..." / "In the future..." (speculation)
- ❌ "Currently using..." (implies might change - use present tense or delete)
- ❌ Contradicts actual code
- ❌ References non-existent files
- ❌ Duplicates package.json / config
- ❌ Explains HOW instead of WHY
- ❌ Generic advice (not project-specific)

**When found:** Delete entire section immediately.

---

## Cleanup Protocol

**Monthly or after major changes:**

```bash
# 1. Check all referenced files exist
cd .sylphx
grep -r "src/" . | grep -o 'src/[^`)]*' | sort -u > /tmp/refs.txt
# Verify each file in refs.txt exists

# 2. Check package.json references
grep -r "package.json" .
# Verify info isn't duplicated

# 3. Check verification markers
grep -r "<!-- VERIFY:" .
# Check each marked file exists and content accurate

# 4. Read all files
# Delete outdated sections
# Update inaccurate content
# Remove speculation
```

---

## Decision Flow: Create ADR?

**Create ADR when:**
- Choosing between 2+ significant alternatives
- Decision has long-term impact
- Future developers will ask "why did they do this?"
- Non-obvious trade-offs involved

**Don't create ADR for:**
- Obvious choices (use standard tool)
- Temporary decisions (will change soon)
- Implementation details (belongs in code comments)
- Trivial choices (naming, formatting)

**Quick test:** Will this decision matter in 6 months? Yes → ADR. No → Skip.

---

## Verification Commands

**Check links valid:**
```bash
cd .sylphx
# Extract all file references
grep -roh '`[^`]*\.[a-z]*`' . | tr -d '`' | sort -u | while read f; do
  [ -f "../$f" ] || echo "MISSING: $f"
done
```

**Check for duplication:**
```bash
# If package.json mentioned without "See package.json"
grep -r "dependencies" .sylphx/ | grep -v "See \`package.json\`"
# Should be empty or references only
```

---

## Examples

### Good context.md (Real Project)

```markdown
# Project Context

## What
AI-powered CLI for autonomous development workflows with agent orchestration.

## Why
Enable developers to delegate complex multi-step tasks to AI that can plan, execute, verify autonomously while maintaining quality.

## Who
Developers using Claude/AI for coding assistance.

## Status
Active development - v1.2.0
Focus: Agent prompt optimization

## Key Constraints
- No breaking changes without major version
- Research mandatory before implementation
- All modules need .test.ts and .bench.ts
- Clean commits only (no TODOs, debug code)

## Source of Truth
<!-- VERIFY: packages/flow/package.json -->
- Dependencies: `packages/flow/package.json`
- Build: `package.json` scripts (root + packages/flow)
- TypeScript: `packages/flow/tsconfig.json`
```

### Good architecture.md

```markdown
# Architecture

## System Overview
CLI loads agent prompts from markdown, composes with rules/output-styles, orchestrates multi-agent workflows.

## Key Components
<!-- VERIFY: Paths exist -->
- **Agent Loader** (`src/core/agent-loader.ts`): Parses markdown prompts
- **Agent Manager** (`src/core/agent-manager.ts`): Orchestration

## Design Patterns

### Pattern: Markdown-as-Config
**Why:** Human-readable, version-controlled, easy iteration
**Where:** `assets/**/*.md` with frontmatter
**Trade-off:** Parsing overhead vs flexibility (chose flexibility)

### Pattern: Minimal Effective Prompting
**Why:** Trust LLM, reduce tokens 40%, increase clarity
**Where:** All prompts (v1.2.0 refactor)
**Trade-off:** Less explicit teaching vs more effective triggering
**Decision:** ADR-002
```

### Good ADR

```markdown
# 002. Minimal Effective Prompt Philosophy

**Status:** ✅ Accepted
**Date:** 2024-11-15

## Context
Agent prompts were verbose with step-by-step teaching, reducing effectiveness and increasing cost.

## Decision
Adopt MEP: Trust LLM, WHAT+WHEN not HOW+WHY, mixed formats, condensed.

## Rationale
- 40% token reduction
- Better LLM performance (less noise)
- Easier maintenance

## Consequences
**Positive:** Lower cost, better results, cleaner prompts
**Negative:** Less explicit for human readers

## References
<!-- VERIFY: commit exists -->
- Implementation: All `assets/**/*.md` files
- Refactor: commit c7795c0f
```

---

## Summary

**Agent behavior:**
1. **First task:** Check .sylphx/ exists → Create if missing → Populate with templates
2. **Every task start:** Read .sylphx/ → Verify accuracy → Update/delete as needed
3. **During work:** New understanding → Update immediately
4. **Before commit:** Verify .sylphx/ matches reality → No contradictions

**Content:**
- **Include:** WHY (context, decisions, rationale)
- **Exclude:** HOW (implementation → code)
- **Reference:** Link to SSOT, never duplicate
- **Maintain:** Verify on read, update on learn, delete when wrong

**Prime Directive: Outdated docs worse than no docs. When in doubt, delete.**
