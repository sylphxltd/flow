# Rules System - Best Practices Built-In

Sylphx Flow's rules system ensures AI agents automatically follow industry best practices, coding standards, and security guidelines. You don't need to remind the AI about SOLID principles, security concerns, or testing - it's built-in.

## What Are Rules?

Rules are **guidelines and constraints** that AI agents follow when:
- Writing code
- Reviewing code
- Generating documentation
- Making architectural decisions

Think of rules as the **engineering team's collective wisdom** encoded into the AI.

## How Rules Work

### Automatic Application

Rules are automatically applied based on context:

```bash
# Request: "implement login"
sylphx-flow "implement login"

# AI automatically applies:
✅ Security rules (password hashing, input validation)
✅ Testing rules (unit tests for auth logic)
✅ Error handling rules (graceful failure handling)
✅ Code quality rules (clean code, SOLID principles)
```

### Rule Categories

Flow organizes rules into categories:

1. **Code Quality** - Clean code, maintainability
2. **Security** - OWASP guidelines, secure coding
3. **Testing** - Test coverage, TDD practices
4. **Performance** - Optimization patterns
5. **Documentation** - Code comments, API docs
6. **Architecture** - Design patterns, structure
7. **Error Handling** - Exception management
8. **Accessibility** - WCAG guidelines (for UI)

---

## Built-In Rules

### 1. Code Quality Rules

**SOLID Principles:**
- **S**ingle Responsibility - One reason to change
- **O**pen/Closed - Open for extension, closed for modification
- **L**iskov Substitution - Subtypes must be substitutable
- **I**nterface Segregation - Many specific interfaces > one general
- **D**ependency Inversion - Depend on abstractions

**Clean Code:**
- Meaningful variable names
- Small functions (< 20 lines ideal)
- No magic numbers
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple, Stupid)

**Example:**
```typescript
// ❌ AI won't generate this (violates rules)
function f(x) {
  if (x > 100) return x * 0.9;
  return x;
}

// ✅ AI generates this instead
function calculateDiscountedPrice(price: number): number {
  const DISCOUNT_THRESHOLD = 100;
  const DISCOUNT_RATE = 0.9;

  if (price > DISCOUNT_THRESHOLD) {
    return price * DISCOUNT_RATE;
  }
  return price;
}
```

---

### 2. Security Rules

**OWASP Top 10 Protection:**
- SQL Injection prevention
- XSS (Cross-Site Scripting) prevention
- CSRF protection
- Secure authentication
- Sensitive data exposure prevention
- Security misconfiguration checks
- Insecure deserialization prevention
- Using components with known vulnerabilities
- Insufficient logging & monitoring

**Secure Coding Practices:**
```typescript
// ❌ Insecure (AI won't generate)
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Secure (AI generates)
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);
```

**Password Handling:**
```typescript
// ❌ Plain text (AI won't generate)
user.password = req.body.password;

// ✅ Hashed (AI generates)
import bcrypt from 'bcrypt';
user.password = await bcrypt.hash(req.body.password, 10);
```

---

### 3. Testing Rules

**Test Coverage:**
- Critical paths: 100% coverage
- Business logic: 80%+ coverage
- Error cases: Always tested
- Edge cases: Documented and tested

**TDD Approach:**
1. Write test first
2. Implement minimal code to pass
3. Refactor
4. Repeat

**Example:**
```typescript
// AI generates both code AND tests

// Implementation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Tests (generated automatically)
describe('validateEmail', () => {
  test('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  test('rejects invalid email', () => {
    expect(validateEmail('invalid')).toBe(false);
  });

  test('rejects email without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });
});
```

---

### 4. Performance Rules

**Optimization Patterns:**
- Use appropriate data structures
- Avoid premature optimization
- Cache when beneficial
- Minimize network requests
- Lazy load when possible
- Use pagination for large datasets

**Example:**
```typescript
// ❌ Inefficient (AI avoids)
const result = users
  .filter(u => u.active)
  .filter(u => u.age > 18)
  .map(u => u.name);

// ✅ Efficient (AI generates)
const result = users
  .filter(u => u.active && u.age > 18)
  .map(u => u.name);
```

---

### 5. Documentation Rules

**Code Comments:**
- Explain **WHY**, not **WHAT**
- Complex logic requires comments
- Public APIs need JSDoc/TSDoc
- TODOs include ticket numbers

**Example:**
```typescript
// ❌ Obvious comment (AI avoids)
// Increment counter
counter++;

// ✅ Useful comment (AI includes)
// Use exponential backoff to avoid rate limiting
await sleep(Math.pow(2, retryCount) * 1000);
```

**API Documentation:**
```typescript
/**
 * Authenticates user with email and password
 *
 * @param email - User's email address
 * @param password - Plain text password (will be hashed)
 * @returns Authentication token or null if failed
 * @throws {ValidationError} If email format is invalid
 * @throws {AuthenticationError} If credentials are incorrect
 *
 * @example
 * ```typescript
 * const token = await authenticateUser('user@example.com', 'password123');
 * ```
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<string | null>
```

---

### 6. Architecture Rules

**Design Patterns:**
- Use established patterns (Factory, Singleton, Observer, etc.)
- Composition over inheritance
- Dependency injection for testability
- Single source of truth for state

**File Organization:**
- Feature-first over layer-first
- Colocate related code
- Clear separation of concerns

**Example:**
```
# ❌ Layer-first (AI avoids)
src/
  controllers/
  models/
  services/
  views/

# ✅ Feature-first (AI prefers)
src/
  auth/
    auth.controller.ts
    auth.service.ts
    auth.model.ts
    auth.test.ts
  users/
    users.controller.ts
    users.service.ts
    users.model.ts
```

