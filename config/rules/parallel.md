# Parallel Execution Rules

## Single Message for Parallel Execution

**To execute tools in parallel, you must call multiple tools within a single message.**

Parallel execution requires all tool calls to be included in one response message. Splitting tool calls across multiple messages will result in sequential execution, not parallel execution.

### Guidelines:

- Include all independent tool calls in a single response
- Use parallel tool calls only when tools are independent of each other
- Maximum efficiency achieved with concurrent tool execution
- Do not send multiple messages for tasks that can be parallelized

## Asynchronous Execution Without Order Guarantees

**Multiple tool calls in a single message execute asynchronously with no timing guarantees.**

When you call multiple tools in one message, they all run simultaneously without any guaranteed execution order or completion sequence.

### Guidelines:

- Assume all tools start execution at the same time
- No guarantee of completion order matching call order
- Design logic to handle results in any sequence
- Use this pattern only when order doesn't matter
- Avoid dependencies between parallel tool calls

### Implementation Pattern:

```bash
# ✅ CORRECT: Parallel execution in single message
- Tool Call 1 (independent)
- Tool Call 2 (independent)
- Tool Call 3 (independent)

# ❌ INCORRECT: Sequential execution across messages
Message 1: Tool Call 1
Message 2: Tool Call 2
Message 3: Tool Call 3
```

Parallel execution optimization requires careful consideration of tool dependencies and timing requirements.