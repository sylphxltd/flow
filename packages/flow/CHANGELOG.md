# @sylphx/flow

## 1.6.5

### Patch Changes

- bfa33df: Test Slack notification with errexit fix - bash -e handling resolved.

## 1.6.4

### Patch Changes

- 02cc912: Test Slack notification with env var fix - shell escaping resolved.

## 1.6.3

### Patch Changes

- db58e6a: Test Slack notification with fixed workflow - should now display correct package name and version.

## 1.6.2

### Patch Changes

- a5e299d: Test Slack notification integration with upgraded publish workflow.

## 1.6.1

### Patch Changes

- 8c6fb07: Use full term "Pragmatic Functional Programming" instead of abbreviation "Pragmatic FP" for clarity and searchability.

## 1.6.0

### Minor Changes

- 4a025d0: Refactor code standards to pragmatic functional programming. Replace dogmatic FP rules with flexible, pragmatic approach following MEP principles.

  **Key Changes:**

  - Programming Patterns: Merge 4 rules into "Pragmatic FP" (-58% tokens). Business logic pure, local mutations acceptable, composition default but inheritance when natural.
  - Error Handling: Support both Result types and explicit exceptions (previously forced Result/Either).
  - Anti-Patterns: Remove neverthrow enforcement, allow try/catch as valid option.

  **Philosophy Shift:** From "pure FP always" to "pragmatic: use best tool for the job". More MEP-compliant (prompt not teach), more flexible, preserves all core values.

## 1.5.4

### Patch Changes

- dfd0264: Revise completion reporting prompts for MEP compliance. Removed over-explanation, teaching language, and redundancy. Changed from prescriptive "what to include" lists to directive triggers. Reduced silent.md from 53 to 38 lines (-28%). Follows MEP principle: prompt (trigger behavior) not teach (explain rationale).

## 1.5.3

### Patch Changes

- f6d55a7: Fix LLM silent completion behavior by clarifying when to report results. Updated silent.md, coder.md, and core.md to distinguish between during-execution silence (no narration) and post-completion reporting (always report what was accomplished, verification status, and what changed). This addresses the issue where agents would complete work without telling the user what was done.

## 1.5.2

### Patch Changes

- fbf8f32: Add Personality section with research-backed trait descriptors (Methodical Scientist, Skeptical Verifier, Evidence-Driven Perfectionist) to combat rash LLM behavior. Refactor Character section to be more MEP-compliant and modular. Research shows personality priming achieves 80% behavioral compliance and is the most effective control method.

## 1.5.1

### Patch Changes

- 76b3c84: Add Playwright MCP server as default pre-configured server for browser automation and testing capabilities

## 1.5.0

### Minor Changes

- 65c2446: Refactor all prompts with research-backed MEP framework. Adds priority markers (P0/P1/P2), XML structure for complex instructions, concrete examples, and explicit verification criteria. Based on research showing underspecified prompts fail 2x more often and instruction hierarchy improves robustness by 63%. All prompts now pass "intern on first day" specificity test while remaining minimal.

## 1.4.20

### Patch Changes

- d34613f: Add comprehensive prompting guide for writing effective LLM prompts. Introduces 5 core principles: pain-triggered, default path, immediate reward, natural integration, and self-interest alignment. This is a meta-level guide for maintainers, not for agents to follow.

## 1.4.19

### Patch Changes

- c7ce3ac: Fix workspace.md execution issues with realistic strategies

  Critical fixes:

  - Fixed cold start: Check exists → create if needed → read (was: read immediately, failing if missing)
  - Changed to batch updates: Note during work, update before commit (was: update immediately, causing context switching)
  - Realistic verification: Spot-check on read, full check before commit (was: check everything on every read)
  - Objective ADR criteria: Specific measurable conditions (was: subjective "can reverse in <1 day?")
  - Added concrete examples to all templates (was: generic placeholders causing confusion)

  Additional improvements:

  - Added SSOT duplication triggers (when to reference vs duplicate)
  - Added content boundary test (README vs context.md decision criteria)
  - Added detailed drift fix patterns with conditions
  - Expanded red flags list
  - Clarified update strategy with rationale

  Result: Executable, realistic workspace management that LLM agents can actually follow.

  Before: 265 lines with execution problems
  After: 283 lines (+7%) with all critical issues fixed, higher information density

## 1.4.18

### Patch Changes

- 156db14: Optimize rules and agents with MEP principles

  - Optimized core.md: removed duplicates, agent-specific content (222→91 lines, -59%)
  - Optimized code-standards.md: removed duplicates, kept unique technical content (288→230 lines, -20%)
  - Optimized workspace.md: applied MEP, added drift resolution (317→265 lines, -16%)
  - Optimized coder.md: added Git workflow section (157→169 lines)
  - Optimized orchestrator.md: condensed orchestration flow (151→120 lines, -21%)
  - Optimized reviewer.md: condensed review modes and output format (161→128 lines, -20%)
  - Optimized writer.md: condensed writing modes (174→122 lines, -30%)

  Overall reduction: 1,470→1,125 lines (-23%)

  All files now follow MEP (Minimal Effective Prompt) principles: concise, direct, trigger-based, no step-by-step, no WHY explanations.

## 1.4.17

### Patch Changes

- ef8463c: Refactor workspace.md rule to follow Minimal Effective Prompt principles. Reduced from 486 to 244 lines (50% reduction) by removing teaching, applying trigger-based outcomes, condensing templates, and trusting LLM capability.

## 1.4.16

### Patch Changes

