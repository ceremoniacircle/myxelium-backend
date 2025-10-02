---
allowed-tools:
  - Task
  - Read
  - Glob
  - Grep
  - Bash
description: "Generate React page component from Markdown using frontend-developer agent"
tags:
  - react
  - component-generation
  - routing
  - frontend
version: 1.0.0
---

# Generate Page Component

## Purpose
Deploy frontend-developer agent to transform Markdown source into React page component. Enforces icon verification, validates public/docs symlink, handles routing integration.

## Inputs
- `markdownPath`: Path to Markdown source file
- `environmentReport`: From analyze-project-environment.md (esp. icon library structure, symlink status)

## Outputs
- Generated/modified files: `src/app/{slug}/page.tsx`, `src/app/{slug}/layout.tsx`, route configs
- Execution notes: Warnings, recommendations, known issues
- Icon imports verified: List of icons used with exact file names

## Execution

### Step 1: Pre-Generation Validation

**CRITICAL: Verify icon library structure BEFORE generating component**

```bash
# Check existing icon import patterns in codebase
grep -r "from \"@untitledui/icons" src/ | head -10

# List available icons with variant numbers
ls node_modules/@untitledui/icons/dist/ | grep -E "^[A-Z].*\.js$" | head -20

# Example output: Heart.js, Shield01.js, Lightbulb02.js, Target04.js
```

**Record findings**:
- Icon naming pattern: Base name + variant number (e.g., Shield01, Target04)
- Available icons for this page (match to section needs)
- Existing import examples to follow

**Verify public/docs symlink**:

```bash
# Check symlink exists
ls -la public/docs

# If missing, create it
[ ! -e public/docs ] && ln -s ../docs public/docs && echo "Symlink created"

# Verify photos accessible
ls public/docs/photos/1600/ | head -5
```

### Step 2: Read Markdown Source and Template Structure

Parse complete Markdown file:

```
Read: {markdownPath}
```

Extract:
- Frontmatter: slug, title, template, **templateStructure**, sections array with image metadata
- **Template structure** (CRITICAL): Components, props, image requirements from template analysis
- Body sections: Text content for each section
- Section order: Match frontmatter sections array order

**If template specified**, verify templateStructure exists in frontmatter:
```yaml
template: "About page 01"
templateCLI: "npx untitledui@latest example about-pages/01"
templateStructure:
  components: [
    { name: "Hero", type: "Hero", props: [...], imageRequired: true },
    { name: "Features", type: "IconFeatureGrid", props: [...], imageRequired: false },
    ...
  ]
```

This ensures generated component matches the actual Untitled UI template.

### Step 3: Deploy Frontend-Developer Agent with Template Context

Launch agent with explicit template structure and icon verification instructions:

