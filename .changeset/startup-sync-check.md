---
"@sylphx/flow": patch
---

Add startup check for new templates:
- Detects missing templates on startup (new templates not installed locally)
- Shows notification with count of new agents/commands/rules
- Prompts user to run --sync to install
- Ignores unknown files (custom user files)
- Non-blocking - just informational
