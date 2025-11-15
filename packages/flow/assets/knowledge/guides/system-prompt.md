---
name: System Prompt Writing Guide
description: MEP (Minimal Effective Prompt) framework for writing high-signal, efficient prompts
---

# Minimal Effective Prompt (MEP) Framework

> **Core Philosophy**: Find the smallest set of high-signal tokens that maximize desired outcomes.

## Core Principles

### The Three Golden Rules

**1. Trust LLM Intelligence**
Modern LLMs (GPT-4, Claude Sonnet 4+):
- Strong contextual reasoning and inference
- Pattern generalization from 1-2 examples
- Trained on common frameworks, standards, best practices
- Understand semantic compression

**2. Eliminate Redundancy**
Each concept appears **exactly once**.
- Stated in A → Don't repeat in B
- Implied by X → Don't state explicitly
- Common sense → Don't state at all

**3. Achieve Goldilocks Zone**
Balance:
- Too rigid: Hardcoded if-else, excessive checklists, brittle rules
- Too vague: "Be helpful", high-level platitudes, no concrete guidance
- **Goldilocks**: Specific guidance + flexible heuristics

---

## The MEP Framework

### The Three Questions (For Every Token)

**1. Is this UNIQUE?**
- Can it be inferred from other parts?
- Is it in LLM's training data?
- Is it just a rewording?

**2. Is this ACTIONABLE?**
- Does it enable concrete behavior?
- Can LLM act on this?
- Is it specific enough?

**3. Is this HIGH-SIGNAL?**
- Does it directly impact outcome?
- Is it critical to success?
- Would removing it degrade performance?

**Decision Matrix:**
```
All 3 YES → KEEP (essential)
Any 1 NO  → REMOVE or MERGE
All 3 NO  → DELETE immediately
```

### Signal Density Target

- **Good**: 60-70% high-signal
- **Great**: 70-80% high-signal
- **Exceptional**: 80-90% high-signal

Calculate: (High-signal tokens / Total tokens) × 100%

---

## Writing Process

### Phase 1: Brain Dump
Capture all requirements, rules, guidance. Don't filter. Focus on completeness.

### Phase 2: Structure
Organize into logical sections:
1. Core Rules/Principles (always true)
2. Identity/Role (who is LLM)
3. Foundational Concepts (philosophy)
4. Operational Guidance (how to work)
5. Tools & Resources (available)
6. Decision Support (when unclear)
7. Standards (quality, security)
8. Anti-Patterns (what to avoid)
9. Output Format (what to deliver)

### Phase 3: Identify Redundancy

**Type A - Exact Repetition**: Same concept, same wording → Keep 1st, delete all others

**Type B - Semantic Repetition**: Same concept, different wording → Keep clearest

**Type C - Implied Repetition**: B is logical consequence of A → Keep only A

**Type D - Section Redundancy**: Entire section restates another → Delete entire section

### Phase 4: Apply The Three Questions

For each section, validate against uniqueness, actionability, high-signal.

**Remove common sense:**
❌ "Never commit broken code", "Use descriptive names", "Test your code"

**Keep specific guidance:**
✅ "Run tests after EVERY change", "Refactor on 3rd duplication", "Extract when >20 lines"

### Phase 5: Optimize Expression

**Compact Syntax:**
```
❌ "First do A, then B, then C" → ✅ "A → B → C"
❌ "Choose from: A, B, or C" → ✅ "Choose: A / B / C"
❌ "If X then Y" → ✅ "X? → Y"
❌ "Never X, never Y, never Z" → ✅ "Never: X / Y / Z"
```

**List Consolidation:**
- **Bullets**: Complex items needing explanation
- **Commas**: Simple, parallel items

**Remove Filler:**
```
❌ "You should always make sure to test" → ✅ "Always test"
❌ "It is important that you document" → ✅ "Document"
❌ "Try to choose the simplest" → ✅ "Choose simplest"
```

**Merge Related Sections:**
When sections are conceptually related, <50 tokens each, total merged <150 tokens.

### Phase 6: Format & Polish

**Headers**: Use hierarchy (`#` > `##` > `###`), avoid excessive nesting

**Emphasis**: Bold for key terms (first mention only), emoji sparingly (section markers only)

**Code Blocks**: For templates, examples, specific formats only

**Tables**: For comparisons and decision matrices

---

## Judgment Criteria

### What to KEEP

**Unique Information:**
- Custom conventions (document format, commit format, priority hierarchy)
- Novel frameworks (execution modes, decision frameworks)
- Specific guidance ("Refactor on 3rd duplication", "Extract when >20 lines")

**Actionable Directives:**
- Specific actions ("Run tests after every change", "Validate inputs at boundaries")
- Clear workflows ("Analyze → Check → Assume → Implement")
- Decision rules ("Ambiguous? → existing > conventions > standards")

**High-Signal Examples:**
1-2 representative examples per concept (LLM generalizes)

### What to REMOVE

