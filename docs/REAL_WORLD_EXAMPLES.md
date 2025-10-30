# Real-World Examples

Practical examples showing how to use functional patterns in real scenarios.

## Table of Contents

1. [API Client](#api-client)
2. [File Processing Pipeline](#file-processing-pipeline)
3. [Database Operations](#database-operations)
4. [Form Validation](#form-validation)
5. [Async Data Loading](#async-data-loading)
6. [Error Recovery](#error-recovery)
7. [Batch Processing](#batch-processing)
8. [Configuration Management](#configuration-management)

---

## 1. API Client

### Scenario: Fetch user data from API with error handling

```typescript
import { fromPromise, mapAsync, flatMapAsync } from '@/core/functional';
import type { AsyncResult } from '@/core/functional';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserProfile {
  user: User;
  avatar: string;
  bio: string;
}

// Pure transformation
const enrichUserData = (user: User): UserProfile => ({
  user,
  avatar: `https://api.example.com/avatars/${user.id}`,
  bio: `User ${user.name}`,
});

// API client with error handling
async function fetchUser(id: string): AsyncResult<User> {
  return fromPromise(
    fetch(`https://api.example.com/users/${id}`).then((res) => res.json()),
    (error) => networkError(`Failed to fetch user ${id}`, { cause: error as Error })
  );
}

// Composable pipeline
async function getUserProfile(id: string): AsyncResult<UserProfile> {
  return pipe(
    await fetchUser(id),
    map(enrichUserData)
  );
}

// Usage
const result = await getUserProfile('123');

match(
  (profile) => console.log('Success:', profile),
  (error) => console.error('Error:', formatError(error))
)(result);
```

---

## 2. File Processing Pipeline

### Scenario: Read, validate, transform, and save configuration files

```typescript
import { pipe, flow } from '@/core/functional';
import { readFile, writeFile } from '@/composables/functional';
import { Str } from '@/utils/functional';

interface Config {
  apiKey: string;
  timeout: number;
  retries: number;
}

// Pure validation
const validateConfig = (data: unknown): Result<Config, ValidationError> => {
  // Use zod or custom validation
  if (!data || typeof data !== 'object') {
    return failure(validationError('Invalid config format', ['config']));
  }

  const config = data as any;
  if (!config.apiKey || typeof config.apiKey !== 'string') {
    return failure(validationError('API key is required', ['apiKey']));
  }

  return success({
    apiKey: config.apiKey,
    timeout: config.timeout || 30000,
    retries: config.retries || 3,
  });
};

// Pure transformation
const normalizeConfig = (config: Config): Config => ({
  ...config,
  apiKey: Str.trim(config.apiKey),
  timeout: Math.max(1000, config.timeout),
  retries: Math.min(10, Math.max(0, config.retries)),
});

// Pure JSON parsing
const parseJSON = (content: string): Result<unknown, ConfigError> =>
  tryCatch(
    () => JSON.parse(content),
    () => configError('Invalid JSON')
  );

// Composable pipeline
const processConfig = flow(
  parseJSON,
  flatMap(validateConfig),
  map(normalizeConfig)
);

// I/O at boundaries
async function loadAndProcessConfig(path: string): AsyncResult<Config> {
  const fileResult = await readFile(path);

  if (isFailure(fileResult)) {
    return fileResult;
  }

  return processConfig(fileResult.value);
}

// Usage with error handling
const configResult = await loadAndProcessConfig('./config.json');

if (isSuccess(configResult)) {
  await writeFile(
    './config.normalized.json',
    JSON.stringify(configResult.value, null, 2)
  );
}
```

---

## 3. Database Operations

### Scenario: CRUD operations with error handling

```typescript
import { createRepository } from '@/repositories/base.repository.functional';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

// Create repository
const todoRepo = createRepository<Todo>(db, logger, 'todos');

// Find and update with error handling
async function toggleTodo(id: string): AsyncResult<Todo> {
  const findResult = await todoRepo.findById(id);

  if (isFailure(findResult)) {
    return findResult;
  }

  if (!findResult.value) {
    return failure(notFoundError('Todo not found', 'Todo', id));
  }

  return todoRepo.update(id, {
    completed: !findResult.value.completed,
  });
}

// Batch operations
async function markAllComplete(): AsyncResult<number> {
  const findResult = await todoRepo.findMany({
    where: { completed: false },
  });

  if (isFailure(findResult)) {
    return findResult;
  }

  const updatePromises = findResult.value.map((todo) =>
    todoRepo.update(todo.id, { completed: true })
  );

  const results = await allAsync(updatePromises);

  if (isFailure(results)) {
    return results;
  }

  return success(results.value.length);
}

// Usage
const result = await toggleTodo('todo-123');

match(
  (todo) => console.log('Updated:', todo),
  (error) => console.error('Failed:', formatError(error))
)(result);
```

---

## 4. Form Validation

### Scenario: Multi-field form validation with accumulated errors

```typescript
import { combine, validateAll, nonEmpty, isEmail, minLength } from '@/core/functional';

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Individual validators
const validateUsername = validateAll(
  nonEmpty('Username is required'),
  minLength(3, 'Username must be at least 3 characters')
);

const validateEmail = validateAll(
  nonEmpty('Email is required'),
  isEmail('Invalid email format')
);

const validatePassword = validateAll(
  nonEmpty('Password is required'),
  minLength(8, 'Password must be at least 8 characters'),
  matches(/[A-Z]/, 'Password must contain uppercase letter'),
  matches(/[0-9]/, 'Password must contain number')
);

const validatePasswordMatch =
  (password: string) =>
  (confirmPassword: string): Validation<string> => {
    if (password !== confirmPassword) {
      return invalid('Passwords do not match');
    }
    return valid(confirmPassword);
  };

// Validate entire form (accumulates ALL errors)
function validateRegisterForm(form: RegisterForm): Validation<RegisterForm> {
  const validations = [
    validateUsername(form.username),
    validateEmail(form.email),
    validatePassword(form.password),
    validatePasswordMatch(form.password)(form.confirmPassword),
  ];

  const result = combine(validations);

  if (isSuccess(result)) {
    return valid(form);
  }

  // All errors accumulated
  return invalid(...result.error);
}

// Usage
const formResult = validateRegisterForm({
  username: 'ab', // Too short
  email: 'invalid', // Invalid format
  password: 'weak', // Too short, no uppercase, no number
  confirmPassword: 'different',
});

if (isFailure(formResult)) {
  // Display ALL errors at once
  formResult.error.forEach((error) => {
    console.error(error);
  });
}
```

---

## 5. Async Data Loading

### Scenario: Load data with retry, timeout, and caching

```typescript
import { retry, withTimeout, memoizeAsync } from '@/core/functional';

// API call with retry and timeout
async function fetchWithRetry(url: string): AsyncResult<any> {
  return retry(
    () => withTimeout(fetch(url).then((res) => res.json()), 5000),
    {
      maxAttempts: 3,
      delayMs: 1000,
      backoff: 2,
      onRetry: (attempt, error) => {
        console.log(`Retry ${attempt} after error:`, error.message);
      },
    }
  );
}

// Cached API calls
const fetchUserCached = memoizeAsync(
  async (id: string) => fromPromise(fetch(`/api/users/${id}`).then((res) => res.json())),
  (id) => `user-${id}` // Cache key
);

// Parallel data loading
async function loadDashboardData(userId: string): AsyncResult<DashboardData> {
  const results = await allAsync([
    fetchUserCached(userId),
    fromPromise(fetch('/api/notifications').then((res) => res.json())),
    fromPromise(fetch('/api/stats').then((res) => res.json())),
  ]);

  if (isFailure(results)) {
    return results;
  }

  const [user, notifications, stats] = results.value;

  return success({
    user,
    notifications,
    stats,
  });
}

// Sequential data loading (when order matters)
async function loadUserPosts(userId: string): AsyncResult<Post[]> {
  return pipe(
    await fetchUserCached(userId),
    flatMapAsync((user) =>
      fromPromise(fetch(`/api/users/${user.id}/posts`).then((res) => res.json()))
    )
  );
}
```

---

## 6. Error Recovery

### Scenario: Handle errors with fallback strategies

```typescript
import { mapError, getOrElse } from '@/core/functional';

// Try multiple sources
async function fetchConfigWithFallback(): AsyncResult<Config> {
  // Try remote config first
  const remoteResult = await fromPromise(
    fetch('/api/config').then((res) => res.json())
  );

  if (isSuccess(remoteResult)) {
    return remoteResult;
  }

  // Fallback to local config
  const localResult = await readFile('./config.local.json');

  if (isSuccess(localResult)) {
    return pipe(localResult.value, parseJSON, flatMap(validateConfig));
  }

  // Fallback to defaults
  return success(getDefaultConfig());
}

// Retry with exponential backoff
async function fetchWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5
): AsyncResult<T> {
  return retry(fn, {
    maxAttempts: maxRetries,
    delayMs: 1000,
    backoff: 2,
    onRetry: (attempt, error) => {
      logger.warn(`Attempt ${attempt} failed:`, error.message);
    },
  });
}

// Graceful degradation
async function loadUserWithFallback(id: string): User {
  const result = await fetchWithBackoff(() =>
    fetch(`/api/users/${id}`).then((res) => res.json())
  );

  return pipe(
    result,
    getOrElse({
      id,
      name: 'Guest User',
      email: 'guest@example.com',
    })
  );
}
```

---

## 7. Batch Processing

### Scenario: Process large datasets with concurrency control

```typescript
import { withConcurrency, chunk } from '@/core/functional';
import { Arr } from '@/utils/functional';

interface Item {
  id: string;
  data: any;
}

// Process single item
async function processItem(item: Item): AsyncResult<ProcessedItem> {
  return fromPromise(
    fetch(`/api/process`, {
      method: 'POST',
      body: JSON.stringify(item),
    }).then((res) => res.json())
  );
}

// Batch processing with concurrency limit
async function processBatch(items: Item[]): AsyncResult<ProcessedItem[]> {
  // Process 5 items at a time
  const tasks = items.map((item) => () => processItem(item));

  return withConcurrency(tasks, 5);
}

// Chunked processing with progress
async function processLargeDataset(
  items: Item[],
  onProgress?: (processed: number, total: number) => void
): AsyncResult<ProcessedItem[]> {
  const chunks = pipe(items, Arr.chunk(100));
  const results: ProcessedItem[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkResult = await processBatch(chunks[i]);

    if (isFailure(chunkResult)) {
      return chunkResult;
    }

    results.push(...chunkResult.value);

    if (onProgress) {
      onProgress(results.length, items.length);
    }
  }

  return success(results);
}

// Usage
const items = await loadItems();
const result = await processLargeDataset(items, (processed, total) => {
  console.log(`Processed ${processed}/${total} items`);
});
```

---

## 8. Configuration Management

### Scenario: Load, validate, merge, and watch configuration

```typescript
import { pipe, flow } from '@/core/functional';
import { Obj } from '@/utils/functional';

interface AppConfig {
  database: {
    host: string;
    port: number;
  };
  api: {
    key: string;
    timeout: number;
  };
  features: {
    [key: string]: boolean;
  };
}

// Default configuration
const defaultConfig: AppConfig = {
  database: {
    host: 'localhost',
    port: 5432,
  },
  api: {
    key: '',
    timeout: 30000,
  },
  features: {},
};

// Load from multiple sources
async function loadConfig(): AsyncResult<AppConfig> {
  // Load from environment
  const envConfig = pipe(
    {
      database: {
        host: getEnvOrElse('DB_HOST', defaultConfig.database.host),
        port: pipe(
          getEnvNumber('DB_PORT'),
          getOrElse(defaultConfig.database.port)
        ),
      },
      api: {
        key: pipe(getEnvRequired('API_KEY'), getOrElse('')),
        timeout: pipe(
          getEnvNumber('API_TIMEOUT'),
          getOrElse(defaultConfig.api.timeout)
        ),
      },
      features: {},
    },
    (config) => config as AppConfig
  );

  // Load from file
  const fileResult = await readFile('./config.json');

  if (isFailure(fileResult)) {
    return success(Obj.deepMerge(defaultConfig, envConfig));
  }

  const fileConfig = pipe(
    fileResult.value,
    parseJSON,
    getOrElse({})
  ) as Partial<AppConfig>;

  // Merge: defaults < file < environment
  return success(
    pipe(defaultConfig, (c) => Obj.deepMerge(c, fileConfig), (c) =>
      Obj.deepMerge(c, envConfig)
    )
  );
}

// Watch for changes
function watchConfig(
  configPath: string,
  onChange: (config: AppConfig) => void
): () => void {
  const watcher = fs.watch(configPath, async () => {
    const result = await loadConfig();
    if (isSuccess(result)) {
      onChange(result.value);
    }
  });

  return () => watcher.close();
}
```

---

## Summary

These examples demonstrate:

1. **Error Handling** - Using Result types instead of exceptions
2. **Composition** - Building complex operations from simple ones
3. **Type Safety** - Compile-time error checking
4. **Testability** - Pure functions easy to test
5. **Maintainability** - Clear separation of concerns

All patterns are production-ready and follow functional programming best practices! 🚀
