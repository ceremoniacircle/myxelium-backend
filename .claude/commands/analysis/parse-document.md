---
description: Extract structured information from any project document (PRD, specs, README, etc.)
argument-hint: [document path or content]
allowed-tools: Read, Glob, Grep
---

Parse the provided document and extract key information in a structured format.

Auto-detect document type and extract relevant sections:

- **Requirements docs**: features, constraints, success criteria
- **Technical specs**: architecture, APIs, data models
- **README files**: setup instructions, usage, dependencies
- **Design docs**: user flows, wireframes, technical decisions

Input: $ARGUMENTS

Return JSON with:

- `document_type`: Detected type and purpose
- `key_sections`: Important content organized by category
- `action_items`: Tasks, TODOs, or next steps mentioned
- `dependencies`: External requirements or integrations
- `contacts`: People, teams, or roles mentioned

Adapt extraction based on document type and content structure.
