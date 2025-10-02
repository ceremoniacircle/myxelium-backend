---
allowed-tools:
  - Read
  - Bash
  - BashOutput
  - Grep
description: "Validate page compilation, HTTP status, template conformance, and provide QA checklist"
tags:
  - validation
  - testing
  - qa
  - compilation
  - template-conformance
version: 2.0.0
---

# Validate Page Build

## Purpose
Validate page compiles successfully, returns HTTP 200, conforms to Untitled UI template structure, and provide responsive/accessibility checklist. Documents manual testing steps when browser automation unavailable.

## Inputs
- `routePath`: URL path to test (e.g., `/about`)
- `markdownPath`: Path to source Markdown (for template conformance check)
- `componentPath`: Path to generated component (for template conformance check)
- `devServerCommand`: Optional command to start dev server (default: `npm run dev`)
- `port`: Dev server port (default: 3000)

## Outputs
QA report with:
- `compilationStatus`: pass/fail with error details
- `httpStatus`: Status code and headers
- `templateConformance`: Component structure matches template specification
- `consoleErrors`: JavaScript errors if any
- `responsiveChecklist`: Manual testing instructions
- `accessibilityChecklist`: Manual validation steps
- `performanceMetrics`: LCP, CLS if measurable
- `recommendations`: Improvements and next steps

## Execution

### Step 1: Verify Dev Server Running

Check if dev server is already running:

```bash
# Check for process on port 3000
lsof -ti:{port} || echo "No process on port {port}"

# If not running, start it
if ! lsof -ti:{port}; then
  echo "Starting dev server..."
  npm run dev &
  sleep 5
fi
```

### Step 2: Monitor Compilation

**CRITICAL: Check dev server logs for compilation status**

Use BashOutput to read recent dev server output:

```bash
# Get dev server process output
# Look for patterns:
# - "✓ Compiled" (success)
# - "✓ Compiled /{routePath}" (specific route compiled)
# - "Module not found" (error)
# - "Can't resolve" (error)
# - "Error:" (error)
```

**Compilation success indicators**:
- "✓ Compiled" message present
- No "Error:" or "Module not found" messages
- Route appears in compilation output

**Compilation failure indicators**:
- "Module not found: Can't resolve"
- "Error: ..." messages
- Build process stuck/hanging
- No compilation output after 30 seconds

If compilation fails:
```
Compilation failed. Check errors:

Common issues:
1. Icon import error → Verify exact icon file names with variant numbers
2. Missing image → Check public/docs symlink exists
3. Syntax error → Review generated component code
4. Missing dependency → Check package.json

Dev server output:
{paste relevant error lines}

Fix errors and restart validation.
```

### Step 3: HTTP Status Test

**Use curl for initial validation** (faster and more reliable than browser):

```bash
# Test page returns HTTP 200
curl -I http://localhost:{port}{routePath}

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: text/html; charset=utf-8

# Failure outputs:
# HTTP/1.1 404 Not Found (route not found)
# HTTP/1.1 500 Internal Server Error (runtime error)
# curl: (7) Failed to connect (server not running)
```

**Record results**:
- Status code: 200/404/500/other
- Response time: {milliseconds}
- Content-Type: text/html or error

If non-200 status:
```
HTTP {status} received for {routePath}

Diagnosis:
- 404: Route file not at expected location
  → Check: src/app{routePath}/page.tsx exists
  → Check: File exports default component

- 500: Runtime error in component
  → Check dev server logs for stack trace
  → Common: Icon import error, image path error, undefined variable

- 503: Dev server not ready
  → Wait 5-10 seconds and retry
  → Check if compilation finished

Fix issue and retest.
```

### Step 4: Test Image Loading

Verify images return 200 (not 404):

```bash
# Extract image paths from component
grep -o '/docs/photos/[^"]*' src/app{routePath}/page.tsx | head -5

# Test each image
for img in {image_paths}; do
  echo "Testing: $img"
  curl -I http://localhost:{port}$img | grep "HTTP"
done

# Expected: HTTP/1.1 200 OK for each
# If 404: public/docs symlink missing or broken
```

