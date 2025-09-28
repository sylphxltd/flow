# Prompt Engineering Core Repository

This repository is the central hub for prompt engineering best practices, modular rules, and templates designed for AI development agents. It enables consistent, ethical, and high-quality code generation across projects by providing self-contained guidelines on coding standards, tool usage, architecture, and more. Sync rules to agents like Cursor, Kilocode, or RooCode for seamless integration.

Key benefits:
- **Modular Design**: Compose rules for specific stacks (e.g., React + TypeScript).
- **AI-Optimized**: Imperative, concise prompts reduce ambiguity and improve outputs.
- **Extensible**: Adapt for new frameworks/tools; focus on timeless patterns.

For full guidelines, see [docs/README.md](docs/README.md).

## Quick Start

### Sync Rules to Your Agent
Install and apply rules with a single command—auto-detects your environment.

```bash
# Recommended: Auto-sync
npx github:sylphxltd/rules

# Target specific agent
npx github:sylphxltd/rules --agent=cursor    # For Cursor AI
npx github:sylphxltd/rules --agent=kilocode  # For Kilocode
npx github:sylphxltd/rules --agent=roocode   # For RooCode

# Preview changes without applying
npx github:sylphxltd/rules --dry-run
```

After sync: Restart your agent and verify rules load (e.g., check .cursor/rules/).

### Explore Documentation
- [📚 Full Guide](docs/README.md): Objectives, principles, and usage.
- [📋 Rule Categories](docs/README.md#rule-categories): Select by stack (e.g., general, framework-specific).
- [🚀 Installation Details](docs/README.md#usage-guide): Advanced sync options.

## Repository Structure
```
├── docs/                  # Core documentation and rules
│   ├── README.md         # Prompt engineering overview
│   ├── rules/            # Modular rule files (e.g., typescript.md, react.md)
│   └── ...               # Templates and stack guides
├── package.json          # NPM sync tool config
├── scripts/              # Internal sync utilities
└── README.md             # This entry point
```

Contribute rules via PRs—follow [docs/README.md#maintenance-and-contributions] for guidelines.