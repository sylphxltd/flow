# The Ultimate System Prompt Writing Guide
## Based on MEP (Minimal Effective Prompt) Principles

> **Core Philosophy**: Find the smallest possible set of high-signal tokens that maximize the likelihood of your desired outcome.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [The MEP Framework](#the-mep-framework)
3. [Writing Process](#writing-process)
4. [Judgment Criteria](#judgment-criteria)
5. [Optimization Techniques](#optimization-techniques)
6. [Common Pitfalls](#common-pitfalls)
7. [Quality Checklist](#quality-checklist)
8. [Practical Examples](#practical-examples)
9. [Quick Reference](#quick-reference)

---

## Core Principles

### The Three Golden Rules

**Rule 1: Trust LLM Intelligence**
Modern LLMs (GPT-4, Claude Sonnet 4+) have:
- Strong contextual reasoning and inference capabilities
- Pattern generalization from minimal examples (1-2 examples sufficient)
- Training data includes common frameworks, standards, best practices
- Semantic compression understanding (interprets concise notation)

**Rule 2: Eliminate Redundancy**
Each concept should appear **exactly once** in the prompt.
- If stated in Core Rules → Don't repeat in other sections
- If implied by A → Don't state explicitly in B
- If common sense → Don't state at all

**Rule 3: Achieve Goldilocks Zone**
Balance between two extremes:
- Too rigid: Hardcoded if-else logic, excessive checklists, brittle rules
- Too vague: "Be helpful", high-level platitudes, no concrete guidance
- **Goldilocks**: Specific enough to guide effectively, flexible enough to provide strong heuristics

---

## The MEP Framework

### The Three Questions (For Every Token)

Ask yourself for EACH piece of content:

**1. Is this UNIQUE?**
- Can it be inferred from other parts of the prompt?
- Is it in the LLM's training data (common knowledge)?
- Is it just a rewording of something already stated?

**2. Is this ACTIONABLE?**
- Does it enable concrete behavior change?
- Can the LLM act on this information?
- Is it specific enough to guide decisions?

**3. Is this HIGH-SIGNAL?**
- Does it directly impact the desired outcome?
- Is it critical to the task's success?
- Would removing it degrade performance?

**Decision Matrix**:
```
All 3 YES    → KEEP (essential content)
Any 1 NO     → REMOVE or MERGE
All 3 NO     → DELETE immediately
```

### Signal Density Target

**Good prompt**: 60-70% high-signal content
**Great prompt**: 70-80% high-signal content
**Exceptional prompt**: 80-90% high-signal content

Calculate: (High-signal tokens / Total tokens) × 100%

---

## Writing Process

### Phase 1: Brain Dump (No Filtering)

**Goal**: Capture all requirements, rules, and guidance

**Method**:
1. Write everything you think the LLM needs to know
2. Include all examples, edge cases, constraints
3. Don't worry about length or redundancy
4. Focus on completeness, not optimization

**Output**: Your "Original" version (likely 2000-5000+ tokens)

---

### Phase 2: Structure & Categorize

**Goal**: Organize content into logical sections

**Standard Structure**:
```
1. Core Rules/Principles (What must ALWAYS be true)
2. Identity/Role (Who is the LLM)
3. Foundational Concepts (Philosophy, principles)
4. Operational Guidance (How to work)
5. Tools & Resources (What's available)
6. Decision Support (When unclear)
7. Standards (Code quality, security, etc.)
8. Anti-Patterns (What to avoid)
9. Output Format (What to deliver)
```

**Tips**:
- Group related concepts together
- Create clear hierarchies (sections, subsections)
- Use consistent formatting (headers, bullets, etc.)

---

### Phase 3: Identify Redundancy

**Goal**: Find and mark all repeated concepts

**Method - The Redundancy Scan**:

**Step 1: Core Concept Extraction**
- Read through entire prompt
- List all unique concepts (e.g., "never block", "test after changes", "document assumptions")
- For each concept, note where it appears

**Step 2: Frequency Analysis**
Create a table:
```
| Concept | Appearances | Locations |
|---------|-------------|-----------|
| "Never block" | 4× | Core Rules, Decision Protocol, Execution, Report |
| "Document assumptions" | 5× | Core, Decision (3×), Report |
| "Test after changes" | 3× | Core Rules, Implementation, Standards |
```

**Step 3: Redundancy Classification**

**Type A - Exact Repetition** (Highest priority to remove):
- Same concept, same wording
- Example: "Never block" appears word-for-word 4 times
- **Action**: Keep 1st instance, delete all others

**Type B - Semantic Repetition** (High priority):
- Same concept, different wording
- Example: "Never block" / "Don't stop" / "Never wait" / "Keep going"
- **Action**: Keep clearest version, delete variations

**Type C - Implied Repetition** (Medium priority):
- Concept B is logical consequence of Concept A
- Example: "Never block" (A) → "Don't say 'I need clarification'" (B)
- **Action**: Keep only A, LLM infers B

**Type D - Section Redundancy** (High priority):
- Entire section restates another section
- Example: "Hard Constraints" section listing items from "Core Rules"
- **Action**: Delete entire section

**Step 4: Mark for Removal**
- Use comments: `<!-- REDUNDANT: Already in Core Rules -->`
- Or strikethrough: `~~This content repeats Core Principle~~`
- Track token savings

---

### Phase 4: Apply The Three Questions

**Goal**: Validate each remaining piece of content

**Method - Section by Section Review**:

For each section, ask:

**1. Uniqueness Check**
```
Question: Can this be inferred from:
- Other sections of the prompt?
- LLM's training data?
- Common sense or industry standards?

Examples to REMOVE:
❌ "Never commit broken code" (universal developer knowledge)
❌ "Use descriptive variable names" (basic programming)
❌ "Test your code" (common sense)

Examples to KEEP:
✅ "Use arrow notation for workflows: A → B → C" (specific convention)
✅ "Document format: ASSUMPTION, ALTERNATIVE, REVIEW" (custom template)
✅ "Choose: existing patterns > conventions > standards" (specific hierarchy)
```

**2. Actionability Check**
```
Question: Does this enable concrete action?

Examples to REMOVE:
❌ "Be thoughtful" (too vague)
❌ "Consider the context" (too general)
❌ "Think deeply" (no concrete behavior)

Examples to KEEP:
✅ "Run tests after every code change" (specific action)
✅ "Validate all inputs at boundaries" (specific action)
✅ "Use JWT auth when unclear" (specific default)
```

**3. High-Signal Check**
```
Question: Is this critical to success?

Examples to REMOVE:
❌ Nice-to-have formatting preferences
❌ Optional optimizations
❌ Background information

Examples to KEEP:
✅ Security requirements (NEVER expose secrets)
✅ Core workflow (Investigation → Design → Implementation)
✅ Decision frameworks (when to use which)
```

---

### Phase 5: Optimize Expression

**Goal**: Make remaining content as concise as possible

**Technique 1: Compact Syntax**

Replace verbose with concise:
```
❌ Verbose: "First you should do A, and then after that you need to do B, followed by C"
✅ Concise: "A → B → C"

❌ Verbose: "You should choose from the following options: option 1, option 2, or option 3"
✅ Concise: "Choose: option1 / option2 / option3"

❌ Verbose: "If the situation is ambiguous, then you should..."
✅ Concise: "Ambiguous? → ..."

❌ Verbose: "never do X, never do Y, never do Z"
✅ Concise: "Never: X / Y / Z"
```

**Technique 2: List Consolidation**

Replace bullet lists with comma-separated where appropriate:
```
❌ Verbose (5 lines):
- Validate inputs
- Use parameterized queries
- Escape output
- Authenticate users
- Authorize actions

✅ Concise (1 line):
Validate inputs, parameterize queries, escape output, authenticate then authorize
```

**When to use bullets vs commas**:
- **Bullets**: When items need explanation or are complex
- **Commas**: When items are simple and parallel

**Technique 3: Remove Filler Words**

```
❌ "You should always make sure to test"
✅ "Always test"

❌ "It is important that you document"
✅ "Document"

❌ "Try to choose the simplest option"
✅ "Choose simplest"

❌ "When you encounter an ambiguous situation"
✅ "When ambiguous" or "Ambiguous? →"
```

**Technique 4: Merge Related Sections**

```
❌ Before: Two separate sections
## Performance
Multiple tool calls in one message = parallel execution

## Git  
Commit format: type(scope): description

✅ After: One combined section
## Technical
**Performance**: Multiple tool calls in one message = parallel
**Git**: type(scope): description
```

**When to merge**:
- Sections are related conceptually
- Each section is short (<50 tokens)
- Total merged section <100 tokens

---

### Phase 6: Format & Polish

**Goal**: Clean, scannable, professional presentation

**Formatting Rules**:

**1. Headers**
```
✅ Use markdown hierarchy
# Top level (prompt title)
## Main sections
### Subsections (use sparingly)

❌ Avoid excessive nesting
#### Fourth level (rarely needed)
##### Fifth level (never needed)
```

**2. Emphasis**
```
✅ Bold for key terms (first mention only)
**Core Principle**: Never block

❌ Don't over-emphasize
**CRITICAL**: **MUST** always **VERIFY** (exhausting to read)

✅ Use emoji sparingly (section markers only)
🎯 First Principles
⚖️ Decision Matrix

❌ Don't use emoji everywhere
🔴 CRITICAL 🚨 RULES ⚠️ (visual noise)
```

**3. Code Blocks**
```
✅ Use for templates, examples, specific formats
```
// ASSUMPTION: JWT auth
// ALTERNATIVE: Session-based
```

❌ Don't use for regular text
```
This is not a code block, just regular guidance
```
```

**4. Tables**
```
✅ Use for comparisons, decision matrices
| Situation | Action |
|-----------|--------|
| Clear | Implement |
| Unclear | Investigate |

❌ Don't use when list suffices
| Item |
|------|
| One item |
| Another item |
(Just use a list here)
```

---

## Judgment Criteria

### What to KEEP

#### 1. Unique Information
Content that **cannot** be inferred:

**Keep: Custom conventions**
```markdown
✅ Document format: ASSUMPTION / ALTERNATIVE / REVIEW
✅ Commit format: type(scope): description
✅ Priority hierarchy: existing > conventions > standards
```

**Keep: Novel frameworks**
```markdown
✅ Cognitive Framework (Understanding Depth, Complexity Navigation)
✅ Execution Modes (Investigation, Design, Implementation, Validation)
✅ Decision frameworks (First Principles, Decision Matrix, Trade-off)
```

**Keep: Specific guidance**
```markdown
✅ "Refactor on 3rd duplication" (specific threshold)
✅ "Extract when function >20 lines" (specific limit)
✅ "Update workspace after significant work" (specific trigger)
```

#### 2. Actionable Directives
Content that enables concrete behavior:

**Keep: Specific actions**
```markdown
✅ "Run tests after every code change"
✅ "Validate all inputs at boundaries"
✅ "Use knowledge_search before implementing"
```

**Keep: Clear workflows**
```markdown
✅ "Analyze → Check patterns → Assume gaps → Implement"
✅ "list → read(task_id) → store → update → complete"
```

**Keep: Decision rules**
```markdown
✅ "Ambiguous? → Choose: existing > conventions > standards"
✅ "Missing info? → Industry defaults, make configurable"
```

#### 3. High-Signal Examples
Examples that establish patterns:

**Keep: 1-2 representative examples per concept**
```markdown
✅ Autonomous decision example (zod):
// Used knowledge_search → zod recommended
// Used codebase_search → already in dependencies
// ASSUMPTION: Use zod (existing, type-safe)

✅ Anti-pattern example:
Don't: Custom validation → Do: import { z } from 'zod'
```

**Remove: Excessive examples**
```markdown
❌ 5 examples of the same pattern
Example 1: JWT
Example 2: Date library
Example 3: Validation
Example 4: Array utilities
Example 5: Retry logic
(2 examples sufficient, LLM generalizes)
```

---

### What to REMOVE

#### 1. Redundant Content

**Remove: Exact repetition**
```markdown
❌ Core Rule: "Never block"
❌ Decision Protocol: "Don't stop"
❌ Execution: "Never stop midway"
❌ Report: Never say "Blocked"
→ Keep ONLY 1st instance
```

**Remove: Semantic repetition**
```markdown
❌ "Document assumptions" (stated 5 times in different sections)
→ Keep in Core + Report format
```

**Remove: Implied content**
```markdown
❌ "Don't say 'need clarification'" (implied by "Never block")
❌ "Never commit broken code" (implied by "Run tests after changes")
```

**Remove: Redundant sections**
```markdown
❌ "Hard Constraints" section that lists items from "Core Rules"
❌ "Excellence Checklist" items distributed in other sections
❌ "Priority" section restating "Core Principle"
```

#### 2. Low-Signal Content

**Remove: Common sense**
```markdown
❌ "Write clean code"
❌ "Use descriptive names"
❌ "Comment your code"
❌ "Never commit broken code"
❌ "Remove debug statements"
```

**Remove: Vague directives**
```markdown
❌ "Be thoughtful"
❌ "Think carefully"
❌ "Consider context"
❌ "Use best practices"
```

**Remove: Over-emphasis**
```markdown
❌ "🔴 CRITICAL: MUST VERIFY"
→ "Verify"

❌ "**NEVER EVER** do X"
→ "Never: X"
```

#### 3. Verbose Expression

**Remove: Filler words**
```markdown
❌ "You should always make sure to..."
→ "Always..."

❌ "It is important that you..."
→ (Delete entirely, implied by inclusion)

❌ "Try to consider..."
→ "Consider..."
```

**Remove: Redundant explanations**
```markdown
❌ "Validate inputs at boundaries (not deep in call stacks)"
→ "Validate inputs at boundaries"
(LLM infers "at boundaries" means "not deep")
```

---

## Optimization Techniques

### Technique 1: The Redundancy Elimination Pass

**Process**:
1. List all concepts in prompt
2. For each concept, find all occurrences
3. Keep best/first occurrence
4. Delete all others
5. Verify nothing lost

**Example**:
```markdown
# Before (4 occurrences)
Core: "Never block"
Decision: "Don't stop"  
Execution: "Never stop midway"
Report: Never say "Blocked"

# After (1 occurrence)
Core: "Never block"
[LLM infers: don't stop, don't wait, complete task]
```

---

### Technique 2: The Implication Chain

**Process**:
1. Identify primary statements (A)
2. Identify derived statements (B, C, D)
3. Check if B/C/D logically follow from A
4. If yes, remove B/C/D

**Example**:
```markdown
A: "Never block. Make assumptions, document them."

Implies:
B: "Don't wait for clarification" ✓
C: "Don't say 'need more info'" ✓
D: "Document all assumptions" ✓

Action: Keep only A, remove B/C/D
```

---

### Technique 3: The Common Sense Filter

**Process**:
1. Read each statement
2. Ask: "Do all developers know this?"
3. If yes → Remove

**Examples**:
```markdown
❌ "Never commit broken code" (universal knowledge)
❌ "Test your code" (universal practice)
❌ "Remove debug statements" (universal standard)
❌ "Use version control" (universal tool)

✅ "Run tests after EVERY code change" (specific frequency)
✅ "Refactor on 3rd duplication" (specific threshold)
✅ "Extract when >20 lines" (specific limit)
```

**Rule**: If it's in every "Programming 101" course, remove it.

---

### Technique 4: The Example Reduction

**Process**:
1. Count examples per concept
2. Identify most representative example(s)
3. Keep 1-2 examples maximum
4. Remove rest

**Decision Matrix**:
```
1 example:  Simple concepts, clear pattern
2 examples: Complex concepts, show variety
3+ examples: Almost never needed
```

**Example**:
```markdown
# Before (5 examples)
Don't: Custom Result type → Do: import from 'neverthrow'
Don't: Custom date format → Do: import from 'date-fns'
Don't: Custom validation → Do: import from 'zod'
Don't: Custom array utils → Do: import from 'lodash'
Don't: Custom retry → Do: use library

# After (2 examples - most representative)
Don't: Custom Result type → Do: import from 'neverthrow'
Don't: Custom validation → Do: import from 'zod'
[LLM generalizes pattern to all libraries]
```

---

### Technique 5: The Section Merger

**Process**:
1. Identify related short sections (<50 tokens each)
2. Check if conceptually related
3. Merge into one section with subsections
4. Use **bold labels** for sub-topics

**Example**:
```markdown
# Before (2 sections, 70 tokens)
## Performance
Multiple tool calls in one message = parallel execution

## Git
type(scope): description
Types: feat, fix, refactor

## Security
Never expose secrets

# After (1 section, 60 tokens)
## Technical

**Performance**: Multiple tool calls = parallel execution
**Git**: type(scope): description | Types: feat, fix, refactor
**Security**: Never expose secrets
```

**When to merge**:
- Sections conceptually related
- Each section <50 tokens
- Total merged <150 tokens

---

### Technique 6: The Compact Syntax Conversion

**Process**:
1. Identify verbose expressions
2. Convert to compact notation
3. Verify clarity maintained

**Conversions**:
```markdown
# Workflows
"First do A, then do B, then do C"
→ "A → B → C"

# Lists
"X, Y, and Z"
→ "X / Y / Z"

# Conditionals
"If X happens, then do Y"
→ "X? → Y"

# Priorities
"Choose X over Y over Z"
→ "Choose: X > Y > Z"

# Labels
"Examples of good practice include:"
→ "Examples:"

# Emphasis
"**NEVER EVER** do X"
→ "Never: X"
```

---

## Common Pitfalls

### Pitfall 1: Over-Specification

**Problem**: Trying to cover every edge case

**Symptoms**:
```markdown
❌ If A happens, do X
❌ If B happens, do Y
❌ If C happens, do Z
❌ If D happens, do...
(50+ conditional rules)
```

**Solution**: Provide principles + heuristics instead
```markdown
✅ Core principle: Never block, make assumptions
✅ Decision rule: Choose simplest, document alternatives
[LLM applies to all scenarios]
```

**Why this works**: LLM can apply principles to novel situations, but memorizing 50 rules is brittle.

---

### Pitfall 2: Repetition for Emphasis

**Problem**: Repeating important concepts thinking it helps

**Symptoms**:
```markdown
❌ Core Rules: "Never block"
❌ Throughout prompt: "Remember: never block"
❌ Execution: "Don't forget to never block"
❌ Report: "Important: Never say you're blocked"
```

**Solution**: State once clearly, trust LLM attention
```markdown
✅ Core Rules: "Never block. Make assumptions, document them, complete task."
[That's it. Don't repeat.]
```

**Why this works**: LLM has perfect recall of the prompt. Repetition creates noise, not emphasis.

---

### Pitfall 3: Excessive Examples

**Problem**: Providing 5+ examples of the same pattern

**Symptoms**:
```markdown
❌ Example 1: JWT authentication
❌ Example 2: Date formatting  
❌ Example 3: Input validation
❌ Example 4: Array operations
❌ Example 5: Retry logic
(All showing "use library instead of custom")
```

**Solution**: 1-2 representative examples
```markdown
✅ Example 1: JWT auth → Use library
✅ Example 2: Validation → import { z } from 'zod'
[LLM generalizes to all similar cases]
```

**Why this works**: LLMs excel at pattern recognition. 2 examples establish pattern, more is redundant.

---

### Pitfall 4: Common Sense Inclusion

**Problem**: Stating universal programming knowledge

**Symptoms**:
```markdown
❌ "Never commit broken code"
❌ "Write clean code"
❌ "Test your code"
❌ "Use meaningful variable names"
❌ "Comment complex logic"
```

**Solution**: Only state non-obvious specifics
```markdown
✅ "Run tests after EVERY code change"
✅ "Refactor on 3rd duplication"
✅ "Extract when function >20 lines"
(Specific thresholds and frequencies)
```

**Why this works**: LLM has programming knowledge from training. Specify only what's unique to your workflow.

---

### Pitfall 5: Vague Directives

**Problem**: High-level guidance without concrete actions

**Symptoms**:
```markdown
❌ "Be thoughtful in your decisions"
❌ "Consider the broader context"
❌ "Think deeply about implications"
❌ "Use best practices"
```

**Solution**: Specific, actionable directives
```markdown
✅ "Ambiguous? → Choose: existing > conventions > standards"
✅ "Missing info? → Industry defaults, make configurable"
✅ "Multiple options? → Choose simplest, note alternatives"
```

**Why this works**: Specificity enables action. Vagueness creates confusion.

---

### Pitfall 6: Format Overload

**Problem**: Too many emoji, bold, headers, etc.

**Symptoms**:
```markdown
❌ 🔴 **CRITICAL** 🚨 **IMPORTANT** ⚠️ **MUST READ** 
(Visual fatigue, decreased signal)
```

**Solution**: Minimal, purposeful formatting
```markdown
✅ ## Core Rules
✅ **Never block.** Make assumptions...
(Clean, scannable)
```

**Why this works**: Formatting is structure, not content. Excessive formatting is noise.

---

### Pitfall 7: Section Bloat

**Problem**: Too many small sections

**Symptoms**:
```markdown
❌ 20+ top-level sections
❌ Each section 20-30 tokens
❌ Many sections conceptually related
```

**Solution**: Merge related sections
```markdown
✅ 8-12 top-level sections
✅ Each section substantial
✅ Clear conceptual boundaries
```

**Why this works**: Too many sections makes navigation difficult. Group related concepts.

---

## Quality Checklist

### Before Optimization

- [ ] Brain dump complete (all requirements captured)
- [ ] Organized into logical sections
- [ ] All examples and edge cases included
- [ ] Every rule and constraint documented

### During Optimization

**Redundancy Check**:
- [ ] No concept appears more than once
- [ ] No section restates another section
- [ ] No implied content stated explicitly
- [ ] Core Rules not repeated elsewhere

**Three Questions Applied**:
- [ ] Every statement passes uniqueness test
- [ ] Every statement passes actionability test
- [ ] Every statement passes high-signal test

**Expression Optimization**:
- [ ] Compact syntax used where appropriate
- [ ] Filler words removed
- [ ] Lists consolidated where possible
- [ ] Related sections merged

### After Optimization

**Content Verification**:
- [ ] All scenarios can still be handled
- [ ] All frameworks fully specified
- [ ] All tools clearly documented
- [ ] All anti-patterns identifiable

**Metrics**:
- [ ] Token reduction: 40-60% from original
- [ ] Signal density: 75-85%
- [ ] Sections: 8-15 (not 20+)
- [ ] Examples per concept: 1-2 (not 5+)

**Goldilocks Zone**:
- [ ] Specific enough (clear guidance, concrete examples)
- [ ] Flexible enough (principles, heuristics, trust LLM)
- [ ] Right altitude (not hardcoded, not vague)

**Formatting**:
- [ ] Clean headers (no excessive nesting)
- [ ] Minimal emphasis (bold for key terms only)
- [ ] Scannable (clear visual hierarchy)
- [ ] Professional (no emoji overload)

---

## Practical Examples

### Example 1: Optimizing a Rule Statement

**Original (Type A - Over-specified)**:
```markdown
## Rule 1: Never Block On Uncertainty

**IMPORTANT**: You must never stop working due to missing information or ambiguous requirements. This is absolutely critical to the success of the agent system.

When you encounter uncertainty:
1. First, try to research the answer
2. If you can't find it, make a reasonable assumption
3. Document your assumption clearly
4. Continue with the implementation
5. Flag it for human review if needed
6. Never say you're blocked
7. Never ask the user for clarification
8. Always complete the task

Remember: It is better to complete a task with documented assumptions than to stop and wait.
```
**Token count**: ~110 tokens
**Issues**: Repetitive, over-emphasized, verbose

**Optimized (MEP version)**:
```markdown
## Rule 1: Never Block

Make reasonable assumptions, document them, complete task. Working solution > perfect never shipped.
```
**Token count**: ~15 tokens (-86%)
**Improvements**: 
- Removed redundancy (7 ways of saying "never block" → 1)
- Removed steps already implied (research → assume → document)
- Removed emphasis ("IMPORTANT", "absolutely critical")
- Added philosophy in concise form

---

### Example 2: Optimizing Decision Rules

**Original (Type B - Detailed but repetitive)**:
```markdown
## Decision Making Protocol

When you face an ambiguous requirement:
- You should choose the most reasonable interpretation
- Prefer existing patterns over new approaches
- Prefer established conventions over custom solutions
- Prefer industry standards over conventions
- Always document which option you chose and why

When you're missing information:
- Use industry standard defaults whenever possible
- Make the decision configurable for future changes
- Document your rationale for the choice
- Don't wait or ask for more information

When there are multiple valid approaches:
- Choose the simplest option that works
- Note what the alternative approaches were
- Document why you chose this one
```
**Token count**: ~115 tokens

**Optimized (MEP version)**:
```markdown
## Decision Rules

**Ambiguous?** → Choose: existing patterns > conventions > standards. Document assumption.

**Missing info?** → Industry defaults, make configurable, document rationale.

**Multiple options?** → Choose simplest. Note alternatives.
```
**Token count**: ~30 tokens (-74%)
**Improvements**:
- Compact syntax (arrows, question marks)
- Removed "you should" and filler words
- Consolidated repetitive "document" into each rule
- Hierarchy shown with > symbols

---

### Example 3: Optimizing Examples Section

**Original (Type C - Too many examples)**:
```markdown
## Anti-Pattern: Reinventing the Wheel

Before implementing any feature, always check if a library already exists.

Examples of what NOT to do:

1. Don't create a custom Result type for error handling
   → Instead: import { Result } from 'neverthrow'

2. Don't write custom date formatting functions
   → Instead: import { format } from 'date-fns'

3. Don't implement custom validation logic
   → Instead: import { z } from 'zod'

4. Don't create array utility functions
   → Instead: import { groupBy, uniq } from 'lodash'

5. Don't build custom retry logic
   → Instead: Use library's retry mechanism

6. Don't write custom API client code
   → Instead: Use axios or fetch with proper wrapper

The pattern is clear: check npm/pip/gem before building.
```
**Token count**: ~140 tokens

**Optimized (MEP version)**:
```markdown
## Anti-Pattern: Reinventing the Wheel

Before ANY feature: knowledge_search + codebase_search + check package registry.

Examples:
```typescript
Don't: Custom Result type → Do: import { Result } from 'neverthrow'
Don't: Custom validation → Do: import { z } from 'zod'
```
```
**Token count**: ~40 tokens (-71%)
**Improvements**:
- Reduced 6 examples → 2 most representative
- Pattern established (LLM generalizes to other cases)
- Added proactive search step (knowledge_search)
- Removed redundant "The pattern is clear" statement

---

### Example 4: Optimizing Security Section

**Original (Type D - Scattered across sections)**:
```markdown
## Security Guidelines

**Critical Security Rules**:
- Never expose secrets, API keys, or tokens in your code
- Never log sensitive information like passwords
- Never transmit secrets over unencrypted connections
- Always validate all user inputs
- Always use parameterized queries for database access
- Always escape output before displaying to users
- Always authenticate users before checking authorization

...

[Later in prompt, Git section]

## Git Workflow

**Never commit**:
- Secrets or API keys
- Passwords or credentials
- Broken code that doesn't compile
- Debug code or console.logs
```
**Token count**: ~100 tokens (spread across 2 sections)
**Issues**: "Secrets" mentioned twice, common sense items included

**Optimized (MEP version)**:
```markdown
## Security (Non-Negotiable)

**Never**: Expose secrets/keys/tokens, commit secrets

**Always**: Validate inputs, parameterize queries, escape output, authenticate before authorize

**Unclear?** → Secure defaults (require auth, deny by default), make swappable
```
**Token count**: ~35 tokens (-65%)
**Improvements**:
- Consolidated from 2 sections → 1
- Removed "broken code, debug code" (common sense)
- Slashes for compact related items (secrets/keys/tokens)
- Added guidance for unclear cases
- Removed redundant "never log, never transmit" (implied by "expose")

---

## Quick Reference

### The MEP Checklist (One-Pager)

**Before you start**:
- [ ] Clear goal (what should LLM do?)
- [ ] Target audience (which LLM? Claude Sonnet 4+?)
- [ ] Context type (system prompt? shared protocol? agent-specific?)

**During writing**:
- [ ] Each concept appears exactly once
- [ ] Every token passes 3 questions (unique? actionable? high-signal?)
- [ ] 1-2 examples per concept (not 5+)
- [ ] Common sense omitted
- [ ] Compact syntax used (arrows, slashes, colons)

**Red flags to watch for**:
- [ ] Same concept appearing 3+ times
- [ ] Entire section restating another section
- [ ] "MUST", "NEVER", "CRITICAL" appearing 10+ times
- [ ] 20+ emoji cluttering the prompt
- [ ] 20+ top-level sections
- [ ] "Obviously", "of course", "as you know" (delete these)

**Target metrics**:
- [ ] 40-60% token reduction from first draft
- [ ] 75-85% high-signal density
- [ ] 8-15 main sections
- [ ] 1-2 examples per concept

**Final validation**:
- [ ] Can handle all required scenarios?
- [ ] All frameworks fully specified?
- [ ] Goldilocks Zone achieved? (specific + flexible)
- [ ] Clean, scannable formatting?

---

### Decision Trees

#### "Should I keep this content?"

```
Is it unique (not inferable)?
├─ NO → DELETE
└─ YES
    ├─ Is it actionable (enables behavior)?
    │  ├─ NO → DELETE
    │  └─ YES
    │      ├─ Is it high-signal (impacts outcome)?
    │      │  ├─ NO → DELETE
    │      │  └─ YES → KEEP
```

#### "Should I include this example?"

```
How many examples for this concept already?
├─ 0 examples → ADD 1-2 representative examples
├─ 1-2 examples → GOOD, stop here
└─ 3+ examples → TOO MANY, remove least representative
```

#### "Should I merge these sections?"

```
Are they conceptually related?
├─ NO → Keep separate
└─ YES
    ├─ Each section <50 tokens?
    │  ├─ NO → Keep separate
    │  └─ YES
    │      ├─ Total if merged <150 tokens?
    │      │  ├─ NO → Keep separate
    │      │  └─ YES → MERGE
```

---

### Common Patterns

#### Pattern 1: Rules Section
```markdown
## Core Rules

1. **[Rule Name]**: [Concise statement]. [Key implication].

2. **[Rule Name]**: [Concise statement]. [Key implication].

[... 3-7 total rules, not 20+]
```

#### Pattern 2: Decision Rules Section
```markdown
## Decision Rules

**[Scenario]?** → [Action]: [Priority/hierarchy]. [Additional guidance].

**[Scenario]?** → [Action]. [Additional guidance].

[... 3-5 scenarios covering main cases]
```

#### Pattern 3: Framework Section
```markdown
## [Framework Name]

**When to use**: [Trigger conditions]

**Process**: [Workflow in compact form]

**Template**:
```
[Example format]
```
```

#### Pattern 4: Anti-Patterns Section
```markdown
## Anti-Patterns

**[Anti-Pattern Name]**: [Brief description]

Examples:
```
Don't: [Bad practice] → Do: [Good practice]
Don't: [Bad practice] → Do: [Good practice]
```

[1-2 examples maximum per anti-pattern]
```

---

### Token Budget Guidelines

**System Prompt Types**:

| Type | Target Tokens | Max Tokens | Focus |
|------|--------------|------------|-------|
| Shared Protocol | 150-250 | 300 | Lightweight, universal |
| Agent-Specific | 800-1200 | 1500 | Comprehensive, specialized |
| Task-Specific | 300-500 | 700 | Focused, actionable |

**Section Budget**:

| Section Type | Target Tokens | Notes |
|-------------|--------------|-------|
| Core Rules | 100-200 | Most critical, invest here |
| Principles | 200-400 | Foundational, can be substantial |
| Frameworks | 150-300 | Essential mental models |
| Tools | 100-200 | Clear but concise |
| Standards | 80-150 | Key points only |
| Examples | 30-60 each | 1-2 per concept |
| Anti-Patterns | 100-200 | Concrete examples |

---

## Final Wisdom

### The Three Truths of MEP

**Truth 1: Less is More**
Every unnecessary token:
- Adds to context burden (n² relationships)
- Creates potential for confusion
- Dilutes high-signal content
- Costs money (API pricing)

**Truth 2: Trust the LLM**
Modern LLMs can:
- Infer implications from principles
- Generalize patterns from 1-2 examples
- Apply training data knowledge
- Handle novel situations with good heuristics

**Truth 3: Specific + Flexible = Powerful**
The Goldilocks Zone:
- Specific enough: Clear guidance, concrete examples
- Flexible enough: Principles, heuristics, room to reason
- Result: Reliable behavior across diverse scenarios

---

### When You're Done

A great prompt should feel like:
- ✅ Reading a well-written manual (clear, concise, complete)
- ✅ A conversation with an expert colleague (professional, efficient)
- ✅ A set of principles to live by (guiding, not restricting)

A great prompt should NOT feel like:
- ❌ Reading legal terms and conditions (exhaustive, repetitive, cautious)
- ❌ Following IKEA instructions (step-by-step, rigid, brittle)
- ❌ Listening to a drill sergeant (emphasis, repetition, no trust)

---

### The Ultimate Test

**Can you explain your prompt's purpose in one sentence?**

If yes: Your prompt is focused ✅
If no: Your prompt tries to do too much ❌

**Can you identify high-signal vs noise in your prompt?**

If 75%+ is essential: Great! ✅
If 50-75% is essential: Good, but can improve 🟡
If <50% is essential: Too much noise, optimize more ❌

**Would you want to read your prompt?**

If yes: Clean, professional, scannable ✅
If hesitant: Probably too long or cluttered 🟡
If no: Definitely needs formatting work ❌

---

## Conclusion

Writing great prompts is about:
1. **Clarity**: Each concept stated once, clearly
2. **Trust**: Believing in LLM capabilities
3. **Economy**: Every token earns its place
4. **Effectiveness**: Achieving desired outcomes

Follow this guide, apply the techniques, trust the process.

**Your prompts will be: Shorter. Clearer. More effective.**

That's the MEP promise. 🎯

---

*Last updated: Based on analysis of 3,200 → 820 token optimization (74% reduction) while maintaining 100% effectiveness.*