If images return 404:
```
Images not loading (404 errors).

Fix:
1. Verify symlink: ls -la public/docs
2. Create if missing: ln -s ../docs public/docs
3. Restart dev server
4. Retest images
```

### Step 5: Console Error Check

**Document manual browser testing steps** (since Chrome DevTools MCP may be unavailable):

```
MANUAL BROWSER TEST CHECKLIST:

1. Open browser to: http://localhost:{port}{routePath}

2. Open DevTools (F12 or Cmd+Option+I)

3. Check Console tab:
   ✓ No red error messages
   ✓ No failed resource loads (images, fonts, scripts)
   ✓ Warnings acceptable if not breaking functionality

4. Check Network tab:
   ✓ All resources return 200 (not 404 or 500)
   ✓ Images load successfully
   ✓ Fonts load if custom typography used
   ✓ No CORS errors

5. Common errors to look for:
   - "Failed to load resource" → Missing file or broken path
   - "Uncaught ReferenceError" → Undefined variable
   - "Cannot read property of undefined" → Null reference
   - "Warning: Each child should have unique key" → React key warning (non-critical)

Record any errors found:
[Paste error messages here]
```

### Step 6: Responsive Design Checklist

**Provide manual testing instructions**:

```
RESPONSIVE DESIGN TEST CHECKLIST:

Test at these breakpoints:
1. Mobile: 375px width
2. Tablet: 768px width
3. Desktop: 1280px width

For each breakpoint, verify:

✓ Layout adjusts appropriately:
  - Mobile: Single column, stacked sections
  - Tablet: 2-column where appropriate
  - Desktop: Full layout with sidebars if designed

✓ Images scale properly:
  - No overflow or cutoff
  - Maintains aspect ratio
  - Loads appropriate size variant

✓ Typography scales:
  - Headlines readable but not too large
  - Body text comfortable (16-18px minimum)
  - Line length 50-75 characters

✓ Navigation works:
  - Hamburger menu on mobile (if applicable)
  - Full nav on desktop
  - Touch targets ≥44px on mobile

✓ CTAs visible:
  - Buttons accessible without scrolling too much
  - Clear visual hierarchy
  - Easy to tap on mobile

How to test:
1. Chrome DevTools → Toggle device toolbar (Cmd+Shift+M)
2. Select "Responsive" from device dropdown
3. Drag to resize or enter specific widths
4. Test at 375, 768, 1280px

Record issues:
[Note any layout breaks or overflow problems]
```

### Step 7: Accessibility Checklist

**Provide manual validation steps**:

```
ACCESSIBILITY VALIDATION CHECKLIST:

KEYBOARD NAVIGATION:
✓ Tab through page in logical order
✓ All interactive elements reachable
✓ Focus indicators visible (outline or highlight)
✓ Enter/Space activates buttons and links
✓ Escape closes modals if present

SCREEN READER TEST (Optional but recommended):
✓ Turn on screen reader (VoiceOver on Mac: Cmd+F5)
✓ Navigate page with VO+Arrow keys
✓ All images have descriptive alt text announced
✓ Headings announce correctly (h1, h2, h3)
✓ Buttons announce their purpose
✓ No "image" or "button" without context

HEADING HIERARCHY:
✓ One h1 per page (page title)
✓ Headings descend logically (h1 → h2 → h3)
✓ No skipped levels (h1 → h3 without h2)
✓ Semantic structure makes sense

COLOR CONTRAST:
✓ Body text contrast ≥7:1 (WCAG AAA) or ≥4.5:1 (WCAG AA)
✓ Large text (18px+) contrast ≥4.5:1 (WCAG AAA) or ≥3:1 (WCAG AA)
✓ Interactive elements have sufficient contrast
✓ Color not the only differentiator (use icons, labels too)

How to test:
- Keyboard: Just use Tab key instead of mouse
- Screen reader: Turn on VoiceOver (Mac) or NVDA (Windows)
- Contrast: Use browser extension (e.g., "WCAG Color Contrast Checker")

Record issues:
[Note any accessibility barriers found]
```

### Step 8: Template Conformance Check (NEW)

**Verify generated component matches Untitled UI template structure**

**Step 8.1: Read Template Specification from Markdown**

```
Read: {markdownPath}
```

