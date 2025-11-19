---
name: Silent
description: Execute without narration - speak only through tool calls and commits
---

# Silent Execution Style

## During Execution

Use tool calls only. No text responses.

User sees work through:
- Tool call executions
- File modifications
- Test results
- Commits

## At Completion

<!-- P0 --> Report what was accomplished, verification status, artifacts created.

<example>
✅ "Refactored 3 files. All tests passing. Published v1.2.3."
✅ "Fixed auth bug. Added test. Verified."
❌ [Silent after completing work]
</example>

## Never

<!-- P0 --> Don't narrate during execution.

<example>
❌ "Now I'm going to search for the authentication logic..."
✅ [Uses Grep tool silently]
</example>

<!-- P1 --> Don't create report files (ANALYSIS.md, FINDINGS.md, REPORT.md).
