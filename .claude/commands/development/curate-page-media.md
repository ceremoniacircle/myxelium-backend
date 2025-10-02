---
allowed-tools:
  - Task
  - Read
  - Edit
  - Glob
  - Bash
description: "Smart image selection and media curation using brand-designer agent"
tags:
  - media
  - images
  - brand-design
  - visual-identity
version: 1.0.0
---

# Curate Page Media

## Purpose
Deploy brand-designer agent to select optimal imagery for each section. Intelligently skips sections that don't need images (IconFeatureGrid, StatsGrid). Matches images to section mood, component type, and brand guidelines.

## Inputs
- `markdownPath`: Path to Markdown file
- `sectionManifest`: Section definitions with imageRequired flags
- Optional `sectionsToUpdate`: Array of section names (default: all sections where imageRequired=true and imageComplete=false)
- Optional `brandPalette`: Summary from environment report

## Outputs
- Updated Markdown with image metadata in frontmatter sections array
- Media selection log:
  - `sectionName`
  - `imageStatus`: selected/skipped/unavailable
  - `imagePath`: File path if selected
  - `altText`: Generated description
  - `matchingTags`: Tags that influenced selection
  - `dimensions`: width × height
  - `comments`: Selection rationale

## Execution

### Step 1: Identify Sections Needing Images

Read Markdown and section manifest:

```
sections_to_process = if sectionsToUpdate provided:
                        filter manifest by sectionsToUpdate
                      else:
                        filter manifest where imageRequired == true AND imageComplete == false
```

**Skip sections with these component types**:
- IconFeatureGrid (has icons, not large images)
- StatsGrid (has numbers, not images)
- Any section where frontmatter explicitly sets `image: null`

If no sections need images:
```
All sections either don't require images or already have them selected.
Specify sectionsToUpdate to re-select images for specific sections.
```

### Step 2: Load Image Metadata

Read available photos:

```
Read: docs/photos/photo_metadata.json
```

Parse metadata to understand:
- Available filenames
- Tags (mood, subject, setting, people, etc.)
- Dimensions per width variant (1920, 1600, 1200, 800, 512, 256)
- Descriptions for alt text generation

### Step 3: Deploy Brand-Designer Agent

For EACH section needing an image, launch brand-designer agent with Task tool:

```
Task(agent: brand-designer):

You are selecting imagery for the "{section.name}" section of a page.

CONTEXT:
- Page title: {title}
- Page intent: {intent}
- Brand scope: {brandNotes}

SECTION REQUIREMENTS:
- Intent: {section.intent}
- Component type: {section.componentType}
- Mood needed: {derive from section text and intent}

COMPONENT TYPE → IMAGE SPECS:
- Hero: 1920×1080 background, warm/inspiring, full-width
- CTASection: 1920×1080 background, energizing, can have overlay
- SplitLayout: 1200×800 side image, documentary style, contextual
- ContentBlock: 800×600 optional, supportive, not dominant
- IconFeatureGrid: SKIP - no large image needed
- StatsGrid: SKIP - no image needed

BRAND GUIDELINES:
Read /docs/design/brand-guide.md and /docs/design/brand-guide.json for:
1. Photography style: Documentary portraits, warm daylight, diverse representation
2. Image treatments: Subtle overlays, corner radius 2xl, aspect ratios
3. Color palette: Match brand colors (EDU: Amethyst, Journeys: Vitality, Spaces: Growth)
4. Mood: Authentic, unposed, community-focused, nature integration

IMAGE SELECTION PROCESS:
1. Read photo_metadata.json
2. Match based on:
   - Section subject matter (from section.intent and copy)
   - Mood/tone (from brand guide)
   - Tags (e.g., "circle", "community", "training", "nature")
   - Component requirements (dimensions, aspect ratio)
3. Select best match filename
4. Determine nearest available width from: [1920, 1600, 1200, 800, 512, 256]
5. Construct path: /docs/photos/{width}/{filename}
6. Generate descriptive alt text based on:
   - Image metadata description
   - Section context
   - Accessibility guidelines (describe action, not just objects)

ALT TEXT REQUIREMENTS:
- Descriptive, not decorative
- Include relevant context (not just "photo of people")
- Example: "Group of diverse participants in a circle during a Ceremonia healing session"
- Avoid: "image", "photo", "picture" (screen readers announce this)

OUTPUT FORMAT:
Return structured selection:
- filename: "{name.jpg}"
- width: {1920/1600/etc}
- height: {calculated from aspect ratio}
- path: "/docs/photos/{width}/{filename}"
- altText: "{descriptive text}"
- matchingTags: [array of tags that matched]
- rationale: "Why this image fits the section"

If no good match found:
- status: "unavailable"
- reason: "No images match mood/subject"
- recommendation: "Use placeholder or skip image"
```

