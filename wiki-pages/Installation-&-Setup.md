# Installation & Setup

Complete guide to install and configure Sylphx Flow.

## 📋 Prerequisites

- **Node.js 18+** - Required for CLI tool
- **Git** - For version control (optional)
- **OpenAI API Key** - For embeddings (knowledge base & codebase search)
- **AI Tool** - Claude Code, Cursor, or other MCP-compatible tool (optional)

## 🚀 Installation Methods

### Method 1: NPX (Recommended)

No installation required - use directly via npx:

```bash
# Use any command directly
npx @sylphx/flow init
npx @sylphx/flow knowledge search "react patterns"
npx @sylphx/flow codebase search "authentication"
npx @sylphx/flow mcp start
```

### Method 2: Clone and Build

For development or customization:

```bash
# Clone the repository
git clone https://github.com/sylphxltd/flow.git
cd flow

# Install dependencies (using Bun)
bun install

# Build the project
bun run build

# Run locally
node dist/index.js --help
```

### Method 3: Global Installation

```bash
# Install globally (when published to npm)
npm install -g @sylphx/flow

# Use anywhere
flow init
flow knowledge search "react patterns"
```

## ⚡ Quick Setup

### 1. Initialize Project

```bash
# Full initialization (recommended)
npx @sylphx/flow init

# Preview what will be installed
npx @sylphx/flow init --dry-run

# Initialize without MCP
npx @sylphx/flow init --skip-mcp

# Initialize only agents
npx @sylphx/flow init --skip-hooks --skip-mcp
```

**What Gets Installed:**
- ✅ **Agents** - orchestrator, coder, reviewer, writer
- ✅ **Hooks** - Session and message hooks for system info
- ✅ **MCP Configuration** - Auto-configured for detected AI tool
- ✅ **Output Styles** - AI response formatting
- ✅ **Knowledge Base** - Indexed and ready (on first MCP start)

### 2. Configure API Keys

```bash
# Set OpenAI API key (required for embeddings)
export OPENAI_API_KEY="your-api-key-here"

# Optional: Custom embedding model
export EMBEDDING_MODEL="text-embedding-3-small"

# Optional: Custom OpenAI endpoint
export OPENAI_BASE_URL="https://api.openai.com/v1"
```

### 3. Verify Installation

```bash
# Check CLI is working
npx @sylphx/flow --help

# Check knowledge base
npx @sylphx/flow knowledge status

# Check codebase search
npx @sylphx/flow codebase status

# Test search
npx @sylphx/flow knowledge search "react patterns"
```

## 🔧 Configuration

### Automatic Configuration

The `init` command automatically creates:

**Directories:**
- `.sylphx-flow/` - Data directory for databases
- `.claude/` or `.opencode/` - Agent definitions and hooks
- `.claude/agents/` - AI agent configurations

**Files:**
- `.claude/mcp.json` or `opencode.jsonc` - MCP server configuration
- `.sylphx-flow/knowledge.db` - Knowledge base index (created on first MCP start)
- `.sylphx-flow/codebase.db` - Codebase search index (created on first search)
- `.sylphx-flow/cache.db` - Cached results

### MCP Configuration

#### Claude Code
Configuration in `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "sylphx-flow": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@sylphx/flow", "mcp", "start"],
      "env": {
        "OPENAI_API_KEY": "your-key-here",
        "EMBEDDING_MODEL": "text-embedding-3-small"
      }
    }
  }
}
```

> **💡 Using latest unreleased version?** Replace `"@sylphx/flow"` with `"github:sylphxltd/flow"` in args.

#### OpenCode
Configuration in `opencode.jsonc`:

```jsonc
{
  "mcp": {
    "sylphx-flow": {
      "type": "local",
      "command": ["npx", "-y", "@sylphx/flow", "mcp", "start"],
      "environment": {
        "OPENAI_API_KEY": "",
        "EMBEDDING_MODEL": "text-embedding-3-small"
      }
    }
  },
  "$schema": "https://opencode.ai/config.json"
}
```

> **💡 Using latest unreleased version?** Replace `"@sylphx/flow"` with `"github:sylphxltd/flow"` in command.

