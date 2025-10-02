---
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - mcp__context7__resolve-library-id
  - mcp__context7__get-library-docs
description: "AI-driven synchronization of brand guide design tokens to Untitled UI global variables with multi-brand support"
tags:
  - design-system
  - brand-tokens
  - untitled-ui
  - ai-analysis
  - prompt-driven
  - multi-brand
version: 1.0.0
---

# Sync Brand Guide to Untitled UI Design Variables

## Purpose
Intelligently analyze brand guide documentation and synchronize design tokens (colors, typography, spacing, etc.) to Untitled UI's global design variable system. Supports multi-brand architectures where sub-brands (e.g., Journeys, EDU, Spaces) can be selected dynamically for page generation.

## Context

This command uses advanced AI analysis to:
1. Research Untitled UI's design token architecture via Context7
2. Parse local brand guide files (brand-guide.json, brand-guide.md)
3. Deploy brand-designer agent to intelligently map brand tokens to Untitled UI variables
4. Generate theme files that support brand scope selection
5. Enable future pages to choose master brand or sub-brand styling

## Execution

### STEP 1: Untitled UI Design Token Research

**Deploy intelligent research to understand Untitled UI's design system architecture:**

Use Context7 to research Untitled UI's design token structure:

```
Let me research how Untitled UI organizes global design variables.

First, resolve the Untitled UI library identifier:
mcp__context7__resolve-library-id("untitled-ui")

Then, fetch comprehensive documentation on design tokens:
mcp__context7__get-library-docs(libraryId, topic: "design tokens variables theming colors typography spacing")

Apply chain-of-thought analysis to understand:
- How Untitled UI structures color tokens (primary, secondary, accent, semantic)
- Typography token organization (font families, sizes, weights, line heights)
- Spacing scale patterns (base unit, multipliers, responsive tokens)
- Component-specific tokens vs. global tokens
- Theme switching mechanisms (light/dark mode, brand variants)
- CSS custom property naming conventions
- Token inheritance and composition patterns

Document the discovered architecture for mapping in subsequent steps.
```

**Expected Research Output:**
- Untitled UI token structure and naming conventions
- Hierarchy of global vs. component tokens
- Theme organization patterns
- CSS custom property patterns

### STEP 2: Brand Guide Discovery and Analysis

**Use intelligent file discovery to locate and parse brand guide documentation:**

```
Apply adaptive file discovery to find brand guide files:

Use Glob tool to search for brand guide files:
- Pattern: "docs/design/**/*.{json,md}"
- Expected: brand-guide.json, brand-guide.md, sub-brand configs

Read each discovered brand guide file and apply intelligent parsing:

For JSON files (brand-guide.json):
- Parse color palettes (neutrals, accents, semantics)
- Extract typography system (font families, size scales, weights)
- Identify spacing scale (base unit, scale multipliers)
- Detect radius/shadow tokens
- Recognize brand scopes (master, sub-brands)

For Markdown files (brand-guide.md):
- Extract design principles and philosophy
- Identify usage guidelines and constraints
- Parse voice/tone guidance for design decisions
- Detect accessibility requirements
- Understand brand hierarchy and relationships

Think step-by-step about the brand architecture:
1. Is this a single-brand or multi-brand system?
2. If multi-brand: What is the master brand? What are sub-brands?
3. How do sub-brands relate to master? (inherit, override, extend)
4. What tokens are shared vs. unique per brand?
5. How should brand selection work for pages?

Document findings for mapping analysis in next step.
```

**Expected Discovery Output:**
- All brand guide file paths
- Parsed brand token data (colors, typography, spacing, etc.)
- Brand hierarchy (master → sub-brands)
- Token inheritance relationships
- Brand selection strategy

### STEP 3: Deploy Brand-Designer Agent for Intelligent Token Mapping

**Launch specialized brand-designer agent to perform sophisticated design token mapping:**