---

### 7. Error Handling Rules

**Error Boundaries:**
- Catch errors at boundaries
- Log with context
- Fail gracefully
- Never swallow errors silently

**Example:**
```typescript
// ❌ Swallowing errors (AI won't do)
try {
  await processPayment(order);
} catch (error) {
  // Silent failure
}

// ✅ Proper error handling (AI generates)
try {
  await processPayment(order);
} catch (error) {
  logger.error('Payment processing failed', {
    orderId: order.id,
    error: error.message,
    stack: error.stack
  });

  // Graceful degradation
  await saveFailedPayment(order);
  throw new PaymentError('Payment failed, please try again');
}
```

---

### 8. Accessibility Rules (UI)

**WCAG 2.1 Compliance:**
- Semantic HTML
- ARIA labels when needed
- Keyboard navigation support
- Color contrast requirements
- Screen reader compatibility

**Example:**
```tsx
// ❌ Inaccessible (AI avoids)
<div onClick={handleClick}>Submit</div>

// ✅ Accessible (AI generates)
<button
  type="submit"
  onClick={handleClick}
  aria-label="Submit form"
>
  Submit
</button>
```

---

## Custom Rules

### Adding Custom Rules

Create custom rules in `.sylphx-flow/rules/`:

```typescript
// .sylphx-flow/rules/custom-naming.ts
export default {
  name: "Company Naming Convention",
  category: "code-quality",
  description: "Follow company-specific naming rules",
  rules: [
    "Use PascalCase for React components",
    "Prefix interfaces with 'I' (e.g., IUser)",
    "Use UPPER_SNAKE_CASE for constants",
    "Event handlers start with 'handle' (e.g., handleClick)"
  ],
  examples: [
    {
      bad: "const user_name = 'John';",
      good: "const userName = 'John';"
    }
  ]
};
```

### Rule Priority

When rules conflict, priority order:
1. **Custom rules** (your project)
2. **Security rules** (never override)
3. **Framework rules** (detected from package.json)
4. **General rules** (Flow defaults)

---

## Syncing Rules

Keep rules updated with latest best practices:

```bash
# Sync all rules
sylphx-flow --sync

# Sync specific platform
sylphx-flow --sync --target claude-code
sylphx-flow --sync --target opencode

# View rule changes before sync
sylphx-flow --sync --dry-run
```

**What syncing updates:**
- Security guidelines (new vulnerabilities)
- Framework best practices (new versions)
- Performance patterns (new optimizations)
- Testing strategies (new techniques)

---

## Rule Enforcement Levels

### Strict (Default)

AI **always** follows rules, refuses to violate:

```bash
User: "Create a SQL query with string concatenation"
AI: "I cannot create SQL queries with string concatenation due to
     SQL injection risk. I'll use parameterized queries instead."
```

### Flexible

AI explains rules but can be overridden:

```bash
User: "Just do it anyway, I know what I'm doing"
AI: "⚠️ Warning: This violates security best practices.
     Proceeding as requested..."
```

### Advisory

AI suggests improvements without blocking:

```bash
AI: "✅ Implementation complete.
     💡 Suggestion: Consider adding input validation for better security."
```

**Setting enforcement level:**
```json
// .sylphx-flow/settings.json
{
  "rules": {
    "enforcement": "strict",  // strict | flexible | advisory
    "categories": {
      "security": "strict",     // Always strict for security
      "performance": "advisory" // Flexible for performance
    }
  }
}
```

---

## Rules by Agent

Different agents emphasize different rules:

### Coder Agent
- ✅ Code quality (high priority)
- ✅ Testing (always included)
- ✅ Security (strict)
- ⚠️ Documentation (moderate)

### Reviewer Agent
- ✅ Security (maximum scrutiny)
- ✅ Code quality (strict checks)
- ✅ Performance (identifies issues)
- ✅ Best practices (comprehensive)

### Writer Agent
- ✅ Documentation (top priority)
- ✅ Clarity (clear language)
- ⚠️ Code quality (moderate)
- ⚠️ Technical accuracy (verified)

### Orchestrator Agent
- ✅ Architecture (system design)
- ✅ Dependencies (careful management)
- ✅ Risk assessment (thorough)
- ✅ All rules (comprehensive approach)

---

## Best Practices

### ✅ Do

- **Trust the rules** - They encode years of best practices
- **Add custom rules** - For company-specific patterns
- **Sync regularly** - Keep rules up-to-date
- **Review generated code** - Rules are guidelines, not perfect

### ❌ Don't

- **Don't override security rules** - Unless absolutely necessary
- **Don't add too many custom rules** - Keep it simple
- **Don't ignore rule violations** - They exist for a reason
- **Don't expect perfection** - AI is very good, not perfect

---

## Troubleshooting

### AI Ignoring Rules

```bash
# Verify rules are loaded
sylphx-flow --list-rules

# Resync rules
sylphx-flow --sync --force

# Check enforcement level
cat .sylphx-flow/settings.json | grep enforcement
```

### Conflicting Rules

```bash
# View rule priority
sylphx-flow --show-rule-priority

# Disable specific rule temporarily
sylphx-flow "task" --disable-rule "rule-name"
```

### Custom Rules Not Working

```bash
# Validate custom rules
sylphx-flow --validate-rules

# Check rule syntax
cat .sylphx-flow/rules/custom-rule.ts
```

---

## Learn More

- [Agents](/features/agents) - How agents use rules
- [Security Best Practices](/guide/security) - Detailed security guidelines
- [Code Quality](/guide/quality) - Writing clean, maintainable code