### Environment Variables

```bash
# Required for embeddings
OPENAI_API_KEY="your-api-key"

# Optional configurations
EMBEDDING_MODEL="text-embedding-3-small"
OPENAI_BASE_URL="https://api.openai.com/v1"

# Development
NODE_ENV="development"
DEBUG="sylphx:*"
```

## 🤖 AI Tool Setup

### Claude Code (Recommended)

Claude Code has native support for Sylphx Flow:

```bash
# 1. Initialize
npx @sylphx/flow init

# 2. Add OpenAI key to .claude/mcp.json
# Edit .claude/mcp.json and add your OPENAI_API_KEY

# 3. Restart Claude Code
# Configuration is automatically loaded

# 4. Verify tools are available
# Check Claude Code's MCP tools panel
```

### OpenCode

```bash
# 1. Initialize
npx @sylphx/flow init --target opencode

# 2. Add OpenAI key to opencode.jsonc
# Edit opencode.jsonc and add your OPENAI_API_KEY

# 3. Restart OpenCode
# Configuration is automatically loaded
```

### Cursor

```bash
# 1. Initialize with Cursor support
npx @sylphx/flow init --target cursor

# 2. Configure MCP (if supported)
# Add MCP configuration to Cursor's settings

# 3. Agents and rules are copied to .cursor/
```

## 📚 Post-Installation

### 1. Index Knowledge Base

Knowledge base is automatically indexed when MCP server starts:

```bash
# Start MCP server (indexes knowledge on first run)
npx @sylphx/flow mcp start

# Verify knowledge base
npx @sylphx/flow knowledge status
npx @sylphx/flow knowledge list
```

### 2. Index Codebase (Optional)

```bash
# Index your project's codebase
npx @sylphx/flow codebase reindex

# Verify codebase index
npx @sylphx/flow codebase status

# Test semantic search
npx @sylphx/flow codebase search "authentication logic"
```

### 3. Test Agents

```bash
# Test coder agent
npx @sylphx/flow run "implement hello world" --agent coder

# Test orchestrator
npx @sylphx/flow run "plan authentication system" --agent orchestrator
```

## 🎯 Complete Setup Workflow

```bash
# 1. Initialize project
npx @sylphx/flow init

# 2. Set OpenAI API key
export OPENAI_API_KEY="your-api-key"

# 3. Edit MCP configuration
# Add your API key to .claude/mcp.json or opencode.jsonc

# 4. Start MCP server (indexes knowledge base)
npx @sylphx/flow mcp start
# Press Ctrl+C after indexing completes

# 5. Index your codebase
npx @sylphx/flow codebase reindex

# 6. Verify everything works
npx @sylphx/flow knowledge search "react patterns"
npx @sylphx/flow codebase search "main entry point"

# 7. Restart your AI tool (Claude Code/OpenCode)
# MCP tools are now available
```

## ✅ Verification Checklist

Test your installation with these commands:

- [ ] **CLI Works**: `npx @sylphx/flow --help`
- [ ] **Knowledge Base Ready**: `npx @sylphx/flow knowledge status`
- [ ] **Knowledge Search Works**: `npx @sylphx/flow knowledge search "test"`
- [ ] **Codebase Indexed**: `npx @sylphx/flow codebase status`
- [ ] **Codebase Search Works**: `npx @sylphx/flow codebase search "test"`
- [ ] **Agents Installed**: `ls .claude/agents/` or `ls .opencode/agents/`
- [ ] **MCP Configured**: `cat .claude/mcp.json` or `cat opencode.jsonc`
- [ ] **API Key Set**: `echo $OPENAI_API_KEY`

## 🐛 Troubleshooting

### "command not found"
```bash
# Ensure Node.js 18+ is installed
node --version

# Should show v18.0.0 or higher
```

### "Permission denied"
```bash
# Check directory permissions
ls -la .sylphx-flow/

# Fix permissions if needed
chmod 755 .sylphx-flow/
```

### "OpenAI API key not configured"
```bash
# Set environment variable
export OPENAI_API_KEY="your-key"

# Or add to MCP configuration
# Edit .claude/mcp.json or opencode.jsonc
```

