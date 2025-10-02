---
description: Check project health and progress across key metrics
argument-hint: [project path]
allowed-tools: Read, Glob, Grep
---

Analyze project status and provide health overview.

Check key indicators:

- **Code quality**: Test coverage, linting results, documentation
- **Development velocity**: Recent commits, issue resolution, milestone progress
- **Technical debt**: TODOs, deprecated code, performance issues
- **Dependencies**: Outdated packages, security vulnerabilities
- **Documentation**: Completeness and currency of project docs

Input: $ARGUMENTS

Return JSON with:

- `health_score`: Overall project health (0-100)
- `code_quality`: Metrics on tests, linting, complexity
- `progress`: Recent activity and milestone status
- `risks`: Issues that need attention
- `recommendations`: Specific actions to improve project health

Adapt metrics to project type and available information.
Focus on actionable insights for improvement.
