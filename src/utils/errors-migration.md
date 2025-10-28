# Error System Migration Guide

## Overview
This document provides guidance for migrating from the complex 552-line error system to the simplified error system.

## Key Changes

### Before (Complex System)
```typescript
// 11+ different error classes
- ValidationError
- ConfigurationError
- NetworkError
- DatabaseError
- FilesystemError
- AuthenticationError
- AuthorizationError
- ExternalServiceError
- InternalError
- CLIError
- ErrorHandler
- ErrorContext
// ... 552 lines total
```

### After (Simplified System)
```typescript
// 7 core error types (3 main ones for most use cases)
- AppError (main error class)
- ValidationError (extends AppError)
- ConfigurationError (extends AppError)
- DatabaseError (extends AppError)
- NetworkError (extends AppError)
- FilesystemError (extends AppError)
- AuthenticationError (extends AppError)
- ErrorFactory (convenient creation)
- ErrorHandler (utility functions)
// ~300 lines total
```

## Migration Patterns

### 1. Simple Error Creation
```typescript
// Before
import { ValidationError } from './errors.js';
throw new ValidationError('Invalid input');

// After
import { createValidationError } from './simplified-errors.js';
throw createValidationError('Invalid input');
```

### 2. Error with Context
```typescript
// Before
import { ConfigurationError } from './errors.js';
throw new ConfigurationError('Missing config', 'MISSING_CONFIG', {
  configKey: 'database.url'
});

// After
import { createConfigurationError } from './simplified-errors.js';
throw createConfigurationError('Missing config', 'database.url');
```

### 3. Error Handling
```typescript
// Before
import { ErrorHandler } from './errors.js';
try {
  await operation();
} catch (error) {
  const handled = ErrorHandler.handle(error);
  console.error(handled.message);
}

// After
import { ErrorHandler } from './simplified-errors.js';
try {
  await operation();
} catch (error) {
  const handled = ErrorHandler.handle(error);
  console.error(handled.message);
}
```

### 4. Operation Execution
```typescript
// Before
import { executeOperation } from './database-errors.js';
const result = await executeOperation('db.insert', async () => {
  return await db.insert(data);
});

// After
import { ErrorHandler } from './simplified-errors.js';
const result = await ErrorHandler.execute(async () => {
  return await db.insert(data);
});

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error.message);
}
```

## Benefits of Simplified System

1. **Reduced Complexity**: From 11+ error classes to 3 main types
2. **Better Performance**: Fewer classes to instantiate and manage
3. **Easier Testing**: Simpler error hierarchy
4. **Consistent Interface**: All errors share the same base properties
5. **Better Logging**: Integrated with structured logging
6. **User-Friendly**: Built-in user message formatting
7. **Backward Compatible**: Legacy exports available

## Files to Update

### High Priority (Direct imports)
1. `src/utils/test-utilities.ts`
2. `src/utils/migration-examples.ts`
3. `src/repositories/base.repository.ts`
4. `src/db/*.ts` files

### Medium Priority (Indirect usage)
1. CLI command files
2. Service files
3. Repository files

### Low Priority (Minimal usage)
1. Test files
2. Utility files

## Migration Strategy

1. **Phase 1**: Update core infrastructure files
2. **Phase 2**: Update service layer files
3. **Phase 3**: Update CLI and utility files
4. **Phase 4**: Update test files
5. **Phase 5**: Remove old error system

## Testing

After migration, ensure:
- Error handling works as expected
- User-facing messages are appropriate
- Logging captures error details
- Test coverage remains intact

## Rollback Plan

If issues arise:
1. Keep old error system temporarily
2. Use legacy exports for backward compatibility
3. Gradually migrate files one by one
4. Remove old system only after full migration