---
description: Generate or improve PRD document with SemVer versioning
argument-hint: [idea-source] [optional-analysis-json]
allowed-tools: Read, Write, Glob
---

Generate a Product Requirements Document (PRD) based on the provided idea and optional requirement analysis.

**Input Processing:**

1. **Idea Source ($1):**
   - If it's a file path, read the content
   - If it's text, use directly as the idea description
   - Validate and extract core concept

2. **Analysis JSON ($2) [Optional]:**
   - If provided, read and parse the requirement analysis JSON
   - Extract ambiguities, gaps, priorities, and risks
   - Use to enhance PRD structure and content

**SemVer Versioning Logic:**

1. Check for existing PRD files using pattern `product-requirements-v*.md`
2. If no existing PRD: start at v1.0.0
3. If existing PRD but no analysis provided: increment patch version (1.0.1)
4. If existing PRD with analysis provided: increment minor version (1.1.0)
5. Save as `product-requirements-v{version}.md`

**PRD Structure to Generate:**

```markdown
# Product Requirements Document v{version}

## Overview
[Problem statement and solution overview]

## Goals & Objectives
[Primary goals and success criteria]

## Features & Requirements

### Critical Features
[High priority features from analysis or core idea]

### Standard Features
[Medium priority features]

### Future Considerations
[Low priority or deferred features]

## Implementation Considerations
[Include any risks or complexity notes from analysis]

## Success Metrics
[How success will be measured]

## Timeline
[Basic milestone structure]

## Notes & Clarifications
[Any ambiguities or gaps identified from analysis]
```

**Process:**

1. Determine input type for idea source
2. Read requirement analysis if provided
3. Generate structured PRD content incorporating analysis insights
4. Calculate appropriate SemVer version
5. Write PRD file with proper naming convention

Focus on clarity, actionability, and incorporating insights from the requirement analysis to improve PRD quality.