```
Task(agent: frontend-developer):

You are generating a React page component from Markdown source that MUST match the Untitled UI template structure.

MARKDOWN SOURCE:
{markdownPath}

PARSED CONTENT:
- Slug: {slug}
- Title: {title}
- Template: {template name} (e.g., "About page 01")
- Template CLI: {templateCLI} (e.g., "npx untitledui@latest example about-pages/01")

TEMPLATE STRUCTURE (CRITICAL - MUST FOLLOW):
{templateStructure from frontmatter}

Expected components in order:
1. {component.name} ({component.type}) - Props: {component.props}
2. {component.name} ({component.type}) - Props: {component.props}
...

SECTIONS (match to template components):
{list section names, component types, and image paths from frontmatter}

REQUIREMENT: Your generated component MUST include ALL components from the template structure in the correct order with the correct props. Do not omit any template components.

ICON LIBRARY VERIFICATION (CRITICAL):
BEFORE generating any icon imports, you MUST:

1. Check existing import patterns:
   grep -r "from \"@untitledui/icons" src/

2. Verify exact icon file names:
   ls node_modules/@untitledui/icons/dist/ | grep {IconName}

3. Use EXACT names including variant numbers:
   ✅ CORRECT: import { Shield01 } from "@untitledui/icons/Shield01"
   ❌ WRONG: import { Shield } from "@untitledui/icons/Shield"

4. Icons you'll likely need for this page:
   {derive from section component types}

   For each icon, run:
   ls node_modules/@untitledui/icons/dist/ | grep -i {icon_base_name}

5. If icon doesn't exist with expected name, find alternative:
   - Search for similar icons
   - Use existing working icons from other pages
   - Document substitution in output notes

COMPONENT STRUCTURE:
- Framework: Next.js App Router
- File location: src/app/{slug}/page.tsx
- Layout file: src/app/{slug}/layout.tsx (for metadata and theme)
- Client component: Use "use client" directive if interactive
- Imports: Untitled UI components from @/components/...

SECTION COMPONENT MAPPING:
- Hero → Use Header + Hero section components
- SplitLayout → Two-column layout with image + text
- IconFeatureGrid → Grid of featured icons with text (NO large image)
- StatsGrid → Grid of statistics (NO image)
- ContentBlock → Text block with optional side image
- CTASection → Call-to-action with background image

IMAGE HANDLING:
- Use Next.js Image component from "next/image"
- Paths start with /docs/photos/{width}/...
- Include width and height from frontmatter metadata
- Use alt text from frontmatter
- Apply className for styling (rounded-2xl, object-cover)

COMPONENT-IMAGE RULES:
- IconFeatureGrid: Do NOT add large featured image (icons provide visuals)
- StatsGrid: Do NOT add image (numbers are the visuals)
- Hero/CTA: Background image required
- SplitLayout: Side image required
- Follow frontmatter image metadata exactly

BRAND STYLING:
- Read /docs/design/brand-guide.json for color tokens
- Import theme CSS: import "@/styles/theme-{brandScope}.css" (NOT @/styles/themes/)
- Use Tailwind classes with design system tokens

TYPOGRAPHY (AUTOMATIC FROM GLOBAL THEME):
- h1-h3 elements: Automatically inherit Merriweather from global theme CSS
- h4-h6 elements: Automatically inherit Open Sans from global theme CSS
- Body text: Automatically inherit Open Sans from global theme CSS
- **DO NOT add font-display class** - typography is handled by global CSS in theme files
- Just use semantic HTML elements: `<h1>`, `<h2>`, `<h3>` with utility classes
- Example: `<h1 className="text-display-lg font-bold text-primary">` (NO font-display class needed)

ACCESSIBILITY REQUIREMENTS:
- Semantic HTML: proper heading hierarchy (h1 → h2 → h3)
- ARIA attributes where needed
- Keyboard navigation support
- Alt text on all images (from frontmatter)

LAYOUT FILE (src/app/{slug}/layout.tsx):
import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/styles/theme-{brandScope}.css";  // NOT @/styles/themes/

export const metadata: Metadata = {
  title: "{title} | Ceremonia {Brand}",
  description: "{derive from first section}",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

PAGE COMPONENT (src/app/{slug}/page.tsx):
"use client";

import Image from "next/image";
import { Header } from "@/components/marketing/header-navigation/header";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Heart } from "@untitledui/icons/Heart"; // Example - VERIFY
import { Shield01 } from "@untitledui/icons/Shield01"; // CORRECT variant

// Section components based on Markdown structure
const HeroSection = () => { ... };
const ValuesSection = () => { ... };
const CTASection = () => { ... };
const Footer = () => { ... };

export default function {SlugCamelCase}Page() {
  return (
    <div>
      <HeroSection />
      <ValuesSection />
      <CTASection />
      <Footer />
    </div>
  );
}

ROUTING:
- Next.js App Router uses file-based routing
- File location determines URL: src/app/about/page.tsx → /about
- No manual route configuration needed

OUTPUT REQUIREMENTS:
Provide:
1. Complete page.tsx content
2. Complete layout.tsx content
3. List of icon imports used (with verification status)
4. List of image paths referenced
5. Any warnings or substitutions made
6. Route URL where page will be accessible
```

### Step 4: Verify Generated Component

After agent completes, validate output:

**Icon imports verification**:
```bash
# Extract icon imports from generated file
grep "from \"@untitledui/icons" src/app/{slug}/page.tsx

# Verify each icon file exists
for icon in {list}; do
  ls node_modules/@untitledui/icons/dist/$icon.js
done
```

**Image paths verification**:
```bash
# Extract image paths from component
grep -o "/docs/photos/[^\"]*" src/app/{slug}/page.tsx

# Verify each image file exists
for img in {list}; do
  ls public$img
done
```

