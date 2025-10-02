---
allowed-tools:
  - Task
  - Read
  - Edit
  - Bash
  - mcp__pinecone-mcp__search-records
description: "Synthesize brand-aligned copy for page sections using Pinecone vector search with anti-hallucination safeguards"
tags:
  - copywriting
  - pinecone
  - content-synthesis
  - brand-alignment
  - anti-hallucination
version: 2.0.0
changelog:
  - v2.0.0: Added 5-option user decision flow for missing content (provide/fabricate/lorem/reduce/skip)
  - v2.0.0: Added critical anti-hallucination guardrails and content gap analysis
  - v2.0.0: Added high-risk content thresholds (score >= 0.85) and audit trail logging
  - v1.0.0: Initial release with Pinecone synthesis and namespace cascade
---

# Update Page Copy

## Purpose
Deploy brand-copywriter agent to synthesize on-brand copy for each section using Pinecone vector search. Respects text budgets, tone guidelines, and compliance requirements. Supports section filters for selective updates.

## Inputs
- `markdownPath`: Path to Markdown file
- `sectionManifest`: Section definitions from prepare-page-markdown.md
- `namespacePrivority`: Array (e.g., [program, marketing, compliance])
- Optional `sectionsToUpdate`: Array of section names (default: all incomplete sections)

## Outputs
- Updated Markdown file with synthesized copy
- Per-section status report:
  - `sectionName`
  - `copyStatus`: complete/incomplete/skipped
  - `sourceNamespace`: Which Pinecone namespace provided best match
  - `matchScore`: Cosine similarity score (0-1)
  - `wordCount`: Final text length vs budget
  - `comments`: Any issues or notes

## Execution

### Step 1: Identify Sections Needing Copy

Read Markdown and section manifest:

```
sections_to_process = if sectionsToUpdate provided:
                        filter manifest by sectionsToUpdate
                      else:
                        filter manifest where copyComplete == false
```

If no sections need updates:
```
All sections already have finalized copy.
Specify sectionsToUpdate to regenerate specific sections.
```

### Step 2: Deploy Brand-Copywriter Agent

For EACH section needing copy, launch brand-copywriter agent with Task tool:

```
Task(agent: brand-copywriter):

You are writing copy for the "{section.name}" section of a page.

CONTEXT:
- Page title: {title}
- Page intent: {intent}
- Target audience: {audience}
- Brand scope: {brandNotes}

SECTION REQUIREMENTS:
- Intent: {section.intent}
- Text budget: {section.textBudget}
- Component type: {section.componentType}

CONTENT SOURCE:
Use Pinecone vector search to find relevant content:
1. Query: Formulate based on section intent and audience
2. Namespaces to search (in priority order): {namespacePriority}
3. Index: "edu"
4. topK: 8
5. includeMetadata: true

NAMESPACE CASCADE STRATEGY:
- Try primary namespace first (e.g., "program")
- If top match score < 0.7, try next namespace
- Continue until good match found or all exhausted

PINECONE RETRIEVAL:
Use mcp__pinecone-mcp__search-records with:
- name: "edu"
- namespace: {current namespace}
- query: {{ inputs: {{ text: "{generated query}" }}, topK: 8 }}

COPY SYNTHESIS REQUIREMENTS:
1. Read /docs/design/brand-guide.md for voice and lexicon
2. Read /docs/design/brand-guide.json for tone constraints
3. Analyze top 3-5 Pinecone matches for themes
4. Extract relevant stats, quotes, claims
5. Respect brand voice (warm, direct, evidence-based)
6. Fit within text budget: {section.textBudget}
7. If from "compliance" namespace, include disclaimers verbatim
8. Use core lexicon: Alive, Free, Connected, Safe, Legal, Guided, Evidence-based
9. Avoid restricted words: Sacred, Miracle, Cure

COMPLIANCE GUARDRAILS:
- No medical claims ("cure", "treat", "diagnose")
- Use "facilitator" not "therapist" (unless licensed)
- Clarify licensure language per Colorado NMHA
- Honor Indigenous traditions without appropriation

CRITICAL ANTI-HALLUCINATION RULES:
==================================
⛔ NEVER INVENT:
- People's names, titles, or credentials
- Testimonials or quotes
- Statistics, numbers, or metrics
- Partnerships or affiliations
- Dates or historical facts
- Certifications or licenses

✅ ONLY USE:
- Information directly from Pinecone matches (score >= 0.7)
- Information from brand guide files
- Generic brand voice and messaging patterns
- Template structure and formatting

🚨 IF INSUFFICIENT DATA (score < 0.7):
- STOP synthesis immediately
- Report content gap to user
- Wait for user decision (provide/fabricate/lorem/reduce/skip)
- DO NOT make up plausible-sounding content

📊 HIGH-RISK CONTENT (requires score >= 0.85):
- Testimonials with names and roles
- Team member bios with credentials
- Statistics and metrics
- Medical or legal claims
- Case studies with specifics

If match score < 0.85 for high-risk content:
→ Flag immediately and wait for user input
→ DO NOT proceed with synthesis

OUTPUT FORMAT:
Return synthesized copy as plain text (Markdown formatted).
Include:
- Section heading (## {section.name})
- Body copy fitting text budget
- Any necessary disclaimers or safety clauses

Also provide metadata:
- Source namespace: {namespace}
- Match score: {score}
- Word count: {count}
- Fit to budget: within/over/under
```

