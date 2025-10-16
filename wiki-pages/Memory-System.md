# Memory System - AI Agent Coordination & Persistence

The **Memory System** is the heart of Sylphx Flow - enabling AI agents to remember, coordinate, and collaborate across sessions and projects.

## 🧠 What is the Memory System?

The Memory System provides **persistent memory** for AI agents through a shared database that works across multiple AI tools and development sessions.

### Key Concepts

| Concept | Description | Example |
|---------|-------------|---------|
| **Persistence** | AI agents remember between conversations | "Remember we use TypeScript for this project" |
| **Coordination** | Multiple agents share the same memory | Cursor and RooCode both know project context |
| **Namespaces** | Organized memory storage | `user:preferences`, `project:architecture` |
| **Cross-Session** | Memory survives restarts | Context preserved across days/weeks |

## 🏗️ Architecture

### Dual Management System

```
┌─────────────────┐    ┌─────────────────┐
│   AI Agents     │    │    Humans       │
│  (MCP Protocol) │    │   (CLI Commands)│
├─────────────────┤    ├─────────────────┤
│ • memory_set    │    │ • flow memory   │
│ • memory_get    │    │ • flow memory   │
│ • memory_search │    │ • flow memory   │
│ • memory_delete │    │ • flow memory   │
└─────────────────┘    └─────────────────┘
           │                       │
           └───────────┬───────────┘
                       ▼
              ┌─────────────────┐
              │   Shared DB     │
              │ .sylphx-flow/   │
              │   memory.db     │
              └─────────────────┘
```

### Database Structure

```json
{
  "namespaces": {
    "default": {
      "project-name": "Sylphx Flow",
      "last-context": "Working on wiki deployment..."
    },
    "user": {
      "preferences": "TypeScript, React, Tailwind",
      "coding-style": "functional components"
    },
    "project": {
      "architecture": "microservices with API gateway",
      "database": "PostgreSQL with Redis cache"
    }
  }
}
```

## 🚀 Real-World Scenarios

### Scenario 1: Development Team with Multiple AI Tools

**Problem**: Your team uses Cursor for frontend, Kilocode for backend, but they don't share context.

**Solution**: Sylphx Flow Memory System

```bash
# Initialize shared memory
npx github:sylphxltd/flow init

# Cursor sets project context
# (AI automatically saves to memory)

# Kilocode accesses the same context
# (AI automatically reads from memory)
```

**Result**: Both AI tools know the same project architecture, coding standards, and recent decisions.

### Scenario 2: Long-Term Project Memory

**Problem**: AI assistant forgets project decisions made weeks ago.

**Solution**: Persistent memory storage

```bash
# Check what AI remembers from last week
npx github:sylphxltd/flow memory list

# Search for specific decisions
npx github:sylphxltd/flow memory search --pattern "*architecture*"

# AI automatically builds on previous context
```

**Result**: AI maintains consistent understanding throughout the project lifecycle.

### Scenario 3: Multi-Agent Collaboration

**Problem**: Complex tasks require multiple AI agents to coordinate.

**Solution**: Shared memory namespace

```bash
# Agent 1: Analyze requirements
# Saves: project:requirements = "User authentication system..."

# Agent 2: Design architecture  
# Reads: project:requirements
# Saves: project:architecture = "JWT with refresh tokens..."

# Agent 3: Implement code
# Reads: project:requirements + project:architecture
# Generates consistent implementation
```

## 🛠️ Memory Operations

### For AI Agents (MCP Tools)

AI agents automatically use these tools during conversations:

```javascript
// AI agents use these internally
memory_set("project:framework", "React + TypeScript")
memory_get("project:framework")  // Returns: "React + TypeScript"
memory_search("*framework*")     // Finds related entries
memory_list()                    // Shows all memory
```

### For Humans (CLI Commands)

Full control over AI memory:

```bash
# View memory statistics
npx github:sylphxltd/flow memory stats

# List all memory entries
npx github:sylphxltd/flow memory list

# Search specific topics
npx github:sylphxltd/flow memory search --pattern "*database*"

# Manage memory by namespace
npx github:sylphxltd/flow memory list --namespace "project"

# Clean up old memory
npx github:sylphxltd/flow memory delete --key "old-data" --confirm
```

## 📊 Memory Management

### Namespaces Explained

| Namespace | Purpose | Example Content |
|-----------|---------|-----------------|
| `default` | General project info | Project name, current task |
| `user` | User preferences | Coding style, tool preferences |
| `project` | Project-specific | Architecture, decisions, configs |
| `session` | Temporary data | Current conversation context |
| `cache` | Cached results | Computed values, API responses |

### Best Practices

#### ✅ Do's
```bash
# Use descriptive keys
memory_set("project:database-type", "PostgreSQL")

# Organize with namespaces
memory_set("user:preferred-framework", "React")

# Search effectively
memory_search --pattern "*config*"
```

