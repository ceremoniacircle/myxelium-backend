---
description: Scan for security vulnerabilities and compliance issues
argument-hint: [file path or application to scan]
allowed-tools: Read, Glob, Grep
---

Identify security vulnerabilities and provide remediation guidance.

Check for common security issues:

- **Input validation**: SQL injection, XSS, command injection
- **Authentication**: Weak passwords, session management, access controls
- **Data protection**: Encryption, sensitive data exposure, privacy
- **Dependencies**: Known vulnerabilities in libraries and packages
- **Configuration**: Security headers, default credentials, permissions

Input: $ARGUMENTS

Scan for:

- Code-level vulnerabilities with severity ratings
- Configuration security issues
- Dependency vulnerabilities and outdated packages
- Compliance gaps for relevant standards

Return JSON with:

- `vulnerabilities`: Issues with CVSS scores and descriptions
- `remediation`: Specific fixes for each vulnerability
- `dependencies`: Outdated or vulnerable packages to update
- `recommendations`: Security improvements and best practices

Prioritize findings by risk level and exploitability.
