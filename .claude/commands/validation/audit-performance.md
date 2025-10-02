---
description: Analyze performance bottlenecks and optimization opportunities
argument-hint: [application URL, file path, or code to analyze]
allowed-tools: Read, Glob, Grep
---

Identify performance issues and provide optimization recommendations.

Analyze different aspects based on project type:

- **Web applications**: Load times, bundle sizes, API response times
- **Backend services**: Database queries, algorithm efficiency, memory usage
- **Mobile apps**: Battery usage, network efficiency, rendering performance
- **Desktop applications**: CPU usage, memory footprint, startup time

Input: $ARGUMENTS

Evaluate:

- Current performance metrics and bottlenecks
- Code efficiency and optimization opportunities
- Resource usage patterns and waste
- Scalability limitations and constraints

Return JSON with:

- `performance_issues`: Specific problems with impact assessment
- `optimizations`: Recommended improvements with expected gains
- `benchmarks`: Key metrics to track for monitoring
- `tools`: Suggested profiling and monitoring solutions

Provide actionable recommendations prioritized by impact and effort.
