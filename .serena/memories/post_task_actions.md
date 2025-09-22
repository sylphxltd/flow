# Post-Task Completion Actions

After completing any development task in the rules repository (e.g., adding a new rule, updating documentation, modifying scripts), follow these steps to ensure quality and consistency:

## 1. Code Review and Validation
- **Self-Review**: Read through changes to ensure they align with modularity, self-containment, and AI-first principles
- **Style Check**: Verify no emojis, concise language, proper Markdown structure, tool-agnostic guidance
- **Scope Validation**: Confirm the rule's globs are precise and don't overlap with other files
- **Independence Test**: Ensure the new/updated file can be understood without referencing others

## 2. Testing
- **Script Testing** (if scripts modified):
  - Run `bash scripts/install-rules.sh --help` to check syntax
  - Test in a temporary directory: `mkdir temp-test && cd temp-test && bash ../scripts/install-rules.sh --minimal`
  - Verify output: Check for errors, correct file downloads, proper cleanup
- **Rule Installation Test** (if rules added/updated):
  - Install to a test project: `curl -fsSL ... | bash -s -- --all`
  - Verify files in `.cursor/rules`: `ls .cursor/rules/docs/rules/`
  - Pull updates: `cd .cursor/rules && git pull origin main`
- **NPM Script Test**:
  - `npm run install:nextjs` (test framework-specific)
  - Check package.json validity: No syntax errors

## 3. Linting and Formatting (Informal)
- **Markdown**: Manual check for consistent headers, lists, code blocks. No broken links
- **Bash**: Use `shellcheck scripts/install-rules.sh` (if shellcheck installed) or manual review for `set -e`, function modularity
- **JSON**: Validate package.json structure (e.g., all scripts point to existing files)

## 4. Commit and Push
- **Staging**: `git add <changed-files>` or `git add .` for all
- **Commit Message**: Descriptive, e.g., "Add ai-sdk-integration.mdc: Streaming patterns for AI tools"
  - Format: "Action: File/Description"
- **Push**: `git push origin main` (or feature branch)
- **Branch Management**: If on feature branch, create PR or merge to main

## 5. Documentation Update
- **Main README**: If new categories or major changes, update docs/README.md with new installation options or quick start
- **Rule Index**: Ensure docs/README.md#rule-categories lists new rules accurately
- **Changelog**: Consider adding to a CHANGELOG.md if it grows (not currently present)

## 6. Cleanup and Verification
- **Git Status**: `git status` to ensure no uncommitted changes
- **Build/Test Project**: If applicable, verify the rules work in a sample project setup
- **Edge Cases**: Test minimal, all, and interactive install modes

## When to Skip Steps
- Pure documentation reads/updates: Skip script testing
- Minor typos: Quick commit without full test

## Completion Checklist
- [ ] Changes follow style conventions
- [ ] Scripts/rules tested in isolation
- [ ] Committed with clear message
- [ ] Pushed to remote
- [ ] README updated if needed
- [ ] No errors in git status

These actions ensure the repository remains maintainable, modular, and reliable for AI development workflows.