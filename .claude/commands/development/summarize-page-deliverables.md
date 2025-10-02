---
allowed-tools:
  - Read
  - Glob
description: "Aggregate outputs from all commands and provide final change summary"
tags:
  - summary
  - documentation
  - handoff
version: 1.0.0
---

# Summarize Page Deliverables

## Purpose
Gather outputs from all previous commands, produce final change summary, run/edit instructions, and recommended next steps. No file writes - output only.

## Inputs
Aggregated artifacts from previous commands:
- `markdownPath`: From prepare-page-markdown.md
- `componentFiles`: From generate-page-component.md
- `qaReport`: From validate-page-build.md
- `complianceReport`: From validate-brand-and-compliance.md
- `copyStatus`: From update-page-copy.md
- `mediaStatus`: From curate-page-media.md

## Outputs
Markdown summary document (displayed to user, not written to file):
- Files created/modified
- Run instructions
- Edit instructions
- Quality metrics
- Known issues
- Recommended next steps

## Execution

### Step 1: Gather All Created/Modified Files

List files touched during page building process:

```bash
# Markdown source
ls -lh {markdownPath}

# React components
ls -lh src/app/{slug}/page.tsx src/app/{slug}/layout.tsx

# Images referenced
grep -o '/docs/photos/[^"]*' src/app/{slug}/page.tsx | sort -u

# Any route configs modified (if applicable)
```

### Step 2: Aggregate Quality Metrics

Compile metrics from all validation commands:

**From update-page-copy.md**:
- Sections processed: {count}
- Average Pinecone match score: {score}
- Sections within text budget: {count}/{total}
- Compliance status: pass/warning/fail

**From curate-page-media.md**:
- Images selected: {count}
- Images skipped (appropriate): {count}
- All images verified: yes/no
- Alt text quality: excellent/good/needs-work

**From generate-page-component.md**:
- Component files generated: {count}
- Icon imports verified: yes/no
- Compilation status: success/fail
- Route URL: {url}

**From validate-brand-and-compliance.md**:
- Copy alignment score: {score}/100
- Visual alignment score: {score}/100
- Critical issues: {count}
- High priority issues: {count}

**From validate-page-build.md**:
- HTTP status: {code}
- Compilation errors: {count}
- Image loading: success/fail
- Manual tests completed: yes/no/partial

### Step 3: Identify Known Issues

List any unresolved issues or warnings:

**Critical (Blocking deployment)**:
- {list from compliance report}

**High Priority (Should fix)**:
- {list from compliance report}
- {list from build validation}

**Medium Priority (Nice to fix)**:
- {list from all reports}

**Low Priority (Optional)**:
- {list suggestions for improvement}

### Step 4: Calculate Overall Quality Score

Weighted scoring:

```
Overall Quality = (
  Copy Quality × 0.3 +
  Visual Quality × 0.2 +
  Compliance × 0.25 +
  Accessibility × 0.15 +
  Performance × 0.10
)

Where each component scored 0-100:
- Copy: Based on match scores and text budget adherence
- Visual: Based on brand alignment and image appropriateness
- Compliance: Pass=100, Warning=70, Fail=0
- Accessibility: WCAG AAA=100, AA=85, Fails=50
- Performance: LCP<2.5s=100, <4s=80, >4s=60
```

### Step 5: Generate Run Instructions

Provide clear steps to see the page:

```markdown
## Running the Page

### Start Dev Server:
```bash
# If not already running
npm run dev

# Or in monorepo
pnpm --filter web dev
```

### Access Page:
Open browser to: http://localhost:{port}{routePath}

### Verify Everything Works:
1. Page loads without errors
2. All images display correctly
3. Navigation works
4. CTAs are clickable
5. Responsive at 375/768/1280px breakpoints
```

### Step 6: Generate Edit Instructions

Explain how to modify content:

```markdown
## Editing Content

### Source of Truth:
**All changes start in the Markdown file**: {markdownPath}

This is your single source of truth. The React component is generated from it.

### To Change Text:
1. Edit {markdownPath}
2. Modify section body content
3. Re-run: /development:build-page-from-markdown-or-description
4. Or manually regenerate component: /development:generate-page-component

### To Change Images:
1. Edit section frontmatter in {markdownPath}:
   ```yaml
   - name: "Hero"
     image:
       src: "/docs/photos/1920/new-image.jpg"
       alt: "New description"
       width: 1920
       height: 1280
   ```
2. Re-run: /development:curate-page-media (to select new images)
3. Or manually update and regenerate component

### To Adjust Brand Styling:
1. Edit: docs/design/brand-guide.json
2. Modify color tokens, typography, spacing
3. Re-run component generation to apply changes

### To Add/Remove Sections:
1. Edit {markdownPath} frontmatter sections array
2. Add section scaffold in body
3. Re-run full build command to regenerate
```

### Step 7: Recommend Next Steps

Provide strategic guidance:

```markdown
## Recommended Next Steps

### Immediate (Before Deploy):
1. Fix any critical issues from compliance report:
   {list critical issues}

2. Complete manual browser tests:
   - Responsive design at 375/768/1280px
   - Keyboard navigation
   - Screen reader (optional but recommended)

3. Run full Lighthouse audit:
   - Target: 90+ across all categories
   - Fix any accessibility issues
   - Optimize performance if needed

### Short Term (Content Refinement):
1. Review synthesized copy for accuracy:
   - Verify statistics and claims
   - Ensure tone matches brand voice
   - Get stakeholder approval

2. A/B test opportunities:
   - Try alternative headlines
   - Test different CTA button copy
   - Experiment with proof point order

3. Gather user feedback:
   - Share with small group first
   - Collect clarity/persuasiveness ratings
   - Iterate based on feedback

### Medium Term (Optimization):
1. Monitor analytics:
   - Track CTA click rates
   - Measure time on page
   - Analyze scroll depth

2. Performance optimization:
   - Implement static generation (if applicable)
   - Add CDN for images
   - Monitor Core Web Vitals in production

3. Conversion optimization:
   - Heat mapping to see user behavior
   - Form analytics if present
   - Iterate on CTA placement

### Long Term (Maintenance):
1. Content updates:
   - Refresh Pinecone index with new content
   - Update statistics as program grows
   - Keep testimonials current

2. Image library:
   - Add new photos from recent events
   - Update photo_metadata.json
   - Refresh imagery periodically

3. Compliance review:
   - Quarterly review of medical claims
   - Update licensure language as regulations evolve
   - Maintain cultural sensitivity standards
```

