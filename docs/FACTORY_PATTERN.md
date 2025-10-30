# Factory Function Pattern for Service Conversion

## Goal
Convert class-based services to pure functional factory functions following FP principles.

## Pattern

### Before: Class-Based Service
```typescript
export class MyService {
  private state: SomeState;
  private config: Config;

  constructor(
    private readonly dependency: Dependency,
    config: Config = {}
  ) {
    this.config = config;
    this.state = initialState;
  }

  async method(input: Input): Promise<Output> {
    // Access this.dependency, this.state, this.config
    const result = await this.dependency.doSomething(input);
    this.state = newState; // Mutation!
    return result;
  }

  dispose(): void {
    // Cleanup
  }
}

// Usage
const service = new MyService(dependency, config);
const result = await service.method(input);
service.dispose();
```

### After: Factory Function
```typescript
// Dependencies type
interface MyServiceDeps {
  readonly dependency: Dependency;
  readonly logger: ILogger;
}

// Configuration type
interface MyServiceConfig {
  readonly option1?: string;
  readonly option2?: number;
}

// Service interface (public API)
interface MyService {
  readonly method: (input: Input) => Promise<Result<Output, ErrorType>>;
  readonly dispose: () => Promise<void>;
}

// Internal state type (if needed)
interface MyServiceState {
  readonly someValue: string;
  readonly cache: ReadonlyMap<string, Data>;
}

// Factory function
export const createMyService = (
  deps: MyServiceDeps,
  config: MyServiceConfig = {}
): MyService => {
  // Initialize immutable state
  let state: MyServiceState = {
    someValue: '',
    cache: new Map(),
  };

  // Helper functions (pure when possible)
  const updateState = (newState: Partial<MyServiceState>): void => {
    state = { ...state, ...newState };
  };

  // Public methods
  const method = async (input: Input): Promise<Result<Output, ErrorType>> => {
    return await tryCatchAsync(
      async () => {
        const result = await deps.dependency.doSomething(input);

        // Immutable state update
        updateState({
          someValue: result.value,
          cache: new Map(state.cache).set(input.key, result.data),
        });

        return result;
      },
      (error) => new ServiceError('Operation failed', error)
    );
  };

  const dispose = async (): Promise<void> => {
    // Cleanup
    state = { someValue: '', cache: new Map() };
    deps.logger.info('Service disposed');
  };

  // Return service interface
  return {
    method,
    dispose,
  };
};

// Usage
const service = createMyService({ dependency, logger }, config);
const result = await service.method(input);
await service.dispose();
```

## Key Principles

### 1. Explicit Dependencies
- All dependencies injected via `deps` parameter
- No hidden dependencies (no imports of singletons)
- Dependencies are readonly

### 2. Immutable State
- State stored in closure
- State updates create new state object
- Use spread operators for updates
- Never mutate existing state

### 3. Pure Functions When Possible
- Helper functions should be pure
- Side effects isolated to service methods
- Testable in isolation

### 4. Result Type for Errors
- All operations return `Result<T, E>`
- Errors explicit in return types
- No throwing exceptions

### 5. Clear Interface
- Service interface defines public API
- Implementation details hidden
- Factory returns interface, not class instance

## Migration Steps

### Step 1: Define Types
```typescript
// Dependencies
interface ServiceDeps {
  readonly dep1: Dep1;
  readonly dep2: Dep2;
  readonly logger: ILogger;
}

// Config
interface ServiceConfig {
  readonly option1?: string;
}

// Public interface
interface Service {
  readonly method1: (input: Input1) => Promise<Result<Output1, Error1>>;
  readonly method2: (input: Input2) => Promise<Result<Output2, Error2>>;
}
```

