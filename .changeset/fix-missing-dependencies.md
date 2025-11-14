---
"@sylphx/flow": patch
---

Fix missing runtime dependencies in package.json

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
