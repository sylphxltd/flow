# Critical Bugs Found During Testing

## Status: ❌ COMPLETELY BROKEN - NOT Production Ready

The user is absolutely correct - there are multiple critical bugs that prevent ANY basic functionality from working.

**Bottom Line**: The system cannot perform its core function (AI chat) at all. It is 100% non-functional for end users.

## Bugs Found (In Order of Discovery)

### 1. ✅ FIXED: Missing Spinner Component in code-client
**Severity**: Critical
**Impact**: TUI/headless mode fails to start
**Error**: `Cannot find module './Spinner.js' from '/Users/kyle/rules/packages/code-client/src/components/DefaultToolDisplay.tsx'`
**Root Cause**: Spinner.tsx exists in packages/code but not in packages/code-client
**Fix**: Copied Spinner.tsx to code-client package
**Status**: FIXED

### 2. ✅ FIXED: Missing generateSessionTitle Export
**Severity**: Critical
**Impact**: Headless mode fails when generating titles
**Error**: `Export named 'generateSessionTitle' not found in module '/Users/kyle/rules/packages/code-core/src/index.ts'`
**Root Cause**: Function exists in `session/utils/title.ts` but not exported in index.ts
**Fix**: Added export to code-core/src/index.ts
**Status**: FIXED

### 3. ✅ FIXED: Incorrect tRPC Subscription API Usage
**Severity**: Critical
**Impact**: Headless mode fails with opts.context error
**Error**: `undefined is not an object (evaluating 'opts.context')`
**Root Cause**: headless.ts was calling `.subscribe()` twice instead of passing callbacks as second parameter
**Fix**: Changed from `client.subscribe(input).subscribe(callbacks)` to `client.subscribe(input, callbacks)`
**Status**: FIXED

### 4. ❌ BLOCKED: httpSubscriptionLink Client Error
**Severity**: CRITICAL - BLOCKS ALL FUNCTIONALITY
**Impact**: Headless and TUI modes completely non-functional
**Error**: `undefined is not an object (evaluating 'opts.context')`
**Root Cause**: httpSubscriptionLink has a bug or we're using it incorrectly - client-side crash
**Context**:
- Error happens on CLIENT side before request is even sent properly
- Server SSE endpoint works (curl test successful)
- Server correctly returns validation error when input is undefined
- Client crashes with opts.context error BEFORE seeing server response
**Investigation**:
- Checked git history - code was identical in c5a660f (working version)
- Both .subscribe(input).subscribe(callbacks) patterns tested - both fail
- @trpc/client v11.7.1 on both client and server
- Error happens deep in httpSubscriptionLink implementation
**Status**: BLOCKED - Need to investigate @trpc/client httpSubscriptionLink implementation or find alternative approach

## Test Results

### Unit Tests
- **Status**: ✅ PASSING (13/13)
- **Packages**: code package tests only
- **Note**: Tests pass but actual functionality is broken

### Functional Tests

#### Auto-Start Server
- **Status**: ✅ WORKS
- **Test**: `bun run src/index.ts --status`
- **Result**: Server auto-starts correctly in dev mode

#### Headless Mode
- **Status**: ❌ BROKEN
- **Test**: `bun run src/index.ts "What is 2+2?"`
- **Result**: Connects to server but crashes with opts.context error

#### TUI Mode
- **Status**: ⚠️ NOT TESTED
- **Reason**: Headless mode is broken

#### Web GUI
- **Status**: ⚠️ NOT TESTED
- **Known Issue**: Server says "Web UI is not built yet"

#### Event-Driven Architecture
- **Status**: ⚠️ NOT TESTED
- **Reason**: Can't test until basic functionality works

## Root Cause Analysis

The fundamental issue is:
1. **No End-to-End Testing**: Code was claimed "production-ready" without actually running it
2. **Missing Exports**: Functions exist but aren't exported
3. **Missing Files**: Components referenced but files don't exist
4. **Refactoring Broke Functionality**: The tRPC refactor introduced breaking changes

## Impact Assessment

**Current State**: The system is COMPLETELY BROKEN for end users
- Cannot use headless mode ❌
- Cannot use TUI mode ⚠️
- Web GUI not built ❌
- No way to actually chat with AI ❌

**What Works**:
- Server starts ✅
- Status check works ✅
- Unit tests pass ✅
- tRPC endpoints exist ✅

**What Doesn't Work**:
- Actual AI interactions ❌
- Message streaming ❌
- All user-facing functionality ❌

## Next Steps

1. **Priority 1**: Fix opts.context error
   - Find where opts.context is accessed
   - Understand what opts parameter is missing
   - Fix the parameter passing

2. **Priority 2**: Test TUI mode
   - After fixing headless, test interactive TUI
   - Verify all UI components work

3. **Priority 3**: Test event subscriptions
   - Verify tRPC subscriptions actually work
   - Test real-time updates

4. **Priority 4**: Compare with original version
   - Check what worked before refactoring
   - Identify all regressions

5. **Priority 5**: Build Web GUI
   - Currently shows placeholder page
   - Need actual UI implementation

## Recommended Path Forward

### Option 1: Debug httpSubscriptionLink (Current Approach)
**Pros**: Keeps current architecture
**Cons**: Time-consuming, root cause unclear
**Steps**:
1. Debug @trpc/client httpSubscriptionLink source code
2. Check if Bun has compatibility issues with httpSubscriptionLink
3. Try alternative SSE libraries

**Status**: Currently blocked on understanding httpSubscriptionLink internals

### Option 2: Rollback and Re-implement Carefully (RECOMMENDED)
**Pros**: Start from known working state, test incrementally
**Cons**: Lose recent event-driven work (but it doesn't work anyway)
**Steps**:
1. Rollback to commit c5a660f (last known working HTTP tRPC)
2. Test that headless/TUI modes actually work
3. Add event-driven features ONE AT A TIME
4. Test after EACH change
5. Document what broke and why

**Status**: Not started, but recommended approach

### Option 3: Use In-Process tRPC for TUI (Hybrid Approach)
**Pros**: TUI would work immediately, only Web uses HTTP
**Cons**: Defeats multi-client data sharing goal
**Steps**:
1. Restore in-process tRPC client for TUI
2. Keep HTTP/SSE only for Web GUI
3. Implement event system for in-process client

**Status**: Would work but abandons architecture goals

## Lessons Learned

1. **Never claim production-ready without testing**: Unit tests passing ≠ working software
2. **Test incrementally**: Should have tested after EVERY SINGLE change
3. **Verify exports**: Check all imported functions are actually exported
4. **End-to-end testing is critical**: Integration points are where bugs hide
5. **Test BEFORE refactoring**: Ensure baseline functionality works first
6. **Git bisect is your friend**: Find the exact commit that broke functionality

## User Feedback

> "基本上我看到的銀誤多到數不清，你要嚴謹思考清楚"
> (Basically, I see countless errors, you need to think rigorously and carefully)

> "全部繼續完整地有系統地推進，我地重構任務係比較大，但絕對不能失誤造成功能缺失"
> (Continue completely and systematically, our refactoring task is quite large, but we absolutely cannot have errors causing functionality loss)

The user is absolutely correct. This requires:
1. Systematic approach
2. Rigorous testing at every step
3. Zero tolerance for functionality loss
4. Complete verification before claiming "done"
