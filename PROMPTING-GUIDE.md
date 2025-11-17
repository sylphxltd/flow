# Effective Prompt Writing Guide

## The Problem

**Minimal ≠ Effective**

We can write concise prompts that agents completely ignore. The issue isn't verbosity—it's that we write **RULES** (obligations without motivation) instead of **PROMPTS** (conditions that trigger behavior).

### Rules vs Prompts

```markdown
❌ RULE (ignored in practice)
"Before commit: Update .sylphx/ files"

✅ PROMPT (triggers behavior)
"About to commit? Ask yourself:
- Did I add a constraint? → One line to CONSTRAINTS.md
- Did I hit a blocker? → One line to BLOCKERS.md
- Did I discover a gotcha? → One line to GOTCHAS.md

Takes 10 seconds. Saves hours for next agent."
```

**Why rules fail:**
- No intrinsic motivation
- Future benefit (not immediate)
- Separate task (not integrated)
- Easy to ignore

**Why prompts work:**
- Triggered by pain/context
- Immediate value
- Natural workflow integration
- Self-interest aligned

---

## Five Principles

### 1. Trigger on Pain (Not Time)

Don't create obligations at arbitrary times. Create prompts that trigger when the agent hits a problem.

```markdown
❌ Time-based
"At start of task: Read .sylphx/context.md"

✅ Pain-triggered
"Confused about scope? → Check .sylphx/CONSTRAINTS.md
Architecture unclear? → Check README Architecture section
Hit a blocker before? → Check .sylphx/BLOCKERS.md"
```

**Pattern**: `[Pain point] → [Solution with location]`

### 2. Default Path (Make Desired Behavior Easiest)

Don't add friction. Make the desired behavior the path of least resistance.

```markdown
❌ Extra work
"Create .sylphx/decisions/NNN-title.md with Status, Context, Decision, Rationale..."

✅ Easiest path
"Significant decision? Add to commit message:
Decision: [What you decided]
Rationale: [Why in one sentence]"
```

**Pattern**: Piggyback on existing workflows (commits, PRs, comments)

### 3. Immediate Reward (Not Future Benefit)

Don't appeal to altruism. Show how it helps the current agent RIGHT NOW.

```markdown
❌ Future benefit
"Document architecture for future agents"

✅ Immediate reward
"Can't keep architecture in head? Sketch in README Architecture section.
You'll reference it in 10 minutes when you forget."
```

**Pattern**: `[Current pain] → [Immediate relief]`

### 4. Natural Integration (Not Separate Task)

Don't create separate documentation tasks. Integrate into what agents already do.

```markdown
❌ Separate task
"After implementing: Update architecture.md with design decisions"

✅ Integrated
"Writing commit message? Prefix with 'Decision:' if you made a choice.
git commit -m 'Decision: Use Redis for sessions (Rationale: Need TTL)'"
```

**Pattern**: Augment existing actions, don't add new ones

### 5. Self-Interest Alignment (Helps Current Agent First)

Don't rely on helping future agents. Make it valuable to the agent doing the work.

```markdown
❌ Altruistic
"Document edge cases for team members"

✅ Selfish
"Just discovered a gotcha? Add one line to .sylphx/GOTCHAS.md
You'll hit this again in 2 days when you forget."
```

**Pattern**: "Will YOU need this? Write NOW."

---

## Practical Templates

### Minimal Workspace Structure

```
.sylphx/
  CONSTRAINTS.md   # What NOT to do (prevents mistakes NOW)
  BLOCKERS.md      # Current blockers (tracks YOUR problems)
  GOTCHAS.md       # Lessons learned (prevents YOUR repetition)
```

**Why these files:**
- Single-source lists (no structure overhead)
- Clear trigger conditions (hit blocker → log it)
- Immediate value (reference while working)

### CONSTRAINTS.md

