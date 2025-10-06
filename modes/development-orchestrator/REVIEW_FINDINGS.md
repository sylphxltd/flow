# Comprehensive Review Findings

## Issues Identified

### 1. Mode Reporting Requirements Not Standardized

**Problem**: Each mode says "Tell me..." but doesn't standardize what exactly to report and in what format.

**Impact**: Orchestrator can't reliably verify completion.

**Fix Needed**: Add explicit "What You Must Report" section to each mode with checklist format.

### 2. Checkbox Tracking Not Explicitly Reported

**Problem**: Phase 3 says to flip checkboxes but doesn't say to report the count in attempt_completion.

**Impact**: Orchestrator can't verify progress without reading tasks.md (which it can't do).

**Fix Needed**: Phase 3 must report: "Tasks: X/Y complete (X tasks marked [x], Y total)"

### 3. Quantification Missing

**Problem**: Vague completion criteria:
- "how many questions resolved" - does mode count them?
- "task count" - specific number needed
- "clear and complete" - subjective

**Impact**: Orchestrator can't objectively verify.

**Fix Needed**: Explicit numbers and objective criteria.

### 4. Exception Handling Unclear

**Problem**: 
- What if Phase 1 clarify iterations exceed reasonable limit?
- What if some questions can't be resolved?
- What if tests keep failing?

**Impact**: No clear escape path.

**Fix Needed**: Define limits and deferred question handling.

### 5. Orchestrator Verification Too Vague

**Problem**: "Does the report seem complete?" - too subjective

**Impact**: Inconsistent gatekeeping.

**Fix Needed**: Concrete checklist of what must be in report.

### 6. Phase 3 Continuous Analysis Unclear

**Problem**: "Continuously update analysis.md" but when? How often?

**Impact**: Unclear execution.

**Fix Needed**: Specify when to update (after each task? After each batch?)

### 7. Constitution Clause References Not Standardized

**Problem**: "List constitution clauses" - what format?

**Impact**: Hard to verify coverage.

**Fix Needed**: Standard format like "Clause 2.1, 3.4, 5.2"

### 8. Risk Severity Not Quantified

**Problem**: "High/Medium/Low" but no criteria for classification.

**Impact**: Inconsistent risk assessment.

**Fix Needed**: Define what makes a risk High vs Medium vs Low.

### 9. Track Selection Criteria Unclear

**Problem**: "High risk, complex → Full" but what determines high risk?

**Impact**: Inconsistent track selection.

**Fix Needed**: Explicit criteria (e.g., "High risk = touches core logic, data models, or security")

### 10. Mode Completion Report Format Inconsistent

**Problem**: Each mode has different "When Done" instructions.

**Impact**: Orchestrator gets different report formats.

**Fix Needed**: Standardize report structure across all modes.

## Recommended Fixes

### Add Standard Reporting Template

All modes should report in consistent structure:
```
STATUS: Completed/Blocked/Deferred
PHASE: X
MODE: <mode-slug>

[If Blocked]
REASON: <MissingBriefFields|HALT|PolicyViolation|OutOfOrder>
WHAT'S MISSING: <specific items>

OUTPUTS CREATED:
- path/to/file1.md
- path/to/file2.md

EVIDENCE:
- path/to/evidence1
- path/to/evidence2

QUANTIFIED RESULTS:
- <specific metrics with numbers>

RISKS IDENTIFIED:
- High: <description>
- Medium: <description>

CONSTITUTION:
- Clauses verified: 2.1, 3.4, 5.2
- Exceptions: <if any>

SUMMARY:
<Natural language explanation>
```

### Add Explicit Completion Criteria

For each phase, define objectively verifiable criteria.

### Add Exception Handling

Define limits and what to do when exceeded.

Would you like me to implement these fixes?