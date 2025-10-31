---
name: Testing Strategies
description: Unit, integration, e2e, TDD, mocking, test architecture
---

# Testing Strategies

## Testing Pyramid
```
      /\
     /E2E\      (10% - Slow, expensive, brittle)
    /------\
   /Integr.\   (20% - Medium speed/cost)
  /----------\
 /Unit Tests \ (70% - Fast, cheap, stable)
```

## Unit Testing

### What to Test
**Do**: Business logic, edge cases, error handling, pure functions
**Don't**: Third-party libraries, implementation details, trivial code

### Best Practices

**AAA Pattern**: Arrange → Act → Assert

**Test names**: Describe behavior (`returns 404 when user not found`)

**One assertion per test** (ideally)

### Mocking

**When**: External APIs, databases, file system, time/date, random values
**How**: Mock boundaries only, not internal code

## Integration Testing

**Test**: Multiple units together, DB interactions, API endpoints, auth flows

**Database**: Use test DB, reset before each test, use transactions (rollback after)

## E2E Testing

**Test**: Critical user flows only (happy path + common errors)
**Example**: Login → Create → Edit → Delete → Logout

**Stability**: Use data-testid, wait for elements, retry assertions, headless in CI
**Speed**: Run parallel, skip UI steps (use API for setup)

## TDD (Test-Driven Development)

### Red-Green-Refactor
1. Write failing test
2. Write minimal code to pass
3. Refactor while keeping tests green

**Good for**: Well-defined requirements, complex logic, bug fixes
**Not for**: Prototypes, UI styling, simple CRUD

## Testing Patterns

### Parameterized Tests
```javascript
test.each([
  [1, 2, 3],
  [2, 3, 5],
])('adds %i + %i = %i', (a, b, expected) => {
  expect(add(a, b)).toBe(expected)
})
```

### Test Doubles
- **Stub**: Returns canned response
- **Mock**: Verifies interactions
- **Spy**: Records calls
- **Fake**: Working implementation (in-memory DB)

## Code Coverage

**Metrics**: Line, branch, function, statement
**Target**: 80%+ (critical paths 100%)

**Don't chase numbers**: Coverage ≠ quality. 70% with good tests > 95% shallow tests.

## React Component Testing

**React Testing Library**: Test user interactions, not implementation

**Query priority**: getByRole > getByLabelText > getByText > getByTestId

## Performance Testing

**Load Testing Metrics**: RPS, response time (p50/p95/p99), error rate, resource usage

**Scenarios**: Baseline (normal), stress (peak 3x), spike (sudden surge), soak (sustained hours)

**Tools**: k6, Artillery, JMeter

## CI/CD Integration

**On commit**: Linting, unit tests, integration tests
**On PR**: Full suite, coverage report, benchmarks
**On deploy**: E2E (staging), smoke tests (production)

## Common Pitfalls

❌ **Testing implementation** → Test public API/behavior
❌ **Brittle tests** → Use semantic queries, independent tests, proper waits
❌ **Slow tests** → Mock external calls, parallelize, focus on unit tests
❌ **Flaky tests** → Investigate root cause (timing, shared state, external deps)
