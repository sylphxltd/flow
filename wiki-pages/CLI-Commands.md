# CLI Commands

Complete reference for all Sylphx Flow CLI commands.

## 🛠️ Command Structure

```bash
npx github:sylphxltd/flow <command> [subcommand] [options]
```

## 📋 Core Commands

### `flow init` - Initialize Project

Initialize your project with Sylphx Flow development agents, MCP tools, hooks, and output styles.

#### Syntax
```bash
npx github:sylphxltd/flow init [options]
```

#### Options
- `--target <type>` - Force specific target (opencode, claude-code, default: auto-detect)
- `--dry-run` - Show what would be done without making changes
- `--skip-agents` - Skip agent installation
- `--skip-hooks` - Skip git hooks installation
- `--skip-mcp` - Skip MCP configuration
- `--skip-output-styles` - Skip output styles installation

#### Examples
```bash
# Full initialization (default)
npx github:sylphxltd/flow init

# Preview changes
npx github:sylphxltd/flow init --dry-run

# Initialize without MCP
npx github:sylphxltd/flow init --skip-mcp

# Initialize only agents
npx github:sylphxltd/flow init --skip-hooks --skip-mcp --skip-output-styles

# Force Claude Code target
npx github:sylphxltd/flow init --target claude-code
```

#### What Gets Installed
- **Agents**: orchestrator, coder, reviewer, writer
- **Hooks**: Session and message hooks for system info
- **MCP Configuration**: Auto-configured for detected AI tool
- **Output Styles**: AI response formatting styles

---

### `flow knowledge` - Knowledge Base Management

Access and search curated development guidelines and best practices.

#### Syntax
```bash
npx github:sylphxltd/flow knowledge [subcommand] [options]
```

#### Subcommands

##### `knowledge search` - Search Knowledge Base
```bash
npx github:sylphxltd/flow knowledge search <query> [options]
```

**Arguments:**
- `query` - Search query (required)

**Options:**
- `--limit <number>` - Maximum results to return (default: 5)
- `--include-content` - Include full content in results
- `--output <format>` - Output format: markdown, json (default: markdown)

**Examples:**
```bash
# Basic search
npx github:sylphxltd/flow knowledge search "react hooks patterns"

# Search with more results
npx github:sylphxltd/flow knowledge search "nextjs routing" --limit 10

# Include full content
npx github:sylphxltd/flow knowledge search "security practices" --include-content

# JSON output
npx github:sylphxltd/flow knowledge search "testing strategies" --output json
```

##### `knowledge get` - Get Specific Document
```bash
npx github:sylphxltd/flow knowledge get <uri>
```

**Arguments:**
- `uri` - Document URI (e.g., "/stacks/react-app")

**Examples:**
```bash
# Get React patterns
npx github:sylphxltd/flow knowledge get "/stacks/react-app"

# Get security guidelines
npx github:sylphxltd/flow knowledge get "/universal/security"

# Get SaaS architecture guide
npx github:sylphxltd/flow knowledge get "/guides/saas-template"
```

##### `knowledge list` - List All Resources
```bash
npx github:sylphxltd/flow knowledge list [options]
```

**Options:**
- `--category <name>` - Filter by category (stacks, guides, universal, data)
- `--output <format>` - Output format: markdown, json

**Examples:**
```bash
# List all knowledge
npx github:sylphxltd/flow knowledge list

# List only stacks
npx github:sylphxltd/flow knowledge list --category stacks

# JSON output
npx github:sylphxltd/flow knowledge list --output json
```

##### `knowledge status` - Check Knowledge Base Status
```bash
npx github:sylphxltd/flow knowledge status
```

Shows:
- Index status
- Number of documents
- Number of embeddings
- Database size
- Last indexed time

---

### `flow codebase` - Codebase Search & Indexing

Semantic search across your project's codebase.

#### Syntax
```bash
npx github:sylphxltd/flow codebase [subcommand] [options]
```

#### Subcommands

##### `codebase search` - Search Codebase
```bash
npx github:sylphxltd/flow codebase search <query> [options]
```

**Arguments:**
- `query` - Search query describing what to find (required)

**Options:**
- `--limit <number>` - Maximum results to return (default: 10)
- `--include-content` - Include full code content in results
- `--output <format>` - Output format: markdown, json (default: markdown)

**Examples:**
```bash
# Basic search
npx github:sylphxltd/flow codebase search "authentication logic"

# Search with more results
npx github:sylphxltd/flow codebase search "api endpoints" --limit 20

# Include content
npx github:sylphxltd/flow codebase search "database queries" --include-content

# JSON output
npx github:sylphxltd/flow codebase search "error handling" --output json
```

