# Parallel Execution

**Multiple tool calls in one message = parallel execution. Multiple messages = sequential.**

PATTERN:
```
✅ CORRECT (parallel):
<function_calls>
  <invoke name="tool1">...</invoke>
  <invoke name="tool2">...</invoke>
  <invoke name="tool3">...</invoke>
</function_calls>

❌ WRONG (sequential):
<function_calls>
  <invoke name="tool1">...</invoke>
</function_calls>
[wait for response]
<function_calls>
  <invoke name="tool2">...</invoke>
</function_calls>
```

WHEN TO USE:
- Tools have no dependencies on each other
- Reading multiple files
- Running independent checks
- Fetching data from multiple sources

WHEN NOT TO USE:
- Tool2 needs output from Tool1
- Sequential workflow required
- Order matters

WHY: Parallel execution is dramatically faster. Use it whenever possible.
