# Error Handling Migration Example

## Current State: MemoryResult

```typescript
// Custom ad-hoc result type
export interface MemoryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    namespace: string;
    timestamp: number;
    size?: number;
  };
}

// Usage
async get(key: string, namespace: string): Promise<MemoryResult<string>> {
  try {
    const entry = await this.repository.getByKey(key, namespace);

    if (!entry) {
      return {
        success: false,
        error: `Memory entry not found: ${key}`,
      };
    }

    return {
      success: true,
      data: entry.value,
      metadata: {
        namespace,
        timestamp: entry.timestamp,
        size: entry.value.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Caller
const result = await memoryService.get('key', 'namespace');
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

## Target State: Result Type

```typescript
import { Result, success, failure, tryCatchAsync } from '../core/functional/result.js';

// Define error types
class MemoryNotFoundError extends Error {
  constructor(key: string, namespace: string) {
    super(`Memory entry not found: ${key} in namespace ${namespace}`);
    this.name = 'MemoryNotFoundError';
  }
}

class MemoryError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'MemoryError';
    this.cause = cause;
  }
}

// Define success value with metadata
interface MemoryValue {
  value: string;
  metadata: {
    namespace: string;
    timestamp: number;
    size: number;
  };
}

// Refactored implementation
async get(
  key: string,
  namespace: string = this.config.defaultNamespace || 'default'
): Promise<Result<MemoryValue, MemoryNotFoundError | MemoryError>> {
  return await tryCatchAsync(
    async () => {
      // Check cache first if enabled
      if (this.config.enableCaching) {
        const cacheKey = `${namespace}:${key}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
          return {
            value: cached.value,
            metadata: {
              namespace,
              timestamp: cached.timestamp,
              size: cached.value.length,
            },
          };
        }
      }

      // Fetch from repository
      const entry = await this.repository.getByKey(key, namespace);

      if (!entry) {
        // Throw to be caught by tryCatchAsync
        throw new MemoryNotFoundError(key, namespace);
      }

      // Cache the result if enabled
      if (this.config.enableCaching) {
        this.updateCache(entry);
      }

      return {
        value: entry.value,
        metadata: {
          namespace,
          timestamp: entry.timestamp,
          size: entry.value.length,
        },
      };
    },
    (error) => {
      // Transform errors
      if (error instanceof MemoryNotFoundError) {
        return error;
      }
      return new MemoryError(
        `Failed to get memory entry: ${key}`,
        error
      );
    }
  );
}

// Caller using pattern matching
import { match } from '../core/functional/result.js';

const result = await memoryService.get('key', 'namespace');

match(
  (memoryValue) => {
    console.log('Value:', memoryValue.value);
    console.log('Timestamp:', memoryValue.metadata.timestamp);
  },
  (error) => {
    if (error instanceof MemoryNotFoundError) {
      console.error('Not found:', error.message);
    } else {
      console.error('Error:', error.message);
    }
  }
)(result);

// Or using isSuccess/isFailure
import { isSuccess } from '../core/functional/result.js';

if (isSuccess(result)) {
  console.log(result.value.value);
} else {
  console.error(result.error);
}

// Or using pipe and map
import { pipe, map } from '../core/functional/result.js';

const extractedValue = pipe(result)(
  map((memoryValue) => memoryValue.value)
);
```

## Migration Benefits

### Type Safety
- **Before**: `data?: T` - might be undefined even when success=true
- **After**: `Result<T, E>` - type guarantees value exists for Success

### Error Discrimination
- **Before**: `error?: string` - just a string, can't distinguish error types
- **After**: Typed errors (`MemoryNotFoundError | MemoryError`) - pattern match on types

### Composability
- **Before**: Manual if/else checking
- **After**: Functional composition with `map`, `flatMap`, `pipe`

### No Hidden Control Flow
- **Before**: `try/catch` can occur anywhere
- **After**: Errors explicit in return type

## Migration Steps

### Step 1: Create Error Types
```typescript
// src/errors/memory-errors.ts
export class MemoryNotFoundError extends Error {
  constructor(public readonly key: string, public readonly namespace: string) {
    super(`Memory entry not found: ${key} in namespace ${namespace}`);
    this.name = 'MemoryNotFoundError';
  }
}

export class MemoryValidationError extends Error {
  constructor(message: string, public readonly field: string) {
    super(message);
    this.name = 'MemoryValidationError';
  }
}

export class MemoryError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'MemoryError';
  }
}
```

### Step 2: Define Value Types with Metadata
```typescript
// src/types/memory-types.ts
export interface MemoryValue {
  value: string;
  metadata: MemoryMetadata;
}

export interface MemoryMetadata {
  namespace: string;
  timestamp: number;
  size: number;
}

export interface MemoryListResult {
  entries: MemoryEntry[];
  metadata: {
    namespace: string;
    count: number;
  };
}
```

### Step 3: Update Method Signatures
```typescript
// Before
async get(key: string, namespace: string): Promise<MemoryResult<string>>

// After
async get(key: string, namespace: string): Promise<Result<MemoryValue, MemoryNotFoundError | MemoryError>>
```

### Step 4: Refactor Implementation
Replace try/catch with `tryCatchAsync` and throw typed errors.

### Step 5: Update Tests
```typescript
// Before
const result = await service.get('key', 'namespace');
expect(result.success).toBe(true);
expect(result.data).toBe('value');

// After
import { isSuccess } from '../core/functional/result.js';

const result = await service.get('key', 'namespace');
expect(isSuccess(result)).toBe(true);
if (isSuccess(result)) {
  expect(result.value.value).toBe('value');
  expect(result.value.metadata.namespace).toBe('namespace');
}
```

### Step 6: Update Callers
Migrate all call sites to use Result pattern.

## Rollout Strategy

1. ✅ Create error types
2. ✅ Create value types with metadata
3. ✅ Keep both `MemoryResult` and `Result` temporarily
4. ✅ Add new `get2()` method using Result
5. ✅ Migrate tests for `get2()`
6. ✅ Verify all tests pass
7. ✅ Migrate callers to `get2()`
8. ✅ Rename `get2()` → `get()`, old `get()` → `getDeprecated()`
9. ✅ Remove `getDeprecated()` once all callers migrated
10. ✅ Remove `MemoryResult` type

This allows incremental migration without breaking existing code.

## Next: Start Migration?

Would you like to:
1. **Start migration** - Begin with creating error types and migrating `get()` method
2. **Review approach** - Discuss the migration strategy
3. **Adjust plan** - Modify the refactoring approach
