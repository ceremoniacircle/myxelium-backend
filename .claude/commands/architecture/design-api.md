---
description: Design API structure and endpoints for any application type
argument-hint: [requirements or existing code to analyze]
allowed-tools: Read, Write, Glob, Grep
---

Analyze requirements and design appropriate API structure.

Auto-detect project type and recommend suitable approach:

- **Web apps**: REST, GraphQL, or WebSocket APIs
- **Mobile backends**: RESTful with mobile-optimized responses
- **CLI tools**: Command structure and argument parsing
- **Games**: Event systems and state management
- **Desktop apps**: IPC and plugin architectures

Input: $ARGUMENTS

Create API design with:

- Endpoint structure appropriate for project type
- Data models and validation rules
- Authentication and security considerations
- Error handling patterns
- Documentation format

Return markdown documentation and example requests/responses.
Adapt patterns to match project language and framework.
