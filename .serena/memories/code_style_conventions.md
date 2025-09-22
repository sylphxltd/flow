# Code Style and Conventions

## General Principles for Rule Files (.mdc, .md)
- **Modularity**: Each file is self-contained; no dependencies on other files
- **AI-First Writing**: Concise, practical, actionable guidance for AI agents. Focus on "how to" implement patterns, not "why"
- **No Decorative Elements**: Remove all emojis, excessive formatting. Use plain, structured Markdown
- **Tool-Agnostic**: Guide patterns and best practices without mandating specific tools (unless essential for the rule)
- **Precise Scope**: Define exact file globs/patterns the rule applies to at the top of each file
- **Pattern-Focused**: Emphasize code patterns, structure, and implementation over theory
- **Self-Contained**: Can be read and understood independently without external references
- **Progressive**: Cover basic to advanced use cases where applicable
- **Future-Proof**: Write timeless principles that adapt to evolving technologies

## Bash Scripts (.sh)
- **Error Handling**: Use `set -e` for strict mode; check dependencies (e.g., git)
- **Color Output**: Define colors (RED, GREEN, etc.) for user-friendly CLI feedback
- **Modular Functions**: Break logic into functions (e.g., show_help, check_dependencies, download_rules)
- **Option Parsing**: Handle CLI flags with case statements; provide --help
- **Quiet Operations**: Use --quiet flags for git/curl to reduce noise
- **Directory Management**: Use mkdir -p; cd carefully with error checks
- **Shebang**: #!/bin/bash at top
- **Comments**: Inline comments for complex logic; header comments for script purpose

## JSON (package.json)
- Standard NPM format: name, version, description, scripts, repository, keywords, author, license
- Scripts section: Map to bash installer with framework-specific options (e.g., "install:nextjs")

## Naming Conventions
- Files: Descriptive, lowercase with hyphens (e.g., general.mdc, install-rules.sh)
- Variables: snake_case in bash (e.g., RULES_DIR)
- Functions: snake_case or descriptive (e.g., selective_install)
- Rule Categories: Organized in subdirs (e.g., framework/nextjs.mdc)

## Documentation Standards
- **README.md**: Structured with sections (Quick Start, Directory Structure, Installation)
- **Headers**: Use # for main titles, ## for sections, ### for subsections
- **Code Blocks**: Use ```bash for scripts, ```typescript for examples
- **Lists**: Bullet points for features, numbered for steps
- **Links**: Internal Markdown links (e.g., [docs/README.md](docs/README.md))

## Overall Conventions
- **Consistency**: Follow Markdown best practices; no mixed styles
- **Conciseness**: Avoid fluff; direct and to-the-point
- **Accessibility**: Plain text where possible; structured for easy parsing by AI
- **Versioning**: Update version in package.json; use git tags for releases
- **No Type Hints/Docstrings**: Not applicable (docs and scripts, not typed code)