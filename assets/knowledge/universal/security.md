---
name: Security Best Practices
description: OWASP, authentication, authorization, vulnerabilities, secure coding
---

# Security Best Practices

## OWASP Top 10

### SQL Injection
- **Never** concatenate user input into SQL queries
- Use parameterized queries or prepared statements
- Example (bad): `SELECT * FROM users WHERE id = ${userId}`  
- Example (good): `SELECT * FROM users WHERE id = ?` with parameter binding

### XSS (Cross-Site Scripting)
- Sanitize and escape all user-generated content before rendering
- Use Content Security Policy (CSP) headers
- Never use `dangerouslySetInnerHTML` without sanitization
- Validate on server-side, not just client-side

### Authentication & Authorization
- Use established auth libraries (Passport, NextAuth, Auth0)
- Store passwords with bcrypt/argon2, never plain text
- Implement rate limiting on login endpoints
- Use httpOnly, secure, sameSite cookies for session tokens
- Separate authentication (who you are) from authorization (what you can do)

### CSRF (Cross-Site Request Forgery)
- Use CSRF tokens for state-changing operations
- Check Origin/Referer headers
- SameSite cookie attribute helps prevent CSRF

## Secrets Management
- **Never** commit secrets to git (.env in .gitignore)
- Use environment variables for secrets
- Rotate credentials regularly
- Use secret management services (AWS Secrets Manager, Vault)

## Input Validation
- Validate on server-side (client validation is for UX only)
- Whitelist approach: Define what's allowed, reject everything else
- Sanitize file uploads (check type, size, scan for malware)
- Validate API inputs against schema (Zod, Joi)

## API Security
- Use HTTPS everywhere
- Implement rate limiting
- Validate Content-Type headers
- Use API keys/tokens with least privilege
- Log security events (failed logins, unusual activity)

## Common Vulnerabilities

### Path Traversal
- Validate file paths, never trust user input
- Use path.resolve() and check if result is within allowed directory

### Command Injection
- Never pass user input to shell commands
- If unavoidable, use libraries that properly escape arguments

### JWT Security
- Verify signature on every request
- Check expiration (exp claim)
- Use short expiration times (15min) with refresh tokens
- Store in httpOnly cookies, not localStorage

## Security Checklist
- [ ] All user inputs validated and sanitized
- [ ] Secrets in environment variables, not code
- [ ] HTTPS enforced
- [ ] Rate limiting on sensitive endpoints
- [ ] Authentication + authorization on protected routes
- [ ] CORS configured properly
- [ ] Security headers set (CSP, X-Frame-Options, etc.)
- [ ] Dependencies regularly updated (npm audit)