```
Task(agent: brand-designer, description: "Map brand tokens to Untitled UI variables"):

You are analyzing brand guide documentation and mapping design tokens to Untitled UI's global design variable system.

CONTEXT PROVIDED:
1. Untitled UI Design Token Architecture (from Step 1 research)
2. Brand Guide Files and Parsed Data (from Step 2 discovery)

YOUR ANALYSIS TASK:

Use extended thinking to perform comprehensive token mapping analysis:

**PHASE 1: Token Alignment Analysis**

Think deeply about how brand tokens map to Untitled UI structure:

Brand Guide Color → Untitled UI Color Tokens:
- Analyze: Do brand neutrals map to gray-50 through gray-950?
- Analyze: How do brand accent colors map to primary/brand token scales?
- Analyze: Do semantic colors (success, warning, error) exist in brand guide?
- Analyze: How to handle brand-specific colors not in Untitled UI defaults?
- Decision: Create token mapping with semantic clarity

Brand Guide Typography → Untitled UI Typography Tokens:
- Analyze: Which brand font becomes --font-display vs --font-body?
- Analyze: How does brand's type scale map to Untitled UI's text-* sizes?
- Analyze: Do font weights align with Untitled UI conventions?
- Analyze: How to handle custom font features or fallbacks?
- Decision: Map typography with performance and accessibility in mind

Brand Guide Spacing → Untitled UI Spacing Tokens:
- Analyze: What is the brand's base spacing unit (4px, 8px)?
- Analyze: Does the scale match Untitled UI's spacing-* pattern?
- Analyze: Are there custom spacing values for specific use cases?
- Decision: Align spacing scales or create custom tokens

**PHASE 2: Multi-Brand Architecture Design**

If multiple sub-brands detected (e.g., Journeys, EDU, Spaces):

Think strategically about brand scope implementation:

1. **Token Organization Strategy:**
   - Master brand tokens: Shared by all sub-brands (neutrals, base spacing)
   - Sub-brand tokens: Unique per brand (accent colors, display fonts)
   - Token inheritance: How sub-brands extend/override master

2. **Theme File Structure:**
   - Should there be: theme.css (master), theme-journeys.css, theme-edu.css, theme-spaces.css?
   - Or: theme.css with brand scope CSS custom properties?
   - Or: Dynamic theme switching via JavaScript?

3. **Brand Selection Mechanism:**
   - How do future pages choose their brand? (frontmatter? layout import? route-based?)
   - Should page components specify brand scope explicitly?
   - How to default to master brand if no sub-brand specified?

4. **Token Naming Convention:**
   - Use scoped tokens: --brand-journeys-primary, --brand-edu-primary?
   - Or use generic tokens that change per theme file: --brand-primary?
   - Ensure clarity and maintainability

**PHASE 3: Mapping Decisions and Recommendations**

Generate comprehensive mapping recommendations:

For each token category (colors, typography, spacing, etc.):
1. Source: Brand guide token name and value
2. Target: Untitled UI CSS custom property name
3. Transformation: Any value conversion needed (hex to RGB, px to rem)
4. Scope: Master brand, sub-brand, or shared
5. Rationale: Why this mapping makes sense

For multi-brand architecture:
1. Recommend theme file structure
2. Specify token inheritance strategy
3. Define brand selection mechanism
4. Suggest naming conventions

**OUTPUT REQUIREMENTS:**

Provide a structured mapping document with:

```markdown
# Brand Token → Untitled UI Mapping Analysis

## Brand Architecture
- Master Brand: [name]
- Sub-Brands: [list]
- Token Inheritance: [strategy]

## Token Mappings

### Colors
| Brand Token | Value | Untitled UI Token | Scope | Notes |
|-------------|-------|-------------------|-------|-------|
| ... | ... | ... | ... | ... |

### Typography
| Brand Token | Value | Untitled UI Token | Scope | Notes |
|-------------|-------|-------------------|-------|-------|
| ... | ... | ... | ... | ... |

### Spacing
| Brand Token | Value | Untitled UI Token | Scope | Notes |
|-------------|-------|-------------------|-------|-------|
| ... | ... | ... | ... | ... |

## Recommended Theme Structure

```css
/* Example structure */
```

## Brand Selection Strategy
[Detailed recommendation for how pages choose brand scope]

