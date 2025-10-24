# Tasks: effect-ecosystem-migration

(Break down implementation into stages based on dependencies. Use checkboxes to track progress.)

## Stage 1: Foundation Setup
(Tasks with no dependencies - can start immediately)
- [ ] TASK_1: Update package.json with Effect ecosystem dependencies
- [ ] TASK_2: Remove old dependencies (commander, @libsql/client, @modelcontextprotocol/sdk)
- [ ] TASK_3: Configure TypeScript for Effect (strict mode, proper imports)
- [ ] TASK_4: Create Effect error types to replace CLIError
- [ ] TASK_5: Setup basic Effect runtime and logging configuration
- [ ] TASK_6: Create base Effect Layer structure for services

## Stage 2: CLI Migration
(Depend on Stage 1 - migrate CLI framework)
- [ ] TASK_7: Replace commander CLI setup with @effect/cli
- [ ] TASK_8: Migrate command definitions to Effect CLI patterns
- [ ] TASK_9: Update command handlers to use Effect.gen
- [ ] TASK_10: Replace CLI error handling with Effect error system
- [ ] TASK_11: Update help system and command validation
- [ ] TASK_12: Test CLI commands work with new framework

## Stage 3: Database Migration
(Depend on Stage 1 - migrate database layer)
- [ ] TASK_13: Replace @libsql/client with @effect/sql-libsql
- [ ] TASK_14: Update BaseDatabaseClient to use Effect patterns
- [ ] TASK_15: Migrate MemoryDatabaseClient to Effect services
- [ ] TASK_16: Update database queries to use tagged template literals
- [ ] TASK_17: Replace Promise-based database operations with Effect
- [ ] TASK_18: Update database error handling with Effect patterns
- [ ] TASK_19: Test database operations with new client

## Stage 4: Platform Integration
(Depend on Stage 1 - migrate file system and platform operations)
- [ ] TASK_20: Replace Node fs operations with @effect/platform FileSystem
- [ ] TASK_21: Update path operations to use @effect/platform Path service
- [ ] TASK_22: Migrate file-based configuration loading
- [ ] TASK_23: Replace console logging with @effect/log throughout codebase
- [ ] TASK_24: Update template engine file operations
- [ ] TASK_25: Test file operations and logging

## Stage 5: AI/MCP Migration
(Depend on Stage 1 and Stage 4 - migrate AI integration)
- [ ] TASK_26: Replace @modelcontextprotocol/sdk with @effect/ai
- [ ] TASK_27: Update MCP server to use Effect patterns
- [ ] TASK_28: Migrate tool registrations to Effect services
- [ ] TASK_29: Update AI error handling with Effect patterns
- [ ] TASK_30: Replace Promise-based AI operations with Effect
- [ ] TASK_31: Test MCP server functionality

## Stage 6: Service Layer Migration
(Depend on Stages 2-5 - migrate remaining application logic)
- [ ] TASK_32: Replace remaining Promise patterns with Effect
- [ ] TASK_33: Update storage classes to use Effect services
- [ ] TASK_34: Migrate indexer classes to Effect patterns
- [ ] TASK_35: Update search services to use Effect
- [ ] TASK_36: Replace async utility functions with Effect
- [ ] TASK_37: Update command builders and validators

## Stage 7: Testing & Validation
(Depend on all previous stages - comprehensive testing)
- [ ] TASK_38: Update test framework to work with Effect
- [ ] TASK_39: Add Effect-specific test patterns and utilities
- [ ] TASK_40: Test all CLI commands with new framework
- [ ] TASK_41: Test database operations and migrations
- [ ] TASK_42: Test file operations and platform integration
- [ ] TASK_43: Test MCP server and AI integration
- [ ] TASK_44: Performance testing and optimization
- [ ] TASK_45: Integration testing of complete workflows

## Stage 8: Cleanup & Documentation
(Depend on Stage 7 - final polish)
- [ ] TASK_46: Remove unused imports and old code
- [ ] TASK_47: Update README and documentation
- [ ] TASK_48: Update build scripts and CI configuration
- [ ] TASK_49: Final code review and optimization
- [ ] TASK_50: Tag release and merge changes

---

## Test Strategy

### Frameworks
- **Vitest**: Continue using Vitest with @effect/vitest plugin for Effect testing
- **Effect Testing**: Use Effect.exit, Effect.runSync, and Layer testing patterns
- **Integration Testing**: Test complete CLI workflows and database operations

### Coverage
- 90%+ on critical paths (CLI commands, database operations, MCP server)
- 80%+ on utility functions and service layer
- Full coverage of error handling paths

### Key Scenarios
- **CLI Commands**: All commands execute successfully with proper error handling
- **Database Operations**: CRUD operations, migrations, error scenarios
- **File Operations**: Configuration loading, template processing, path operations
- **MCP Server**: Tool registration, execution, error handling
- **Error Recovery**: All error types are properly caught and displayed
- **Resource Management**: Database connections, file handles are properly managed
- **Performance**: No significant performance regression from migration

### Effect-Specific Testing Patterns
- **Effect.exit**: Capture Effect results for assertion
- **Layer Testing**: Test service layers in isolation
- **Error Testing**: Verify tagged errors are properly raised and handled
- **Resource Testing**: Ensure proper acquisition and release of resources