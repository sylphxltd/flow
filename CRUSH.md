# Sylphx Flow - Development Commands & Guidelines

## Build & Development
- `pnpm build` - Build project with tsup
- `pnpm dev` - Run development server with tsx
- `pnpm start` - Run production build
- `pnpm clean` - Clean dist directory

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, no `any`, use `unknown` with type guards
- **Architecture**: Domain-driven structure under `src/` with feature-based organization
- **Dependencies**: Prefer functional programming, pure functions, dependency injection
- **File size**: Keep functions <50 lines, files <300 lines
- **Error handling**: Use typed Error subclasses, structured responses
- **Naming**: PascalCase for types, camelCase for variables, kebab-case for files

## Linting & Testing
- TypeScript compiler: `tsc --noEmit` for type checking
- No test framework currently configured
- Follow SOLID principles, immutability, minimal nesting (≤3 levels)

## Key Rules from .cursor/
- Use tools proactively for data gathering and verification
- Maintain strict data boundaries and contracts
- Serverless architecture: stateless, idempotent operations
- UUID v7 for all identifiers
- Response language: Mixed Cantonese/English for AI, English for code