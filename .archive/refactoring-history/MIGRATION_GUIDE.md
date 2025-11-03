# Migration Guide: Functional Programming Patterns

This guide shows practical examples of migrating existing code to functional programming patterns.

## Table of Contents

1. [Error Handling](#error-handling)
2. [File Operations](#file-operations)
3. [String Transformations](#string-transformations)
4. [Array Operations](#array-operations)
5. [Object Transformations](#object-transformations)
6. [Business Logic Extraction](#business-logic-extraction)
7. [Service Refactoring](#service-refactoring)
8. [Repository Pattern](#repository-pattern)

---

## Error Handling

### Before: Exception-based

```typescript
function getUserById(id: string): User {
  if (!id) {
    throw new Error('User ID is required');
  }

  const user = database.find(id);
  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

// Usage
try {
  const user = getUserById('123');
  console.log(user.name);
} catch (error) {
  console.error(error.message);
}
```

### After: Result-based

```typescript
import { Result, success, failure, notFoundError } from '@/core/functional';

function getUserById(id: string): Result<User, AppError> {
  if (!id) {
    return failure(validationError('User ID is required', ['id']));
  }

  const user = database.find(id);
  if (!user) {
    return failure(notFoundError('User not found', 'User', id));
  }

  return success(user);
}

// Usage - explicit error handling
const result = getUserById('123');

if (isSuccess(result)) {
  console.log(result.value.name);
} else {
  console.error(formatError(result.error));
}

// Or with pipe
pipe(
  getUserById('123'),
  map(user => user.name),
  getOrElse('Unknown')
);
```

---

## File Operations

### Before: Mixed I/O and logic

```typescript
async function processConfigFile(path: string): Promise<Config> {
  const content = await fs.readFile(path, 'utf-8');
  const parsed = JSON.parse(content);

  // Validation mixed with I/O
  if (!parsed.apiKey) {
    throw new Error('API key is required');
  }

  // Transformation
  parsed.apiKey = parsed.apiKey.trim();
  parsed.timeout = parsed.timeout || 30000;

  return parsed;
}
```

### After: Pure logic + explicit I/O

```typescript
import { pipe, flow } from '@/core/functional';
import { readFile } from '@/composables/functional';

// Pure validation
const validateConfig = (data: unknown): Result<Config, ValidationError> => {
  const schema = z.object({
    apiKey: z.string().min(1),
    timeout: z.number().optional(),
  });

  const result = schema.safeParse(data);
  if (!result.success) {
    return failure(validationError('Invalid config', result.error.errors));
  }

  return success(result.data);
};

// Pure transformation
const normalizeConfig = (config: Config): Config => ({
  ...config,
  apiKey: config.apiKey.trim(),
  timeout: config.timeout ?? 30000,
});

// Composable pure functions
const parseJSON = (content: string): Result<unknown, ConfigError> =>
  tryCatch(
    () => JSON.parse(content),
    () => configError('Failed to parse JSON')
  );

const processConfig = flow(
  parseJSON,
  flatMap(validateConfig),
  map(normalizeConfig)
);

// I/O at boundaries
async function loadConfig(path: string): Promise<Result<Config, AppError>> {
  const fileResult = await readFile(path);

  if (isFailure(fileResult)) {
    return fileResult;
  }

  return processConfig(fileResult.value);
}
```

---

## String Transformations

### Before: Imperative

```typescript
function formatUserName(firstName: string, lastName: string): string {
  let result = '';

  if (firstName) {
    result += firstName.trim();
  }

  if (lastName) {
    if (result) {
      result += ' ';
    }
    result += lastName.trim();
  }

  if (!result) {
    return 'Unknown';
  }

  // Capitalize
  return result
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
```

### After: Declarative with utilities

```typescript
import { Str } from '@/utils/functional';
import { pipe } from '@/core/functional';

const formatUserName = (firstName: string, lastName: string): string => {
  const fullName = [firstName, lastName]
    .filter(Str.isNotBlank)
    .map(Str.trim)
    .join(' ');

  return pipe(
    fullName,
    Str.isBlank,
    (isEmpty) => (isEmpty ? 'Unknown' : fullName),
    Str.capitalizeWords
  );
};

// Or even simpler
const formatUserName = (firstName: string, lastName: string): string =>
  pipe(
    [firstName, lastName],
    Arr.filter(Str.isNotBlank),
    Arr.map(Str.trim),
    Str.join(' '),
    (name) => (Str.isBlank(name) ? 'Unknown' : name),
    Str.capitalizeWords
  );
```

---

## Array Operations

### Before: Imperative loops

```typescript
function processUsers(users: User[]): ProcessedUser[] {
  const results: ProcessedUser[] = [];

  for (const user of users) {
    if (user.age >= 18 && user.active) {
      const processed = {
        id: user.id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email.toLowerCase(),
      };
      results.push(processed);
    }
  }

  return results;
}
```

### After: Declarative pipeline

```typescript
import { Arr, Str } from '@/utils/functional';
import { pipe, flow } from '@/core/functional';

const isAdultAndActive = (user: User): boolean =>
  user.age >= 18 && user.active;

const toProcessedUser = (user: User): ProcessedUser => ({
  id: user.id,
  fullName: `${user.firstName} ${user.lastName}`,
  email: Str.toLowerCase(user.email),
});

const processUsers = flow(
  Arr.filter(isAdultAndActive),
  Arr.map(toProcessedUser)
);

// Or inline
const processUsers = (users: User[]): ProcessedUser[] =>
  pipe(
    users,
    Arr.filter((u) => u.age >= 18 && u.active),
    Arr.map((u) => ({
      id: u.id,
      fullName: `${u.firstName} ${u.lastName}`,
      email: Str.toLowerCase(u.email),
    }))
  );
```

---

## Object Transformations

### Before: Mutation

```typescript
function updateUserSettings(settings: Settings, updates: Partial<Settings>): Settings {
  // Mutating original object
  for (const key in updates) {
    if (updates[key] !== undefined) {
      settings[key] = updates[key];
    }
  }

  // Add default values
  if (!settings.theme) {
    settings.theme = 'light';
  }

  return settings;
}
```

### After: Immutable transformations

```typescript
import { Obj } from '@/utils/functional';
import { pipe } from '@/core/functional';

const withDefaults = (settings: Partial<Settings>): Settings => ({
  theme: 'light',
  notifications: true,
  language: 'en',
  ...settings,
});

const updateUserSettings = (settings: Settings, updates: Partial<Settings>): Settings =>
  pipe(
    settings,
    Obj.merge(Obj.compactAll(updates)), // Remove null/undefined
    withDefaults
  );

// Or simpler
const updateUserSettings = (settings: Settings, updates: Partial<Settings>): Settings =>
  withDefaults({
    ...settings,
    ...Obj.compactAll(updates),
  });
```

---

## Business Logic Extraction

### Before: Mixed concerns

```typescript
async function createUser(data: CreateUserInput): Promise<User> {
  // Validation mixed with I/O
  if (!data.email || !data.email.includes('@')) {
    throw new Error('Invalid email');
  }

  // Check existence (I/O)
  const existing = await db.users.findByEmail(data.email);
  if (existing) {
    throw new Error('User already exists');
  }

  // Transformation
  const user = {
    id: generateId(),
    email: data.email.toLowerCase(),
    name: data.name.trim(),
    createdAt: new Date(),
  };

  // Save (I/O)
  await db.users.insert(user);

  // Send email (I/O)
  await emailService.sendWelcome(user.email);

  return user;
}
```

### After: Separated concerns

```typescript
// Pure validation
const validateEmail = (email: string): Result<string, ValidationError> => {
  if (!email || !email.includes('@')) {
    return failure(validationError('Invalid email', ['email']));
  }
  return success(email);
};

// Pure transformation
const prepareUserData = (input: CreateUserInput): User => ({
  id: generateId(),
  email: input.email.toLowerCase(),
  name: input.name.trim(),
  createdAt: new Date(),
});

// Pure business logic
const validateUserCreation = (
  input: CreateUserInput,
  existingUser: User | null
): Result<CreateUserInput, AppError> => {
  const emailResult = validateEmail(input.email);
  if (isFailure(emailResult)) {
    return emailResult;
  }

  if (existingUser) {
    return failure(
      validationError('User already exists', ['email'], { field: 'email' })
    );
  }

  return success(input);
};

// I/O at boundaries
async function createUser(data: CreateUserInput): Promise<Result<User, AppError>> {
  // Check existence
  const existingResult = await db.users.findByEmail(data.email);
  if (isFailure(existingResult)) {
    return existingResult;
  }

  // Validate
  const validationResult = validateUserCreation(data, existingResult.value);
  if (isFailure(validationResult)) {
    return validationResult;
  }

  // Transform
  const user = prepareUserData(data);

  // Save
  const saveResult = await db.users.insert(user);
  if (isFailure(saveResult)) {
    return saveResult;
  }

  // Send email (fire and forget or handle separately)
  emailService.sendWelcome(user.email).catch(console.error);

  return success(user);
}
```

---

## Service Refactoring

### Before: Class with mixed concerns

```typescript
class UserService {
  constructor(
    private db: Database,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async registerUser(data: RegisterInput): Promise<User> {
    this.logger.info('Registering user', data.email);

    try {
      // Validation
      if (!data.email || !data.password) {
        throw new Error('Email and password required');
      }

      // Check existence
      const existing = await this.db.users.findByEmail(data.email);
      if (existing) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await this.db.users.create({
        email: data.email,
        password: hashedPassword,
        name: data.name,
      });

      // Send welcome email
      await this.emailService.sendWelcome(user);

      this.logger.info('User registered', user.id);

      return user;
    } catch (error) {
      this.logger.error('Failed to register user', error);
      throw error;
    }
  }
}
```

### After: Functional composition

```typescript
// Pure business logic
import { validateRegistration, prepareUserData } from './user-logic.js';

// Dependencies as parameters (dependency injection)
interface UserDeps {
  db: Database;
  emailService: EmailService;
  logger: Logger;
}

// Pure validation
const validateRegistration = (data: RegisterInput): Result<RegisterInput, AppError> => {
  if (!data.email || !data.password) {
    return failure(validationError('Email and password required', ['email', 'password']));
  }
  return success(data);
};

// Composable operations
const registerUser = (deps: UserDeps) => async (
  data: RegisterInput
): Promise<Result<User, AppError>> => {
  const { db, emailService, logger } = deps;

  logger.info('Registering user', { email: data.email });

  return pipe(
    await validateRegistration(data),
    flatMap(async (input) => {
      // Check existence
      const existing = await db.users.findByEmail(input.email);
      if (isFailure(existing)) return existing;
      if (existing.value) {
        return failure(validationError('User already exists', ['email']));
      }
      return success(input);
    }),
    flatMap(async (input) => {
      // Hash password
      const hashed = await tryCatchAsync(
        () => bcrypt.hash(input.password, 10),
        () => unknownError('Failed to hash password')
      );
      if (isFailure(hashed)) return hashed;

      // Create user
      return db.users.create({
        email: input.email,
        password: hashed.value,
        name: input.name,
      });
    }),
    tap((user) => {
      // Send email (fire and forget)
      emailService.sendWelcome(user).catch((err) =>
        logger.error('Failed to send welcome email', err)
      );
      logger.info('User registered', { userId: user.id });
    })
  );
};

// Usage
const userService = {
  registerUser: registerUser({ db, emailService, logger }),
};
```

---

## Repository Pattern

See `src/repositories/base.repository.functional.ts` for the complete pattern.

### Key points:

1. **Pure query building**: Build SQL/queries as pure functions
2. **Isolated execution**: Execute queries in separate functions
3. **Result types**: Return `Result<T, DatabaseError>` instead of throwing
4. **Dependency injection**: Pass dependencies as parameters

### Example:

```typescript
import { createRepository } from '@/repositories/base.repository.functional';

// Create repository with dependencies
const userRepository = createRepository<User>(db, logger, 'users');

// Use with Result type
const result = await userRepository.findById('123');

if (isSuccess(result)) {
  console.log(result.value); // User | null
} else {
  console.error(result.error); // DatabaseError
}
```

---

## Testing Benefits

### Before: Requires mocking

```typescript
describe('UserService', () => {
  it('should register user', async () => {
    const mockDb = {
      users: {
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: '123' }),
      },
    };

    const service = new UserService(mockDb as any, ...);
    // Complex setup...
  });
});
```

### After: Pure functions - no mocking

```typescript
describe('validateRegistration', () => {
  it('should require email and password', () => {
    const result = validateRegistration({ email: '', password: '' });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.kind).toBe('ValidationError');
    }
  });
});

describe('prepareUserData', () => {
  it('should normalize email', () => {
    const user = prepareUserData({ email: 'TEST@EXAMPLE.COM', name: 'John' });

    expect(user.email).toBe('test@example.com');
  });
});
```

---

## Quick Reference

### When to use what:

- **Result**: Operations that can fail (I/O, validation)
- **Option**: Optional values (replaces null/undefined)
- **Either**: Generic two-possibility type
- **pipe**: Transform single value through multiple functions
- **flow**: Create reusable transformation pipeline
- **Validation**: Accumulate multiple errors (forms)

### Import paths:

```typescript
// Core functional
import { Result, Option, pipe, flow } from '@/core/functional';

// Error types
import { AppError, configError, validationError } from '@/core/functional';

// Utilities
import { Str, Arr, Obj } from '@/utils/functional';

// Composables
import { readFile, writeFile } from '@/composables/functional';

// Repository
import { createRepository } from '@/repositories/base.repository.functional';
```

---

## Common Patterns

### Pattern 1: Read → Validate → Transform → Save

```typescript
const processData = async (path: string): Promise<Result<Data, AppError>> =>
  pipe(
    await readFile(path),
    flatMap(parseJSON),
    flatMap(validate),
    map(transform),
    flatMap(save)
  );
```

### Pattern 2: Multiple validations

```typescript
const validateUser = validateAll(
  validateEmail,
  validateAge,
  validateName
);
```

### Pattern 3: Conditional logic

```typescript
const result = pipe(
  data,
  validate,
  flatMap((valid) =>
    condition ? processA(valid) : processB(valid)
  )
);
```

### Pattern 4: Error recovery

```typescript
const result = pipe(
  await riskyOperation(),
  mapError((err) => {
    logger.error(err);
    return defaultValue;
  })
);
```

---

For more examples, see:
- `REFACTORING.md` - Overview of all changes
- `src/core/functional/` - Core abstractions
- `tests/` - Test examples
- `src/commands/functional/` - Real-world usage
