---
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - mcp__context7__resolve-library-id
  - mcp__context7__get-library-docs
description: "Discover or create Markdown source file for page with complete frontmatter"
tags:
  - markdown
  - scaffold
  - content-planning
  - untitled-ui
version: 2.0.0
---

# Prepare Page Markdown

## Purpose
Discover existing Markdown source OR interview user to create new page scaffold. Normalizes frontmatter and generates section manifest for downstream commands.

## Inputs
- Optional: Web path (`/about/team`) or file path (`docs/pages/about/team/index.md`)
- Environment report from `analyze-project-environment.md`

## Outputs
- `markdownPath`: Canonical file path (`/docs/pages/{path}/index.md`)
- `frontmatter`: Normalized metadata (slug, title, template, intent, audience, namespacePriority, sections[])
- `sectionManifest`: Array of sections with:
  - `name`: Section identifier
  - `intent`: Purpose of section
  - `textBudget`: Word count guidance
  - `componentType`: Untitled UI component (Hero, SplitLayout, IconFeatureGrid, etc.)
  - `copyComplete`: Boolean indicating if section has finalized text
  - `imageRequired`: Boolean indicating if section needs imagery
  - `imageComplete`: Boolean indicating if image is selected

## Execution

### Step 1: Determine Content Source Strategy

Ask user:

```
Do you already have a Markdown file for this page under /docs/pages (or subfolder)?

- If YES: Provide either:
  - Website URL path (e.g., /about/team)
  - OR file path (e.g., docs/pages/about/team/index.md)

- If NO: Reply 'no' and I'll interview you to create it
```

**Wait for user response.**

---

## WORKFLOW A: Existing Markdown (If User Said YES)

### Step A1: Path Resolution and Discovery

Convert provided path to canonical file path:
- Web path `/about/team` → `docs/pages/about/team/index.md`
- Relative path `docs/...` → Resolve to absolute path

Use Read tool to verify file exists:

```
Read: docs/pages/{path}/index.md
```

If file not found at exact path:
```bash
# Search for similar paths
find docs/pages -name "*.md" | grep -i {keyword}
```

### Step A2: Markdown Parsing

Extract frontmatter keys:
- `slug`: URL-friendly name
- `title`: Full page title
- `template`: Untitled UI template name (optional)
- `pageType`: Page category (about, landing, contact, etc.)
- `intent`: educate, convert, leads
- `audience`: Target persona description
- `brandNotes`: Key brand constraints
- `namespacePriority`: Array (e.g., [program, marketing, compliance])
- `mustHaveAssets`: Required hero/logo images
- `sections[]`: Array of section definitions with name, intent, textBudget, components, image

**Identify all sections**:
- Parse H2/H3 headings in body
- Cross-reference with frontmatter sections array
- Check for text budget comments (`<!-- Text Budget: ... -->`)
- Check for intent comments (`<!-- Intent: ... -->`)

### Step A3: Gap Analysis

Compare parsed metadata against required fields:

**Required fields checklist**:
- [ ] slug
- [ ] title
- [ ] intent (educate/convert/leads)
- [ ] audience
- [ ] namespacePriority
- [ ] sections array (at least 1 section)

**If any gaps exist**, ask user for missing information:

```
I've analyzed your Markdown file. I need clarification on:

a) Slug & Title: [confirmed: {slug}, {title}] or [need you to provide]
b) Untitled UI Template: Mirror a template (e.g., 'About page 10') or just specify pageType?
c) Primary Intent: educate, convert, or leads?
d) Target Audience: [summarize from brand guide] - confirm or adjust?
e) Namespace Priority: program → marketing → compliance? Or different order?
f) Must-Have Assets: Specific hero image or logo files?
g) Target URL Path: /{slug} or deeper path like /about/team?
```

### Step A4: Markdown Normalization

Use Edit tool to add/update frontmatter with finalized metadata:

```yaml
---
slug: "{slug}"
title: "{title}"
template: "{template}" # or pageType: "{type}"
intent: "{educate/convert/leads}"
audience: "{description}"
brandNotes: "{constraints from brand guide}"
namespacePriority: [program, marketing, compliance]
mustHaveAssets:
  hero: "{filename.jpg}" # or null
  logo: "{filename.png}" # or null
sections:
  - name: "Hero"
    intent: "Hook and establish value"
    textBudget: "15-25 words headline, 30-40 words subheadline"
    components: ["Hero"]
    image: null
  [... all sections ...]
---
```

