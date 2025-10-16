# Sylphx Flow - Development Flow & Agent Coordination Platform

A comprehensive platform for managing development flow, guidelines, and AI agent coordination with persistent memory capabilities. This project provides both a CLI tool for syncing development flow to AI agents and an MCP (Model Context Protocol) server for persistent memory storage and coordination between AI agents.

## 🚀 What This Project Is

**Sylphx Flow** is a dual-purpose platform that combines:

1. **Development Flow Management** - A curated collection of type-safe development guidelines and best practices for modern web development
2. **Agent Coordination System** - An MCP server providing persistent memory storage for AI agents to coordinate and share state

The platform enables consistent, high-quality code generation across projects while providing the infrastructure for AI agents to work together through shared memory and coordination tools.

## ✨ Key Features & Capabilities

### Development Rules Management
- **Modular Rule System**: Self-contained rule files for different technologies and patterns
- **Multi-Agent Support**: Compatible with Cursor, Kilocode, and RooCode AI agents
- **Auto-Detection**: Automatically detects your development environment
- **Dry-Run Mode**: Preview changes before applying them
- **Technology Agnostic**: Framework-agnostic guidelines focused on timeless patterns

### Agent Coordination & Memory
- **Persistent Memory Storage**: JSON-based storage with automatic persistence
- **Namespace Support**: Organize memories by project, agent, or purpose
- **Full CRUD Operations**: Set, get, search, list, delete, and clear memories
- **Pattern Matching**: Search memories using wildcard patterns
- **Statistics & Monitoring**: Track memory usage and database statistics
- **MCP Protocol**: Standard Model Context Protocol for broad client compatibility

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 

### Install the CLI Tool

**GitHub Installation (Recommended)**

```bash
# Use directly from GitHub without installation
npx github:sylphxltd/flow

# Or use npx for specific commands
npx github:sylphxltd/flow init
# npx github:sylphxltd/flow sync  # [DEPRECATED] Use init instead
# npx github:sylphxltd/flow mcp start  # Optional: MCP tools auto-load in OpenCode
```

**Alternative: Clone and Build**

```bash
# Clone the repository
git clone https://github.com/sylphxltd/flow.git
cd flow

# Install dependencies and build
pnpm install
pnpm build

# Run locally
./dist/index.js sync
# or
node dist/index.js sync
```

### Quick Start

```bash
# Initialize project with Sylphx Flow (installs agents + MCP tools)
npx github:sylphxltd/flow init

# Sync flow to your AI agent (deprecated, use init instead)
npx github:sylphxltd/flow sync

# Manually start MCP server (optional - auto-loads in OpenCode)
npx github:sylphxltd/flow mcp start
```

## 🛠️ Available Commands

### `flow init` - Initialize Project

Initialize your project with Sylphx Flow development agents and MCP tools.

```bash
# Initialize with default opencode agent and MCP tools
npx github:sylphxltd/flow init

# Initialize with specific agent
npx github:sylphxltd/flow init --agent=opencode

# Preview what would be installed
npx github:sylphxltd/flow init --dry-run

# Initialize without MCP tools
npx github:sylphxltd/flow init --no-mcp
```

### `flow sync` - Sync Development Rules [DEPRECATED]

> ⚠️ **This command is deprecated** and will be removed in a future version.
> Use `npx github:sylphxltd/flow init` instead for new projects.

The sync command only works with legacy agents (cursor, kilocode, roocode) and is kept for backward compatibility.

```bash
# Legacy usage (not recommended for new projects)
npx github:sylphxltd/flow sync --agent=cursor     # For Cursor AI
npx github:sylphxltd/flow sync --agent=kilocode   # For Kilocode  
npx github:sylphxltd/flow sync --agent=roocode    # For RooCode

# Preview changes without applying
npx github:sylphxltd/flow sync --dry-run

# Force overwrite existing flow
npx github:sylphxltd/flow sync --force
```

