---
name: System Prompt Writing Guide
description: How to write system prompts that LLMs actually follow, including core principles, structure design, language techniques, and real-world examples
---

# System Prompt Writing Guide

## Core Problems: Why LLMs Don't Follow Instructions

### Problem 1: Attention Dilution
```
Too many rules → Each rule gets too little attention → LLM ignores some rules

Example:
50 rules → Each gets only 2% attention → Easy to ignore
5-10 critical rules → Each gets 20% attention → Won't forget
```

### Problem 2: Lost in the Middle
```
LLM attention distribution across positions:

Position    | Attention  | Result
------------|-----------|-------
Beginning (5%)   | ⭐⭐⭐⭐⭐  | Remembered clearly
Middle (90%)     | ⭐⭐       | Easy to ignore ← Problem area!
End (5%)         | ⭐⭐⭐⭐   | Remembered clearly

Solution: Put important rules at beginning and end, repeat middle content
```

### Problem 3: Abstract vs Concrete
```
❌ Abstract (LLM easy to ignore):
"Write tests for your code"
"Use existing libraries"

✅ Concrete (LLM easy to follow):
"After modifying any .ts file, run `npm test` immediately"
"Before implementing date formatting, check if date-fns library provides it"
```

### Problem 4: No Reinforcement Mechanism
```
Only said once:
"Run tests after every change"

LLM's "memory" decay:
Step 1-3: ✓ Remember
Step 4-5: ⚠️ Starting to forget
Step 6+:  ❌ Completely forget

Solution: Repeat critical rules 3-5 times
```

### Problem 5: Relying on Memory (Unreliable)
```
❌ Wrong approach: Expect LLM to remember rules
"Remember to test after changes"

✅ Correct approach: Force check mechanism
"BEFORE RESPONDING: Did you run tests? If no → Go back and run now"
```

## Basic Principles: The Five Laws

### Law 1: Repetition is Key
**Critical rules must be repeated 3-5 times**

```markdown
❌ Wrong (only said once):
## TECHNICAL STANDARDS
- Run tests after code changes

✅ Correct (repeated 3 times):
## 🔴 CRITICAL RULES - READ FIRST
1. Run tests after EVERY code change

... (middle sections) ...

## IMPLEMENTATION
- ⚠️ MANDATORY: Run tests immediately after change

... (end) ...

## MANDATORY CHECKLIST
- [ ] Did I run tests after code changes?
```

**Principle:**
- Repeat the 5-10 most critical rules 3 times
- Positions: beginning + relevant sections + end
- Use different phrasing (avoid identical repetition)

### Law 2: Position Matters
**Leverage Attention Bias**

```markdown
✅ Correct structure:

┌─────────────────────────────────────┐
│ 🔴 CRITICAL RULES                   │ ← Beginning: high attention
│    - Top 5-10 most important rules  │    Put most important rules here
├─────────────────────────────────────┤
│ IDENTITY & PRINCIPLES               │
├─────────────────────────────────────┤
│ DETAILED GUIDANCE                   │ ← Middle: low attention
│    - Technical standards            │    Detailed content
│    - Implementation details         │
├─────────────────────────────────────┤
│ ⚠️ MANDATORY CHECKLIST              │ ← End: high attention
│    - Before responding verify...    │    Force verification
└─────────────────────────────────────┘
```

**Principle:**
- Beginning (5%): Most important rules
- Middle (90%): Detailed guidance, technical specifics
- End (5%): Mandatory checks, reinforce again

### Law 3: Strong Language Wins
**Language strength directly affects compliance rate**

```markdown
❌ Weak language (easy to ignore):
- "You should test your code"
- "It's recommended to use existing libraries"
- "Try to refactor when needed"

✅ Strong language (won't ignore):
- "🔴 MANDATORY: Run tests after EVERY code change"
- "❌ NEVER build what libraries already provide"
- "⚠️ CRITICAL: Refactor immediately, not later"
```

**Language levels:**
1. Suggestion (weakest): should, could, consider, try
2. Expectation: expect, prefer, encourage
3. Requirement: must, always, never
4. Mandatory (strongest): 🔴 CRITICAL, ⚠️ MANDATORY, ❌ NEVER

**Principle:** Use mandatory level for critical rules, requirement level for general guidance

### Law 4: Concrete Beats Abstract
**Provide workflows, examples, specific actions**

```markdown
❌ Abstract (LLM hard to execute):
"Use existing libraries before implementing custom solutions"

✅ Concrete (LLM easy to execute):
**Before implementing ANY feature:**
1. Check: Does library/framework have this?
2. Search: npm/pip for existing solutions
3. Found existing? Use it
4. No existing? Then implement

**Example:**
❌ DON'T: Write custom date formatting
→ ✅ DO: import { format } from 'date-fns'
```

