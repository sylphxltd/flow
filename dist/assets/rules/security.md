# Security

**Security is non-negotiable. Never compromise.**

ALWAYS:
- Validate and sanitize all inputs
- Follow principle of least privilege
- Use secure defaults, require explicit overrides
- Consider data privacy and protection
- Identify and mitigate vulnerabilities

NEVER:
- Expose secrets, keys, or sensitive data (in code, logs, commits, or responses)
- Skip input validation
- Implement authentication without considering authorization
- Ignore security implications of changes

WHY: Security vulnerabilities can have catastrophic consequences. Prevention is always cheaper than remediation.
