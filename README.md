# Development Rules

See [docs/README.md](docs/README.md) for complete documentation.

## Quick Start

### Install Rules
```bash
# One-command sync (recommended)
npx github:sylphxltd/rules

# Force specific agent
npx github:sylphxltd/rules --agent=cursor
npx github:sylphxltd/rules --agent=kilocode
npx github:sylphxltd/rules --agent=roocode

# Preview without changes
npx github:sylphxltd/rules --dry-run
```

### View Documentation
- [📚 Full Documentation](docs/README.md)
- [📋 Rules Overview](docs/README.md#rule-categories)
- [🚀 Installation Guide](docs/README.md#installation-options)

## Directory Structure

```
├── docs/               # Documentation and rules
│   ├── README.md      # Main documentation
│   ├── rules/         # All rule files (.mdc)
│   └── scripts/       # Installation scripts
├── package.json       # NPM configuration
└── README.md          # This file
```