#### ❌ Don'ts
```bash
# Avoid generic keys
memory_set("data", "some value")  # Bad

# Don't mix namespaces
memory_set("user-data", "project info")  # Confusing
```

## 🔧 Advanced Features

### Memory Statistics

```bash
npx github:sylphxltd/flow memory stats
```

**Output:**
```
📊 Memory Statistics
==================
Total Entries: 47
Namespaces: 4

Namespaces:
  • default: 15 entries
  • user: 12 entries  
  • project: 18 entries
  • session: 2 entries

Oldest Entry: 2025-10-01 14:30:00
Newest Entry: 2025-10-16 17:45:22

📍 Database: .sylphx-flow/memory.db
📏 Size: 2.4 MB
```

### Memory Search Patterns

```bash
# Wildcard searches
memory_search --pattern "*theme*"     # Contains "theme"
memory_search --pattern "config/*"    # Starts with "config/"
memory_search --pattern "/*-settings" # Ends with "-settings"

# Namespace filtering
memory_search --pattern "*" --namespace "project"

# Case-insensitive search
memory_search --pattern "*DATABASE*"  # Finds "database", "DATABASE", etc.
```

### Memory Cleanup

```bash
# Clear specific namespace
npx github:sylphxltd/flow memory clear --namespace "session" --confirm

# Clear old entries (by date range)
npx github:sylphxltd/flow memory delete --key "old-temp-*" --confirm

# Full reset (emergency only)
npx github:sylphxltd/flow memory clear --confirm
```

## 🔒 Privacy & Security

### Data Storage
- **Location**: `.sylphx-flow/memory.db` in your project
- **Format**: JSON (human-readable)
- **Encryption**: None (local storage only)
- **Backup**: Copy the `.sylphx-flow/` directory

### Privacy Controls
```bash
# Review what AI remembers
npx github:sylphxltd/flow memory list

# Delete sensitive information
npx github:sylphxltd/flow memory delete --key "api-keys" --confirm

# Export memory for backup
cp .sylphx-flow/memory.db backup/memory-$(date +%Y%m%d).db
```

### Security Best Practices
- **Never commit** `.sylphx-flow/` to version control
- **Regular cleanup** of sensitive data
- **Backup important** memory before major changes
- **Review memory** periodically for outdated information

## 🚀 Performance Optimization

### Memory Efficiency
```bash
# Check memory usage
npx github:sylphxltd/flow memory stats

# Clean up old data
npx github:sylphxltd/flow memory clear --namespace "cache" --confirm

# Optimize database
sqlite3 .sylphx-flow/memory.db "VACUUM;"
```

### Large Project Management
```bash
# Use project-specific namespaces
memory_set("mega-project:auth-system", "OAuth 2.0 with JWT")

# Separate by feature
memory_set("feature:payment-gateway", "Stripe integration")

# Time-based organization
memory_set("2025-10-16:decision", "Switched to PostgreSQL")
```

## 🐛 Troubleshooting

### Common Issues

**Memory not persisting?**
```bash
# Check database exists
ls -la .sylphx-flow/memory.db

# Check permissions
ls -ld .sylphx-flow/

# Recreate if corrupted
rm .sylphx-flow/memory.db
npx github:sylphxltd/flow init
```

**AI not remembering?**
```bash
# Check MCP server is running
npx github:sylphxltd/flow mcp start

# Verify memory tools are loaded
npx github:sylphxltd/flow mcp list

# Test memory operations
npx github:sylphxltd/flow memory set --key "test" --value "working"
npx github:sylphxltd/flow memory get --key "test"
```

**Performance issues?**
```bash
# Check database size
du -sh .sylphx-flow/memory.db

# Clean up old entries
npx github:sylphxltd/flow memory clear --namespace "cache" --confirm

# Optimize database
sqlite3 .sylphx-flow/memory.db "VACUUM;"
```

## 🎯 Pro Tips

### 1. Memory Organization
```bash
# Use consistent naming
project:component-name
user:preference-name
session:temporary-data
```

### 2. Context Preservation
```bash
# Save important decisions
memory_set("project:2025-10-16-decision", "Chose React over Vue for performance")

# Save reasoning
memory_set("project:architecture-reasoning", "Microservices for team scalability")
```

### 3. Team Collaboration
```bash
# Share memory with team
cp .sylphx-flow/memory.db ../team-shared/memory.db

# Merge team memories
# (Manual process - compare and combine key entries)
```

## 📚 Next Steps

- **[CLI Commands](CLI-Commands)** - Master memory management commands
- **[Installation & Setup](Installation-&-Setup)** - Configure memory system
- **[Agent Integration](Installation-&-Setup#agent-configuration)** - Set up AI tools

---

**💡 Key Insight**: The Memory System transforms AI assistants from stateless tools into persistent collaborators that learn and grow with your project.

*Last Updated: 2025-10-16 | [Database Schema](https://github.com/sylphxltd/flow/blob/main/src/utils/memory-storage.ts) | [Report Issues](https://github.com/sylphxltd/flow/issues)*