**Preserve existing body content** - don't modify section text.

### Step A5: Generate Section Manifest

Build structured manifest for downstream commands:

```javascript
sectionManifest = [
  {
    name: "Hero",
    intent: "Hook and establish value proposition",
    textBudget: "15-25 words headline, 30-40 words subheadline",
    componentType: "Hero",
    copyComplete: false, // Check if placeholder text or real content
    imageRequired: true, // Hero always needs background image
    imageComplete: false // Check if image metadata exists
  },
  {
    name: "Values",
    intent: "Highlight core pillars",
    textBudget: "30-50 words per value (3-4 values)",
    componentType: "IconFeatureGrid",
    copyComplete: true, // Check body text
    imageRequired: false, // Icon grids don't need large featured images
    imageComplete: true // N/A
  },
  // ... all sections
]
```

**Component type → Image requirement mapping**:
- `Hero`: Required (background)
- `CTASection`: Required (background)
- `SplitLayout`: Required (side image)
- `ContentBlock`: Optional (contextual)
- `IconFeatureGrid`: NOT required (has icons)
- `StatsGrid`: NOT required (has numbers)
- `TestimonialGrid`: Optional (if includes photos)

**Proceed to next command.**

---

## WORKFLOW B: New Markdown Creation (If User Said NO)

### Step B1: Untitled UI Template Analysis (CRITICAL)

**If user specified an Untitled UI template** (e.g., "About page 01"):

**Step B1.1: Get Untitled UI Documentation**

Use Context7 to fetch Untitled UI docs:

```
mcp__context7__resolve-library-id("untitled-ui")
mcp__context7__get-library-docs(libraryId, topic: "templates examples cli")
```

**Step B1.2: Find Template CLI Command**

Search docs for the template generation command:

```bash
# Look for CLI command pattern
# Expected format: npx untitledui@latest example {category}/{number}
# Examples:
# - npx untitledui@latest example about-pages/01
# - npx untitledui@latest example landing-pages/07
# - npx untitledui@latest example contact-pages/03
```

**Parse template identifier**:
- Template name: "About page 01" → category: "about-pages", number: "01"
- Template name: "Landing page 07" → category: "landing-pages", number: "07"

**Step B1.3: Generate Template Example**

Run the CLI command to generate the example:

```bash
# Generate template in temp directory
mkdir -p /tmp/untitled-template-analysis
cd /tmp/untitled-template-analysis
npx untitledui@latest example {category}/{number}

# Capture generated files
ls -R
```

**Step B1.4: Analyze Template Structure**

Parse the generated example to extract:

**Component Analysis**:
```bash
# Find all component imports
grep -r "from.*@/components" . | grep -o "from.*" | sort -u

# Example output:
# from "@/components/marketing/hero"
# from "@/components/marketing/features/icon-feature-grid"
# from "@/components/marketing/stats-grid"
# from "@/components/marketing/cta-section"
```

**Section Structure Analysis**:
```bash
# Identify section components in main page file
grep -E "(export default|function.*Page|const.*Section)" {page-file}
```

**Record findings**:
```javascript
templateStructure = {
  components: [
    { name: "Hero", type: "Header + Hero section", props: ["heading", "subheading", "cta", "backgroundImage"] },
    { name: "Features", type: "IconFeatureGrid", props: ["title", "features[]"], imageRequired: false },
    { name: "Stats", type: "StatsGrid", props: ["stats[]"], imageRequired: false },
    { name: "Team", type: "TeamGrid", props: ["members[]"], imageRequired: true },
    { name: "CTA", type: "CTASection", props: ["heading", "cta", "backgroundImage"], imageRequired: true }
  ],
  images: {
    hero: { size: "1920x1080", aspect: "16:9", purpose: "background" },
    team: { size: "800x800", aspect: "1:1", purpose: "profile photos", count: "4-6" },
    cta: { size: "1920x1080", aspect: "16:9", purpose: "background with overlay" }
  },
  copyRequirements: {
    hero: { headline: "10-15 words", subheadline: "25-35 words", cta: "2-3 words" },
    features: { title: "5-8 words", description: "15-25 words per feature", count: "3-4 features" },
    stats: { number: "metric", label: "2-4 words", count: "4-6 stats" },
    team: { name: "2-3 words", role: "2-4 words", bio: "20-30 words", count: "4-6 members" },
    cta: { headline: "8-12 words", description: "15-25 words", button: "2-3 words" }
  },
  dataRequirements: {
    stats: ["alumni count", "video testimonials", "review rating", "completion rate"],
    team: ["names", "roles", "photos", "bios"],
    features: ["value propositions", "benefit statements", "proof points"]
  }
}
```