### `flow mcp` - Manage MCP Tools

Manage MCP (Model Context Protocol) tools and servers.

```bash
# Start the Sylphx Flow MCP server
npx github:sylphxltd/flow mcp start

# Install specific MCP tools
npx github:sylphxltd/flow mcp install memory everything

# Install all available MCP tools
npx github:sylphxltd/flow mcp install --all

# List all available MCP tools
npx github:sylphxltd/flow mcp list

# Preview MCP tool installation
npx github:sylphxltd/flow mcp install --all --dry-run
```

**Supported Agents:**
- **Cursor**: `.cursor/flow/*.mdc` (YAML frontmatter)
- **Kilocode**: `.kilocode/flow/*.md` (plain Markdown)
- **RooCode**: `.roo/flow/*.md` (plain Markdown)

### `flow install` - Install Agent Definitions & MCP Servers

Install SDD (Structured Development & Delivery) agent definitions for advanced workflows and configure MCP (Model Context Protocol) servers.

```bash
# Install all agent definitions
npx github:sylphxltd/flow install

# Install with merge mode (single combined file)
npx github:sylphxltd/flow install --merge

# Preview installation
npx github:sylphxltd/flow install --dry-run

# Install MCP servers
npx github:sylphxltd/flow install --mcp memory      # Install Rules memory server
npx github:sylphxltd/flow install --mcp everything   # Install MCP Everything server
npx github:sylphxltd/flow install --mcp memory everything  # Install both servers

# List currently configured MCP servers
npx github:sylphxltd/flow install --mcp

# Install with dry run (preview MCP changes)
npx github:sylphxltd/flow install --mcp memory --dry-run
```

#### MCP Server Options

The `--mcp` option supports the following servers:

| Server | Description | Use Case |
|--------|-------------|----------|
| `memory` | Rules memory server for agent coordination | Persistent state sharing between AI agents |
| `everything` | MCP Everything server - comprehensive tool collection | Access to filesystem, web, git, and system tools |

#### OpenCode Configuration (`opencode.jsonc`)

When you install MCP servers, the tool automatically creates or updates an `opencode.jsonc` configuration file in your project root. This file defines which MCP servers are available to your AI agents.

**Example `opencode.jsonc`:**
```jsonc
{
  // MCP (Model Context Protocol) server configuration
  
  // See https://modelcontextprotocol.io for more information
  
  "mcp": {
    "flow_memory": {
      "type": "local",
      "command": [
        "npx",
        "github:sylphxltd/flow",
        "mcp"
      ]
    },
    "mcp_everything": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@modelcontextprotocol/server-everything"
      ]
    }
  },
  "$schema": "https://opencode.ai/config.json"
}
```

**Configuration Structure:**
- `mcp`: Object containing MCP server definitions
- `server_name`: Unique identifier for each server
- `type`: Server type (currently only `"local"` is supported)
- `command`: Command array to start the server
- `$schema`: JSON schema for validation and IDE support

### `flow mcp` - Manage MCP Tools

Manage MCP (Model Context Protocol) tools and servers.

```bash
# Start the memory server
npx github:sylphxltd/flow mcp start

# Server will be available at stdio for MCP clients
# Database stored at: .sylphx-flow/memory.db
```

## 🧠 MCP Memory Server Functionality

The memory server provides persistent storage capabilities for AI agents through the Model Context Protocol. It enables agents to:

- **Share state** across sessions and restarts
- **Coordinate workflows** through shared memory
- **Maintain context** for long-running processes
- **Track progress** and intermediate results

### Available Memory Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `memory_set` | Store a value in memory | `key`, `value`, `namespace?` |
| `memory_get` | Retrieve a value from memory | `key`, `namespace?` |
| `memory_search` | Search memory keys by pattern | `pattern`, `namespace?` |
| `memory_list` | List all memory keys | `namespace?` |
| `memory_delete` | Delete a specific memory | `key`, `namespace?` |
| `memory_clear` | Clear memory namespace or all | `namespace?`, `confirm` |
| `memory_stats` | Get database statistics | none |

