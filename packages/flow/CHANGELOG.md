# @sylphx/flow

## 1.3.0

### Minor Changes

- Enhanced --sync with MCP registry checking:
  - Detect servers not in Flow registry (removed or custom)
  - Interactive selection for removal
  - Clean removal from .mcp.json
  - Flow: sync templates → check MCP → remove selected

## 1.2.1

### Patch Changes

- Apply MEP principles to workspace documentation rule:
  - Condensed from verbose instructions to condition→action format
  - Removed step-by-step teaching and command examples
  - Embedded verification in directives
  - 31% reduction while maintaining clarity

## 1.2.0

### Minor Changes

- 2272596: Enhanced agent system prompts with Minimal Effective Prompt principles:

  - **Workflow Standards**: Added continuous atomic commits, semver discipline (minor-first), TypeScript release workflow with changeset + CI, and proactive pre-commit cleanup
  - **Research-First Mindset**: Enforced research before implementation to prevent outdated approaches
  - **Silent Mode Fix**: Prevented agents from creating report files to compensate for not speaking
  - **Proactive Cleanup**: Added mandatory pre-commit hygiene - refactor, remove unused code, delete outdated docs, fix tech debt
  - **MEP Refactor**: Refactored all prompts (coder, orchestrator, reviewer, writer, core, code-standards, silent) using Minimal Effective Prompt principles - trust LLM, WHAT+WHEN not HOW+WHY, condition→action format, ~40% token reduction

  Prime directive: Never accumulate misleading artifacts. Research is mandatory. Tests and benchmarks required (.test.ts, .bench.ts).

## 1.1.1

### Patch Changes

- 5b1adfb: Fix missing runtime dependencies in package.json

  Add missing dependencies that are required when the package is installed globally:

  - react and ink (for UI components)
  - drizzle-orm and @libsql/client (for database operations)
  - @modelcontextprotocol/sdk (for MCP features)
  - @lancedb/lancedb (for vector storage)
  - @huggingface/transformers (for tokenization)
  - chokidar (for file watching)
  - ignore (for gitignore parsing)
  - ai (for AI SDK features)

  This fixes the error: "Cannot find module 'react/jsx-dev-runtime'" when running sylphx-flow -v after global installation.

## 1.1.0

### Minor Changes

- 7fdb9f2: Simplify provider selection - always ask, never save defaults

  **Breaking Change**: Removed smart defaults for provider/agent selection

  **Before:**

  - Initial setup saved default provider
  - Runtime choices were automatically saved
  - Smart defaults applied on next run
  - Complex conditional logic with useDefaults flags

  **After:**

  - Initial setup only configures API keys
  - Always prompts for provider/agent each run
  - No automatic saving of runtime choices
  - Simple: want to skip prompts? Use `--provider` / `--agent` args

  **Migration:**
  Users who relied on saved defaults should now:

  - Use `--provider default --agent coder` in scripts
  - Or accept the prompt on each run

  **Example:**

  ```bash
  # Always prompts (new default behavior)
  sylphx-flow "your prompt"

  # Skip prompts with args
  sylphx-flow --provider default --agent coder "your prompt"
  ```

  This change reduces code complexity by 155 lines and makes behavior more predictable.

## 1.0.6

### Patch Changes

- 841929e: Include assets directory with agents, rules, and templates in npm package

## 1.0.5

### Patch Changes

- Fix Claude Code component detection - rules and output styles are included in agent files

## 1.0.4

### Patch Changes

- Fix false "missing components" warning by checking if directories contain files

## 1.0.3

### Patch Changes

- Publish source code instead of bundled dist to fix Unicode and native binding issues

## 1.0.2

### Patch Changes

- Fix missing dist directory in npm package by adding prepublishOnly script

## 1.0.0

### Major Changes

- 2ee21db: 🎉 **Sylphx Flow v1.0.0 - Production Release**

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

## 1.0.0

### Major Changes

