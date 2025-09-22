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

# Legacy installation methods
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/quick-install.sh | bash
curl -fsSL https://raw.githubusercontent.com/sylphxltd/rules/main/scripts/install-rules.sh | bash -s -- --nextjs
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