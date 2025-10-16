# Memory System

Complete guide to Sylphx Flow's memory management system for AI agent coordination.

## 🧠 Overview

Sylphx Flow provides a **dual memory management system**:

1. **AI Agent Access** - Through MCP (Model Context Protocol)
2. **Human Access** - Through CLI commands

Both systems operate on the **same database**, ensuring perfect synchronization.

## 📊 Database Structure

### Location
```
.sylphx-flow/memory.db
```

### Format
```json
{
  "namespace:key": {
    "key": "key",
    "namespace": "namespace", 
    "value": "any JSON value",
    "timestamp": 1729094400000,
    "created_at": "2024-10-16T10:00:00.000Z",
    "updated_at": "2024-10-16T10:00:00.000Z"
  }
}
```

### Key Concepts

- **Namespace**: Organize memories by project, agent, or purpose
- **Key**: Unique identifier within namespace
- **Value**: Any JSON-serializable data
- **Timestamp**: Unix timestamp for sorting
- **Created/Updated**: ISO timestamps for tracking

## 🤖 AI Agent Access (MCP)

AI agents can use these MCP tools:

### memory_set
Store a value in memory
```javascript
await client.callTool({
  name: "memory_set",
  arguments: {
    key: "project/status",
    value: { status: "in-progress", phase: "implementation" },
    namespace: "my-project"  // optional, defaults to "default"
  }
});
```

### memory_get
Retrieve a value from memory
```javascript
await client.callTool({
  name: "memory_get",
  arguments: {
    key: "project/status",
    namespace: "my-project"  // optional
  }
});
```

### memory_search
Search memory keys by pattern
```javascript
await client.callTool({
  name: "memory_search",
  arguments: {
    pattern: "project/*",  // supports * wildcards
    namespace: "my-project"  // optional
  }
});
```

### memory_list
List all memory keys
```javascript
await client.callTool({
  name: "memory_list",
  arguments: {
    namespace: "my-project"  // optional
  }
});
```

### memory_delete
Delete a specific memory
```javascript
await client.callTool({
  name: "memory_delete",
  arguments: {
    key: "project/status",
    namespace: "my-project"  // optional
  }
});
```

### memory_clear
Clear memory namespace or all
```javascript
await client.callTool({
  name: "memory_clear",
  arguments: {
    namespace: "my-project",  // optional, clears all if omitted
    confirm: true  // must be true for destructive operations
  }
});
```

### memory_stats
Get database statistics
```javascript
await client.callTool({
  name: "memory_stats",
  arguments: {}
});
```

## 👤 Human Access (CLI)

Users can manage the same database via CLI:

### Statistics
```bash
npx github:sylphxltd/flow memory stats
```

Output:
```
📊 Memory Statistics
==================
Total Entries: 15
Namespaces: 3

Namespaces:
  • default: 5 entries
  • user: 8 entries
  • project: 2 entries

Oldest Entry: 16/10/2024, 17:00:00
Newest Entry: 16/10/2024, 17:03:20

📍 Database: .sylphx-flow/memory.db
```

### List Entries
```bash
# List all entries
npx github:sylphxltd/flow memory list

# List specific namespace
npx github:sylphxltd/flow memory list --namespace "user"

# Limit results
npx github:sylphxltd/flow memory list --limit 10
```

### Search Entries
```bash
# Search with pattern
npx github:sylphxltd/flow memory search --pattern "*theme*"

# Search within namespace
npx github:sylphxltd/flow memory search --pattern "config/*" --namespace "project"
```

### Delete Entries
```bash
# Delete specific entry
npx github:sylphxltd/flow memory delete --key "old-data" --namespace "user"

# Clear namespace (requires confirmation)
npx github:sylphxltd/flow memory clear --namespace "temp" --confirm

# Clear all data (requires confirmation)
npx github:sylphxltd/flow memory clear --confirm
```

## 🏷️ Namespace Strategy

### Common Namespaces