## Output Format

Provide complete summary:

````markdown
=== PAGE DELIVERABLES SUMMARY ===

## Files Created/Modified

### Content Source (Source of Truth):
- **{markdownPath}** (Edit this file to update page content)
  - Size: {KB} KB
  - Sections: {count}
  - Last modified: {timestamp}

### Generated Code:
- **src/app/{slug}/page.tsx** (React component, regenerate from Markdown)
  - Size: {LOC} lines
  - Components: {count} section components
  - Icons used: {list}

- **src/app/{slug}/layout.tsx** (Theme and metadata)
  - Theme: theme-{brandScope}.css
  - Metadata: title, description

### Assets Referenced:
- **Images**: {count} photos from /docs/photos/
  {list image paths}

---

## Quality Metrics

### Overall Quality Score: {score}/100
{visual bar graph: ████████░░ 82/100}

**Breakdown**:
- Copy Quality: {score}/100 ({rating})
- Visual Design: {score}/100 ({rating})
- Compliance: {status} ({score}/100)
- Accessibility: {level} ({score}/100)
- Performance: {rating} ({score}/100)

### Detailed Scores:

**Copy Synthesis**:
- Sections processed: {count}
- Avg Pinecone match: {score}
- Text budget adherence: {percent}%
- Brand voice alignment: {rating}

**Media Curation**:
- Images selected: {count}
- Images skipped: {count} (appropriate for component types)
- All paths verified: ✅
- Alt text quality: {rating}

**Component Generation**:
- Compilation: ✅ Success
- Icon imports: ✅ Verified with variant numbers
- Route: ✅ Accessible at {url}

**Brand & Compliance**:
- Critical issues: {count}
- High priority: {count}
- Ready for deploy: {yes/no/with-fixes}

**Build Validation**:
- HTTP status: ✅ 200 OK
- Image loading: ✅ All images 200
- Manual tests: {completed/pending}

---

## Known Issues

### Critical (Must Fix Before Deploy):
{list or "None"}

### High Priority (Recommended):
{list or "None"}

### Medium/Low Priority:
{list or "See compliance report for details"}

---

## Running the Page

### Start Dev Server:
```bash
npm run dev
```

### Access Page:
**URL**: http://localhost:{port}{routePath}

### Verify:
✓ Page loads without errors
✓ All images display
✓ Navigation works
✓ CTAs clickable
✓ Responsive at 375/768/1280px

---

## Editing Content

### Source of Truth:
**{markdownPath}** - All changes start here

### To Change Text:
1. Edit Markdown body sections
2. Re-run: /development:build-page-from-markdown-or-description
3. Or: /development:update-page-copy (copy only)

### To Change Images:
1. Edit section frontmatter image metadata
2. Re-run: /development:curate-page-media
3. Then: /development:generate-page-component

### To Adjust Styling:
1. Edit: docs/design/brand-guide.json
2. Regenerate component to apply

---

## Recommended Next Steps

### ⚡ Immediate (Before Deploy):
1. {action item}
2. {action item}
3. Complete manual browser tests

### 📊 Short Term (Content):
1. Review copy accuracy
2. Get stakeholder approval
3. Consider A/B testing headlines

### 🚀 Medium Term (Optimization):
1. Monitor analytics
2. Implement static generation
3. Optimize for Core Web Vitals

### 🔄 Long Term (Maintenance):
1. Update Pinecone content
2. Refresh imagery
3. Quarterly compliance review

---

## Success Criteria Met

✅ Markdown source exists with complete frontmatter
✅ All sections have finalized content
✅ Images selected appropriately (no unnecessary images)
✅ React component renders correctly
✅ Page accessible at target URL
{✅/⚠️} Brand compliance validated
{✅/⚠️} Accessibility standards met
{✅/⚠️} No blocking issues

**Status**: {Ready for deployment / Needs fixes / Review required}

---

## Support & Documentation

**Command Library**:
- Environment check: /development:analyze-project-environment
- Prepare Markdown: /development:prepare-page-markdown
- Update copy: /development:update-page-copy
- Curate media: /development:curate-page-media
- Generate component: /development:generate-page-component
- Brand audit: /development:validate-brand-and-compliance
- Build validation: /development:validate-page-build
- Full pipeline: /development:build-page-from-markdown-or-description

**Key Files**:
- Brand guide: docs/design/brand-guide.md
- Design tokens: docs/design/brand-guide.json
- Photo metadata: docs/photos/photo_metadata.json

**Next Build**:
To create another page, run: /development:build-page-from-markdown-or-description
````

## Success Criteria

- All deliverables documented
- Quality metrics compiled
- Clear run/edit instructions provided
- Known issues identified
- Next steps prioritized
- No files written (output only)
- User has complete understanding of what was built

## Next Commands

None - this is the final summary command.

User can now:
- Deploy the page (if quality sufficient)
- Fix issues and re-validate
- Build another page using lessons learned
