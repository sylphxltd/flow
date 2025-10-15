# Installation Guide

## GitHub Installation (Recommended)

The Rules project is designed to work directly from GitHub without requiring npm installation. This approach ensures you always have the latest version and simplifies setup.

### Prerequisites

- Node.js 18+ 
- Internet connection

### Quick Start

```bash
# Install development rules for your AI agent
npx github:sylphxltd/rules sync

# Install MCP servers for agent coordination
npx github:sylphxltd/rules install --mcp memory everything

# Install agent definitions
npx github:sylphxltd/rules install

# Start the memory server
npx github:sylphxltd/rules mcp
```

### Available Commands

All commands work with `npx github:sylphxltd/rules`:

```bash
# Sync rules to AI agents
npx github:sylphxltd/rules sync [--agent=cursor|kilocode|roocode] [--dry-run] [--force]

# Install agent definitions and MCP servers
npx github:sylphxltd/rules install [--merge] [--dry-run] [--mcp memory|everything]

# Start memory MCP server
npx github:sylphxltd/rules mcp

# Show help
npx github:sylphxltd/rules --help
```

### Supported AI Agents

- **Cursor**: `.cursor/rules/*.mdc` (YAML frontmatter)
- **Kilocode**: `.kilocode/rules/*.md` (plain Markdown)
- **RooCode**: `.roo/rules/*.md` (plain Markdown)

### MCP Server Configuration

When you install MCP servers, they're automatically configured in `opencode.jsonc`:

```jsonc
{
  "mcp": {
    "rules_memory": {
      "type": "local",
      "command": ["npx", "github:sylphxltd/rules", "mcp"]
    },
    "mcp_everything": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-everything"]
    }
  },
  "$schema": "https://opencode.ai/config.json"
}
```

## Alternative: Local Development

If you prefer to develop locally or contribute:

```bash
# Clone the repository
git clone https://github.com/sylphxltd/rules.git
cd rules

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run locally
./dist/index.js sync
```

## Verification

Test your installation:

```bash
# Test GitHub installation
npx github:sylphxltd/rules --help

# Test sync functionality
npx github:sylphxltd/rules sync --dry-run

# Test MCP installation
npx github:sylphxltd/rules install --mcp --dry-run
```

## Troubleshooting

### GitHub Installation Not Working

1. **Check Node.js version**: Ensure you have Node.js 18+
2. **Internet connection**: Verify you can access GitHub
3. **Clear npx cache**: `npx clear-cache` (if available)

### MCP Server Issues

```bash
# Check MCP configuration
npx github:sylphxltd/rules install --mcp

# Test memory server directly
npx github:sylphxltd/rules mcp

# Regenerate configuration
rm opencode.jsonc
npx github:sylphxltd/rules install --mcp memory everything
```

### Sync Issues

```bash
# Check which agents are available
npx github:sylphxltd/rules sync --help

# Preview changes before applying
npx github:sylphxltd/rules sync --dry-run

# Force overwrite existing rules
npx github:sylphxltd/rules sync --force
```

## Next Steps

- [Read the full documentation](README.md)
- [Explore development rules](docs/rules/)
- [Learn about MCP integration](README.md#-mcp-client-integration)
- [Check out agent definitions](agents/)