### Memory Storage Details

- **Location**: `.sylphx-flow/memory.db` in your working directory
- **Format**: JSON with automatic persistence
- **Namespaces**: Organize memories by project, agent, or purpose
- **Timestamps**: Track creation and update times
- **Pattern Matching**: Support for `*` wildcards in searches

## 🔌 MCP Client Integration

### Supported MCP Servers

The Rules platform supports the following MCP servers:

#### 1. Rules Memory Server (`memory`)
- **Purpose**: Persistent memory storage for AI agent coordination
- **Features**: 
  - JSON-based storage with automatic persistence
  - Namespace support for organization
  - Full CRUD operations (set, get, search, list, delete, clear)
  - Pattern matching with wildcards
  - Database statistics and monitoring
- **Installation**: `flow install --mcp memory`
- **Storage Location**: `.sylphx-flow/memory.db`

#### 2. MCP Everything Server (`everything`)
- **Purpose**: Comprehensive tool collection for general AI assistance
- **Features**:
  - Filesystem operations (read, write, list, search)
  - Web browsing and content fetching
  - Git operations (status, log, diff, commit)
  - System information and process management
  - Database operations
- **Installation**: `flow install --mcp everything`
- **Package**: `@modelcontextprotocol/server-everything`

### Claude Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "flow-memory": {
      "command": "npx",
      "args": ["github:sylphxltd/flow", "mcp"]
    },
    "mcp-everything": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"]
    }
  }
}
```

### OpenCode Integration

OpenCode automatically reads the `opencode.jsonc` configuration file. After installing MCP servers with `flow install --mcp`, the servers are immediately available to your OpenCode AI agents.

**Manual OpenCode Configuration:**
If you prefer to configure OpenCode manually, create/edit `opencode.jsonc`:

```jsonc
{
  "mcp": {
    "flow_memory": {
      "type": "local",
      "command": ["npx", "github:sylphxltd/flow", "mcp"]
    },
    "mcp_everything": {
      "type": "local", 
      "command": ["npx", "-y", "@modelcontextprotocol/server-everything"]
    }
  },
  "$schema": "https://opencode.ai/config.json"
}
```

### Custom MCP Client Integration

```javascript
// Example client integration
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["github:sylphxltd/flow", "mcp"]
});

