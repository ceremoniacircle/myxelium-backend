---
description: Design data architecture and storage strategy for any project type
argument-hint: [requirements or existing schema]
allowed-tools: Read, Write, Glob, Grep
---

Design data architecture appropriate for the project type and requirements.

Analyze needs and recommend storage solution:

- **Relational data**: SQL database design with proper normalization
- **Document storage**: NoSQL collections and indexing
- **File-based**: Configuration files, logs, static data
- **In-memory**: Caches, sessions, temporary storage
- **Hybrid**: Multiple storage types for different needs

Input: $ARGUMENTS

Generate:

- Data model definitions in appropriate format
- Relationships and constraints
- Indexing strategy for performance
- Migration plan for schema changes
- Backup and data integrity considerations

Output format matches project technology (SQL DDL, JSON schema, etc.).
