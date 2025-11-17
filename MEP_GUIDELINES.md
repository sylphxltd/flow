# Minimal Effective Prompt - 寫作指南 (研究修訂版)

## 核心原則

**Structure + Specificity + Signal + Trust**

1. **Structure** - Use clear hierarchy, XML tags for complex prompts
2. **Specificity** - Explicit enough that "intern on first day" can execute
3. **Signal** - Clear priority when conflicts with user task
4. **Trust** - LLM capability (prompt, don't teach basics)

**Minimal = 最少 necessary information，唔係最少字數**

---

## 新增：優先級框架

System prompt 同 user task 會 compete。明確 priority：

| Priority | 類型 | 例子 | User task 衝突時 |
|----------|------|------|------------------|
| P0 - MUST | Safety, correctness | No secrets in commits | BLOCK task |
| P1 - SHOULD | Quality gates | Tests pass before commit | REMIND then proceed |
| P2 - MAY | Optimization | Function >20 lines → extract | SKIP if task urgent |

**寫法：**
```markdown
<!-- P0 --> Never commit secrets or credentials.
<!-- P1 --> Tests pass before commit.
<!-- P2 --> Function >20 lines → consider extracting.
```

---

## 格式選擇矩陣（擴充版）

| 目的 | 格式 | 何時用 | 例子 |
|------|------|--------|------|
| Critical safety | Imperatives + P0 | Must never violate | `<!-- P0 --> No secrets in commits.` |
| Must-do actions | Imperatives + P1 | Core workflow | `<!-- P1 --> Tests pass before commit.` |
| Philosophy/mindset | Principles | General guidance | `Pure functions default. Side effects isolated.` |
| Conditional rules | Triggers | Specific conditions | `Function >20 lines → extract.` |
| Complex workflows | Structured steps + XML | Multi-step process | `<workflow>` (see below) |
| Quality gates | Checklist | Verification points | `- [ ] Tests pass` |
| Desired end state | Outcomes | Target result | `Commit only production code.` |
| Motivation | Consequences | Show impact | `Skip research → outdated code → rework.` |
| Edge cases | Examples + XML | Clarify ambiguity | `<example>` (see below) |

---

## 寫作規則（修訂版）

### ✅ DO

#### 1. Structure complex prompts with XML
```markdown
✅
## Error Handling

<instruction priority="P1">
When encountering a bug: investigate root cause → fix → add test.
</instruction>

<example type="good">
Bug: Login fails intermittently
Root cause: JWT expiry not handled
Fix: Add token refresh logic
Test: Verify refresh flow works
</example>

<example type="bad">
Bug: Login fails
Quick fix: Add try-catch, return generic error
Result: Bug still happens, just hidden
</example>
```

❌
```markdown
Bug → fix.
```

#### 2. Specify WHAT, WHEN, and necessary CONTEXT
```markdown
✅ No TODOs in commits. TODOs indicate incomplete work; finish before committing.

❌ No TODOs in commits.
(Too minimal - LLM might not understand why or might skip)
```

#### 3. Use examples for ambiguous or critical instructions
```markdown
✅
Pure functions default. Side effects → explicit comment.

<example>
// SIDE EFFECT: Writes to disk
function saveConfig(config) { ... }

// Pure function
function validateConfig(config) { ... }
</example>

❌ Pure functions default.
(Ambiguous without example)
```

#### 4. Break down complex workflows (research-backed)
```markdown
✅
<workflow name="commit">
1. Run tests (must pass)
2. Check for secrets (use git diff)
3. Review changes (self-review)
4. Write clear commit message
5. Commit

Each step required. Skip → reject commit.
</workflow>

❌ Test → review → commit.
(Too compressed for complex workflow)
```

#### 5. Embed verification, make it concrete
```markdown
✅ Remove unused code. Check: No unused imports (linter clean).

❌ Remove unused code.
(How to verify?)
```

#### 6. Mix formats based on complexity
```markdown
## Section

Simple rule: Condition → action.

Complex rule with context:
<instruction>
[What to do]
[When to do it]
[Why it matters - if critical]
</instruction>

<example>[Concrete case]</example>
```

### ❌ DON'T

#### 1. Don't teach basic operations (unchanged)
```markdown
❌ Run `npm test` to execute tests, then check if all pass
✅ Tests pass before commit.
```

#### 2. Don't over-explain common knowledge WHY
```markdown
❌ Use pure functions because they're easier to test, reason about, and debug...
✅ Pure functions default. Side effects isolated with comment.
```

#### 3. Don't use explicit labels (unchanged)
```markdown
❌ Trigger: X / Action: Y / Verification: Z
✅ X → Y. Verify: Z.
```

#### 4. Don't write step-by-step for simple tasks
```markdown
❌
1. Open file
2. Edit content
3. Save file
4. Close file

✅ Edit file → save.
```

**BUT DO write step-by-step for complex/critical workflows** (research-backed):
```markdown
✅
<workflow name="release">
1. Run full test suite
2. Update CHANGELOG.md
3. Bump version (changeset)
4. Push to trigger CI
5. Monitor release workflow

Critical path. Each step required.
</workflow>
```

---

## 實戰模板（擴充版）

### Critical Instruction Pattern
```markdown
<!-- P0 --> [Absolute requirement]

<reasoning>Why this is critical</reasoning>

<example type="violation">
[What happens if violated]
</example>
```

**Example:**
```markdown
<!-- P0 --> Never commit secrets, API keys, or credentials.

<reasoning>Exposed secrets = security breach, can't be undone (git history)</reasoning>

<example type="violation">
Committed: API_KEY=sk_live_123abc
Result: Key exposed in public repo → immediate security incident
</example>
```

### Core Behavior Pattern (Enhanced)
```markdown
**[Principle Name]**: [Core directive].

[Outcome state]. [Consequence if violated - if not obvious].

<example>[Concrete case showing the principle]</example>
```

**Example:**
```markdown
**Fix, Don't Report**: Bug → investigate → fix root cause → test.

Commits contain solutions, not problem descriptions.

<example>
❌ "Found bug in auth, needs investigation"
✅ "Fix JWT expiry handling in auth middleware
   Root cause: Token refresh not implemented
   Added refresh logic + test"
</example>
```

### Conditional Rules Pattern (Enhanced)
```markdown
**[Topic]**

Simple: [Condition] → [action].
Complex: [Condition] → [action]. [Context if needed].

[Principle statement].

<example>[Edge case or clarification]</example>
```

**Example:**
```markdown
**Code Complexity**

Function >20 lines → extract smaller functions.
Cognitive load high (>3 nesting levels) → simplify or extract.

Keep code readable.

<example>
Before: 45-line function with 4 nesting levels
After: Main function (12 lines) + 2 helper functions (8 lines each)
Result: Clear flow, easier to test
</example>
```

### Quality Gates Pattern (with XML)
```markdown
**[Context]**

<checklist priority="P1">
Before [event]:
- [ ] [Outcome 1]
- [ ] [Outcome 2]
- [ ] [Outcome 3]
</checklist>

All required. No exceptions.
```

**Example:**
```markdown
**Pre-Commit Quality**

<checklist priority="P1">
Before every commit:
- [ ] Tests pass (run them, don't assume)
- [ ] No TODOs or FIXMEs
- [ ] No secrets or debug code
- [ ] Linter clean
</checklist>

All required. No exceptions.
```

### Complex Workflow Pattern (NEW)
```markdown
**[Workflow Name]**

<workflow priority="[P0/P1/P2]">
1. [Step 1] - [verification]
2. [Step 2] - [verification]
3. [Step 3] - [verification]

[Success criteria]
[Failure handling]
</workflow>

<example type="success">[Happy path]</example>
<example type="failure">[Common failure + recovery]</example>
```

---

## Quality Self-Check（修訂版）

寫完後問自己：

1. **Specificity test**: "Intern on first day" 睇完可唔可以執行？
   - No → Add examples or context
   - Yes → Keep

2. **Structure test**: 複雜既 instruction 有冇用 XML structure？
   - Complex without structure → Add `<instruction>`, `<example>`
   - Simple → Plain text OK

3. **Priority test**: 如果同 user task 衝突，LLM 知唔知點做？
   - Unclear → Add `<!-- P0/P1/P2 -->`
   - Clear → Keep

4. **Verification test**: 點樣知道有冇跟？
   - Can't verify → Add concrete check
   - Can verify → Keep

5. **Example test**: 有冇 edge case 或 ambiguity？
   - Yes + no example → Add `<example>`
   - No ambiguity → Skip example

6. **Minimal test**: 有冇 unnecessary information？
   - Teaching basics → Delete
   - Explaining common knowledge WHY → Delete
   - Critical context/examples → Keep

7. **Trust test**: 我係咪教緊 LLM 點做基本操作？
   - Yes → Delete it
   - No → Keep

---

## 修訂重點

### 改變左咩？

1. ✅ **加左 Structure** - XML tags for complex prompts (research-backed)
2. ✅ **加左 Priority system** - P0/P1/P2 解決 conflict (63% improvement)
3. ✅ **Examples 變必須** - For ambiguous/critical instructions (research-backed)
4. ✅ **容許 step-by-step** - For complex workflows (research-backed)
5. ✅ **Specificity requirement** - "Intern test" (Anthropic best practice)
6. ✅ **Necessary context OK** - Critical WHY can be included
7. ✅ **Redefine Minimal** - 最少 necessary info，唔係最少字

### 冇變既野？

1. ✅ Trust LLM capability - 唔教 basic operations
2. ✅ WHAT + WHEN focus - 唔講 HOW
3. ✅ Condense over expand - 簡潔 preferred
4. ✅ Format diversity - Mix imperatives, triggers, principles
5. ✅ No explicit labels - 唔用 "Trigger:", "Action:"

---

## TL;DR（修訂版）

**Effective Prompt 四大法則：**

1. **Structure** - XML for complex, plain for simple
2. **Specificity** - Explicit enough to execute (intern test)
3. **Signal** - Clear priority (P0 > P1 > P2)
4. **Trust** - LLM capability (don't teach basics)

**Minimal = Minimal necessary information**
- 唔係 fewest words
- 係 necessary details + structure + examples for execution

**Remember**:
- Simple rule → `Condition → action`
- Complex rule → `<instruction>` + `<example>`
- Critical rule → `<!-- P0 -->` + reasoning

**Prompt triggers reliable action, not just describes desired outcome.**