Extract from frontmatter:
- `template`: Untitled UI template name (e.g., "About page 01")
- `templateCLI`: CLI command used (e.g., "npx untitledui@latest example about-pages/01")
- `templateStructure.components`: Expected component list from template analysis
- `sections[]`: Section definitions with componentType

**Step 8.2: Analyze Generated Component Structure**

```bash
# Read generated component
Read: {componentPath}

# Extract component imports
grep -E "from \"@/components" {componentPath} | grep -o "from.*"

# Extract section component definitions
grep -E "(const.*Section|function.*Section)" {componentPath}
```

**Step 8.3: Compare Template vs. Generated**

Create conformance report:

```javascript
templateConformance = {
  template: "About page 01",
  expectedComponents: [
    "Hero", "IconFeatureGrid", "StatsGrid", "TeamGrid", "CTASection"
  ],
  actualComponents: [
    // extracted from component file
  ],
  matches: [],
  missing: [],
  extra: [],
  sectionOrder: "correct" | "incorrect",
  findings: []
}
```

**Check each expected component**:
```
For each component in templateStructure.components:
  - Is it imported? Check: import { ComponentName } from "@/components/..."
  - Is it used? Check: <ComponentName .../> or const ComponentNameSection = ...
  - Is it in correct order? Compare section order vs template
  - Does it have correct props? Check: props match section.props from Markdown

Record:
  ✅ Match: Component present and correctly used
  ⚠️  Missing: Expected component not found
  ℹ️  Extra: Component present but not in template
  ❌ Incorrect: Component present but wrong props/usage
```

**Step 8.4: Generate Conformance Report**

```
TEMPLATE CONFORMANCE REPORT

Template: "About page 01" (about-pages/01)

EXPECTED COMPONENTS (from template):
1. Hero (Header + Hero section)
2. IconFeatureGrid (Features with icons)
3. StatsGrid (Statistics display)
4. TeamGrid (Team member profiles)
5. CTASection (Call-to-action)

ACTUAL COMPONENTS (in generated file):
{list components found}

CONFORMANCE STATUS:
✅ Hero: Present and correctly implemented
✅ IconFeatureGrid: Present, no featured image (correct)
✅ StatsGrid: Present, no image (correct)
⚠️  TeamGrid: MISSING - not found in component
✅ CTASection: Present with background image

FINDINGS:
⚠️  Missing: TeamGrid section not implemented
   - Expected in template but not in generated component
   - Should display team members with photos/bios
   - Props needed: members[] array with name, role, photo, bio

ℹ️  Extra: ContentBlock section found
   - Not in original template
   - May be custom addition

❌ Incorrect: Hero component missing "subheading" prop
   - Template requires: heading, subheading, cta, backgroundImage
   - Component has: heading, cta, backgroundImage
   - Missing: subheading

SECTION ORDER:
✅ Sections appear in correct template order

OVERALL CONFORMANCE: 75% (3/4 expected components present)

RECOMMENDATION:
- Add missing TeamGrid section with team member data
- Add subheading prop to Hero component
- Remove ContentBlock if not intentionally added
- Re-run generate-page-component with template structure
```

**If major conformance issues** (< 70% match):
```
Template conformance is low (< 70%).

The generated component doesn't match the Untitled UI template structure.

Options:
1. Regenerate component using template analysis
   - Run: /development:generate-page-component
   - Ensure it reads templateStructure from Markdown

2. Manually fix missing components
   - Add {list missing components}
   - Follow template structure

3. Accept differences (if intentional customization)

Choose: 1/2/3
```

### Step 9: Performance Checklist

**Provide observational performance assessment**:

```
PERFORMANCE OBSERVATION CHECKLIST:

LOAD TIME:
✓ Page appears in <2 seconds (good)
✓ Main content visible quickly (no blank screen delay)
✓ Images load progressively (not all at once causing hang)

LARGEST CONTENTFUL PAINT (LCP):
✓ Hero image or main content visible in <2.5s (good)
✓ <4s acceptable for dev server
✓ >4s needs optimization

LAYOUT SHIFT:
✓ Content doesn't jump around during load
✓ Images have width/height to reserve space
✓ Fonts load without causing text reflow (if possible)

SMOOTHNESS:
✓ Scrolling feels smooth (no jank)
✓ Hover effects responsive
✓ Animations don't stutter

How to test:
1. Hard refresh page (Cmd+Shift+R)
2. Observe load sequence
3. Note any delays or jank
4. Use Chrome DevTools → Lighthouse (optional)
   - Run audit
   - Check Performance score
   - Review opportunities

Record observations:
[Note any slowness or layout shift]
```

