# Framework/Library Rules

## GraphQL
### Schema Design
- Use `ID` type for all identifiers instead of `String`.

### Pothos Best Practices
- Ensure the subscribe function is always defined before the resolve function to avoid issues with resolver arguments not being typed correctly.