---
"@sylphx/flow": major
---

🎉 **Sylphx Flow v1.0.0 - Production Release**

Major release with autonomous loop mode, auto-initialization, and production-ready features.

## 🚀 Major Features

### Loop Mode - Autonomous Continuous Execution
- **Revolutionary autonomous AI** that keeps working until you stop it
- Zero wait time by default (task execution time is natural interval)
- Optional wait time for polling scenarios: `--loop [seconds]`
- Max runs limit: `--max-runs <count>`
- Smart configuration: Saves provider/agent preferences automatically
- **Platform Support**: Claude Code (full support), OpenCode (coming soon)

```bash
# Continuous autonomous work
sylphx-flow "process all github issues" --loop --target claude-code

# With wait time and limits
sylphx-flow "check for updates" --loop 300 --max-runs 20
```

### Auto-Initialization
- **Zero configuration required** - setup happens automatically on first use
- Smart platform detection (Claude Code, OpenCode)
- Intelligent defaults that learn from your choices
- Manual setup still available: `sylphx-flow --init-only`

### Template Synchronization
- New `--sync` flag to synchronize with latest Flow templates
- Updates agents, rules, output styles, and slash commands
- Safe sync: Won't overwrite user customizations
- Platform-specific sync: `--sync --target opencode`

### File Input Support
- Load prompts from files: `sylphx-flow "@task.txt"`
- No shell escaping issues
- Perfect for complex, reusable instructions
- Works with loop mode: `sylphx-flow "@prompt.md" --loop`

## ✨ Enhancements

### CLI Improvements
- Simplified command structure - direct execution without subcommands
- Better error messages and validation
- Improved verbose output for debugging
- Command printing in headless/loop mode

### Platform Support
- **Claude Code**: Full support with headless execution
- **OpenCode**: Full support (loop mode coming soon due to TTY requirements)
- Auto-detection of target platform
- Manual override: `--target claude-code` or `--target opencode`

### Branding & Documentation
- Modern flow infinity symbol icon system
- Comprehensive documentation with VitePress
- Clear platform support matrix
- Updated examples and guides

## 🐛 Bug Fixes

- Fix targetId undefined in loop mode initialization
- Remove problematic flags from OpenCode headless mode
- Resolve init command never executing - agents now install properly
- Fix ConfigDirectoryTypoError by cleaning up old 'commands' directory

## 📦 Package Configuration

- Configured for npm publishing
- Proper entry points and exports
- Type definitions included
- MIT license

## 🔄 Breaking Changes

- Loop mode default interval changed from 60s to 0s (no wait time)
- Command structure simplified (subcommands still work but not required)
- Init/run commands consolidated into flow command

## 📚 Documentation

- Complete rewrite emphasizing auto-initialization
- Loop mode clearly marked as Claude Code only
- New --sync flag documentation
- Simplified getting started guide
- Updated CLI commands reference

## 🙏 Migration Guide

### From pre-1.0 versions:

```bash
# Old way
sylphx-flow init
sylphx-flow run "task"
sylphx-flow run "task" --loop

# New way (auto-initializes)
sylphx-flow "task"
sylphx-flow "task" --loop --target claude-code
```

### Loop mode interval:

```bash
# Old default: 60s wait time
sylphx-flow "task" --loop

# New default: 0s wait time (immediate)
sylphx-flow "task" --loop

# If you want wait time, specify explicitly:
sylphx-flow "task" --loop 60
```

## 🔗 Links

- [Documentation](https://flow.sylphx.ai)
- [GitHub Repository](https://github.com/sylphxltd/flow)
- [Getting Started Guide](https://flow.sylphx.ai/guide/getting-started)
