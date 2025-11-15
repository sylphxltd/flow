---
name: Security Best Practices
description: OWASP, authentication, authorization, vulnerabilities, secure coding
---

# Security Best Practices

## OWASP Top 10

### SQL Injection
**Never** concatenate user input into SQL
```javascript
// BAD: Vulnerable
db.query(`SELECT * FROM users WHERE id = ${userId}`)

// GOOD: Parameterized
db.query('SELECT * FROM users WHERE id = $1', [userId])
```

### XSS (Cross-Site Scripting)
- Sanitize/escape user content before rendering
- Use CSP headers
- Never use `dangerouslySetInnerHTML` without sanitization
- Validate server-side, not just client

### Authentication & Authorization
- Use established libraries (Passport, NextAuth, Auth0)
- Hash passwords (bcrypt/argon2), never plain text
- Rate limit login endpoints
- httpOnly, secure, sameSite cookies for tokens
- Separate authentication (who) from authorization (what)

### CSRF (Cross-Site Request Forgery)
- CSRF tokens for state-changing ops
- Check Origin/Referer headers
- SameSite cookie attribute

## Secrets Management
**Never** commit secrets to git (.env in .gitignore)
- Environment variables for secrets
- Rotate credentials regularly
- Use secret managers (AWS Secrets Manager, Vault)

## Input Validation
- Validate server-side (client is UX only)
- Whitelist approach: Define allowed, reject all else
- Sanitize file uploads (check type, size, scan)
- Schema validation (Zod, Joi)

## API Security
- HTTPS everywhere
- Rate limiting
- Validate Content-Type headers
- API keys/tokens with least privilege
- Log security events (failed logins, unusual activity)

## Common Vulnerabilities

### Path Traversal
Validate file paths, never trust user input. Use path.resolve() and verify within allowed directory.

### Command Injection
Never pass user input to shell commands. If unavoidable, use libraries that escape properly.

### JWT Security
- Verify signature on every request
- Check expiration (exp claim)
- Short expiration (15min) + refresh tokens
- Store in httpOnly cookies, not localStorage

## Security Checklist
- [ ] All inputs validated/sanitized
- [ ] Secrets in environment variables
- [ ] HTTPS enforced
- [ ] Rate limiting on sensitive endpoints
- [ ] Auth + authz on protected routes
- [ ] CORS configured
- [ ] Security headers (CSP, X-Frame-Options)
- [ ] Dependencies updated (npm audit)
