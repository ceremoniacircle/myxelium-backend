---
description: Review code for quality, security, and best practices
argument-hint: [file path or code to review]
allowed-tools: Read, Glob, Grep
---

Perform comprehensive code review focusing on quality, security, and maintainability.

Analyze code for:

- **Logic errors**: Bugs, edge cases, incorrect assumptions
- **Security issues**: Vulnerabilities, input validation, authentication
- **Performance**: Inefficient algorithms, memory leaks, bottlenecks
- **Maintainability**: Code clarity, documentation, test coverage
- **Best practices**: Language conventions, framework patterns

Input: $ARGUMENTS

Return JSON with:

- `issues`: Prioritized list of problems with severity levels
- `suggestions`: Specific improvements with code examples
- `security_concerns`: Potential vulnerabilities and fixes
- `performance_opportunities`: Optimization recommendations
- `best_practices`: Standards compliance and improvements

Focus on actionable feedback that improves code quality.
Adapt review criteria to language and project type.
