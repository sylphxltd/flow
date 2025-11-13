# Getting Started

Welcome to Sylphx Flow! This guide will help you get up and running in minutes.

## What is Sylphx Flow?

Sylphx Flow is an AI-powered development workflow automation tool that enables truly autonomous AI agents. Instead of spending time writing detailed prompts, you simply tell the AI what you want, and it handles the rest.

## Key Features

- **🔄 Loop Mode**: Autonomous continuous execution (Claude Code)
- **📝 File Input**: Load prompts from files
- **🧠 Smart Configuration**: Learns from your choices
- **🔌 Platform Support**: Claude Code and OpenCode
- **⚡ MEP Architecture**: Minimal Effective Prompt design
- **🌐 70+ Languages**: StarCoder2 tokenization

## Prerequisites

- Node.js >= 18.0.0
- Bun (recommended) or npm

## Installation

::: code-group

```bash [bun]
# Install globally
bun install -g @sylphx/flow

# Verify installation
sylphx-flow --version
```

```bash [npm]
# Install globally
npm install -g @sylphx/flow

# Verify installation
sylphx-flow --version
```

:::

## Quick Start

### 1. Run Your First Task

**Setup happens automatically!** Just run a task and Flow will initialize on first use.

```bash
# Direct prompt (auto-initializes)
sylphx-flow "implement user authentication"

# With specific agent
sylphx-flow "review code for security" --agent reviewer

# Choose platform explicitly
sylphx-flow "write tests" --target claude-code
sylphx-flow "refactor code" --target opencode
```

### 2. Try Loop Mode (Claude Code)

**Autonomous continuous execution** - the AI keeps working until you stop it.

```bash
# Continuous execution (zero wait time)
sylphx-flow "process github issues" --loop --target claude-code

# With wait time and max runs
sylphx-flow "check for updates" --loop 300 --max-runs 10 --target claude-code
```

**Platform Support:**
- ✅ **Claude Code**: Full loop mode support
- ⏳ **OpenCode**: Coming soon (OpenCode `run` has known issues with background execution)

### 3. Synchronize Templates

Keep your setup up-to-date with the latest Flow templates:

```bash
# Sync all template files (agents, rules, slash commands)
sylphx-flow --sync

# Sync for specific platform
sylphx-flow --sync --target claude-code
sylphx-flow --sync --target opencode
```

### 4. Use File Input

Create a file `task.txt`:

```text
Implement a REST API for user management with:
- CRUD operations
- JWT authentication
- Input validation
- Error handling
- Unit tests
```

Then run:

```bash
sylphx-flow "@task.txt"
```

## Next Steps

- [Learn about Loop Mode](/features/loop-mode)
- [Understand File Input](/features/file-input)
- [Configure Smart Defaults](/features/smart-config)
- [Read CLI Commands Reference](/api/cli-commands)

## Need Help?

- [GitHub Issues](https://github.com/sylphxltd/flow/issues)
- [Documentation](/)
- [Examples](/guide/examples)
