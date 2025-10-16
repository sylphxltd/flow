# CLI Commands

Complete reference for all Sylphx Flow CLI commands.

## 🛠️ Command Structure

```bash
npx github:sylphxltd/flow <command> [subcommand] [options]
```

## 📋 Core Commands

### `flow init` - Initialize Project

Initialize your project with Sylphx Flow development agents and MCP tools.

#### Syntax
```bash
npx github:sylphxltd/flow init [options]
```

#### Options
- `--agent <type>` - Force specific agent (opencode, cursor, kilocode, roocode)
- `--verbose` - Show detailed output
- `--dry-run` - Show what would be done without making changes
- `--clear` - Clear obsolete items before processing
- `--no-mcp` - Skip MCP tools installation

#### Examples
```bash
# Default initialization
npx github:sylphxltd/flow init

# Preview changes
npx github:sylphxltd/flow init --dry-run

# Initialize without MCP tools
npx github:sylphxltd/flow init --no-mcp

# Verbose output
npx github:sylphxltd/flow init --verbose

# Clear existing setup first
npx github:sylphxltd/flow init --clear
```

### `flow memory` - Manage Memory Database

Manage the Sylphx Flow memory database directly from the command line.

#### Syntax
```bash
npx github:sylphxltd/flow memory [subcommand] [options]
```

#### Subcommands

##### `memory stats` - Show Database Statistics
```bash
npx github:sylphxltd/flow memory stats
```

**Output:**
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

##### `memory list` - List Memory Entries
```bash
npx github:sylphxltd/flow memory list [options]
```

**Options:**
- `--namespace <name>` - Filter by namespace
- `--limit <number>` - Limit number of entries (default: 50)

**Examples:**
```bash
# List all entries
npx github:sylphxltd/flow memory list

# List specific namespace
npx github:sylphxltd/flow memory list --namespace "user"

# Limit results
npx github:sylphxltd/flow memory list --limit 10
```

##### `memory search` - Search Memory Entries
```bash
npx github:sylphxltd/flow memory search --pattern <pattern> [options]
```

**Options:**
- `--pattern <pattern>` - Search pattern (supports * wildcards) [REQUIRED]
- `--namespace <name>` - Filter by namespace

**Examples:**
```bash
# Search for theme-related entries
npx github:sylphxltd/flow memory search --pattern "*theme*"

# Search within namespace
npx github:sylphxltd/flow memory search --pattern "config/*" --namespace "project"

# Exact match
npx github:sylphxltd/flow memory search --pattern "user-settings"
```

##### `memory delete` - Delete Memory Entry
```bash
npx github:sylphxltd/flow memory delete --key <key> [options]
```

**Options:**
- `--key <key>` - Memory key to delete [REQUIRED]
- `--namespace <name>` - Namespace (default: default)

**Examples:**
```bash
# Delete from default namespace
npx github:sylphxltd/flow memory delete --key "old-data"

# Delete from specific namespace
npx github:sylphxltd/flow memory delete --key "temp-file" --namespace "cache"
```

##### `memory clear` - Clear Memory Entries
```bash
npx github:sylphxltd/flow memory clear [options]
```

**Options:**
- `--namespace <name>` - Clear specific namespace (optional)
- `--confirm` - Confirm the clear operation [REQUIRED]

**Examples:**
```bash
# Clear specific namespace
npx github:sylphxltd/flow memory clear --namespace "temp" --confirm

# Clear all data
npx github:sylphxltd/flow memory clear --confirm
```

##### `memory tui` - Launch Interactive TUI
```bash
npx github:sylphxltd/flow memory tui
# or use the alias
npx github:sylphxltd/flow mtui
```

Launch a powerful interactive terminal UI for memory management.

**Features:**
- 📋 **List View** - Browse all memory entries with namespace filtering
- 🔍 **Search** - Wildcard search patterns (`*theme*`, `config/*`)
- ✏️ **Edit Mode** - Create or modify memory entries
- 🗑️ **Delete** - Remove entries with confirmation
- 📊 **Statistics** - View memory usage and namespace breakdown
- ⌨️ **Keyboard Shortcuts** - Quick navigation

**Keyboard Shortcuts:**
- `q` - Quit TUI
- `s` - Search mode
- `n` - New entry
- `d` - Delete selected entry
- `t` - Statistics view
- `r` - Refresh list
- `ESC` - Go back / Cancel
- `ENTER` - Confirm / Select

**Example Workflow:**
```bash
# Launch TUI
npx github:sylphxltd/flow mtui

# Inside TUI:
# 1. Press 's' to search for "*config*"
# 2. Select an entry to view details
# 3. Press 'e' to edit the entry
# 4. Press 'd' to delete (with 'y' confirmation)
# 5. Press 't' to view statistics
# 6. Press 'q' to quit
```

### `flow mcp` - Manage MCP Tools

