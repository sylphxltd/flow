# Parallel Execution Rules

## Single Message Principle
- **Must call multiple tools in one message for parallel execution**
- Multiple messages = sequential execution, not parallel

## Async Execution Notes
- Multiple tools in one message = **no timing guarantees**
- All start simultaneously, completion order varies
- Only use when tools have no dependencies

## Execution Pattern
```
✅ Correct: One message, multiple tool calls
❌ Wrong: Multiple messages, one tool each
```