**Redundant Content:**
- Exact repetition (same concept, same wording)
- Semantic repetition (same concept, different wording)
- Implied content (B follows from A)
- Redundant sections (duplicates another section)

**Low-Signal Content:**
- Common sense ("Write clean code", "Comment your code")
- Vague directives ("Be thoughtful", "Think carefully", "Consider context")
- Over-emphasis ("🔴 CRITICAL: MUST VERIFY" → "Verify")

**Verbose Expression:**
- Filler words ("You should always...", "It is important that...")
- Redundant explanations (LLM infers implications)

---

## Common Pitfalls

**Over-Specification**: 50+ conditional rules → Principles + heuristics instead

**Repetition for Emphasis**: Stating "Never block" 4 times → State once, trust LLM

**Excessive Examples**: 5+ examples of same pattern → 2 examples sufficient

**Common Sense Inclusion**: Universal programming knowledge → Omit

**Vague Directives**: "Be thoughtful" → Specific, actionable

**Format Overload**: Too many emoji/bold/emphasis → Minimal, purposeful

**Section Bloat**: 20+ tiny sections → Merge related (8-15 sections ideal)

---

## Quality Checklist

### Before Optimization
- [ ] Brain dump complete
- [ ] Organized into sections
- [ ] All examples included
- [ ] All rules documented

### During Optimization
- [ ] No concept appears >1 time
- [ ] Every statement passes 3 questions
- [ ] Compact syntax used
- [ ] Related sections merged

### After Optimization
- [ ] All scenarios handleable
- [ ] All frameworks fully specified
- [ ] 40-60% token reduction
- [ ] 75-85% signal density
- [ ] 8-15 main sections
- [ ] 1-2 examples per concept
- [ ] Goldilocks Zone achieved (specific + flexible)
- [ ] Clean, scannable formatting

---

## Decision Trees

### "Should I keep this content?"
```
Is it unique (not inferable)?
├─ NO → DELETE
└─ YES → Is it actionable?
    ├─ NO → DELETE
    └─ YES → Is it high-signal?
        ├─ NO → DELETE
        └─ YES → KEEP
```

### "Should I include this example?"
```
How many examples already?
├─ 0 → ADD 1-2 representative
├─ 1-2 → GOOD, stop
└─ 3+ → TOO MANY, remove least representative
```

### "Should I merge these sections?"
```
Are they related?
├─ NO → Keep separate
└─ YES → Each <50 tokens?
    ├─ NO → Keep separate
    └─ YES → Total merged <150?
        ├─ NO → Keep separate
        └─ YES → MERGE
```

---

## Practical Examples

### Example 1: Optimizing Rules

**Before (110 tokens):**
```markdown
## Rule 1: Never Block On Uncertainty

**IMPORTANT**: You must never stop working due to missing information...

When you encounter uncertainty:
1-8. [Long list of steps]

Remember: It is better to complete...
```

**After (15 tokens, -86%):**
```markdown
## Rule 1: Never Block

Make reasonable assumptions, document them, complete task.
```

### Example 2: Optimizing Decisions

**Before (115 tokens):**
```markdown
When you face an ambiguous requirement:
- You should choose the most reasonable...
[Multiple verbose bullet points]
```

**After (30 tokens, -74%):**
```markdown
**Ambiguous?** → existing patterns > conventions > standards. Document assumption.
**Missing info?** → Industry defaults, make configurable.
**Multiple options?** → Simplest. Note alternatives.
```

---

## Token Budget Guidelines

**System Prompt Types:**

| Type | Target Tokens | Max Tokens | Focus |
|------|--------------|------------|-------|
| Shared Protocol | 150-250 | 300 | Lightweight, universal |
| Agent-Specific | 800-1200 | 1500 | Comprehensive, specialized |
| Task-Specific | 300-500 | 700 | Focused, actionable |

---

## Final Validation

**A great prompt should feel like:**
- ✅ Well-written manual (clear, concise, complete)
- ✅ Expert colleague conversation (professional, efficient)
- ✅ Set of principles (guiding, not restricting)

**A great prompt should NOT feel like:**
- ❌ Legal terms (exhaustive, repetitive, cautious)
- ❌ IKEA instructions (step-by-step, rigid, brittle)
- ❌ Drill sergeant (emphasis, repetition, no trust)

**The Ultimate Tests:**

**Can you explain your prompt's purpose in one sentence?**
- Yes → Focused ✅
- No → Tries to do too much ❌

**Can you identify high-signal vs noise?**
- 75%+ essential → Great ✅
- 50-75% essential → Good, can improve 🟡
- <50% essential → Too much noise ❌

**Would you want to read your prompt?**
- Yes → Clean, professional, scannable ✅
- No → Needs work ❌

---

## Conclusion

Great prompts = **Clarity** (each concept once) + **Trust** (LLM intelligence) + **Economy** (every token earns place) + **Effectiveness** (achieve outcomes)

Shorter. Clearer. More effective. 🎯
