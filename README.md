# Sylphx Flow - Development Flow & Agent Coordination Platform

A comprehensive platform for managing development flow guidelines and AI agent coordination with persistent memory capabilities.

## 🚀 What It Does

**Sylphx Flow** combines two essential tools:

1. **Development Flow Management** - Curated, type-safe development guidelines
2. **Agent Coordination System** - MCP server for AI agent memory sharing

Enable consistent code generation while providing AI agents the infrastructure to coordinate through shared memory.

## ✨ Key Features

- 🧠 **Persistent Memory** - AI agents can remember and coordinate across sessions
- 📋 **Development Guidelines** - Type-safe rules for modern web development
- 🔧 **Multi-Agent Support** - Compatible with Cursor, Kilocode, RooCode, and OpenCode
- 🔄 **MCP Protocol** - Standard Model Context Protocol for broad compatibility
- 🛠️ **CLI Management** - Full command-line interface for both flows and memory

## 📦 Quick Start

```bash
# Initialize project with agents + MCP tools
npx github:sylphxltd/flow init

# Manage memory database
npx github:sylphxltd/flow memory stats
npx github:sylphxltd/flow memory list

# Start MCP server (optional - auto-loads in OpenCode)
npx github:sylphxltd/flow mcp start
```

## 🛠️ Core Commands

### `flow init` - Initialize Project
```bash
npx github:sylphxltd/flow init              # Default setup
npx github:sylphxltd/flow init --dry-run     # Preview changes
npx github:sylphxltd/flow init --no-mcp      # Skip MCP tools
```

### `flow memory` - Manage Memory Database
```bash
npx github:sylphxltd/flow memory stats                    # Database overview
npx github:sylphxltd/flow memory list                     # List all entries
npx github:sylphxltd/flow memory search --pattern "*theme*"  # Search entries
npx github:sylphxltd/flow memory delete --key "old-data" --confirm  # Delete entry
npx github:sylphxltd/flow memory clear --confirm          # Clear all data
```

### `flow mcp` - Manage MCP Tools
```bash
npx github:sylphxltd/flow mcp start           # Start memory server
npx github:sylphxltd/flow mcp install --all    # Install all MCP tools
npx github:sylphxltd/flow mcp config gpt-image # Configure API keys
```

### `flow sysinfo` - Display System Information
```bash
npx github:sylphxltd/flow sysinfo              # Quick system info (default hook preset)
npx github:sylphxltd/flow sysinfo --preset hook     # Minimal info for LLM hooks
npx github:sylphxltd/flow sysinfo --preset development # Development tools & system info
npx github:sylphxltd/flow sysinfo --preset full     # Complete system details
npx github:sylphxltd/flow sysinfo --json      # Output system info as JSON
```

*Presets:*
- *`hook`* - Time, environment tools, platform, memory usage (for LLM hooks)
- *`development`* - Development tools, system specs, and hardware info
- *`full`* - Complete system information including processes and directories

### `flow sync` - Legacy Sync [DEPRECATED]
> ⚠️ Use `flow init` instead. Kept for backward compatibility.

## 🧠 Memory System

Sylphx Flow provides **dual memory management**:

### For AI Agents (MCP Protocol)
AI agents can use these MCP tools:
- `memory_set`, `memory_get`, `memory_search`, `memory_list`
- `memory_delete`, `memory_clear`, `memory_stats`

### For Humans (CLI Commands)
Users can manage the same database via CLI:
- View, search, edit, and clean AI agent memories
- Monitor usage and debug issues
- Ensure data privacy and control

**Database**: `.sylphx-flow/memory.db` (JSON format)

## 🔌 Supported MCP Tools

| Tool | Purpose | API Key Required |
|------|---------|------------------|
| `memory` | Agent coordination & memory | ❌ |

| `gpt-image-1-mcp` | GPT image generation | ✅ |
| `perplexity-ask` | Perplexity search | ✅ |
| `gemini-google-search` | Google search via Gemini | ✅ |
| `context7` | Context management | ❌ |

## 🏗️ Project Structure

```
flow/
├── agents/                    # AI agent definitions
│   ├── sdd/                  # SDD workflow agents
│   └── core/                 # Core specialized agents
├── docs/rules/               # Development guidelines
├── src/                      # CLI source code
├── .sylphx-flow/            # Memory database
└── opencode.jsonc           # MCP configuration
```

## 📚 Documentation

> **📝 Note**: The wiki is being automatically deployed but needs manual initialization. Visit [github.com/sylphxltd/flow/wiki](https://github.com/sylphxltd/flow/wiki) and create the first page to activate it.

- **📖 [Wiki](https://github.com/sylphxltd/flow/wiki)** - Detailed documentation
- **🔧 [Configuration Guide](https://github.com/sylphxltd/flow/wiki/Installation-&-Setup)** - Setup instructions
- **🤖 [Agent Integration](https://github.com/sylphxltd/flow/wiki/CLI-Commands)** - Agent-specific setup
- **🧠 [Memory System](https://github.com/sylphxltd/flow/wiki/Memory-System)** - Memory management details

## 🤝 Contributing

Contributions welcome! Please see our [Contributing Guide](https://github.com/sylphxltd/flow/wiki/Contributing).

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Sylphx Flow** - Consistent development, intelligent coordination.