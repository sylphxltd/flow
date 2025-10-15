# Memory Tools Plugin

This plugin provides shared memory coordination tools for OpenCode agents, enabling inter-agent communication and state management.

## Available Tools

### memory_set
Store a value in shared memory for agent coordination.

**Args:**
- `key` (string): Memory key (e.g., 'swarm/coder/status')
- `value` (string): Value to store (will be JSON stringified)
- `namespace` (string, optional): Optional namespace for organization

**Example:**
```javascript
memory_set({
  key: "swarm/coder/status",
  value: JSON.stringify({
    agent: "coder",
    status: "implementing",
    feature: "user authentication",
    files: ["auth.service.ts", "auth.controller.ts"],
    timestamp: Date.now()
  }),
  namespace: "coordination"
})
```

### memory_get
Retrieve a value from shared memory.

**Args:**
- `key` (string): Memory key to retrieve
- `namespace` (string, optional): Optional namespace

**Returns:** JSON string with memory data including key, value, timestamp, namespace, and age.

### memory_search
Search memory keys by pattern.

**Args:**
- `pattern` (string): Search pattern (supports wildcards)
- `namespace` (string, optional): Optional namespace to limit search

**Example:**
```javascript
// Search all coder-related memories
memory_search({
  pattern: "swarm/coder/*",
  namespace: "coordination"
})

// Search all swarm memories
memory_search({
  pattern: "swarm/*"
})
```

### memory_list
List all memory keys, optionally filtered by namespace.

**Args:**
- `namespace` (string, optional): Optional namespace to filter

**Returns:** JSON string with all keys and their metadata.

### memory_delete
Delete a specific memory entry.

**Args:**
- `key` (string): Memory key to delete
- `namespace` (string, optional): Optional namespace

### memory_clear
Clear all memory or specific namespace.

**Args:**
- `namespace` (string, optional): Optional namespace to clear
- `confirm` (boolean): Confirmation required for clearing all memory

## Usage Patterns

### Agent Coordination
```javascript
// Coder agent reports status
memory_set({
  key: "swarm/coder/status",
  value: JSON.stringify({
    agent: "coder",
    status: "implementing",
    current_task: "user authentication",
    progress: 0.6
  }),
  namespace: "coordination"
})

// Planner agent checks status
const status = memory_get({
  key: "swarm/coder/status",
  namespace: "coordination"
})
```

### Task Handoffs
```javascript
// Researcher shares findings
memory_set({
  key: "swarm/shared/research-findings",
  value: JSON.stringify({
    patterns_found: ["MVC", "Repository", "Factory"],
    dependencies: ["express", "passport", "jwt"],
    recommendations: ["upgrade passport", "add rate limiter"]
  }),
  namespace: "coordination"
})

// Coder retrieves findings
const findings = memory_get({
  key: "swarm/shared/research-findings",
  namespace: "coordination"
})
```

### Progress Tracking
```javascript
// Update task progress
memory_set({
  key: "swarm/tasks/T123/status",
  value: JSON.stringify({
    task_id: "T123",
    status: "in_progress",
    agent: "coder",
    started_at: Date.now(),
    estimated_completion: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
  }),
  namespace: "tasks"
})

// Get all task statuses
const allTasks = memory_list({
  namespace: "tasks"
})
```

## Best Practices

1. **Use Namespaces**: Organize memories by namespace (e.g., 'coordination', 'tasks', 'shared')
2. **Structured Keys**: Use consistent key patterns like 'swarm/{agent}/{type}'
3. **JSON Values**: Always store structured data as JSON strings
4. **Timestamps**: Include timestamps in stored values for tracking
5. **Cleanup**: Use `memory_clear` to clean up old or test memories

## Namespaces

- `coordination`: For inter-agent communication and status updates
- `shared`: For shared data and findings between agents
- `tasks`: For task status and progress tracking
- `research`: For research findings and analysis results
- `implementation`: For code implementation details and decisions

## Memory Lifecycle

Memory is stored in-memory and persists for the duration of the OpenCode session. When OpenCode restarts, all memory is cleared.

## Error Handling

All tools return string responses:
- Success messages start with `✅`
- Error messages start with `❌`
- Search and list operations return JSON strings with structured data