### Step 2: Create Factory Function
```typescript
export const createService = (
  deps: ServiceDeps,
  config: ServiceConfig = {}
): Service => {
  // State in closure
  let state = initialState;

  // Helper functions
  const helper = (input: Input): Output => {
    // Pure function
  };

  // Public methods
  const method1 = async (input: Input1): Promise<Result<Output1, Error1>> => {
    return await tryCatchAsync(
      async () => {
        // Implementation using deps and state
      },
      (error) => new Error1('Failed', error)
    );
  };

  return { method1, method2 };
};
```

### Step 3: Update Tests
```typescript
// Before
describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService(mockDep);
  });

  it('should work', async () => {
    const result = await service.method(input);
    expect(result).toBe(expected);
  });
});

// After
describe('createMyService', () => {
  const createTestService = () => {
    const deps: MyServiceDeps = {
      dependency: mockDep,
      logger: mockLogger,
    };
    return createMyService(deps);
  };

  it('should work', async () => {
    const service = createTestService();
    const result = await service.method(input);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe(expected);
    }
  });
});
```

### Step 4: Update Callers
```typescript
// Before
const service = new MyService(dep, config);
const result = await service.method(input);

// After
const service = createMyService({ dep, logger }, config);
const result = await service.method(input);

if (isSuccess(result)) {
  // Handle success
} else {
  // Handle error
}
```

## Benefits

### Testability
- Easy to mock dependencies
- No need for dependency injection framework
- Pure functions testable in isolation

### Immutability
- No hidden state mutations
- Predictable behavior
- Easier to reason about

### Composability
- Services can be composed easily
- Functions can be extracted and reused
- Clear dependency graph

### Type Safety
- All dependencies explicit
- Configuration typed
- Return types explicit

## Common Patterns

### Stateful Services
```typescript
const createStatefulService = (deps: Deps): Service => {
  let state: State = initialState;

  const updateState = (updates: Partial<State>): void => {
    state = { ...state, ...updates };
  };

  return { method };
};
```

### Cleanup/Disposal
```typescript
const createServiceWithCleanup = (deps: Deps): Service => {
  let timer: NodeJS.Timeout | undefined;

  const dispose = async (): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return { method, dispose };
};
```

### Caching
```typescript
const createCachedService = (deps: Deps): Service => {
  let cache: CacheState<K, V> = createCache();

  const method = async (key: K): Promise<Result<V, E>> => {
    const cached = cacheGet(cache, key);
    if (cached) {
      return { _tag: 'Success', value: cached };
    }

    // Fetch and cache
    const result = await fetch(key);
    cache = cacheSet(cache, key, result);
    return { _tag: 'Success', value: result };
  };

  return { method };
};
```

## Anti-Patterns to Avoid

### ❌ Don't: Mutate State Directly
```typescript
const bad = () => {
  let state = { count: 0 };

  const increment = () => {
    state.count++; // Mutation!
  };
};
```

### ✅ Do: Create New State
```typescript
const good = () => {
  let state = { count: 0 };

  const increment = () => {
    state = { ...state, count: state.count + 1 };
  };
};
```

### ❌ Don't: Use `this`
```typescript
// Classes use `this` - avoid
class Service {
  method() {
    return this.dependency.call();
  }
}
```

### ✅ Do: Use Closure
```typescript
// Factory functions use closures
const createService = (deps: Deps) => {
  const method = () => {
    return deps.dependency.call();
  };

  return { method };
};
```

### ❌ Don't: Throw Errors
```typescript
const bad = async (input: Input): Promise<Output> => {
  if (!input) {
    throw new Error('Invalid input');
  }
  // ...
};
```

### ✅ Do: Return Result
```typescript
const good = async (input: Input): Promise<Result<Output, ValidationError>> => {
  if (!input) {
    return { _tag: 'Failure', error: new ValidationError('Invalid input') };
  }
  // ...
};
```

## Next Steps

1. Start with simplest service (fewest dependencies, least state)
2. Convert one service at a time
3. Update tests immediately
4. Verify tests pass before moving to next service
5. Document any patterns discovered