- **default** - General purpose data
- **user** - User preferences and settings
- **project-{name}** - Project-specific data
- **agent-{name}** - Agent-specific data
- **session-{id}** - Temporary session data
- **cache** - Cached computations

### Examples

```javascript
// Project coordination
await memory_set("project-alpha/status", { phase: "implementation" }, "project-alpha");
await memory_set("project-alpha/next-task", "implement-auth", "project-alpha");

// Agent coordination
await memory_set("agent-coder/current-task", "user-auth", "agent-coder");
await memory_set("agent-tester/test-results", testResults, "agent-tester");

// User preferences
await memory_set("user/theme", "dark", "user");
await memory_set("user/language", "typescript", "user");
```

## 🔄 Use Cases

### 1. Agent Coordination
```javascript
// Agent A: Start task
await memory_set("swarm/task/current", "implement-auth", "swarm");
await memory_set("swarm/task/assignee", "agent-coder", "swarm");

// Agent B: Check status
const task = await memory_get("swarm/task/current", "swarm");
const assignee = await memory_get("swarm/task/assignee", "swarm");

// Agent C: Update progress
await memory_set("swarm/task/progress", "0.7", "swarm");
```

### 2. Project State Management
```javascript
// Save project state
await memory_set("project/config", projectConfig, "my-project");
await memory_set("project/dependencies", dependencies, "my-project");
await memory_set("project/build-status", "success", "my-project");
```

### 3. Session Persistence
```javascript
// Save session context
await memory_set("session/context", conversationContext, "session-123");
await memory_set("session/user-preferences", preferences, "session-123");
```

## 🔍 Search Patterns

The search system supports wildcard patterns:

- **`*`** - Matches any characters
- **`theme`** - Exact match
- **`*theme`** - Ends with "theme"
- **`theme*`** - Starts with "theme"
- **`*theme*`** - Contains "theme"
- **`config/*`** - Starts with "config/"
- **`*/status`** - Ends with "/status"

### Examples
```bash
# Find all theme-related entries
npx github:sylphxltd/flow memory search --pattern "*theme*"

# Find all project configurations
npx github:sylphxltd/flow memory search --pattern "*/config"

# Find all status entries
npx github:sylphxltd/flow memory search --pattern "*/status"
```

## 🛡️ Best Practices

### 1. Namespace Organization
- Use descriptive namespaces
- Separate concerns by namespace
- Use consistent naming conventions

### 2. Key Naming
- Use hierarchical keys: `category/subcategory/item`
- Be consistent with separators
- Avoid spaces and special characters

### 3. Data Structure
- Store JSON-serializable data only
- Keep values reasonably sized
- Use timestamps for temporal data

### 4. Memory Management
- Regular cleanup of temporary data
- Monitor database size
- Use appropriate TTL patterns

## 🔧 Maintenance

### Backup Database
```bash
# Copy memory database
cp .sylphx-flow/memory.db .sylphx-flow/memory.db.backup

# Or export to JSON
npx github:sylphxltd/flow memory list --format json > memory-backup.json
```

### Monitor Usage
```bash
# Check database statistics
npx github:sylphxltd/flow memory stats

# Monitor database size
ls -lh .sylphx-flow/memory.db
```

### Cleanup
```bash
# Clear temporary data
npx github:sylphxltd/flow memory clear --namespace "temp" --confirm

# Clear old session data
npx github:sylphxltd/flow memory search --pattern "session-*"
# Then delete specific entries as needed
```

## 🐛 Troubleshooting

### Database Corruption
```bash
# Check database integrity
npx github:sylphxltd/flow memory stats

# If corrupted, restore from backup
cp .sylphx-flow/memory.db.backup .sylphx-flow/memory.db
```

### Permission Issues
```bash
# Check permissions
ls -la .sylphx-flow/

# Fix permissions
chmod 755 .sylphx-flow/
chmod 644 .sylphx-flow/memory.db
```

### Performance Issues
- Large values can slow down operations
- Consider splitting large data into multiple entries
- Regular cleanup helps maintain performance

---

**Related**: [CLI Commands](CLI-Commands), [MCP Tools](MCP-Tools)