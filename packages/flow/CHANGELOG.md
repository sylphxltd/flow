# @sylphx/flow

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