##### `codebase reindex` - Reindex Codebase
```bash
npx github:sylphxltd/flow codebase reindex
```

Rebuilds the codebase search index. Run after significant code changes.

##### `codebase status` - Check Index Status
```bash
npx github:sylphxltd/flow codebase status
```

Shows:
- Index status
- Number of files indexed
- Languages detected
- Database size
- Last indexed time

---

### `flow run` - Execute AI Agents

Run AI agents with specific prompts and tasks.

#### Syntax
```bash
npx github:sylphxltd/flow run [prompt] [options]
```

#### Arguments
- `prompt` - The task or prompt for the agent (optional, will prompt if not provided)

#### Options
- `--agent <name>` - Agent to use: coder, reviewer, writer, orchestrator (default: coder)
- `--target <type>` - Force specific target (opencode, claude-code)

#### Examples
```bash
# Use default agent (coder)
npx github:sylphxltd/flow run "implement user authentication"

# Specify agent
npx github:sylphxltd/flow run "review this code for security" --agent reviewer
npx github:sylphxltd/flow run "document the API" --agent writer
npx github:sylphxltd/flow run "implement OAuth with tests" --agent orchestrator

# Interactive mode (prompts for input)
npx github:sylphxltd/flow run --agent coder
```

#### Available Agents
- **coder** - Code implementation and execution (default)
- **orchestrator** - Task coordination and delegation
- **reviewer** - Code review and quality assurance
- **writer** - Documentation and technical writing

---

### `flow mcp` - Manage MCP Server

Manage MCP (Model Context Protocol) server and configuration.

#### Syntax
```bash
npx github:sylphxltd/flow mcp [subcommand] [options]
```

#### Subcommands

##### `mcp start` - Start MCP Server
```bash
npx github:sylphxltd/flow mcp start [options]
```

**Options:**
- `--disable-knowledge` - Disable knowledge base tools
- `--disable-codebase` - Disable codebase search tools
- `--disable-time` - Disable time utility tools
- `--disable-memory` - Disable memory tools (deprecated)
- `--target <type>` - Force specific target configuration

**Examples:**
```bash
# Start with all tools (default)
npx github:sylphxltd/flow mcp start

# Start without knowledge tools
npx github:sylphxltd/flow mcp start --disable-knowledge

# Start with only knowledge tools
npx github:sylphxltd/flow mcp start --disable-codebase --disable-time

# Force OpenCode configuration
npx github:sylphxltd/flow mcp start --target opencode
```

**Available MCP Tools:**
- `knowledge_search`, `knowledge_get`, `knowledge_list` - Knowledge base access
- `codebase_search`, `codebase_reindex`, `codebase_status` - Codebase search
- `time_get_current`, `time_format`, `time_calculate` - Time utilities

##### `mcp config` - Configure MCP Server
```bash
npx github:sylphxltd/flow mcp config [options]
```

Configure MCP server settings and API keys.

##### `mcp list` - List MCP Servers
```bash
npx github:sylphxltd/flow mcp list
```

List all configured MCP servers.

##### `mcp add` - Add MCP Servers
```bash
npx github:sylphxltd/flow mcp add <servers...>
```

Add additional MCP servers to configuration.

##### `mcp remove` - Remove MCP Servers
```bash
npx github:sylphxltd/flow mcp remove <servers...>
```

Remove MCP servers from configuration.

---

### `flow sysinfo` - System Information

Display system information and current status.

#### Syntax
```bash
npx github:sylphxltd/flow sysinfo [options]
```

#### Options
- `--hook <type>` - Hook type: session (static), message (dynamic)
- `--output <format>` - Output format: markdown, standard, json
- `--target <type>` - Force specific target (opencode, claude-code)

#### Hook Types
- **session** - Static system info (platform, dirs, hardware) - runs once at session start
- **message** - Dynamic status (time, CPU, memory) - runs per message

#### Output Formats
- **markdown** - Markdown format, optimized for LLM hooks (default)
- **standard** - Colored terminal output with decorations
- **json** - JSON format for automation

#### Examples
```bash
# Default output (markdown, message hook)
npx github:sylphxltd/flow sysinfo

# Session info (runs once)
npx github:sylphxltd/flow sysinfo --hook session

# Dynamic status (per message)
npx github:sylphxltd/flow sysinfo --hook message

# Standard terminal output
npx github:sylphxltd/flow sysinfo --output standard

# JSON output for scripting
npx github:sylphxltd/flow sysinfo --output json
```

---

## 🔧 Global Options

These options work with all commands:

- `--help, -h` - Show help for command
- `--version, -v` - Show version number

## 📝 Output Formats

### Success Messages
```
✅ Operation completed successfully
✅ Knowledge search completed: 5 results
✅ Codebase indexed: 347 files
✅ MCP server started
```