**Methods for concretization:**
1. **Workflow**: Step-by-step instructions
2. **Examples**: Give positive and negative examples
3. **Commands**: Give specific commands
4. **Triggers**: Explain when to activate
5. **Checklist**: Provide checklists

### Law 5: Check, Don't Trust
**Force verification mechanism**

```markdown
❌ Rely on memory (unreliable):
"Remember to run tests"

✅ Force verification (reliable):
## ⚠️ BEFORE EVERY RESPONSE - MANDATORY VERIFICATION

### 🔴 Testing (CRITICAL)
- [ ] Did I run tests after code changes?
- [ ] Are all tests passing?

**If any box unchecked → Go back and run tests NOW.**
```

**Principle:**
- Add MANDATORY CHECKLIST at the end
- Separate CRITICAL vs general levels
- Clear action: "Go back and fix NOW"
- Don't rely on LLM memory

## Structure Design: Three-Part Architecture

### Overall Structure

```markdown
# SYSTEM PROMPT NAME

## 🔴 CRITICAL RULES - READ FIRST
[5-10 most important rules, strongest language]

---

## Part 1: IDENTITY & PRINCIPLES (10-15%)
- Who/what you are
- Core philosophy
- Guiding principles

## Part 2: DETAILED GUIDANCE (75-85%)
- Cognitive framework
- Execution modes
- Technical standards
- Decision heuristics
- Anti-patterns

---

## ⚠️ MANDATORY CHECKLIST - BEFORE EVERY RESPONSE
[Force verification of critical rules]

## THE CREED / CLOSING
[Inspiring summary]
```

### Detailed Explanation

#### 1. Opening: CRITICAL RULES (Must Have)
```markdown
## 🔴 CRITICAL RULES - READ FIRST

**Review before EVERY response:**

1. 🔴 [CRITICAL RULE 1]: [Action in EVERY/NEVER language]
2. 🔴 [CRITICAL RULE 2]: [Action in EVERY/NEVER language]
3. 🔴 [CRITICAL RULE 3]: [Action in EVERY/NEVER language]
4. 🔴 [CRITICAL RULE 4]: [Action in EVERY/NEVER language]
5. 🔴 [CRITICAL RULE 5]: [Action in EVERY/NEVER language]

---
```

**Elements:**
- 5-10 most important rules
- Mark with 🔴
- Use strongest language (MANDATORY, NEVER, EVERY)
- Keep concise (1-2 lines each)
- At very beginning (leverage attention bias)

#### 2. Middle: Detailed Content (Main Body)
```markdown
## IDENTITY
[Who you are, what you do]

## PRINCIPLES
### Philosophy
[Core beliefs]

### Programming
[How to code]

### Quality
[How to maintain excellence]

## COGNITIVE FRAMEWORK
[How to think and decide]

## EXECUTION MODES
[How to work]

## TECHNICAL STANDARDS
[Specific technical requirements]

## ANTI-PATTERNS
[What to avoid - with examples]
```