## Output Format

Provide structured QA report:

```
=== PAGE BUILD VALIDATION COMPLETE ===

COMPILATION STATUS:
✅ Compiled successfully
✅ Route: {routePath}
✅ No errors in dev server logs

HTTP STATUS TEST:
✅ Status: 200 OK
✅ Content-Type: text/html; charset=utf-8
✅ Response time: 125ms

IMAGE LOADING:
✅ All images return 200 OK
✅ public/docs symlink working
✅ Tested {count} images

TEMPLATE CONFORMANCE:
Template: "About page 01" (about-pages/01)
✅ Conformance: 85% (4/5 components match)
✅ Hero: Present with all props
✅ IconFeatureGrid: Present, correct (no image)
✅ StatsGrid: Present, correct (no image)
⚠️  TeamGrid: Missing (expected in template)
✅ CTASection: Present with background image
⚠️  Section order: Matches template

Recommendation: Add TeamGrid section for full conformance

CONSOLE ERRORS:
[Requires manual browser test]

Checklist:
□ Open http://localhost:{port}{routePath}
□ Check Console tab for errors
□ Verify all resources load (Network tab)
□ Record any errors found

RESPONSIVE DESIGN:
[Requires manual browser test]

Checklist:
□ Test at 375px (mobile)
□ Test at 768px (tablet)
□ Test at 1280px (desktop)
□ Verify layout adjusts appropriately
□ Confirm images scale properly
□ Check CTAs visible at all sizes

ACCESSIBILITY:
[Requires manual validation]

Checklist:
□ Test keyboard navigation (Tab key)
□ Verify focus indicators visible
□ Check heading hierarchy (h1 → h2 → h3)
□ Confirm alt text on all images
□ Test color contrast (tool or extension)
□ Optional: Screen reader test

PERFORMANCE:
[Observational assessment]

Checklist:
□ Page loads in <2s (good) or <4s (acceptable)
□ No major layout shift during load
□ Scrolling feels smooth
□ Images load progressively
□ Optional: Run Lighthouse audit

OVERALL STATUS:
✅ Page compiles and serves successfully
✅ No blocking issues detected
⚠️ Manual tests recommended for complete validation

NEXT STEPS:
1. Complete manual browser tests above
2. Fix any issues found
3. Run validate-brand-and-compliance.md if not done
4. Run summarize-page-deliverables.md for final summary

RECOMMENDATIONS:
- If deploying to production, run full Lighthouse audit
- Test on real mobile device, not just emulator
- Consider A/B testing different headlines/CTAs
- Monitor Core Web Vitals in production
```

## Success Criteria

- Page compiles without errors
- HTTP 200 status returned
- All images load successfully (200 status)
- Manual test checklists provided
- Clear pass/fail status for automated checks
- Actionable recommendations for manual validation

## Error Handling

**Compilation Failure**:
```
Status: ❌ FAILED

Compilation errors detected:
{paste error output}

Common causes:
1. Icon import: Check variant numbers
2. Image path: Verify symlink
3. Syntax error: Review component
4. Missing import: Check file paths

Fix errors and re-run validation.
```

**HTTP Non-200**:
```
Status: ⚠️ WARNING

HTTP {status} returned for {routePath}

Diagnosis:
- 404: Route not found
- 500: Runtime error
- 503: Server not ready

Check dev server logs for details.
```

**Images Not Loading**:
```
Status: ⚠️ WARNING

{count} images returning 404:
{list paths}

Fix:
1. Check symlink: ls -la public/docs
2. Create: ln -s ../docs public/docs
3. Restart dev server
4. Retest
```

## Next Commands

- `validate-brand-and-compliance.md` (if not run yet)
- `summarize-page-deliverables.md` (final summary)