### "Knowledge base not indexed"
```bash
# Start MCP server to trigger indexing
npx @sylphx/flow mcp start
# Wait for indexing to complete, then Ctrl+C

# Verify
npx @sylphx/flow knowledge status
```

### "Codebase not indexed"
```bash
# Index manually
npx @sylphx/flow codebase reindex

# Verify
npx @sylphx/flow codebase status
```

### "MCP tools not available in AI tool"
```bash
# 1. Verify MCP configuration exists
cat .claude/mcp.json  # or opencode.jsonc

# 2. Verify API key is set in config

# 3. Restart AI tool (Claude Code/OpenCode)

# 4. Check MCP server starts
npx @sylphx/flow mcp start

# 5. Check tools are enabled
npx @sylphx/flow knowledge status
npx @sylphx/flow codebase status
```

### "Embeddings fail"
```bash
# Check API key
echo $OPENAI_API_KEY

# Test OpenAI connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Verify model is accessible
# Default: text-embedding-3-small
```

### Database Issues
```bash
# Clean and rebuild databases
rm -rf .sylphx-flow/
npx @sylphx/flow init

# Reindex knowledge base
npx @sylphx/flow mcp start

# Reindex codebase
npx @sylphx/flow codebase reindex
```

## 🎯 Advanced Configuration

### Custom Embedding Model

```bash
# Use different OpenAI embedding model
export EMBEDDING_MODEL="text-embedding-3-large"

# Or in MCP configuration (.claude/mcp.json):
{
  "mcpServers": {
    "sylphx-flow": {
      "env": {
        "EMBEDDING_MODEL": "text-embedding-3-large"
      }
    }
  }
}
```

### Disable Specific Tools

```bash
# Disable knowledge base tools
npx @sylphx/flow mcp start --disable-knowledge

# Disable codebase search
npx @sylphx/flow mcp start --disable-codebase

# Disable time utilities
npx @sylphx/flow mcp start --disable-time

# Multiple disables
npx @sylphx/flow mcp start --disable-codebase --disable-time
```

### Custom Database Location

```bash
# Set custom data directory
export SYLPHX_DATA_DIR="/custom/path/.sylphx-flow"

# Databases will be created in this directory
```

## 📝 Configuration Files Summary

| File | Purpose | Location |
|------|---------|----------|
| `.claude/mcp.json` | MCP server config (Claude Code) | Project root |
| `opencode.jsonc` | MCP server config (OpenCode) | Project root |
| `.sylphx-flow/knowledge.db` | Knowledge base index | Project root |
| `.sylphx-flow/codebase.db` | Codebase search index | Project root |
| `.sylphx-flow/cache.db` | Cached results | Project root |
| `.claude/agents/` | AI agent definitions | Project root |
| `.claude/hooks/` | Session/message hooks | Project root |

## 🎓 Next Steps

Once installation is complete:

1. **[CLI Commands](CLI-Commands)** - Learn available commands
2. **[Knowledge Base](Knowledge-Base)** - Explore curated guidelines
3. **[Codebase Search](Codebase-Search)** - Search your code semantically
4. **[Agent Framework](Agent-Framework)** - Work with AI agents

## 💡 Pro Tips

- **Regular Reindexing**: Run `flow codebase reindex` after significant code changes
- **API Key Security**: Never commit API keys to version control
- **Performance**: Use `--disable-*` flags to disable unused MCP tools
- **Debugging**: Use `--verbose` flag for detailed output
- **Updates**: Pull latest npm version with `npx @sylphx/flow@latest`
- **Bleeding Edge**: Use unreleased features with `npx github:sylphxltd/flow`

## 📞 Getting Help

- **[GitHub Issues](https://github.com/sylphxltd/flow/issues)** - Report bugs
- **[Discussions](https://github.com/sylphxltd/flow/discussions)** - Ask questions
- **[Wiki](https://github.com/sylphxltd/flow/wiki)** - Full documentation

---

*Last Updated: 2025-10-30 | [Edit this page](https://github.com/sylphxltd/flow/wiki/Installation-&-Setup) | [Report Issues](https://github.com/sylphxltd/flow/issues)*