const client = new Client(
  { name: "my-client", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

await client.connect(transport);

// Use memory tools
const result = await client.callTool({
  name: "memory_set",
  arguments: {
    key: "project/status",
    value: JSON.stringify({ status: "in-progress", phase: "implementation" }),
    namespace: "my-project"
  }
});
```

### Memory Usage Examples

```javascript
// Store project state
await client.callTool({
  name: "memory_set",
  arguments: {
    key: "swarm/coder/status",
    value: JSON.stringify({ 
      task: "implement-auth",
      progress: 0.7,
      last_updated: new Date().toISOString()
    }),
    namespace: "project-alpha"
  }
});

// Retrieve project state
const status = await client.callTool({
  name: "memory_get",
  arguments: {
    key: "swarm/coder/status",
    namespace: "project-alpha"
  }
});

// Search for all coder-related memories
const coderMemories = await client.callTool({
  name: "memory_search",
  arguments: {
    pattern: "coder/*",
    namespace: "project-alpha"
  }
});

// Get database statistics
const stats = await client.callTool({
  name: "memory_stats",
  arguments: {}
});
```

## 📁 Project Structure Overview

```
flow/
├── agents/                    # AI agent definitions
│   ├── sdd/                  # SDD workflow agents
│   │   ├── development-orchestrator.md
│   │   ├── constitution.md
│   │   ├── specify.md
│   │   ├── clarify.md
│   │   ├── plan.md
│   │   ├── task.md
│   │   ├── analyze.md
│   │   ├── implement.md
│   │   └── release.md
│   ├── core/                 # Core specialized agents
│   │   ├── coder.md
│   │   ├── planner.md
│   │   ├── researcher.md
│   │   ├── reviewer.md
│   │   └── tester.md
│   └── archived/             # Archived configurations
├── docs/                     # Documentation and flow
│   ├── flow/               # Development rule files
│   │   ├── flow.md
│   │   ├── saas-template.md
│   │   ├── tech-stack.md
│   │   └── ui-ux-guidelines.md
│   └── archived/            # Archived rule files
├── src/                     # Source code
│   ├── commands/           # CLI command implementations
│   ├── core/              # Core functionality
│   ├── servers/           # MCP server implementations
│   ├── opencode/          # OpenCode plugin integration
│   └── utils/             # Utility functions
├── dist/                  # Compiled JavaScript output
├── .sylphx-flow/         # Sylphx Flow data storage
├── opencode.jsonc        # OpenCode MCP configuration (auto-generated)
└── package.json          # Project configuration
```

## 💡 Examples & Use Cases

### Use Case 1: Development Team Coordination

```bash
# Start memory server for team coordination
npx github:sylphxltd/flow mcp start

# In one terminal, sync flow for the team
npx github:sylphxltd/flow sync --agent=cursor

# Team members can now share state through memory
# Agent A stores progress:
memory_set key "feature/auth/status" value '{"progress": 0.8, "blocker": null}' namespace "team-project"

# Agent B retrieves progress:
memory_get key "feature/auth/status" namespace "team-project"
```

### Use Case 2: CI/CD Pipeline Integration

```bash
# In CI pipeline, sync latest flow
npx github:sylphxltd/flow sync --agent=cursor --force

# Store pipeline state
npx github:sylphxltd/flow mcp &
# Then use memory tools to track pipeline stages
```

### Use Case 3: Multi-Agent Development Workflow

```javascript
// Development orchestrator coordinates multiple agents
await client.callTool({
  name: "memory_set",
  arguments: {
    key: "workflow/current-phase",
    value: "implementation",
    namespace: "sdd-workflow"
  }
});

// Individual agents check workflow state
const phase = await client.callTool({
  name: "memory_get",
  arguments: {
    key: "workflow/current-phase",
    namespace: "sdd-workflow"
  }
});
```

### Use Case 4: Project Template Management

```bash
# Create new project with flow
mkdir my-project && cd my-project
npx github:sylphxltd/flow sync --agent=cursor

# Store project configuration
npx github:sylphxltd/flow mcp &
# Then configure project-specific memory namespace
```

### Use Case 5: MCP Server Setup for New Projects

```bash
# Start a new project with full MCP support
mkdir my-new-project && cd my-new-project

# Install development flow
npx github:sylphxltd/flow sync --agent=cursor

# Install both MCP servers
npx github:sylphxltd/flow install --mcp memory everything

# Start the memory server
npx github:sylphxltd/flow mcp &

# Now your AI agents have:
# - Development flow and guidelines
# - Persistent memory for coordination
# - Comprehensive tool access (filesystem, web, git, etc.)
```

### Use Case 6: Multi-Server MCP Configuration

```bash
# Install only the memory server for lightweight coordination
npx github:sylphxltd/flow install --mcp memory

# Later, add the everything server for full tool access
npx github:sylphxltd/flow install --mcp everything

# List current MCP configuration
npx github:sylphxltd/flow install --mcp

# Remove a server (if needed)
# Edit opencode.jsonc manually to remove unwanted servers
```

### Use Case 7: Development Environment Setup

```bash
# Complete development environment setup
npx github:sylphxltd/flow sync --agent=cursor           # Install development flow
npx github:sylphxltd/flow install --mcp memory everything  # Install MCP servers
npx github:sylphxltd/flow install                        # Install agent definitions

# Start all services
npx github:sylphxltd/flow mcp &                          # Start memory server in background

# Your environment is now ready with:
# - Consistent development guidelines
# - Agent coordination through memory
# - Full tool access for AI assistants
# - Specialized agent workflows
```

## 🔧 Development & Contributing

### Build from Source

```bash
# Clone repository
git clone https://github.com/sylphxltd/flow.git
cd flow

# Install dependencies
pnpm install

# Build project
pnpm build

# Run in development
pnpm dev

# Test the build
node dist/index.js --help
```

### Project Scripts

- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm dev` - Run CLI in development mode
- `pnpm start` - Run compiled CLI
- `pnpm clean` - Clean build artifacts
- `pnpm prepare` - Build project (runs automatically on install)

### Testing GitHub Installation

```bash
# Test installation from GitHub (from any directory)
npx github:sylphxltd/flow --help

# Test specific commands
npx github:sylphxltd/flow sync --dry-run
npx github:sylphxltd/flow install --dry-run
```

### Adding New Rules

1. Create rule file in `docs/flow/`
2. Follow the established format and principles
3. Test with `npx github:sylphxltd/flow sync --dry-run`
4. Submit PR for review

### Adding New Agent Support

1. Update `src/commands/sync-command.ts`
2. Add agent configuration to the sync logic
3. Test with `npx github:sylphxltd/flow sync --agent=new-agent --dry-run`

### Adding New MCP Servers

1. Update `src/utils/mcp-config.ts` with server configuration
2. Add server type to `MCP_SERVERS` object
3. Update command builder options if needed
4. Test with `npx github:sylphxltd/flow install --mcp new-server --dry-run`

## 🔧 MCP Troubleshooting & Tips

### Common Issues

**MCP Server Not Starting:**
```bash
# Check if the server is properly configured
npx github:sylphxltd/flow install --mcp

# Verify the opencode.jsonc configuration
cat opencode.jsonc

# Test the memory server directly
npx github:sylphxltd/flow mcp start
```

**Memory Database Issues:**
```bash
# Check memory database location
ls -la .sylphx-flow/

# Clear corrupted memory database
rm .sylphx-flow/memory.db
# Restart the server to recreate
npx github:sylphxltd/flow mcp start
```

**OpenCode Configuration Problems:**
```bash
# Regenerate configuration
rm opencode.jsonc
npx github:sylphxltd/flow install --mcp memory everything
```

### Best Practices

1. **Use Namespaces**: Organize memories by project or agent to avoid conflicts
2. **Regular Cleanup**: Use `memory_clear` to remove old or test data
3. **Backup Memory**: Copy `.sylphx-flow/memory.db` for important project state
4. **Monitor Usage**: Use `memory_stats` to track database size and performance

### Performance Tips

- Keep memory values concise (avoid storing large binary data)
- Use specific key patterns for efficient searching
- Clear unused namespaces regularly
- Consider using separate namespaces for different project phases

### Security Considerations

- Memory data is stored in plain text JSON
- Don't store sensitive information (passwords, API keys) in memory
- Use appropriate file permissions for `.sylphx-flow/` directory
- Regular backup of important memory data

## 📚 Additional Resources

- [Development Rules Documentation](docs/README.md)
- [Agent Definitions](agents/README.md)
- [SDD Workflow Guide](agents/sdd/development-orchestrator.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [MCP Everything Server](https://github.com/modelcontextprotocol/servers)
- [OpenCode Configuration](https://opencode.ai/)

## 🤝 Community & Support

- **Issues**: [GitHub Issues](https://github.com/sylphxltd/flow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sylphxltd/flow/discussions)
- **Contributing**: See [Contributing Guidelines](CONTRIBUTING.md)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Rules** - Empowering developers with consistent guidelines and AI agents with persistent coordination capabilities.