**Syntax check**:
```bash
# Basic syntax validation (TypeScript will do full check)
node -c src/app/{slug}/page.tsx 2>&1 || echo "Syntax issue detected"
```

### Step 5: Restart Dev Server

**CRITICAL: Restart dev server for major changes**

Hot reload may not pick up:
- New route files
- Icon import changes
- Public folder symlink

```bash
# Kill existing dev server processes
lsof -ti:3000 | xargs kill -9

# Start fresh
npm run dev

# Wait 3-5 seconds for compilation
sleep 5
```

### Step 6: Monitor Compilation

Check dev server output for errors:

```bash
# Look for compilation status
# Expected: "✓ Compiled"
# Errors: "Module not found", "Can't resolve"
```

If compilation errors:
```
Compilation failed. Common issues:
1. Icon import path incorrect → Verify exact file names
2. Missing image file → Check symlink and file existence
3. Syntax error → Review generated code
4. Missing dependency → Check package.json

Fix issues and restart server.
```

## Output Format

Provide structured summary:

```
=== COMPONENT GENERATION COMPLETE ===

GENERATED FILES:
✅ src/app/{slug}/page.tsx (250 lines)
✅ src/app/{slug}/layout.tsx (12 lines)

ICON IMPORTS (VERIFIED):
✅ Heart from @untitledui/icons/Heart
✅ Shield01 from @untitledui/icons/Shield01
✅ Lightbulb02 from @untitledui/icons/Lightbulb02
✅ Target04 from @untitledui/icons/Target04

IMAGE REFERENCES (VERIFIED):
✅ /docs/photos/1920/20230306-group-sitting-circle.jpg
✅ /docs/photos/1600/20230307-dancing-living-room.jpg
✅ /docs/photos/1600/20230506-trust-building.jpg

ROUTE INFORMATION:
- URL: http://localhost:3000/{slug}
- Framework: Next.js App Router
- Routing: File-based (automatic)

COMPILATION STATUS:
✅ Dev server restarted
✅ No compilation errors
✅ Page accessible at route

WARNINGS/NOTES:
- Values section: No large image added (IconFeatureGrid doesn't need one)
- CTA section: Background image with gradient overlay applied
- All icons use exact variant numbers per verification

ACCESSIBILITY:
✅ Semantic HTML structure
✅ Proper heading hierarchy (h1 → h2 → h3)
✅ Alt text on all images
✅ Keyboard navigation supported

NEXT STEPS:
- Run validate-page-build.md to test HTTP status
- Run validate-brand-and-compliance.md for audit
- Check page in browser for visual verification
```

## Success Criteria

- Component files generated at correct locations
- All icon imports verified with exact file names including variants
- All image paths verified to exist
- No compilation errors
- Dev server running successfully
- Route accessible at expected URL
- No duplicate/unnecessary images in component
- Brand theme applied correctly

## Error Handling

**Icon Module Not Found**:
```
Error: Module not found: Can't resolve '@untitledui/icons/Shield'

Root cause: Icon name doesn't match actual file (should be Shield01)

Fix:
1. List icons: ls node_modules/@untitledui/icons/dist/ | grep Shield
2. Found: Shield01.js
3. Update import: import { Shield01 } from "@untitledui/icons/Shield01"
4. Update usage: icon: Shield01
5. Restart dev server
```

**Image 404 Errors**:
```
Error: Image not loading /docs/photos/1600/image.jpg

Root cause: public/docs symlink missing or broken

Fix:
1. Check symlink: ls -la public/docs
2. Create if missing: ln -s ../docs public/docs
3. Verify: ls public/docs/photos/1600/
4. Restart dev server
```

**Route Not Found**:
```
Error: Page not accessible at expected URL

Checklist:
1. File at correct location: src/app/{slug}/page.tsx
2. Exported default component
3. Dev server restarted
4. No compilation errors
5. Check actual URL: http://localhost:3000/{slug}
```

**Hot Reload Cache**:
```
Warning: Changes not reflected despite editing file

Solution:
1. Don't rely on hot reload for major changes
2. Kill dev server: lsof -ti:3000 | xargs kill -9
3. Restart: npm run dev
4. Wait for fresh compilation
```

## Next Commands

- `validate-page-build.md` (test compilation and HTTP status)
- `validate-brand-and-compliance.md` (audit component)
- `summarize-page-deliverables.md` (final summary)
