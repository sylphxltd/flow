---
name: Testing Strategies
description: Unit, integration, e2e, TDD, mocking, test architecture
---

# Testing Strategies

## Testing Pyramid

**Concept:** More unit tests, fewer integration, minimal E2E

```
      /\
     /E2E\      (Few - Slow, expensive, brittle)
    /------\
   /Integr.\   (Some - Medium speed/cost)
  /----------\
 /Unit Tests \ (Many - Fast, cheap, stable)
/--------------\
```

**Distribution:** 70% unit, 20% integration, 10% E2E

## Unit Testing

### What to Test
**DO test:**
- Business logic
- Edge cases (null, empty, boundary values)
- Error handling
- Pure functions (same input → same output)

**DON'T test:**
- Third-party libraries (trust them)
- Implementation details (test behavior, not internals)
- Trivial code (getters/setters)

### Best Practices
**Arrange-Act-Assert pattern:**
```javascript
test('calculates total with discount', () => {
  // Arrange
  const items = [{ price: 100 }, { price: 200 }]
  const discount = 0.1
  
  // Act
  const total = calculateTotal(items, discount)
  
  // Assert
  expect(total).toBe(270)
})
```

**Test names should describe behavior:**
```javascript
// BAD
test('test1')

// GOOD
test('returns 404 when user not found')
test('throws error when email is invalid')
```

**One assertion per test (ideally):**
- Easier to debug failures
- Clear what's being tested
- Exception: Testing object shape

### Mocking
**When to mock:**
- External APIs
- Databases
- File system
- Time/Date
- Random values

**How to mock:**
```javascript
// Mock module
jest.mock('./api')

// Mock function
const mockFn = jest.fn().mockReturnValue(42)

// Spy on existing
const spy = jest.spyOn(obj, 'method')
```

**Don't over-mock:**
- Mock boundaries (external dependencies)
- Don't mock internal code (test real behavior)

## Integration Testing

### What to Test
- Multiple units working together
- Database interactions
- API endpoints
- Authentication/authorization flows

### API Testing
```javascript
test('POST /users creates user', async () => {
  const response = await request(app)
    .post('/users')
    .send({ name: 'John', email: 'john@example.com' })
    .expect(201)
  
  expect(response.body.id).toBeDefined()
  expect(response.body.name).toBe('John')
})
```

### Database Testing
**Use test database:**
- Separate from development/production
- Reset before each test (clean state)
- Use transactions (rollback after test)

**Fixtures:**
```javascript
beforeEach(async () => {
  await db.users.create({ id: 1, name: 'Test User' })
})

afterEach(async () => {
  await db.users.deleteAll()
})
```

## E2E Testing

### What to Test
- Critical user flows only
- Happy path + most common errors
- Example: Login → Create item → Edit → Delete → Logout

### Best Practices
**Playwright/Cypress patterns:**
```javascript
test('user can complete purchase', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[name=email]', 'test@example.com')
  await page.fill('[name=password]', 'password')
  await page.click('button[type=submit]')
  
  // Add to cart
  await page.goto('/products/123')
  await page.click('button:text("Add to Cart")')
  
  // Checkout
  await page.goto('/cart')
  await page.click('button:text("Checkout")')
  
  // Assert
  await expect(page).toHaveURL('/order-confirmation')
})
```