```markdown
# Constraints

<!-- Add constraints that prevent mistakes. One line each. -->

- Bundle must be <5MB (Vercel edge limit)
- Zero telemetry (enterprise security requirement)
- No TypeScript in public API (JS-only consumers)
```

**When to update:**
- Added a "don't do X" rule? → Add one line
- Fixed a mistake others might make? → Add one line

### BLOCKERS.md

```markdown
# Blockers

<!-- Current problems blocking progress -->

- [ ] API rate limit (429) - need enterprise key
- [ ] Type error in auth.ts:45 - circular dependency
```

**When to update:**
- Stuck on something? → Add checkbox
- Unblocked? → Check it off
- All clear? → Delete file

### GOTCHAS.md

```markdown
# Gotchas

<!-- Non-obvious lessons. Add when you discover them. -->

- useState in loop → extract to component or use useReducer
- Date parsing fails in Safari → use date-fns parseISO
- Redis connection hangs → must call .quit() in cleanup
```

**When to update:**
- Spent >10 min debugging something non-obvious? → Add one line
- Discovered a "why does this..." moment? → Add one line

### README.md Architecture Section

```markdown
## Architecture

**Data Flow**: Form → Validation (Zod) → API → Database (Prisma) → Cache (Redis)

**Key Patterns**:
- Server Actions for mutations
- React Query for reads
- Optimistic updates on client

**Why Redis**: Need TTL for sessions (security requirement)
**Why Prisma**: Type-safe queries + migrations

See ADR-003 for database choice rationale.
```

**When to update:**
- Can't remember how pieces fit? → Add 2-3 lines NOW
- Made architectural decision? → Add one "Why X" line

### Commit Messages with Decisions

```bash
git commit -m "feat(auth): use JWT for sessions

Decision: JWT over session cookies
Rationale: Stateless auth required for edge deployment"
```

**Pattern:**
```
<type>(<scope>): <what>

Decision: <choice>
Rationale: <why in one sentence>
```

**When to use:**
- Made a significant choice between 2+ alternatives? → Use this format
- Straightforward implementation? → Regular commit message

---

## Before/After Examples

### Example 1: Architecture Documentation

**Before (Rule-based, ineffective):**
```markdown
## Architecture Documentation

All agents must maintain `.sylphx/architecture.md` with:
- System overview
- Component responsibilities
- Design patterns
- Trade-offs

Update this file whenever:
- Architecture changes
- New pattern adopted
- Major refactor completed
```

**Why it fails:**
- Separate task (friction)
- Future benefit (no immediate value)
- Time-based triggers (easy to forget)
- No pain point (feels bureaucratic)

**After (Prompt-based, effective):**
```markdown
Can't remember how components fit together?

1. Sketch in README Architecture section (you'll reference it in 10 min)
2. Made a trade-off? Add "Why X" line (you'll forget tomorrow)

Example:
**Why Redis**: Need TTL for sessions (security req)
**Why Prisma**: Type-safe + migrations
```

**Why it works:**
- Pain-triggered ("Can't remember...")
- Immediate value (reference in 10 min)
- Natural integration (already editing README)
- Self-interest (YOU will forget)

### Example 2: Decision Documentation

**Before (Rule-based, ineffective):**
```markdown
## ADR Requirements

Create `.sylphx/decisions/NNN-title.md` when:
- Difficult to reverse
- Affects >3 components
- Security/compliance decision

Use template:
# NNN. [Title]
Status: Accepted
Date: YYYY-MM-DD
...
```

**Why it fails:**
- Extra file creation (friction)
- Complex template (cognitive load)
- Separate from code (context switch)
- Obligation without motivation

**After (Prompt-based, effective):**
```markdown
Made a significant choice? Explain in commit message:

git commit -m "feat(auth): use JWT for sessions

Decision: JWT over session cookies
Rationale: Stateless auth for edge deployment"

Complex trade-offs (affects >3 components)?
Create ADR-NNN.md. Otherwise commit message is enough.
```