**Elements:**
- Layered organization (use ##, ### for clear marking)
- Detailed but not redundant
- Critical rules repeated in relevant sections (2nd time)
- Give concrete examples and workflows

#### 3. Closing: MANDATORY CHECKLIST (Must Have)
```markdown
## ⚠️ BEFORE EVERY RESPONSE - MANDATORY VERIFICATION

**You MUST verify before submitting ANY response:**

### 🔴 [Critical Area 1] (CRITICAL)
- [ ] [Check 1]
- [ ] [Check 2]
- [ ] [Check 3]

**If any box unchecked → [Specific action] NOW.**

### 🔴 [Critical Area 2] (CRITICAL)
- [ ] [Check 1]
- [ ] [Check 2]

**If any box unchecked → [Specific action] NOW.**

### ✅ [General Area]
- [ ] [Check 1]
- [ ] [Check 2]

**IF ANY CRITICAL (🔴) BOX UNCHECKED → STOP AND FIX.**

---

## THE CREED
[Inspiring summary, working principles]
```

**Elements:**
- At the end (leverage recency bias)
- Separate CRITICAL (🔴) and general (✅)
- Clear action ("Go back and fix NOW")
- Critical rules reinforced 3rd time

## Language Techniques: How to Write Effectively

### 1. Use Mandatory Language

| Strength | Vocabulary | When to Use |
|----------|------------|-------------|
| Strongest | MUST, NEVER, ALWAYS, MANDATORY, CRITICAL | Absolutely unbreakable rules |
| Strong | ALWAYS, Should always, Required | Important rules |
| Medium | Should, Recommended, Prefer | General suggestions |
| Weak | Could, Consider, Try | Optional items |

```markdown
❌ Weak: You should consider running tests
⚠️ Medium: You should run tests after changes
✅ Strong: ALWAYS run tests after every change
🔴 Strongest: 🔴 MANDATORY: Run tests after EVERY code change
```

### 2. Use Visual Emphasis

**Symbol system:**
```markdown
🔴 = CRITICAL/MANDATORY (red warning)
⚠️ = WARNING/IMPORTANT (yellow warning)
❌ = NEVER/DON'T (forbidden)
✅ = ALWAYS/DO (must do)
🟢 = OK/GOOD (normal)
🟡 = CAUTION (attention)
```

**Format emphasis:**
```markdown
**Bold** = Important vocabulary
UPPERCASE = Extremely important
> Quote = Citation or emphasis
```markdown code blocks``` = Specific examples
```

### 3. Use Action-Oriented Language

```markdown
❌ State description (passive):
"Tests should be run"
"Libraries should be checked"

✅ Action command (active):
"Run tests after every change"
"Check if library provides feature before implementing"
```

### 4. Use "When...Then..." Pattern

```markdown
**Trigger condition → Action:**

When [trigger] → [action]
If [condition] → [action]
Before [event] → [verify]

Examples:
- When implementing feature → Check library first
- If tests fail → Return to design
- Before committing → Verify all tests pass
```

### 5. Use Contrast (❌ vs ✅)

```markdown
**Positive-negative contrast is most effective:**

❌ DON'T: Write custom date formatting function
✅ DO: import { format } from 'date-fns'

❌ NEVER: Skip tests because "no time"
✅ ALWAYS: Write tests as you implement
```

## Content Design: What to Include

### Must-Have Content

#### 1. Identity
```markdown
## IDENTITY
[Who you are in 2-3 sentences]
[What you do]
[How you work]
```

**Purpose:** Establish role positioning

#### 2. Critical Rules
```markdown
## 🔴 CRITICAL RULES - READ FIRST
1-10 most important behaviors
```

**Purpose:** Highest priority rules

#### 3. Principles
```markdown
## PRINCIPLES
### Philosophy
Core beliefs

### Programming
How to code

### Quality
How to maintain excellence
```

**Purpose:** Guiding philosophy

#### 4. Cognitive Framework
```markdown
## COGNITIVE FRAMEWORK
How to think, decide, and adapt
```

**Purpose:** Metacognitive ability

#### 5. Execution Guidance
```markdown
## EXECUTION MODES
When and how to do different types of work
```

**Purpose:** Specific work methods

#### 6. Technical Standards
```markdown
## TECHNICAL STANDARDS
Specific technical requirements
```

**Purpose:** Specific technical specifications

#### 7. Anti-Patterns
```markdown
## ANTI-PATTERNS
What NOT to do, with examples
```

**Purpose:** Prevent common mistakes

#### 8. Mandatory Checklist
```markdown
## ⚠️ MANDATORY CHECKLIST
Before every response, verify...
```

**Purpose:** Force compliance

### Should-Have Content

- Decision Heuristics
- Handling Uncertainty
- Output Contract
- Examples

### Nice-to-Have Content

- Project Context Protocol
- Recovery Protocols
- Excellence Checklist
- The Creed

## Quality Checklist

### Structure Check

- [ ] **CRITICAL RULES at beginning?**
- [ ] **MANDATORY CHECKLIST at end?**
- [ ] **Critical rules repeated 3 times?** (beginning, middle, end)
- [ ] **Clear section hierarchy?** (use ##, ### markers)
- [ ] **Reasonable length?** (200-500 lines, 3K-6K tokens)

### Content Check

- [ ] **Identity clear?** (2-3 sentences explaining who)
- [ ] **Principles complete?** (philosophy, programming, quality)
- [ ] **Specific workflows?** (not just abstract rules)
- [ ] **Positive-negative examples?** (❌ DON'T vs ✅ DO)
- [ ] **Anti-patterns with examples?** (explain what to avoid)

### Language Check

- [ ] **Strong language for critical rules?** (MUST, NEVER, ALWAYS)
- [ ] **Visual emphasis?** (🔴⚠️❌✅)
- [ ] **Action-oriented?** ("Run tests" not "Tests should be run")
- [ ] **Concrete enough?** (has commands, steps, examples)
- [ ] **Avoid redundancy?** (don't repeat same content)

### Effectiveness Check

- [ ] **Position Bias utilized?** (important content at beginning/end)
- [ ] **Attention dilution avoided?** (under 50 rules)
- [ ] **Force verification mechanism?** (not just rely on memory)
- [ ] **Concrete?** (not just abstract principles)
- [ ] **Target LLM common problems?** (like forgetting tests, reinventing wheel)

## Common Mistakes: Avoid

### ❌ Mistake 1: Too Many Rules, No Focus
```markdown
❌ Wrong:
50 rules, all very important
→ Result: LLM ignores most

✅ Correct:
5-10 CRITICAL RULES (repeated 3 times)
+ Other detailed guidance (middle)
```

### ❌ Mistake 2: Rules Too Abstract
```markdown
❌ Wrong:
"Write clean code"
"Use best practices"

✅ Correct:
"Extract function when >20 lines"
"Refactor on 3rd duplication"
"Run `npm test` after every .ts file change"
```

### ❌ Mistake 3: Only Said Once
```markdown
❌ Wrong:
Rules only appear once in one section
→ Result: LLM easily forgets

✅ Correct:
Critical rules repeated 3 times:
1. CRITICAL RULES (beginning)
2. Relevant sections (middle)
3. MANDATORY CHECKLIST (end)
```

### ❌ Mistake 4: Using Weak Language
```markdown
❌ Wrong:
"You should probably test your code"
"It might be good to use libraries"

✅ Correct:
"🔴 MANDATORY: Run tests after EVERY change"
"❌ NEVER implement what libraries provide"
```

### ❌ Mistake 5: No Verification Mechanism
```markdown
❌ Wrong:
Only rules, no verification
→ Result: Rely on LLM memory (unreliable)

✅ Correct:
## MANDATORY CHECKLIST
- [ ] Did I run tests?
- [ ] Did I check library?
**If unchecked → Go back NOW**
```

### ❌ Mistake 6: Important Content in Middle
```markdown
❌ Wrong:
Beginning: Introduction
Middle: Critical rules ← Low attention
End: Greeting

✅ Correct:
Beginning: 🔴 CRITICAL RULES ← High attention
Middle: Detailed guidance
End: ⚠️ MANDATORY CHECKLIST ← High attention
```

### ❌ Mistake 7: No Examples
```markdown
❌ Wrong:
"Don't reinvent the wheel"
→ LLM doesn't know what specifically refers to

✅ Correct:
"Don't reinvent the wheel"
❌ DON'T: Write formatDate()
→ ✅ DO: import { format } from 'date-fns'
```

### ❌ Mistake 8: Too Long or Too Short
```markdown
❌ Too short (<100 lines):
Not specific enough, LLM doesn't know what to do

❌ Too long (>1000 lines):
Severe attention dilution

✅ Just right (200-500 lines, 3K-6K tokens):
Specific enough, attention won't be too diluted
```

## Real-World Cases: Comparison

### Case 1: Testing Rule

#### ❌ Version 1 (Very Poor)
```markdown
Write tests for your code.
```
**Problems:**
- Too abstract
- Weak language (no enforcement)
- Doesn't say when to test
- Only said once

#### ⚠️ Version 2 (Average)
```markdown
## Technical Standards
- Write tests for critical functionality
- Run tests before committing
```
**Problems:**
- Still abstract (what is critical?)
- Weak language (should be "MUST")
- Only said once
- No verification mechanism

#### ✅ Version 3 (Good)
```markdown
## 🔴 CRITICAL RULES
1. 🔴 TESTING MANDATORY: Run tests after EVERY code change

...

## IMPLEMENTATION
🔴 CRITICAL WORKFLOW:
3. ⚠️ MANDATORY: Run tests immediately after change
4. ⚠️ MANDATORY: Update tests if behavior changed

...

## MANDATORY CHECKLIST
### 🔴 Testing (CRITICAL)
- [ ] Did I run tests after code changes?
- [ ] Are all tests passing?
**If unchecked → Run tests NOW.**
```
**Why it's good:**
- ✅ Repeated 3 times
- ✅ Strong language (MANDATORY, EVERY)
- ✅ Concrete (when, how)
- ✅ Force verification
- ✅ Clear action

### Case 2: Use Existing Libraries

#### ❌ Version 1 (Very Poor)
```markdown
Use existing libraries when possible.
```
**Problems:**
- Too abstract (when? how to use?)
- Weak language ("when possible" too vague)
- No examples
- Only said once

#### ⚠️ Version 2 (Average)
```markdown
## Anti-Patterns
- Reinventing the wheel: Building what libraries already provide
```
**Problems:**
- Still abstract
- No concrete examples
- No workflow
- Only said once

#### ✅ Version 3 (Good)
```markdown
## 🔴 CRITICAL RULES
2. 🔴 LIBRARY FIRST: Before implementing ANY feature, check if library provides it

...

## ANTI-PATTERNS
### Reinventing the Wheel
❌ NEVER build what libraries already provide.

**Before implementing ANY feature:**
1. Check: Does library/framework have this?
2. Search: npm/pip for existing
3. Found? Use it
4. No? Then implement

**Examples:**
❌ DON'T: Write formatDate()
→ ✅ DO: import { format } from 'date-fns'

❌ DON'T: Implement validation
→ ✅ DO: import { z } from 'zod'

...

## MANDATORY CHECKLIST
### 🔴 Library Usage (CRITICAL)
- [ ] Did I check if library provides this?
- [ ] Am I reinventing any wheel?
**If unchecked → Search for solutions NOW.**
```
**Why it's good:**
- ✅ Repeated 3 times
- ✅ Strong language (NEVER, BEFORE ANY)
- ✅ Concrete workflow (5 steps)
- ✅ Multiple examples (visualized)
- ✅ Force verification

## Summary: The Ultimate Checklist

When writing System Prompts, ensure:

### Structure ✓
- [ ] CRITICAL RULES at beginning (5-10 rules)
- [ ] MANDATORY CHECKLIST at end
- [ ] Critical rules repeated 3 times
- [ ] Clear section hierarchy (##, ###)
- [ ] Reasonable length (200-500 lines)

### Content ✓
- [ ] Identity clear
- [ ] Principles complete (Philosophy, Programming, Quality)
- [ ] Cognitive Framework present
- [ ] Execution Modes present
- [ ] Technical Standards present
- [ ] Anti-Patterns (with examples)
- [ ] Specific workflows
- [ ] Positive-negative examples (❌ vs ✅)

### Language ✓
- [ ] Strongest language for critical rules (MUST, NEVER, ALWAYS, MANDATORY)
- [ ] Visual emphasis (🔴⚠️❌✅)
- [ ] Action-oriented ("Run tests" not "Tests should be run")
- [ ] Concrete (has commands, steps, examples)
- [ ] Avoid redundancy

### Effectiveness ✓
- [ ] Position Bias utilized (beginning+end)
- [ ] Attention dilution avoided (<50 rules)
- [ ] Force verification (not just rely on memory)
- [ ] Target LLM common problems (forgetting tests, over-engineering, etc.)
- [ ] Tested effectiveness (if possible)

## Appendix: Quick Reference

### Language Strength Comparison Table
| What you want to say | Weak language ❌ | Strong language ✅ |
|----------------------|------------------|-------------------|
| Should do | should, could | MUST, ALWAYS |
| Shouldn't do | shouldn't, avoid | NEVER, ❌ DON'T |
| Important | important | 🔴 CRITICAL, ⚠️ MANDATORY |
| Every time | when needed | EVERY time, after EVERY |

### Visual Symbol Quick Reference
```
🔴 = CRITICAL/extremely important
⚠️ = WARNING/important warning
❌ = NEVER/forbidden
✅ = ALWAYS/must do
🟢 = OK/normal
🟡 = CAUTION/attention
```

### Repetition Pattern
```
Rule repetition 3 times template:

Position 1 - Beginning CRITICAL RULES:
"🔴 [Rule name]: [Action]"

Position 2 - Relevant sections:
"⚠️ MANDATORY: [Specific action]"
or
"**[Rule name]:** [Detailed explanation + workflow]"

Position 3 - End CHECKLIST:
"- [ ] Did I [action]?
**If no → [Fix action] NOW.**"
```

## Final Reminder

### Golden Rules for Writing System Prompts:

1. **Concise but complete**: 200-500 lines, not too long or too short
2. **Repeat key content**: Most important 5-10 rules repeated 3 times
3. **Position strategy**: Important content at beginning and end
4. **Strong language**: MUST, NEVER, ALWAYS, MANDATORY
5. **Be concrete**: Give workflows, examples, commands
6. **Verification mechanism**: MANDATORY CHECKLIST, not just rely on memory
7. **Visual emphasis**: 🔴⚠️❌✅
8. **Be targeted**: Solve problems LLM actually makes

### Remember:
- **LLMs forget** → Repeat
- **LLMs ignore middle** → Put important content at beginning/end
- **LLMs need concrete** → Give workflows and examples
- **LLMs need enforcement** → Verification mechanism, not suggestions

---

**Now you can write System Prompts that LLMs actually follow!** 🚀