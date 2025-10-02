---
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - mcp__pinecone-mcp__describe-index
description: "Analyze project environment and validate prerequisites for page building"
tags:
  - environment
  - validation
  - prerequisites
version: 1.0.0
---

# Analyze Project Environment

## Purpose
Validate environment prerequisites before page building. Checks repo layout, environment variables, Pinecone connectivity, Untitled UI availability, and public/docs symlink status.

## Inputs
None - analyzes current project state

## Outputs
Structured report (in memory) with:
- `projectLayout`: Framework detected, routing pattern, component library location
- `envStatus`: API keys validation (OPENAI_API_KEY, PINECONE_API_KEY)
- `pinecone`: Index connectivity, namespaces, dimensions, metric
- `assetPipeline`: public/docs symlink status, photo metadata availability
- `risks`: Critical blockers that must be resolved before proceeding

## Execution

### Step 1: Project Structure Discovery

Detect framework and routing patterns:

```bash
# Check for Next.js
ls -d src/app 2>/dev/null && echo "Next.js App Router detected"
ls -d pages 2>/dev/null && echo "Next.js Pages Router detected"

# Check for component library
ls node_modules/@untitledui/icons/dist/ 2>/dev/null | head -10
```

**Record findings**:
- Framework: Next.js (App Router / Pages Router) or other
- Components location: node_modules/@untitledui or custom
- Icon availability: List 5-10 example icons with exact names (including variant numbers)

### Step 2: Configuration Validation

Check required configuration files:

```bash
# Brand guide
ls -la docs/design/brand-guide.json docs/design/brand-guide.md

# Photo metadata
ls -la docs/photos/photo_metadata.json

# Environment variables
grep -E "OPENAI_API_KEY|PINECONE_API_KEY" .env.local 2>/dev/null || echo "No .env.local found"
```

**Record findings**:
- Brand guide: Available (JSON + MD) / Missing
- Photo metadata: Available / Missing
- Environment vars: Configured / Missing / Needs verification

### Step 3: API Key Validation

If environment variables exist, validate they're accessible:

```bash
# Test if keys are set (without exposing values)
[ -n "$OPENAI_API_KEY" ] && echo "OPENAI_API_KEY: Set" || echo "OPENAI_API_KEY: Missing"
[ -n "$PINECONE_API_KEY" ] && echo "PINECONE_API_KEY: Set" || echo "PINECONE_API_KEY: Missing"
```

**If keys are missing**, prompt user:
```
I need API keys to proceed. Please provide:
- OPENAI_API_KEY (for text-embedding-3-large embeddings)
- PINECONE_API_KEY (for the edu index)

Add them to .env.local:
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=pcsk_...
```

### Step 4: Pinecone Index Validation

Use Pinecone MCP to verify index configuration:

```
mcp__pinecone-mcp__describe-index("edu")
```

**Verify**:
- Dimensions: Should be 3072 (text-embedding-3-large)
- Metric: Should be cosine
- Namespaces: Should include program, marketing, processes, compliance
- Status: Ready

**If index not accessible**, record as critical blocker.

### Step 5: Asset Pipeline Check

Verify image serving setup:

```bash
# Check if public/docs symlink exists
ls -la public/docs 2>/dev/null

# Check if docs/photos exists
ls -d docs/photos 2>/dev/null

# Check photo metadata
ls -la docs/photos/photo_metadata.json 2>/dev/null
```

**Record findings**:
- Symlink status: Exists / Missing (create with `ln -s ../docs public/docs`)
- Photos directory: Available (count files)
- Metadata: Available / Missing

### Step 6: Risk Assessment

Identify critical blockers:

**CRITICAL (Must fix before proceeding)**:
- Missing API keys
- Pinecone index not accessible
- No component library found

**HIGH (Should fix, workarounds available)**:
- Missing public/docs symlink (can create)
- Missing photo metadata (can generate)
- Missing brand guide (can skip brand validation)

**LOW (Nice to have)**:
- Dev server not running (can start)
- Limited photo library (can use placeholders)

## Output Format

Provide structured summary:

```
=== PROJECT ENVIRONMENT REPORT ===

PROJECT LAYOUT:
- Framework: Next.js App Router
- Components: @untitledui/icons available
- Example icons: Heart, Shield01, Lightbulb02, Target04, CheckCircle

ENVIRONMENT STATUS:
- OPENAI_API_KEY: Set
- PINECONE_API_KEY: Set
- Brand guide: Available (JSON + MD)
- Photo metadata: Available (150 photos)

PINECONE INDEX:
- Name: edu
- Status: Ready
- Dimensions: 3072
- Metric: cosine
- Namespaces: program, marketing, processes, compliance

ASSET PIPELINE:
- public/docs symlink: EXISTS
- docs/photos: Available (150 files)
- photo_metadata.json: Available

RISKS:
[None] or [List critical blockers]

RECOMMENDATION:
✅ Environment is ready for page building
OR
⚠️ Fix the following before proceeding: [list]
```

## Success Criteria

- All required files and configurations detected
- API keys validated (if present)
- Pinecone index accessible
- No critical blockers identified
- Clear go/no-go recommendation provided

## Next Command

If environment is ready: `prepare-page-markdown.md`
If issues found: Resolve blockers first
