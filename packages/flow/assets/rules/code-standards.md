---
name: Code Standards
description: Shared coding standards for Coder and Reviewer agents
---

# CODE STANDARDS

## Task Approach

### Understanding Depth
- **Shallow OK**: Well-defined, low-risk, established patterns → Implement
- **Deep required**: Ambiguous, high-risk, novel, irreversible → Investigate first

### Complexity Navigation
- **Mechanical**: Known patterns → Execute fast
- **Analytical**: Multiple components → Design then build
- **Emergent**: Unknown domain → Research, prototype, design, build

### State Awareness
- **Flow**: Clear path, tests pass → Push forward
- **Friction**: Hard to implement, messy → Reassess, simplify
- **Uncertain**: Missing info → Assume reasonably, document, continue

**Signals to pause**: Can't explain simply, too many caveats, hesitant without reason, over-confident without alternatives.

---

## Structure

**Feature-first over layer-first**: Organize by functionality, not type.

```
✅ features/auth/{api, hooks, components, utils}
❌ {api, hooks, components, utils}/auth
```

**File size limits**:
Component <250 lines, Module <300 lines.
Larger → split by feature or responsibility.

---

## Programming Patterns

**3+ params → named args**:
```typescript
✅ updateUser({ id, email, role })
❌ updateUser(id, email, role)
```

**Functional composition**:
Pure functions where possible. Immutable data. Explicit side effects.

**Composition over inheritance**:
Prefer mixins, HOCs, hooks. Dependency injection > tight coupling.

**Declarative over imperative**:
```typescript
✅ const active = users.filter(u => u.isActive)
❌ const active = []; for (let i = 0; i < users.length; i++) { ... }
```

**Event-driven when appropriate**:
Decouple components through events/messages. Pub/sub for cross-cutting concerns.

---

## Quality Standards

**YAGNI**: Build what's needed now, not hypothetical futures.

**KISS**: Simple > complex.

**DRY**: Extract on 3rd duplication. Balance with readability.

**Single Responsibility**: One reason to change per module.

**Dependency Inversion**: Depend on abstractions, not implementations.

---

## Code Quality Checklist

**Naming**:
- [ ] Functions: verbs (getUserById, calculateTotal)
- [ ] Booleans: is/has/can (isActive, hasPermission)
- [ ] Classes: nouns (UserService, AuthManager)
- [ ] Constants: UPPER_SNAKE_CASE
- [ ] No abbreviations unless universal (req/res ok, usr/calc not ok)

**Testing**:
- [ ] Critical paths: 100% coverage
- [ ] Business logic: 80%+ coverage
- [ ] Edge cases explicitly tested
- [ ] Error paths tested
- [ ] Test names describe behavior, not implementation

**Comments**:
- [ ] Explain WHY, not WHAT
- [ ] Complex logic has reasoning
- [ ] Non-obvious decisions documented
- [ ] TODOs forbidden (implement or delete)

**Type Safety**:
- [ ] Make illegal states unrepresentable
- [ ] No `any` without justification
- [ ] Null/undefined handled explicitly
- [ ] Union types over loose types

---

## Security Standards

**Input Validation**:
Validate at boundaries (API, forms, file uploads). Whitelist > blacklist.
Sanitize before storage/display. Use schema validation (Zod, Yup).

**Authentication/Authorization**:
Auth required by default (opt-in to public). Deny by default.
Check permissions at every entry point. Never trust client-side validation.

**Data Protection**:
Never log: passwords, tokens, API keys, PII.
Encrypt sensitive data at rest. HTTPS only.
Secure cookie flags (httpOnly, secure, sameSite).

**Risk Mitigation**:
Rollback plan for risky changes. Feature flags for gradual rollout.
Circuit breakers for external services.

---

## Error Handling

**At Boundaries**:
```typescript
✅ try { return Ok(data) } catch { return Err(error) }
❌ const data = await fetchUser(id) // let it bubble
```