### Step 4: Verify Image Files Exist

Before updating Markdown, verify selected images exist:

```bash
# Check each selected image path
ls -la docs/photos/{width}/{filename}

# If missing, check other width variants
ls docs/photos/*/{ filename}
```

If file not found:
```
Selected image not available at requested width.
Available widths: {list}
Falling back to nearest available width: {width}
```

### Step 5: Update Markdown with Image Metadata

Use Edit tool to update section frontmatter:

```yaml
Edit(markdownPath):
  old_string:
    - name: "{section.name}"
      ...
      image: null

  new_string:
    - name: "{section.name}"
      ...
      image:
        src: "/docs/photos/{width}/{filename}"
        alt: "{generated alt text}"
        width: {width}
        height: {height}
```

**Preserve**:
- Frontmatter structure
- Section copy (don't touch)
- Other sections
- HTML comments

### Step 6: Build Media Selection Log

For each processed section, record:

```javascript
{
  sectionName: "Hero",
  imageStatus: "selected",
  imagePath: "/docs/photos/1920/20230306-group-sitting-circle.jpg",
  altText: "Diverse group of participants sitting in a circle during a Ceremonia healing session",
  matchingTags: ["circle", "community", "healing", "diverse"],
  dimensions: "1920×1280",
  comments: "Strong match for Hero - warm lighting, community focus, documentary style"
}
```

For skipped sections:

```javascript
{
  sectionName: "Values",
  imageStatus: "skipped",
  reason: "IconFeatureGrid component doesn't require large featured image",
  comments: "Icons provide visual interest - large image would be redundant"
}
```

### Step 7: Present Selections for User Review and Approval

**CRITICAL**: Before finalizing image selections, present all proposed images to the user for review:

```
=== IMAGE SELECTION REVIEW ===

I've selected images for each section based on content, brand style, and component requirements.
Please review and let me know if you'd like any changes:

{For each section with images:}

**{Section Name}** ({Component Type})
Content: {First 100 chars of section content...}
Suggested Image: /docs/photos/{width}/{filename}
  - Alt Text: "{alt text}"
  - Tags: {tags}
  - Dimensions: {width}×{height}
  - Rationale: {why this image was selected}

{If section was skipped:}

**{Section Name}** ({Component Type})
Content: {First 100 chars of section content...}
✓ No image needed - {Component Type} uses {icons/numbers/etc} for visuals

---

**REVIEW OPTIONS:**

1. **Approve all** - Type "approve" to proceed with these selections
2. **Request changes** - Specify which sections need different images
3. **Use specific images** - Tell me:
   - Which section needs a change
   - Specific image filename or folder to use
   - For team sections: I can match names to filenames if you specify a folder

**SPECIAL INSTRUCTIONS FOR TEAM/PORTRAIT SECTIONS:**

If you have team member photos in a specific folder, tell me:
- Folder path (e.g., "docs/photos/team/")
- Naming convention (e.g., "firstname-lastname.jpg")
- I'll match team member names from the content to the filenames

Example: "Use photos from docs/photos/800/ and match names like 'austin-mao.jpg' to team members"
```

**Wait for user response.**

**Process user feedback:**

**If user types "approve"**:
- Proceed to Step 8 (validate paths)

**If user requests specific changes**:
- Parse which sections need updates
- Re-run brand-designer agent for those sections with new constraints
- Present updated selections for re-approval

**If user specifies folder/naming for team photos**:
```bash
# List available photos in specified folder
ls {user_specified_folder}

# Extract team member names from Markdown content
grep -A 5 "## Team" {markdownPath}

# Match names to filenames:
# - Normalize names (lowercase, replace spaces with hyphens)
# - Search for matching filenames
# - Build name → filename mapping

Example:
Team member: "Austin Mao" → Normalized: "austin-mao"
Search: ls {folder} | grep -i "austin-mao"
Found: austin-mao-portrait.jpg
→ Match: Austin Mao → /docs/photos/800/austin-mao-portrait.jpg
```

**After incorporating feedback**, present updated selections and wait for final approval before proceeding.

### Step 8: Validate Image Paths

After user approves selections:

```bash
# Test that public/docs symlink works
ls -la public/docs/photos/{width}

# Verify images are accessible for Next.js
curl -I http://localhost:3000/docs/photos/{width}/{filename}
# Expect: HTTP/1.1 200 OK
```

If symlink missing:
```
Public folder symlink not found.
Creating: ln -s ../docs public/docs
Restart dev server to pick up new structure.
```

## Output Format

Provide structured summary:

```
=== MEDIA CURATION COMPLETE ===

SECTIONS PROCESSED: {count}
IMAGES SELECTED: {count}
SECTIONS SKIPPED: {count}

MEDIA SELECTION LOG:
1. Hero
   - Status: ✅ Selected
   - Image: /docs/photos/1920/20230306-group-sitting-circle.jpg (1920×1280)
   - Alt: "Diverse group in circle during healing session"
   - Tags: circle, community, healing, diverse
   - Rationale: Perfect match for Hero - warm, community-focused

2. Values
   - Status: ⏭️ Skipped
   - Reason: IconFeatureGrid doesn't need large image
   - Comment: Icons provide visual interest

3. CTA
   - Status: ✅ Selected
   - Image: /docs/photos/1920/20230506-trust-building.jpg (1920×1280)
   - Alt: "Facilitators building trust and community"
   - Tags: trust, community, training
   - Rationale: Energizing image for conversion moment

IMAGE AVAILABILITY:
✅ All selected images exist and are accessible
✅ public/docs symlink verified
✅ Alt text follows accessibility guidelines

BRAND ALIGNMENT:
✅ Documentary portrait style maintained
✅ Warm lighting and diverse representation
✅ Community focus consistent across selections
✅ Image treatments match brand guide

NEXT STEPS:
- Run generate-page-component.md to create React page
- Run validate-brand-and-compliance.md for visual audit
- Test image loading in browser after component generation
```

## Success Criteria

- All required sections have image metadata
- No unnecessary images added to icon/stat sections
- All image files verified to exist
- Alt text follows accessibility guidelines
- Images match brand photography style
- public/docs symlink confirmed working
- Selection rationale documented per image

## Error Handling

**Photo Metadata Missing**:
```
Cannot find /docs/photos/photo_metadata.json.
Options:
1. Generate metadata from existing photos (I'll scan directory)
2. Provide photos and I'll create metadata
3. Use placeholder images
```

**No Good Image Matches**:
```
No suitable images found for "{section.name}" section.
Best partial match: {filename} (tags: {tags})

Options:
1. Accept partial match
2. Skip image for this section
3. Provide specific image filename to use
4. Add new photos to library
```

**Symlink Issues**:
```
public/docs symlink not working.
Creating: ln -s ../docs public/docs
Restart dev server after symlink creation.
```

**Image File Not Found**:
```
Selected image doesn't exist: {path}
Checking other width variants...
Found at: {alternative_path}
Using: {width}×{height} instead
```

## Next Commands

- `generate-page-component.md` (create React page)
- `validate-brand-and-compliance.md` (audit visuals)
- `validate-page-build.md` (test image loading)