- # 1.0.0 - Major Release

  Sylphx Flow 1.0.0 is a complete reimagination of AI-powered development workflow automation. This release represents months of refinement, optimization, and user feedback integration.

  ## 🚀 Major Features

  ### Loop Mode - Autonomous Continuous Execution

  Revolutionary loop mode that enables truly autonomous AI agents:

  - **Continuous execution** with automatic context preservation
  - **Zero wait time default** - task execution is the natural interval
  - **Smart continue mode** - auto-enables from 2nd iteration
  - **Graceful shutdown** - Ctrl+C handling with summaries
  - **Configurable wait times** for rate limiting or polling scenarios

  ```bash
  # Continuous autonomous work
  sylphx-flow "process all github issues" --loop

  # With wait time for polling
  sylphx-flow "check for new commits" --loop 300 --max-runs 20
  ```

  ### File Input Support

  Load prompts from files for complex, reusable instructions:

  - **@file syntax** - `@prompt.txt` or `@/path/to/prompt.txt`
  - **No shell escaping issues** - write natural language prompts
  - **Version control friendly** - commit prompts alongside code
  - **Works seamlessly with loop mode**

  ```bash
  # Use file input
  sylphx-flow "@task.txt" --loop --max-runs 10
  ```

  ### Smart Configuration System

  Intelligent defaults that learn from your choices:

  - **Auto-saves preferences** - provider, agent, target selections
  - **Smart defaults** - uses saved preferences automatically
  - **Selective override** - `--select-provider` / `--select-agent` flags
  - **Inline API key setup** - configure keys when selecting providers
  - **No repeated prompts** - set once, use forever

  ### OpenCode Integration

  Full support for OpenCode (Claude Code alternative):

  - **Auto-detection** of OpenCode installation
  - **Target-aware component checking**
  - **JSONC config parsing** for OpenCode's commented configs
  - **Directory structure adaptation** (singular vs plural naming)
  - **Automatic migration** from old directory structures

  ## 🔧 Major Improvements

  ### Flow Orchestrator Architecture

  Complete refactor for separation of concerns:

  - **Modular design** - clean separation of init/setup/launch phases
  - **State-driven decisions** - smart detection of project state
  - **Positive logic patterns** - explicit conditions instead of negative flags
  - **Component integrity** - automatic detection and repair of missing components

  ### Performance Optimizations

  - **Loop mode optimization** - setup once, execute repeatedly (no redundant checks)
  - **Parallel execution** - concurrent independent operations
  - **Smart caching** - reuse configuration across runs
  - **Reduced overhead** - streamlined initialization flow

  ### Developer Experience

  - **Better error messages** - actionable feedback with suggestions
  - **Progress indicators** - clear feedback during long operations
  - **Dry-run mode** - preview commands before execution
  - **Verbose mode** - detailed output for debugging
  - **Headless mode** - `-p` for non-interactive execution

  ## 🐛 Bug Fixes

  ### Critical Fixes

  - **Init command execution** - fixed Commander.js action() misuse that prevented initialization
  - **State detection timing** - only check components after target is known
  - **MCP detection** - proper JSONC parsing for OpenCode configs
  - **Directory naming** - fixed OpenCode command/commands mismatch
  - **Continue flag logic** - proper handling of conversation context

  ### OpenCode Specific

  - **YAML field compatibility** - removed unsupported fields (name, mode, rules)
  - **Automatic cleanup** - removes legacy directories to prevent crashes
  - **Config validation** - proper error handling for invalid configurations

  ### Memory & Settings

  - **Persistent settings** - fixed "re-prompt every run" issue
  - **Target-specific configs** - separate settings per platform
  - **Environment variables** - proper inheritance to spawned processes

  ## 📚 Documentation

  ### Comprehensive Guides

  - **LOOP_MODE.md** - Complete loop mode documentation (English)
  - **Updated help text** - clearer, more descriptive option descriptions
  - **Inline examples** - usage examples in help output
  - **Consistent terminology** - "wait time" instead of mixed "interval/cooldown"

  ### API Reference

  - Clear parameter descriptions
  - Recommended values for all options
  - When to use each feature
  - Troubleshooting guides

  ## ⚠️ Breaking Changes

  ### Configuration File Rename

  - Old: `.sylphx-flow/config.json`
  - New: `.sylphx-flow/settings.json`
  - Migration: Automatic on first run

  ### Default Behavior Changes

  - **Loop interval default**: 60s → 0s (immediate execution)
  - **Init logic**: Negative logic → Positive logic (explicit conditions)
  - **Provider selection**: Opt-in defaults → Smart defaults (auto-use saved)

  ### Removed Features

  - **Deprecated commands**: Old separate init/run commands (use integrated `flow` command)
  - **Complex loop strategies**: Removed over-engineered exit conditions (until-success, until-stable)

  ## 🔄 Migration Guide

  ### From 0.x to 1.0

  1. **Update package**:

  ```bash
  bun update @sylphx/flow
  ```

  2. **Config auto-migrates** on first run - no manual steps needed

  3. **Loop mode users**: If you were using `--loop 60`, consider removing the number for faster continuous execution:

  ```bash
  # Before (0.x)
  sylphx-flow "task" --loop 60

  # After (1.0 - faster)
  sylphx-flow "task" --loop

  # Or keep wait time if needed
  sylphx-flow "task" --loop 60
  ```

  4. **Provider/Agent selection**: No longer need `--use-defaults` - it's automatic now

  ## 🙏 Acknowledgments

  This release incorporates extensive user feedback and addresses real-world usage patterns. Thank you to all contributors and early adopters who helped shape this release.

  ## 📊 Stats

  - **50+ commits** since 0.3.0
  - **15+ major features** added
  - **20+ bug fixes**
  - **Full OpenCode support**
  - **10x faster loop execution** (setup overhead removed)