**Step B1.5: Clean Up**

```bash
# Remove temporary files
rm -rf /tmp/untitled-template-analysis
```

### Step B2: Gather Page Context and Background Information

**BEFORE asking structured questions**, gather unstructured context from the user:

```
Before I ask you structured questions, please share any background information, context, or supporting materials for this page:

**Examples of helpful context:**
- Company/team bios you've already written
- Mission statements or brand messaging
- Statistics, testimonials, or proof points
- Product descriptions or service details
- Any existing copy or drafts
- Links to reference pages or competitors
- Notes about what you want to communicate

You can paste as much or as little as you have. This will help me create more accurate, relevant content that matches your vision.

If you don't have any supporting materials, just type "none" and I'll proceed with the structured interview.
```

**Wait for user response.**

**Process the context:**
- Save user-provided information as reference material
- Extract key facts, statistics, names, claims
- Identify tone, voice, and messaging patterns
- Note any specific requirements or constraints mentioned

This context will be used later to:
- Inform copy synthesis in update-page-copy.md
- Match team member names to photos in curate-page-media.md
- Ensure accuracy in generated content

### Step B3: Comprehensive Interview

Ask all required questions informed by template analysis:

```
Let's create the content plan for your new page based on the "{template name}" template.

**TEMPLATE STRUCTURE DISCOVERED**:
I analyzed the Untitled UI "{template name}" template and found:
- Components: {list component types}
- Image requirements: {list image specs}
- Copy requirements: {list text budget per section}
- Data requirements: {list specific content needs}
```

Then ask all required questions in one message:

```
Let's create the content plan for your new page. I need:

**a) Page Identity:**
- Slug (URL-friendly, e.g., 'about' or 'team')
- Full title (e.g., 'About Ceremonia' or 'Meet Our Team')
- Target URL path (e.g., /about or /about/team) [defaults to /{slug}]

**b) Design Template:**
- Specific Untitled UI template to mirror? (e.g., 'Landing page 07', 'About page 10')
- OR just pageType? (landing, about, contact, pricing, program-detail)

**c) Strategy:**
- Primary intent: educate, convert, or capture leads?
- Target audience: [I'll summarize from brand guide] - confirm or adjust?

**d) Content Sources:**
- Pinecone namespace priority: program → marketing → compliance (default)? Or different?
- Any must-have assets? (hero image filename, logos)

**e) Brand Alignment:**
[Load and summarize brand-guide.json]
- Tone: {warm/professional/educational}
- Key constraints: {legal disclaimers, medical claims, etc.}
- Does this match your vision?
```

**Wait for user response.**

### Step B4: Outline Proposal

Based on template or pageType, propose structure:

```
Based on the Untitled UI "{template name}" template and your inputs,
here's the proposed page structure:

## Proposed Structure (From Template Analysis)

{For each component in templateStructure.components:}

### {index}. {component.name} Section
- Component Type: {component.type}
- Intent: {derive from component purpose}
- Props Required: {component.props}
- Image Required: {component.imageRequired ? "Yes - " + imageSpecs : "No"}
- Text Budget: {copyRequirements for this section}
- Data Needs: {dataRequirements for this section}

Example sections based on "About page 01":

### 1. Hero Section
- Component: Hero (Header + Hero section)
- Intent: Hook and establish value proposition
- Props: heading, subheading, cta, backgroundImage
- Image: YES - 1920×1080 background, 16:9 aspect
- Text Budget: 10-15 words headline, 25-35 words subheadline, 2-3 words CTA
- Data Needs: Core promise, safety clause, primary CTA

### 2. Features Section
- Component: IconFeatureGrid
- Intent: Highlight key value propositions
- Props: title, features[] (each with icon, title, description)
- Image: NO (uses icons instead)
- Text Budget: 5-8 words title, 15-25 words per feature (3-4 features)
- Data Needs: Value propositions, benefit statements, proof points

### 3. Stats Section
- Component: StatsGrid
- Intent: Provide social proof through numbers
- Props: stats[] (each with number, label, description)
- Image: NO (displays numbers)
- Text Budget: Number + 2-4 words label per stat (4-6 stats)
- Data Needs: Alumni count, video testimonials, review rating, completion rate

[... continue for all template sections ...]

Does this structure match your needs? Any sections to add, remove, or modify?
```

