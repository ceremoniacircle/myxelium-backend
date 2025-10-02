---
description: Prioritize features based on value, effort, and dependencies
argument-hint: [feature list or requirements document]
allowed-tools: Read, Glob
---

Analyze features and create a prioritized development plan.

Evaluate each feature on:

- **Business value**: Impact on users and goals
- **Implementation effort**: Complexity and time required
- **Dependencies**: What needs to be built first
- **Risk level**: Technical and timeline uncertainty

Input: $ARGUMENTS

Return JSON with:

- `features`: Each feature with priority score and rationale
- `development_phases`: Logical groupings for implementation
- `quick_wins`: High-value, low-effort features to start with
- `dependencies`: Required order and blocking relationships
- `risks`: Features that need careful planning or may cause delays

Use MoSCoW method (Must/Should/Could/Won't) and consider dependencies for realistic sequencing.