**Why it works:**
- Default path (commit message, already writing)
- Lightweight (just add 2 lines)
- Progressive disclosure (ADR only if complex)
- Natural integration (part of commit)

### Example 3: Constraint Tracking

**Before (Rule-based, ineffective):**
```markdown
## Constraint Management

Maintain `.sylphx/context.md` Key Constraints section:
- Technical constraints
- Business constraints
- Legal constraints

Review and update:
- At project start
- When requirements change
- Before major refactors
```

**Why it fails:**
- Unclear when to update (vague triggers)
- No immediate pain point
- Future benefit only
- Feels like busywork

**After (Prompt-based, effective):**
```markdown
About to make a mistake others might make? Add one line to .sylphx/CONSTRAINTS.md

Example:
- Bundle must be <5MB (Vercel edge limit)
- Zero telemetry (enterprise requirement)

About to violate a constraint? Check this file FIRST (saves rebuild time).
```

**Why it works:**
- Pain-triggered (making a mistake, violating constraint)
- Immediate value (prevents YOUR mistakes)
- Minimal format (one line)
- Self-interest (saves YOUR time)

---

## Writing Checklist

When writing any prompt, ensure:

- [ ] **Trigger**: What pain/context triggers this? (Not "at start", "before commit")
- [ ] **Immediate**: How does this help the current agent NOW? (Not "for future")
- [ ] **Default**: Is this the easiest path? (Or does it add friction?)
- [ ] **Integrated**: Part of existing workflow? (Or separate task?)
- [ ] **Selfish**: Does it help the agent doing the work? (Or just others?)

**Red flags:**
- ❌ "Before/After commit..." (time-based)
- ❌ "For future agents..." (altruistic)
- ❌ "Create X.md with..." (friction)
- ❌ "Maintain/Update..." (obligation)
- ❌ "Must/Should..." (rule language)

**Green flags:**
- ✅ "Confused? Stuck? Forgot?" (pain-triggered)
- ✅ "You'll need this in 10 min..." (immediate)
- ✅ "Add to commit message..." (integrated)
- ✅ "Saves YOUR time..." (selfish)
- ✅ "One line to..." (minimal friction)

---

## Migration Strategy

**Don't rewrite everything.** Apply principles incrementally:

1. **Identify failing prompts**: Which rules do agents ignore in practice?
2. **Find the pain**: When SHOULD they do this? What problem would it solve?
3. **Reduce friction**: Can we piggyback on existing workflow?
4. **Add immediate value**: How does it help them NOW?
5. **Test**: Do agents actually do it without reminders?

**Example:**

Current: "Update .sylphx/architecture.md when architecture changes"
→ Agents ignore it

Pain: Agent can't remember how components fit together
→ Real problem

Friction: Separate .sylphx/ file, context switch
→ Too much work

Solution: "Can't remember how it fits? Add 2 lines to README Architecture section (you'll reference it in 10 min)"
→ Natural, immediate value

Test: Do agents actually update README? (YES → Success)

---

## Summary

**Core insight**: Agents are LLMs that operate on computational logic, not human obligation.

**Old approach**: Write rules telling them what they "should" do
→ Rules get ignored

**New approach**: Create conditions that trigger desired behavior
→ Behavior happens naturally

**Five principles**:
1. **Pain-triggered**: Not "before commit" but "stuck? → check X"
2. **Default path**: Not "create file" but "add to commit message"
3. **Immediate reward**: Not "for future" but "you'll need this in 10 min"
4. **Natural integration**: Not separate task but augment existing workflow
5. **Self-interest**: Not "help team" but "saves YOUR time"

**Practical result**: Minimal workspace (.sylphx/CONSTRAINTS.md, BLOCKERS.md, GOTCHAS.md) + rich commit messages + README Architecture section.

**Success metric**: Agents update docs without being reminded, because it helps them complete the current task.
