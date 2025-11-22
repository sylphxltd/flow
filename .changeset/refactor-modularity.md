---
"@sylphx/flow": patch
---

Refactor codebase for better modularity and maintainability

- Split flow-command.ts into focused modules (1207 → 258 lines, 78% reduction)
- Reorganize utils into feature-based directories (config, display, files, security)
- Extract reusable utilities (version, banner, status, prompt resolution)
- Create modular flow command structure in src/commands/flow/
- Add JSONC parser utility for JSON with comments support
- Update all imports to use new modular structure
- Improve code organization and separation of concerns