### Step 3: Handle Missing or Weak Content

If agent reports match score < 0.7 after cascading through all namespaces:

#### 3A: Analyze Content Gap

Determine what type of content is missing and required quantity:

```
📊 CONTENT ANALYSIS: "{section.name}"
==========================================

Pinecone Results:
- Best match score: {score} (threshold: 0.7)
- Namespace searched: {namespaces}
- Top snippet: "{first 100 chars}"

Content Requirements:
- Component type: {componentType}
- Required items: {requiredCount} (e.g., 6-9 team members, 3-5 testimonials)
- Available items: {foundCount} (items with score >= 0.7)
- Gap: {requiredCount - foundCount} items missing

Risk Level:
{if section involves testimonials/bios/credentials: "🚨 HIGH-RISK - Fabricated content poses legal/brand risk"}
{if section involves statistics/claims: "⚠️ MODERATE-RISK - Unverified claims pose credibility risk"}
{else: "✓ LOW-RISK - Generic marketing copy"}
```

#### 3B: Present User Options

Based on content gap analysis, present decision options:

```
⚠️ INSUFFICIENT CONTENT FOR: {section.name}

What would you like to do?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTION 1: Provide Real Information
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Best for: Production sites, high-trust content
⏱️  Time: 5-30 minutes (depending on amount)

I'll ask you for the specific information needed:
{if testimonials: "- Real testimonial quotes with full names, roles, consent"}
{if team bios: "- Team member names, verified credentials, accurate bios"}
{if statistics: "- Actual numbers with data sources and dates"}

Type "1" or "provide" to proceed with manual input.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTION 2: Generate Plausible Content (AI Fabrication)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Best for: Prototypes, design mockups, demos
🚨 RISKS:
   - Fabricated names, credentials, testimonials
   - Legal liability if published as real
   - Brand damage if discovered
   - NOT suitable for production without review

{if HIGH-RISK: "⛔ STRONGLY DISCOURAGED for testimonials/team bios/credentials"}

I will:
- Generate realistic-sounding but FICTIONAL content
- Mark clearly as "[AI-GENERATED - NOT VERIFIED]"
- Log this decision for audit trail
- Require explicit confirmation you understand risks

Type "2" or "fabricate" to proceed (requires confirmation).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTION 3: Use Lorem Ipsum Placeholders
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Best for: Layout testing, design review, wireframes
⏱️  Time: Instant

I will:
- Fill section with standard lorem ipsum text
- Maintain correct structure (headlines, body, lists)
- Preserve text budget requirements
- Clear visual indicator this is placeholder

Type "3" or "lorem" to use placeholders.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTION 4: Reduce Component Count to Available Data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Best for: Working with partial real data
⏱️  Time: Instant

Current situation:
- Required: {requiredCount} items
- Available (score >= 0.7): {foundCount} items

I will:
{if foundCount >= 1: "- Create section with {foundCount} verified items only"}
{if foundCount === 0: "- Cannot use this option (no verified items found)"}
- Update component props to reflect reduced count
- Maintain design integrity with fewer items

{if applicable: "Example: Team section with 3 verified members instead of 9"}

Type "4" or "reduce" to use only verified content.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTION 5: Skip This Section Entirely
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Best for: Non-essential sections without data
⏱️  Time: Instant

I will:
- Mark section as skipped in manifest
- Exclude from component generation
- Document in status report
- Can be added later when content available

Type "5" or "skip" to omit this section.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 3C: Execute User Decision

**IF user chooses Option 1 (Provide Information):**

```
Great! I need the following information for {section.name}:

{if testimonials:}
For each testimonial (need {gap} more):
1. Full quote (exact words)
2. Full name
3. Role/title
4. Company/affiliation (if applicable)
5. Consent obtained? (yes/no)
6. Photo available? (path or description)

{if team bios:}
For each team member (need {gap} more):
1. Full name
2. Title/role
3. Credentials (degrees, licenses - will be verified)
4. Bio (2-3 sentences)
5. LinkedIn or website (for verification)
6. Photo path

{if statistics:}
For each metric (need {gap} more):
1. Metric name
2. Actual number/value
3. Data source
4. Date of data
5. Update frequency

Paste your information below:
```

Wait for user input, then synthesize with brand-copywriter agent using provided data.

**IF user chooses Option 2 (Fabricate):**

First, show confirmation warning:

```
⚠️  FABRICATION CONFIRMATION REQUIRED ⚠️
═══════════════════════════════════════════

You are about to generate FICTIONAL content.

RISKS:
• Legal liability if published as real
• Brand damage if discovered as fake
• Ethical concerns with fabricated testimonials/credentials
• May violate advertising regulations

INTENDED USE CASES:
✓ Design mockups and prototypes
✓ Internal presentations and wireframes
✓ Development/staging environments
✗ Production websites (not recommended)
✗ Investor/client presentations (misleading)

ALL generated content will be marked:
[AI-GENERATED - NOT VERIFIED - FOR MOCKUP ONLY]

Type "CONFIRM FABRICATE" to proceed:
```

If confirmed, instruct brand-copywriter agent:
```
Generate plausible but FICTIONAL content for {section.name}.
Make it realistic and on-brand, BUT:
- Prefix ALL content with: [AI-GENERATED MOCKUP - NOT VERIFIED]
- Use obviously placeholder names if possible (e.g., "Dr. Jane Smith")
- Document that this is fabricated in output metadata
- Log this decision with timestamp
```

**IF user chooses Option 3 (Lorem Ipsum):**

Generate appropriate lorem ipsum structure:

```
{if testimonials:}
> "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
> — **Lorem Ipsum**, [Role Placeholder]

{if team bio:}
**Lorem Ipsum**, [Title Placeholder]
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

{if statistics:}
**[Number]** — Lorem ipsum dolor sit amet
```

**IF user chooses Option 4 (Reduce Count):**

Calculate optimal reduction:

```
Original requirement: {requiredCount} items
Available verified items: {foundCount} items
Reduction: {requiredCount - foundCount} items removed

Component adjustment:
- Update templateStructure.props to reflect {foundCount} items
- Maintain responsive grid layout
- Document reduction in metadata

Proceeding with {foundCount}-item version...
```

Synthesize content using only high-confidence matches.

**IF user chooses Option 5 (Skip):**

```
Skipping "{section.name}" section.

