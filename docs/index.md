---
layout: home

hero:
  name: "Sylphx Flow"
  text: "AI-Powered Development Automation"
  tagline: Stop writing prompts. Start building software.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/sylphxltd/flow

features:
  - icon: 🔄
    title: Loop Mode
    details: Autonomous continuous execution with automatic context preservation. Claude Code supported.

  - icon: 📝
    title: File Input Support
    details: Load prompts from files for complex, reusable instructions. No shell escaping issues.

  - icon: 🧠
    title: Smart Configuration
    details: Intelligent defaults that learn from your choices. Configure once, use forever.

  - icon: 🔌
    title: OpenCode Integration
    details: Full support for OpenCode (Claude Code alternative) with auto-detection and migration.

  - icon: ⚡
    title: MEP Architecture
    details: Minimal Effective Prompt - AI adapts to you, not the other way around.

  - icon: 🌐
    title: 70+ Languages
    details: StarCoder2 tokenization for true semantic code understanding across all major languages.
---

## Quick Example

```bash
# Continuous autonomous work (Claude Code)
sylphx-flow "process all github issues" --loop --target claude-code

# With wait time for polling
sylphx-flow "check for new commits" --loop 300 --max-runs 20

# Load prompts from files
sylphx-flow "@complex-task.txt"
```

## Why Sylphx Flow?

**90% less prompt. 100% better code.**

Traditional AI coding tools make you work too hard - spending more time writing prompts than code. Sylphx Flow changes that with autonomous agents that understand your codebase, follow your patterns, and work continuously until you tell them to stop.

## Installation

```bash
# Install globally
bun install -g @sylphx/flow

# Start using (auto-initializes on first use)
sylphx-flow "implement authentication"
```

[Get Started →](/guide/getting-started)