**Stability:**
- Use data-testid over CSS selectors
- Wait for elements (don't use hard sleeps)
- Retry flaky assertions
- Run in headless mode in CI

**Speed:**
- Run in parallel
- Skip unnecessary steps (direct URL instead of clicking)
- Use API for setup (create user via API, not UI)

## Test-Driven Development (TDD)

### Red-Green-Refactor
1. **Red:** Write failing test
2. **Green:** Write minimal code to pass
3. **Refactor:** Improve code while keeping tests green

### Benefits
- Better design (testable code)
- Documentation (tests show usage)
- Confidence in changes
- Regression prevention

### When to Use
**Good for:**
- Well-defined requirements
- Complex business logic
- Bug fixes (write test that reproduces)

**Not necessary for:**
- Prototypes/spikes
- UI styling
- Simple CRUD

## Testing Patterns

### AAA Pattern (Arrange-Act-Assert)
```javascript
test('example', () => {
  const input = createInput()      // Arrange
  const result = doSomething(input) // Act
  expect(result).toBe(expected)     // Assert
})
```

### Test Doubles
**Dummy:** Passed but never used
**Stub:** Returns canned response
**Mock:** Verifies interactions (called with X)
**Spy:** Records calls for later assertion
**Fake:** Working implementation (in-memory DB)

### Parameterized Tests
```javascript
test.each([
  [1, 2, 3],
  [2, 3, 5],
  [-1, 1, 0],
])('adds %i + %i to equal %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected)
})
```

## Code Coverage

### Metrics
- **Line coverage:** % of lines executed
- **Branch coverage:** % of if/else branches taken
- **Function coverage:** % of functions called
- **Statement coverage:** % of statements executed

### Targets
- **80%+ is good** for most projects
- **100% is not necessary** (diminishing returns)
- **Focus on critical paths** (auth, payments, data integrity)

### Don't Chase Numbers
- Coverage ≠ quality
- High coverage with bad tests is useless
- Better: 70% coverage with good tests than 95% with shallow tests

## Testing React Components

### React Testing Library
**Philosophy:** Test how users interact, not implementation

```javascript
test('shows error when email invalid', async () => {
  render(<LoginForm />)
  
  // User types invalid email
  await userEvent.type(
    screen.getByLabelText(/email/i),
    'invalid'
  )
  await userEvent.click(
    screen.getByRole('button', { name: /submit/i })
  )
  
  // Error appears
  expect(
    screen.getByText(/invalid email/i)
  ).toBeInTheDocument()
})
```

**Query priority:**
1. getByRole (accessibility)
2. getByLabelText (forms)
3. getByText (content)
4. getByTestId (last resort)

### Component Testing Checklist
- [ ] Renders correctly with props
- [ ] Handles user interactions
- [ ] Shows loading/error states
- [ ] Calls callbacks with correct args
- [ ] Conditional rendering works
- [ ] Accessibility (keyboard, screen reader)

## Performance Testing

### Load Testing
**Metrics:**
- Requests per second
- Response time percentiles (p50, p95, p99)
- Error rate
- Resource usage (CPU, memory)

**Tools:** k6, Artillery, JMeter, Gatling

**Scenarios:**
- Baseline: Normal traffic
- Stress: Peak traffic (3x normal)
- Spike: Sudden surge
- Soak: Sustained load (hours)

### Profiling
**Frontend:**
- Chrome DevTools Performance
- React Profiler
- Lighthouse

**Backend:**
- APM tools (New Relic, Datadog)
- Profilers (Node --prof, py-spy)
- Database query analysis

## Continuous Testing

### CI/CD Integration
```yaml
# Run on every commit
- Linting
- Unit tests
- Integration tests

# Run on PR
- Full test suite
- Code coverage report
- Performance benchmarks

# Run on deploy
- E2E tests (staging)
- Smoke tests (production)
```

### Test Automation
- Run tests on file change (watch mode)
- Pre-commit hooks (lint + quick tests)
- Automated visual regression (Percy, Chromatic)

## Common Pitfalls

### Testing Implementation
**Bad:** Testing internal state
**Good:** Testing public API/behavior

### Brittle Tests
**Causes:** CSS selectors, test order dependency, timing issues
**Fix:** Use semantic queries, independent tests, proper waits

### Slow Tests
**Causes:** Real network calls, no parallelization, too many E2E
**Fix:** Mock external calls, run in parallel, focus on unit tests

### Ignoring Flaky Tests
**Problem:** Tests that randomly fail
**Fix:** Investigate root cause (timing, shared state, external dependency)