**Wait for user approval.**

### Step B4: Markdown Scaffolding with Template Structure

Use Write tool to create file at canonical path:

```
docs/pages/{path}/index.md
```

**Scaffold content using template structure**:

```markdown
---
slug: "{slug}"
title: "{title}"
template: "{Untitled UI template name}" # e.g., "About page 01"
templateCLI: "npx untitledui@latest example {category}/{number}"
intent: "{educate/convert/leads}"
audience: "{target audience}"
brandNotes: "{brand constraints}"
namespacePriority: [program, marketing, compliance]
mustHaveAssets:
  hero: null
  logo: null
templateStructure:
  components: {list from analysis}
  images: {specs from analysis}
  copyRequirements: {budgets from analysis}
  dataRequirements: {needs from analysis}
sections:
  # Sections MATCH template component structure
  - name: "{component.name from template}"
    intent: "{derived from component purpose}"
    componentType: "{component.type from template}"
    props: {component.props from template}
    textBudget: "{copyRequirements from template}"
    dataNeeds: {dataRequirements from template}
    image: null # if imageRequired from template

  # Example for "About page 01":
  - name: "Hero"
    intent: "Hook and establish value proposition"
    componentType: "Hero"
    props: ["heading", "subheading", "cta", "backgroundImage"]
    textBudget: "10-15 words headline, 25-35 words subheadline, 2-3 words CTA"
    dataNeeds: ["core promise", "safety clause", "primary CTA"]
    image: null # 1920×1080 background required

  - name: "Features"
    intent: "Highlight key value propositions"
    componentType: "IconFeatureGrid"
    props: ["title", "features[]"]
    textBudget: "5-8 words title, 15-25 words per feature (3-4 features)"
    dataNeeds: ["value propositions", "benefit statements", "proof points"]
    image: null # NO image - uses icons

  - name: "Stats"
    intent: "Provide social proof through numbers"
    componentType: "StatsGrid"
    props: ["stats[]"]
    textBudget: "Number + 2-4 words label per stat (4-6 stats)"
    dataNeeds: ["alumni count", "testimonials", "rating", "completion rate"]
    image: null # NO image - displays numbers

  [... all sections from template ...]
---

# {Title}

## Hero
<!-- Intent: Hook and establish value proposition -->
<!-- Text Budget: 15-25 words headline, 30-40 words subheadline -->

[Placeholder: Content will be synthesized from Pinecone]

## Problem/Promise
<!-- Intent: Address pain points and present solution -->
<!-- Text Budget: 50-75 words -->

[Placeholder: Content will be synthesized from Pinecone]

[... all section scaffolds ...]
```

### Step B4: Generate Section Manifest

Build manifest from scaffold (all sections incomplete):

```javascript
sectionManifest = sections.map(section => ({
  name: section.name,
  intent: section.intent,
  textBudget: section.textBudget,
  componentType: section.components[0],
  copyComplete: false, // All placeholders
  imageRequired: determineImageRequirement(section.components[0]),
  imageComplete: false
}))
```

**Proceed to next command.**

---

## Output Format

Provide structured summary:

```
=== MARKDOWN PREPARATION COMPLETE ===

MARKDOWN PATH:
docs/pages/{path}/index.md

FRONTMATTER:
- Slug: {slug}
- Title: {title}
- Template: {template} or PageType: {type}
- Intent: {intent}
- Audience: {audience}
- Namespace Priority: {array}

SECTION MANIFEST:
1. Hero (Hero component)
   - Copy: [Complete/Incomplete]
   - Image: [Required, Incomplete]

2. Problem/Promise (SplitLayout component)
   - Copy: [Incomplete]
   - Image: [Required, Incomplete]

[... all sections ...]

NEXT STEPS:
✅ Ready for copy synthesis: update-page-copy.md
✅ Ready for media curation: curate-page-media.md

You can run these in parallel or sequentially.
```

## Success Criteria

- Markdown file exists at canonical path
- Frontmatter contains all required fields
- Section manifest accurately reflects content completeness
- Component types correctly identified
- Image requirements determined
- Clear handoff to next commands

## Next Commands

- `update-page-copy.md` (can run in parallel)
- `curate-page-media.md` (can run in parallel)
- OR both simultaneously for faster completion
