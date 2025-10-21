# Installation & Setup

Complete guide to install and configure Sylphx Flow.

## 📋 Prerequisites

- **Node.js 18+** - Required for CLI tool
- **Git** - For cloning and version control
- **AI Agent** - One of the supported agents (optional)

## 🚀 Installation Methods

### Method 1: GitHub Installation (Recommended)

No installation required - use directly via npx:

```bash
# Use any command directly
npx github:sylphxltd/flow init
npx github:sylphxltd/flow memory stats
npx github:sylphxltd/flow mcp start
```

### Method 2: Clone and Build

For development or offline use:

```bash
# Clone the repository
git clone https://github.com/sylphxltd/flow.git
cd flow

# Install dependencies
bun install

# Build the project
bun run build

# Run locally
node dist/index.js --help
```

### Method 3: Global Installation

```bash
# Install globally (when published)
npm install -g @sylphxltd/flow

# Use anywhere
flow init
flow memory stats
```

## ⚡ Quick Setup

### 1. Initialize Project

```bash
# Initialize with default settings
npx github:sylphxltd/flow init

# Preview what will be installed
npx github:sylphxltd/flow init --dry-run

# Initialize without MCP tools
npx github:sylphxltd/flow init --no-mcp
```

### 2. Verify Installation

```bash
# Check CLI is working
npx github:sylphxltd/flow --help

# Check memory system
npx github:sylphxltd/flow memory stats

# Check MCP tools
npx github:sylphxltd/flow mcp list
```

## 🔧 Configuration

### Automatic Configuration

The `init` command automatically creates:

- `.sylphx-flow/memory.db` - Memory database
- `opencode.jsonc` - MCP configuration (if MCP tools installed)
- Agent-specific directories (`.cursor/`, `.kilocode/`, etc.)

### Manual Configuration

#### MCP Configuration (`opencode.jsonc`)

```jsonc
{
  "mcp": {
    "sylphx_flow": {
      "type": "local",
      "command": ["npx", "github:sylphxltd/flow", "mcp", "start"]
    }
  },
  "$schema": "https://opencode.ai/config.json"
}
```

#### Memory Database Location

Default: `.sylphx-flow/memory.db`

You can specify custom location via environment variable:

```bash
export SYLPHX_MEMORY_DB="/custom/path/memory.db"
```

## 🤖 AI Agent Setup

### OpenCode (Recommended)

1. Install Sylphx Flow: `npx github:sylphxltd/flow init`
2. OpenCode automatically detects `opencode.jsonc`
3. MCP tools are available immediately

### Cursor

```bash
npx github:sylphxltd/flow init --agent=cursor
```

Creates `.cursor/rules/` with development guidelines.

### Kilocode

```bash
npx github:sylphxltd/flow init --agent=kilocode
```

Creates `.kilocode/flow/` with markdown guidelines.

### RooCode

```bash
npx github:sylphxltd/flow init --agent=roocode
```

Creates `.roo/flow/` with markdown guidelines.

## 🔑 API Keys Configuration

Some MCP tools require API keys:

```bash
# Configure interactively
npx github:sylphxltd/flow mcp config gpt-image
npx github:sylphxltd/flow mcp config perplexity
npx github:sylphxltd/flow mcp config gemini-search

# Or set environment variables
export OPENAI_API_KEY="your-openai-key"
export PERPLEXITY_API_KEY="your-perplexity-key"
export GEMINI_API_KEY="your-gemini-key"
```

## ✅ Verification

Test your installation:

```bash
# Test CLI
npx github:sylphxltd/flow --help

# Test memory system
npx github:sylphxltd/flow memory stats

# Test MCP server
npx github:sylphxltd/flow mcp start
# Press Ctrl+C to stop

# Test memory operations
npx github:sylphxltd/flow memory list
npx github:sylphxltd/flow memory search --pattern "*"
```

## 🐛 Troubleshooting

### Common Issues

**"command not found"**
- Ensure Node.js 18+ is installed: `node --version`
- Try using npx instead of global installation

**Permission errors**
- Check file permissions in project directory
- Try running with appropriate permissions

**MCP tools not loading**
- Verify `opencode.jsonc` exists and is valid JSON
- Check MCP server is running: `npx github:sylphxltd/flow mcp start`

**Memory database errors**
- Check `.sylphx-flow/` directory exists
- Verify write permissions
- Try deleting and recreating: `rm -rf .sylphx-flow/ && npx github:sylphxltd/flow init`

### Getting Help

- [GitHub Issues](https://github.com/sylphxltd/flow/issues) - Report problems
- [Discussions](https://github.com/sylphxltd/flow/discussions) - Ask questions

---

**Next Steps**: [Memory System](Memory-System), [CLI Commands](CLI-Commands)