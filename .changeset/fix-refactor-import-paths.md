---
"@sylphx/flow": patch
---

Fix broken imports and Ctrl+C handling

- Fix Ctrl+C gracefully exits during target selection instead of showing stack trace
- Restore accidentally deleted object-utils.ts file
- Correct 16 broken relative import paths from refactor reorganization:
  - target-config.ts: Fix imports to config/, core/, services/ (5 paths)
  - sync-utils.ts: Fix imports to types, servers, paths (3 paths)
  - mcp-config.ts: Fix imports to config/, core/, target-config (4 paths)
  - target-utils.ts: Fix import to types (1 path)
  - execute.ts, setup.ts, flow-orchestrator.ts: Fix sync-utils paths (3 paths)

All module resolution errors fixed. Application now runs successfully.