Updated status:
- Section marked as skipped
- Will not be included in component generation
- Can be enabled later with: sectionsToUpdate=["{section.name}"]

Continue with remaining sections...
```

#### 3D: Log Decision for Audit Trail

Record all handling decisions:

```javascript
{
  section: "{section.name}",
  contentGap: {
    required: {requiredCount},
    found: {foundCount},
    gap: {gap}
  },
  riskLevel: "high|moderate|low",
  userDecision: "provide|fabricate|lorem|reduce|skip",
  timestamp: "{ISO datetime}",
  fabricationWarningShown: true/false,
  fabricationConfirmed: true/false
}
```

Save to: `docs/content-decisions-log.json`

### Step 4: Update Markdown with Synthesized Copy

Use Edit tool to replace section content:

```
Edit(markdownPath):
  old_string: "## {section.name}\n[Placeholder...]"
  new_string: "## {section.name}\n{synthesized copy}"
```

**Preserve**:
- Frontmatter (don't touch)
- Other sections (only update target section)
- Image metadata (don't touch)
- HTML comments with intent/budget

### Step 5: Build Status Report

For each processed section, record:

```javascript
{
  sectionName: "Hero",
  copyStatus: "complete",
  sourceNamespace: "program",
  matchScore: 0.85,
  wordCount: "Headline: 18 words, Subhead: 35 words",
  budgetFit: "within budget (15-25, 30-40)",
  comments: "Strong match from program namespace, used evidence-based proof points"
}
```

### Step 6: Final Validation

After all sections processed:

```bash
# Verify Markdown file syntax
cat {markdownPath} | head -50 # Check frontmatter intact

# Count total words added
wc -w {markdownPath}
```

## Output Format

Provide structured summary:

```
=== COPY SYNTHESIS COMPLETE ===

SECTIONS PROCESSED: {count}

SECTION STATUS:
1. Hero
   - Status: ✅ Complete
   - Source: program (score: 0.85)
   - Word count: 18 / 35 (within budget)
   - Notes: Strong evidence-based proof points

2. Problem/Promise
   - Status: ✅ Complete
   - Source: marketing (score: 0.78)
   - Word count: 68 (within 50-75 budget)
   - Notes: Fallback to marketing after program score 0.65

3. Values
   - Status: ⚠️ Weak match
   - Source: compliance (score: 0.62)
   - Action required: Manual review recommended

OVERALL QUALITY:
- Average match score: 0.76
- Sections within budget: 2/3
- Sections needing review: 1

COMPLIANCE CHECK:
✅ No medical claims detected
✅ Proper licensure language used
✅ Cultural sensitivity maintained
✅ Core lexicon applied consistently

NEXT STEPS:
- Review sections with match scores < 0.7
- Run curate-page-media.md to add imagery
- Run validate-brand-and-compliance.md for full audit
```

## Success Criteria

- All target sections have synthesized copy
- Copy fits within text budgets (±10% acceptable)
- Brand voice consistent across sections
- Compliance requirements met
- No placeholder text remains
- Markdown file syntax valid
- Status report provides clear quality indicators

## Error Handling

**Missing API Keys**:
```
Cannot query Pinecone without OPENAI_API_KEY and PINECONE_API_KEY.
Run analyze-project-environment.md first.
```

**Pinecone Index Unavailable**:
```
Cannot connect to Pinecone index "edu".
Verify index name and API key.
Consider manual copy input as fallback.
```

**Brand Guide Missing**:
```
Cannot apply brand voice without /docs/design/brand-guide.md.
Options:
1. Create minimal brand guide
2. Skip brand validation (not recommended)
3. Provide brand guidelines inline
```

**All Namespace Matches Weak**:
```
All namespaces yielded weak matches for "{section.name}".
Recommendation: Provide manual copy points or skip section.
```

## Next Commands

- `curate-page-media.md` (add imagery)
- `validate-brand-and-compliance.md` (audit quality)
- `generate-page-component.md` (if copy finalized)