## Implementation Notes
[Any special considerations, warnings, or optimizations]
```

Execute this analysis autonomously and return the complete mapping document.
```

**Expected Agent Output:**
- Comprehensive token mapping table
- Multi-brand architecture recommendation
- Theme file structure proposal
- Brand selection mechanism design
- Implementation guidance

### STEP 4: Theme File Generation and Integration

**Use AI-driven synthesis to generate theme files based on mapping analysis:**

```
Based on the brand-designer agent's mapping analysis, intelligently generate theme files.

Apply adaptive theme generation strategy:

**IF Single Brand System Detected:**

Generate single theme file:
- Path: src/styles/theme.css
- Contains: All Untitled UI CSS custom properties mapped from brand guide
- Structure: @theme block with all design tokens
- Includes: Typography global rules (h1-h3 use display font, etc.)

**IF Multi-Brand System Detected (Master + Sub-Brands):**

Generate master theme file:
- Path: src/styles/theme.css
- Contains: Shared tokens (neutrals, base spacing, semantic colors)
- Typography: Base font definitions

Generate sub-brand theme files:
- Paths: src/styles/theme-[subbrand].css (e.g., theme-journeys.css, theme-edu.css)
- Contains: Sub-brand specific tokens (brand accent, display font overrides)
- Extends: Master theme through CSS cascade
- Typography: h1-h3 global rules to enforce brand fonts

For each theme file, construct content using intelligent synthesis:

1. **@theme Block Construction:**
   - Map each brand token to corresponding Untitled UI CSS custom property
   - Apply value transformations (hex → rgb(), px → rem if needed)
   - Organize by category (colors, typography, spacing, shadows, radii)
   - Include comments explaining token origins and usage

2. **Typography Global Rules:**
   ```css
   @layer base {
       h1, h2, h3 {
           font-family: var(--font-display);
       }
       h4, h5, h6, p, span, div, a, button, input, textarea, label {
           font-family: var(--font-body);
       }
   }
   ```

3. **Brand Scope Comments:**
   - Document which brand this theme represents
   - Explain inheritance relationships
   - Note any custom tokens or overrides

**Brand Selection Documentation:**

Create or update README with brand selection instructions:

```markdown
## Brand Selection for Pages

This project supports multiple brand scopes: [list brands]

### How to Select Brand for a Page:

**Method 1: Layout Import (Recommended)**
In your page's layout.tsx:
```typescript
import "@/styles/theme-edu.css";  // For EDU brand
// OR
import "@/styles/theme-journeys.css";  // For Journeys brand
```

**Method 2: Default to Master**
If no sub-brand theme imported, pages use master brand automatically.

### Brand Scope Hierarchy:
- Master Brand: [name] - Shared tokens, neutral palette
- Sub-Brand: [name] - Unique accent colors, optional font overrides
...
```

Generate all theme files and documentation autonomously.
```

**Expected Generation Output:**
- theme.css (master brand)
- theme-[subbrand].css files (one per sub-brand)
- Updated documentation on brand selection
- Typography global rules in all theme files

### STEP 5: Validation and Verification

**Apply intelligent validation to ensure correct synchronization:**

```
Perform comprehensive validation using adaptive quality checks:

**Token Completeness Check:**
Think through: Have all critical Untitled UI tokens been mapped?
- Verify: Color scales complete (50-950 for each color family)
- Verify: Typography tokens present (font families, sizes, weights)
- Verify: Spacing scale defined (base unit through 5xl+)
- Verify: Component tokens populated (shadows, radii, transitions)

**Multi-Brand Architecture Validation:**
If multi-brand system:
- Verify: Master theme contains shared tokens
- Verify: Each sub-brand theme contains unique tokens
- Verify: No token conflicts between master and sub-brands
- Verify: Brand selection mechanism documented clearly

**CSS Syntax Validation:**
- Verify: All CSS custom properties use correct syntax (--variable-name)
- Verify: Color values in correct format (rgb() for Tailwind compatibility)
- Verify: No syntax errors in @theme blocks
- Verify: Comments are clear and helpful

**Usage Documentation Check:**
- Verify: README or docs explain how to select brand for pages
- Verify: Examples provided for common use cases
- Verify: Migration notes included if updating existing theme

Apply intelligent error detection:
- If validation issues found, provide specific fix recommendations
- If architecture seems suboptimal, suggest improvements
- If documentation incomplete, generate missing sections

Report validation results with clear pass/fail status.
```