**Expected Failures**:
Use Result/Either types. Never exceptions for control flow. Return errors as values.

**Logging**:
Include context (user id, request id). Actionable messages.
Appropriate severity. Never mask failures.

**Retry Logic**:
Transient failures (network, rate limits) → retry with exponential backoff.
Permanent failures (validation, auth) → fail fast.
Max retries: 3-5 with jitter.

---

## Performance Patterns

**Query Optimization**:
```typescript
❌ for (const user of users) { user.posts = await db.posts.find(user.id) }
✅ const posts = await db.posts.findByUserIds(users.map(u => u.id))
```

**Algorithm Complexity**:
O(n²) in hot paths → reconsider algorithm.
Nested loops on large datasets → use hash maps.
Repeated calculations → memoize.

**Data Transfer**:
Large payloads → pagination or streaming.
API responses → only return needed fields.
Images/assets → lazy load, CDN.

**When to Optimize**:
Only with data showing bottleneck. Profile before optimizing.
Measure impact. No premature optimization.

---

## Refactoring Triggers

**Extract function when**:
- 3rd duplication appears
- Function >20 lines
- >3 levels of nesting
- Cognitive load high

**Extract module when**:
- File >300 lines
- Multiple unrelated responsibilities
- Difficult to name clearly

**Immediate refactor**:
Thinking "I'll clean later" → Clean NOW.
Adding TODO → Implement NOW.
Copy-pasting → Extract NOW.

---

## Anti-Patterns

**Technical Debt**:
- ❌ "I'll clean this later" → You won't
- ❌ "Just one more TODO" → Compounds
- ❌ "Tests slow me down" → Bugs slow more
- ✅ Refactor AS you work, not after

**Reinventing the Wheel**:
Before ANY feature: research best practices + search codebase + check package registry + check framework built-ins.

```typescript
❌ Custom Result type → ✅ import { Result } from 'neverthrow'
❌ Custom validation → ✅ import { z } from 'zod'
❌ Custom date formatting → ✅ import { format } from 'date-fns'
```

**Premature Abstraction**:
- ❌ Interfaces before 2nd use case
- ❌ Generic solutions for specific problems
- ✅ Solve specific first, extract when pattern emerges

**Copy-Paste Without Understanding**:
- ❌ Stack Overflow → paste → hope
- ✅ Stack Overflow → understand → adapt

**Working Around Errors**:
- ❌ Suppress error, add fallback
- ✅ Fix root cause

---

## Code Smells

**Complexity**:
Function >20 lines → extract.
>3 nesting levels → flatten or extract.
>5 parameters → use object or split.
Deeply nested ternaries → use if/else or early returns.

**Coupling**:
Circular dependencies → redesign.
Import chains >3 levels → reconsider architecture.
Tight coupling to external APIs → add adapter layer.

**Data**:
Mutable shared state → make immutable or encapsulate.
Global variables → dependency injection.
Magic numbers → named constants.
Stringly typed → use enums/types.

**Naming**:
Generic names (data, info, manager, utils) → be specific.
Misleading names → rename immediately.
Inconsistent naming → align with conventions.

---

## Data Handling

**Self-Healing at Read**:
```typescript
function loadConfig(raw: unknown): Config {
  const parsed = ConfigSchema.safeParse(raw)
  if (!parsed.success) {
    const fixed = applyDefaults(raw)
    const retry = ConfigSchema.safeParse(fixed)
    if (retry.success) {
      logger.info('Config auto-fixed', { issues: parsed.error })
      return retry.data
    }
  }
  if (!parsed.success) throw new ConfigError(parsed.error)
  return parsed.data
}
```

**Single Source of Truth**:
Configuration → Environment + config files.
State → Single store (Redux, Zustand, Context).
Derived data → Compute from source, don't duplicate.

**Data Flow**:
```
External → Validate → Transform → Domain Model → Storage
Storage → Domain Model → Transform → API Response
```

Never skip validation at boundaries.
