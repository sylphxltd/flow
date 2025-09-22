# Project Overview

## Purpose
This repository provides modular, self-contained development rules designed specifically for AI coding agents. The rules guide AI agents in generating consistent, high-quality code across various technology stacks and projects. Rules are categorized by general practices, languages (eTypeScript), frameworks (React, SvelteKit, Next.js, Flutter), and tools (Biome, PandaCSS, Drizzle, tRPC, Zustand).

The project enables easy installation of relevant rule subsets into other projects via bash scripts, targeting AI-assisted development workflows in Cursor or similar IDEs.

## Tech Stack
- **Documentation**: Markdown (.md, .mdc files) for rules
- **Scripts**: Bash (.sh) for installation and management
- **Configuration**: JSON (package.json for npm integration)
- **Version Control**: Git
- **Platform**: Darwin (macOS)
- No runtime dependencies; it's a static documentation and script repository.

## Codebase Structure
- **docs/**: Main documentation directory
  - README.md: Comprehensive guide to rules, installation, and usage
  - rules/: Categorized .mdc rule files (ai/, backend/, core/, data/, devops/, framework/, misc/, security/, ui/)
  - scripts/: Installation scripts (install-rules.sh, quick-install.sh) – wait, no, scripts are at root
- **scripts/**: Root-level bash scripts for rule installation
- **Root files**:
  - README.md: Quick start and overview
  - package.json: NPM package configuration with install scripts
  - .gitignore: Standard ignores

The codebase is primarily documentation-focused with utility scripts. No application code to run; focus is on maintaining and extending rule documents.

## Key Features
- Modular rules: Each .mdc file is independent and composable
- Installation automation: Scripts clone/download rules to .cursor/rules in target projects
- Framework-agnostic core principles with specific extensions
- AI-optimized: Rules written for AI agents – concise, actionable, pattern-focused