---
description: Validate project builds successfully and meets quality gates
argument-hint: [project path]
allowed-tools: Read, Bash, Glob, Grep
---

Run project validation checks and quality gates.

Execute appropriate checks for project type:

- **Build process**: Compilation, bundling, packaging
- **Tests**: Unit, integration, and end-to-end test suites
- **Code quality**: Linting, formatting, complexity analysis
- **Security**: Vulnerability scans, dependency checks
- **Performance**: Build times, bundle sizes, benchmark tests

Input: $ARGUMENTS

Validate:

- All code compiles/builds without errors
- Test suites pass with adequate coverage
- Code quality standards are met
- No critical security vulnerabilities
- Performance benchmarks are satisfied

Return JSON with:

- `build_status`: Success/failure with error details
- `test_results`: Coverage and pass/fail status
- `quality_gates`: Which gates passed/failed
- `blocking_issues`: Problems that prevent deployment
- `recommendations`: Steps to resolve failures

Stop on first critical failure or continue through all checks based on configuration.
