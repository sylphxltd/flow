---
"@sylphx/flow": patch
---

Remove root assets directory and simplify publish flow:

**Cleanup:**
- Removed duplicate root assets/ directory (4080 lines)
- packages/flow/assets/ is now single source of truth
- Updated prepublishOnly to no-op (assets already in package)

**Templates (now correctly published):**
- Agents: coder, orchestrator, reviewer, writer (MEP optimized)
- Rules: core, code-standards, workspace (MEP optimized + NEW)
- Slash commands: cleanup, improve, polish, quality, release (NEW)
- Output styles: silent (prevent report files)

**Root cause:** Root assets/ was copied to package during publish, causing template sync issues.