**Expected Validation Output:**
- Token completeness report
- Multi-brand architecture verification
- CSS syntax validation results
- Documentation completeness check
- Recommendations for any issues found

### STEP 6: Success Summary and Next Steps

**Synthesize final summary using intelligent reporting:**

```
Generate comprehensive completion report:

## Sync Complete: Brand Guide → Untitled UI Design Variables

### Files Generated/Updated:
- ✅ src/styles/theme.css (master brand)
- ✅ src/styles/theme-[subbrand].css (if multi-brand)
- ✅ docs/[brand-selection-guide].md (usage documentation)

### Token Synchronization Summary:
- Colors: [count] tokens mapped
- Typography: [count] tokens mapped
- Spacing: [count] tokens mapped
- Other: [shadows, radii, etc.]

### Brand Architecture:
- Master Brand: [name]
- Sub-Brands: [list with descriptions]
- Selection Method: [layout import / route-based / etc.]

### Validation Results:
✅ All critical tokens mapped
✅ Multi-brand architecture validated
✅ CSS syntax correct
✅ Documentation complete

### Next Steps for Developers:

1. **Test Theme Integration:**
   - Create test page importing each brand theme
   - Verify colors, typography, spacing render correctly
   - Check dark mode if implemented

2. **Update Existing Pages:**
   - Review current pages and assign appropriate brand scope
   - Add theme imports to layout files
   - Verify visual consistency after migration

3. **Generate New Pages:**
   - Use /development:build-page-from-markdown-or-description
   - Specify brand scope in page configuration
   - Theme will be automatically applied based on layout import

4. **Monitor and Iterate:**
   - Gather feedback on token mappings
   - Adjust if brand guidelines evolve
   - Re-run this command to re-sync if needed

### Helpful Resources:
- Untitled UI Docs: [link to docs]
- Brand Guide Reference: [link to local brand guides]
- Theme Selection Guide: [link to generated docs]

🎨 Brand design tokens are now synchronized with Untitled UI!
Your design system is ready for multi-brand page generation.
```

## Error Handling and Adaptive Recovery

**IF Context7 lookup fails:**
- Provide manual Untitled UI token structure reference
- Proceed with standard Untitled UI conventions (documented widely)
- Note limitation in output, suggest re-running with Context7 access

**IF Brand guide files not found:**
- Search alternate locations (root, /docs, /config)
- Ask user to specify brand guide location
- Provide example brand guide structure for creation

**IF Multi-brand architecture unclear:**
- Default to single-brand system
- Generate extensible theme.css that can be split later
- Document how to refactor for multi-brand in future

**IF Token mapping ambiguous:**
- Deploy brand-designer agent with extended thinking
- Request clarification on specific ambiguous mappings
- Use conservative defaults that can be refined iteratively

## Success Criteria

✅ Untitled UI design token architecture researched and documented
✅ All brand guide files discovered and parsed
✅ Brand-designer agent deployed and mapping analysis completed
✅ Theme files generated with correct token mappings
✅ Multi-brand architecture implemented if applicable
✅ Brand selection mechanism documented
✅ Typography global rules applied
✅ Validation passed for completeness and correctness
✅ Clear next steps provided for developers

## Follow-Up Commands

After running this command, consider:
- `/development:build-page-from-markdown-or-description` - Generate pages with brand scope selection
- `/development:validate-brand-and-compliance` - Audit brand token usage in existing pages
- `/design:audit-theme-coverage` - Check which components use which tokens

---

**Note:** This is a pure AI-driven, prompt-based command with zero hardcoded scripts. All logic is executed through intelligent analysis, tool orchestration, and adaptive decision-making.
