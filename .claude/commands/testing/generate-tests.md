---
description: Generate appropriate tests for any codebase
argument-hint: [file path or code to test]
allowed-tools: Read, Write, Edit, Glob, Grep
---

Analyze code and generate comprehensive tests using project's existing testing framework.

Auto-detect testing setup:

- **JavaScript/TypeScript**: Jest, Vitest, Mocha, or Cypress
- **Python**: pytest, unittest, or nose
- **Java**: JUnit, TestNG, or Mockito
- **Go**: built-in testing package
- **Other languages**: Appropriate framework for language

Input: $ARGUMENTS

Generate tests covering:

- **Unit tests**: Individual functions and classes
- **Integration tests**: Component interactions
- **Edge cases**: Boundary conditions and error scenarios
- **Mocks**: External dependencies and APIs

Create test files following project conventions:

- Naming patterns that match existing tests
- Setup and teardown appropriate for framework
- Assertions using project's preferred style
- Coverage for critical paths and error handling

If no testing framework detected, recommend appropriate options.