### Error Messages
```
❌ Error: Invalid option
❌ Database not found, run: flow init
❌ OpenAI API key not configured
```

### Warning Messages
```
⚠️ WARNING: Codebase not indexed yet
⚠️ Knowledge base is empty
```

### Info Messages
```
ℹ️ Database: .sylphx-flow/codebase.db
ℹ️ Found 347 files
ℹ️ MCP server running on stdio
```

## 🎯 Common Workflows

### 1. Initial Setup
```bash
# Initialize project
npx github:sylphxltd/flow init

# Check knowledge base
npx github:sylphxltd/flow knowledge status

# Check codebase index
npx github:sylphxltd/flow codebase status

# Start MCP server
npx github:sylphxltd/flow mcp start
```

### 2. Working with Knowledge Base
```bash
# Search for patterns
npx github:sylphxltd/flow knowledge search "react hooks"

# Get specific guide
npx github:sylphxltd/flow knowledge get "/stacks/react-app"

# List all resources
npx github:sylphxltd/flow knowledge list
```

### 3. Searching Codebase
```bash
# Semantic search
npx github:sylphxltd/flow codebase search "authentication logic"

# Search with more results
npx github:sylphxltd/flow codebase search "api endpoints" --limit 20

# Reindex after changes
npx github:sylphxltd/flow codebase reindex
```

### 4. Using AI Agents
```bash
# Implement feature
npx github:sylphxltd/flow run "add user authentication" --agent coder

# Review code
npx github:sylphxltd/flow run "review for security" --agent reviewer

# Write documentation
npx github:sylphxltd/flow run "document the API" --agent writer

# Complex task
npx github:sylphxltd/flow run "implement OAuth with tests" --agent orchestrator
```

### 5. Managing MCP Server
```bash
# Start with all tools
npx github:sylphxltd/flow mcp start

# Start with specific tools
npx github:sylphxltd/flow mcp start --disable-codebase

# List configured servers
npx github:sylphxltd/flow mcp list
```

## ⚙️ Environment Variables

### Required for Embeddings
```bash
# OpenAI API key for vector embeddings
export OPENAI_API_KEY="your-api-key"

# Optional: Custom embedding model
export EMBEDDING_MODEL="text-embedding-3-small"

# Optional: Custom OpenAI endpoint
export OPENAI_BASE_URL="https://api.openai.com/v1"
```

### Development
```bash
# Enable debug mode
export NODE_ENV="development"

# Verbose logging
export DEBUG="sylphx:*"
```

## 🐛 Troubleshooting

### Knowledge Base Issues
```bash
# Check status
flow knowledge status

# Verify database exists
ls -la .sylphx-flow/knowledge.db

# Rebuild index
rm .sylphx-flow/knowledge.db
flow mcp start
```

### Codebase Search Issues
```bash
# Check status
flow codebase status

# Reindex
flow codebase reindex

# Verify API key
echo $OPENAI_API_KEY
```

### MCP Server Issues
```bash
# Check configuration
cat .claude/mcp.json  # or opencode.jsonc

# Test with verbose output
flow mcp start --verbose

# Verify tools are available
flow knowledge status
flow codebase status
```

### Agent Issues
```bash
# Check agents are installed
ls .claude/agents/  # or .kilocode/agents/

# Reinstall agents
flow init --skip-hooks --skip-mcp
```

## 🎯 Pro Tips

### Efficient Knowledge Search
```bash
# Be specific
flow knowledge search "react custom hooks patterns"

# Use categories
flow knowledge list --category stacks

# Get full content when needed
flow knowledge search "security" --include-content
```

### Effective Codebase Search
```bash
# Describe what you're looking for
flow codebase search "code that handles user authentication"

# Search for related concepts
flow codebase search "error handling in API routes"

# Reindex regularly
git pull && flow codebase reindex
```

### Agent Best Practices
```bash
# Use orchestrator for complex tasks
flow run "implement feature with tests" --agent orchestrator

# Be specific in prompts
flow run "add JWT authentication with refresh tokens" --agent coder

# Use reviewer for quality checks
flow run "review for OWASP vulnerabilities" --agent reviewer
```

## 📚 Next Steps

- **[Knowledge Base](Knowledge-Base)** - Learn about curated guidelines
- **[Codebase Search](Codebase-Search)** - Semantic code discovery
- **[Agent Framework](Agent-Framework)** - Working with AI agents
- **[MCP Integration](MCP-Integration)** - Connecting AI tools

---

*Last Updated: 2025-10-30 | [Edit this page](https://github.com/sylphxltd/flow/wiki/CLI-Commands) | [Report Issues](https://github.com/sylphxltd/flow/issues)*