Manage MCP (Model Context Protocol) tools and servers.

#### Syntax
```bash
npx github:sylphxltd/flow mcp [subcommand] [options]
```

#### Subcommands

##### `mcp start` - Start MCP Server
```bash
npx github:sylphxltd/flow mcp start
```

Starts the Sylphx Flow MCP server for AI agent integration.

##### `mcp install` - Install MCP Tools
```bash
npx github:sylphxltd/flow mcp install [servers...] [options]
```

**Arguments:**
- `servers...` - MCP tools to install (memory, gpt-image, perplexity, context7, gemini-search)

**Options:**
- `--all` - Install all available MCP tools
- `--dry-run` - Show what would be done without making changes

**Examples:**
```bash
# Install specific tools
npx github:sylphxltd/flow mcp install memory

# Install all tools
npx github:sylphxltd/flow mcp install --all

# Preview installation
npx github:sylphxltd/flow mcp install --all --dry-run
```

##### `mcp list` - List Available MCP Tools
```bash
npx github:sylphxltd/flow mcp list
```

**Output:**
```
🔧 Available MCP Tools:
====================
memory           - Agent coordination & memory

gpt-image-1-mcp  - GPT image generation
perplexity-ask   - Perplexity search
gemini-google-search - Google search via Gemini
context7         - Context management
```

##### `mcp config` - Configure API Keys
```bash
npx github:sylphxltd/flow mcp config <server>
```

**Arguments:**
- `server` - MCP server to configure (gpt-image, perplexity, gemini-search)

**Examples:**
```bash
# Configure GPT Image tool
npx github:sylphxltd/flow mcp config gpt-image

# Configure Perplexity tool
npx github:sylphxltd/flow mcp config perplexity

# Configure Gemini Search tool
npx github:sylphxltd/flow mcp config gemini-search
```

### `flow sync` - Legacy Sync [DEPRECATED]

> ⚠️ **DEPRECATED**: Use `flow init` instead. Kept for backward compatibility.

#### Syntax
```bash
npx github:sylphxltd/flow sync [options]
```

#### Options
- `--agent <type>` - Force specific agent (cursor, kilocode, roocode)
- `--verbose` - Show detailed output
- `--dry-run` - Show what would be done without making changes
- `--clear` - Clear obsolete items before processing

#### Examples
```bash
# Legacy usage (not recommended)
npx github:sylphxltd/flow sync --agent=cursor
npx github:sylphxltd/flow sync --dry-run
```

## 🔧 Global Options

These options can be used with any command:

- `--help, -h` - Show help for command
- `--version, -v` - Show version number

## 📝 Output Formats

### Success Messages
```
✅ Operation completed successfully
✅ Memory entry deleted: default:test-key
✅ MCP tools installed
```

### Error Messages
```
❌ Error: Invalid option
❌ Memory entry not found: default:missing-key
❌ Please use --confirm to clear memory entries
```

### Warning Messages
```
⚠️ WARNING: The "sync" command is deprecated
⚠️ Database file not found, creating new one
```

### Info Messages
```
ℹ️ Database: .sylphx-flow/memory.db
ℹ️ Found 15 entries
ℹ️ No changes required
```

## 🎯 Common Workflows

### 1. Complete Setup
```bash
# Initialize project
npx github:sylphxltd/flow init

# Check memory system
npx github:sylphxltd/flow memory stats

# Start MCP server
npx github:sylphxltd/flow mcp start
```

### 2. Memory Management
```bash
# Check what's stored
npx github:sylphxltd/flow memory list

# Search for specific data
npx github:sylphxltd/flow memory search --pattern "*config*"

# Clean up old data
npx github:sylphxltd/flow memory clear --namespace "temp" --confirm
```

### 3. MCP Tool Management
```bash
# Install all MCP tools
npx github:sylphxltd/flow mcp install --all

# Configure API keys
npx github:sylphxltd/flow mcp config gpt-image

# List available tools
npx github:sylphxltd/flow mcp list
```

### 4. Troubleshooting
```bash
# Check system status
npx github:sylphxltd/flow memory stats

# Test with dry run
npx github:sylphxltd/flow init --dry-run

# Verbose output for debugging
npx github:sylphxltd/flow init --verbose
```

## 🐛 Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_OPTION` | Unknown command option | Check `--help` for valid options |
| `FILE_NOT_FOUND` | Database or config file missing | Run `flow init` to create |
| `PERMISSION_DENIED` | Insufficient file permissions | Check directory permissions |
| `INVALID_JSON` | Corrupted JSON file | Restore from backup or reinitialize |
| `NETWORK_ERROR` | Failed to download tools | Check internet connection |
| `API_KEY_MISSING` | Required API key not configured | Use `flow mcp config <server>` |

---

**Related**: [Memory System](Memory-System), [Installation & Setup](Installation-&-Setup)