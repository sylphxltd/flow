# Systematic Fix Plan - Restoring Full Functionality

## Current Situation (2025-11-04 21:15)

### Critical Finding
**Even "working" commits are broken!**
- Checked c5a660f (supposedly working HTTP tRPC refactor)
- SAME `@libsql/darwin-arm64` error as current version
- This means the build has been broken for multiple commits

### Root Cause Analysis
The issue is **NOT with recent refactoring** - it's with the **build/packaging approach**:
1. Native modules (@libsql) cannot be bundled by Bun build
2. Built dist/ files fail with module resolution errors
3. **BUT**: Running from SOURCE (bun run src/file.ts) works!

### Evidence
- Server starts successfully when run from source: `bun run packages/code-server/src/cli.ts`
- Unit tests pass (13/13) because they run from source
- Build output files fail because they try to load bundled native modules

## User Requirements

> "重點是我們所有功能之前都是正常運作的，重構後所有功能要保持正確運作，你可以參照以前的版本檢查功能完整性"
> (The key point is that all our functions were working normally before, after refactoring all functions should continue to work correctly, you can refer to previous versions to check functional integrity)

**Translation**: ALL functionality must work. Zero tolerance for regressions.

## Proposed Solution: Source-Only Approach

### Strategy
1. **Abandon dist/ builds** - They don't work with native modules anyway
2. **Run everything from source** - Already works!
3. **Use bun directly** - `#!/usr/bin/env bun` in entry files
4. **Fix actual functionality issues** - Not build issues

### Implementation Steps

#### Phase 1: Verify Source Works (NOW)
1. Test packages/code-server/src/cli.ts from source
2. Test packages/code/src/index.ts from source
3. Verify TUI, headless, and server modes
4. Document what actually works

#### Phase 2: Fix httpSubscriptionLink Error
1. Debug the `opts.context` error systematically
2. Check if it's Bun-specific issue
3. Try alternative approaches if needed
4. **Test after each change**

#### Phase 3: Restore All Functionality
Compare with older working commits:
- fa8b0fe: "complete Phase 4 - @sylphx/code-client fully functional"
- Test each feature systematically
- Fix regressions one by one

#### Phase 4: Update Documentation
- Remove all "build" instructions
- Document source-only approach
- Update package.json scripts

## Testing Checklist

### Must Work (In Order)
- [ ] Server starts from source
- [ ] Status check works
- [ ] Headless mode: Single prompt
- [ ] Headless mode: AI responds correctly
- [ ] TUI mode: Launches
- [ ] TUI mode: Can send message
- [ ] TUI mode: AI responds
- [ ] Web mode: Opens browser
- [ ] tRPC queries work
- [ ] tRPC mutations work
- [ ] tRPC subscriptions work
- [ ] Event system works
- [ ] Multi-client data sharing works

## Current Blockers

### Blocker 1: httpSubscriptionLink `opts.context` Error
**Status**: INVESTIGATING
**Impact**: Blocks ALL AI functionality
**Next Step**: Debug with source code, test with different @trpc versions

### Blocker 2: Missing Exports (FIXED)
- ✅ Spinner component
- ✅ generateSessionTitle function

## Commits to Reference

### Known Working (Probably)
- `fa8b0fe` - Phase 4 code-client fully functional
- Earlier commits before monorepo refactor

### Known Broken
- `c5a660f` - HTTP tRPC (same @libsql error)
- `9cbc026` - Current (multiple issues)

## Next Actions (Prioritized)

1. **NOW**: Test if c5a660f works when run from SOURCE (not built dist)
2. **NEXT**: If it works, compare with current version to find regression
3. **THEN**: Fix httpSubscriptionLink error systematically
4. **FINALLY**: Test EVERY feature against checklist

## Success Criteria

✅ **All functionality from before refactor works**
✅ **Event-driven architecture additions work**
✅ **No regressions**
✅ **Can chat with AI in all modes (TUI, headless, Web)**
