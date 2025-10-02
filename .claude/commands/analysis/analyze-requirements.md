---
description: Analyze requirements document and identify ambiguities, gaps, and priorities
argument-hint: [file path or requirements text]
allowed-tools: Read, Glob
---

Analyze the provided requirements and identify:

1. **Ambiguous specifications** - unclear, vague, or conflicting requirements
2. **Missing information** - gaps that need clarification
3. **Priority assessment** - critical vs optional features
4. **Implementation risks** - potentially complex or problematic areas

Input: $ARGUMENTS

Return JSON with:

- `ambiguities`: Array of unclear requirements with suggested clarifications
- `gaps`: Missing information that needs to be specified
- `priorities`: Requirements categorized by importance (critical/high/medium/low)
- `risks`: Implementation challenges and complexity concerns
- `recommendations`: Specific questions to ask stakeholders

Focus on actionable insights that improve requirement clarity and project planning.
