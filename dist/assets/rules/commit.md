# Git Commits

**Format: `type(scope): description`**

TYPES:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

REQUIREMENTS:
- One logical change per commit
- Clear, concise message (why, not what)
- No sensitive data (secrets, keys, passwords)
- Working code only (tests pass)

EXAMPLES:
```
✅ feat(auth): add OAuth2 login flow
✅ fix(api): handle null user in /profile endpoint
✅ refactor(db): extract query builder to separate module
❌ fix stuff
❌ WIP
❌ update code
```

WHY: Good commit messages create a clear history and enable easy debugging/rollbacks.