- 54ad8ff: Fix agent enhancement by reading rules before transformation (CRITICAL):
  - Rules field was read AFTER transformation (which strips it for Claude Code)
  - Now reads rules from original content BEFORE transformation
  - Rules field correctly stripped in final output (Claude Code doesn't use it)
  - Fixes: only core.md was loaded, code-standards and workspace were ignored

## 1.4.15

### Patch Changes

- 638418b: Fix agent enhancement by preserving rules field in frontmatter (CRITICAL):
  - convertToClaudeCodeFormat was stripping the rules field
  - Enhancement logic needs rules field to know which rules to load
  - Now preserves rules array in transformed frontmatter
  - Fixes: only core.md was being loaded, code-standards and workspace were ignored

## 1.4.14

### Patch Changes

- 11abdf2: Add workspace.md rule to agent frontmatter:

  - Coder: added workspace (creates .sylphx/ documentation)
  - Reviewer: added workspace (checks workspace conventions)
  - Writer: added workspace (documents .sylphx/ patterns)
  - Orchestrator: kept core only (coordination, no file creation)

  Ensures workspace documentation rule is properly embedded in Claude Code agent files.

## 1.4.13

### Patch Changes

- 1d0ac4e: Add startup check for new templates:
  - Detects missing templates on startup (new templates not installed locally)
  - Shows notification with count of new agents/commands/rules
  - Prompts user to run --sync to install
  - Ignores unknown files (custom user files)
  - Non-blocking - just informational

## 1.4.12

### Patch Changes

- d88d280: Show missing templates in sync preview:
  - Added "Will install (new templates)" section
  - Users can now see which templates will be newly installed
  - Better visibility into what changes sync will make

## 1.4.11

### Patch Changes

- 22ddfb9: Fix sync to dynamically scan templates instead of hardcoding (CRITICAL):
  - Now scans assets/ directory at runtime for agents, slash commands, and rules
  - Prevents sync from breaking when templates change
  - Old commands (commit, context, explain, review, test) now correctly detected as unknown files
  - New commands (cleanup, improve, polish, quality, release) properly recognized as Flow templates

## 1.4.10

### Patch Changes

- 126de1e: Fix CI auto-publish workflow NPM authentication

## 1.4.9

### Patch Changes

- 4493ee0: Remove root assets directory and simplify publish flow:

  **Cleanup:**

  - Removed duplicate root assets/ directory (4080 lines)
  - packages/flow/assets/ is now single source of truth
  - Updated prepublishOnly to no-op (assets already in package)

  **Templates (now correctly published):**

  - Agents: coder, orchestrator, reviewer, writer (MEP optimized)
  - Rules: core, code-standards, workspace (MEP optimized + NEW)
  - Slash commands: cleanup, improve, polish, quality, release (NEW)
  - Output styles: silent (prevent report files)

  **Root cause:** Root assets/ was copied to package during publish, causing template sync issues.

## 1.4.6

### Patch Changes

- b4a5087: Restore MEP-optimized templates accidentally reverted in v1.3.0:

  **Agents (MEP optimized):**

  - Coder, Orchestrator, Reviewer, Writer - streamlined prompts with 40% token reduction

  **Rules (MEP optimized + new):**

  - core.md - universal rules with behavioral triggers
  - code-standards.md - shared quality standards
  - workspace.md - NEW: auto-create .sylphx/ workspace documentation

  **Slash Commands (complete replacement):**

  - Removed: commit, context, explain, review, test
  - Added: cleanup, improve, polish, quality, release
  - Essential workflows over granular utilities

  **Output Styles:**

  - silent.md - prevent agents from creating report files

  **Root cause:** Working on sync feature from stale branch without latest templates.

## 1.4.4

### Patch Changes

- 4de084e: Add comprehensive debug logging to trace sync file operations:

  - **Deletion verification**: Check file exists before/after unlink to verify actual deletion
  - **Installation logging**: Show force flag status, file paths, and write verification
  - **Force flag propagation**: Log when force mode is activated for agents and slash commands

  This diagnostic release helps identify why sync appears successful but git shows no changes.

## 1.4.3

### Patch Changes

- Fix sync not actually updating files (CRITICAL):
  - Installation was comparing content and skipping writes
  - Even after deletion, files weren't updated if content "matched"
  - Add force mode that always overwrites during sync
  - Sync now properly updates all files regardless of content

## 1.4.2

### Patch Changes

- Add visible deletion output during sync:
  - Show each file being deleted with checkmark
  - Display MCP servers being removed
  - Clear visual feedback of the full sync process
  - Users can now see exactly what's happening

## 1.4.1

### Patch Changes

- Fix rules scanning showing all project markdown files:
  - Skip rules scanning for Claude Code (rules embedded in agent files)
  - Only scan when target has explicit rulesFile config
  - Prevent scanning entire project directory

## 1.4.0

### Minor Changes

- Complete sync redesign with intelligent file categorization:
  - Categorize all files: agents, commands, rules, MCP servers
  - Separate Flow templates (auto-sync) from unknown files (user decides)
  - New flow: preview → select unknowns → summary → confirm → execute
  - Preserve user custom files by default (no accidental deletion)
  - Multi-select UI for unknown files
  - Clear visibility: what syncs, what's removed, what's preserved
  - Remove all Chinese text (English only)

## 1.3.1

### Patch Changes

- Redesign sync flow for better clarity:
  - Remove duplicate config files in preserved list
  - Show MCP check in preview upfront (not after confirmation)
  - Combined preview: templates + MCP servers + preserved files
  - Clear sections with emojis for easy scanning

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
