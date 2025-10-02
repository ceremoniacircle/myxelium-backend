---
allowed-tools:
  - SlashCommand
  - Read
  - TodoWrite
description: "Orchestrate full page building pipeline using specialized commands and agents"
tags:
  - orchestrator
  - page-builder
  - pipeline
version: 2.0.0
---

# Build Page from Markdown or Description

## Purpose
Orchestrate the complete page building pipeline by calling specialized commands in sequence. Each command has clear inputs/outputs and can run standalone or as part of the pipeline.

## Pipeline Overview

```
analyze-project-environment
          ↓
prepare-page-markdown
          ↓
    ┌─────┴─────┐
    ↓           ↓
update-page-copy  curate-page-media  (can run in parallel)
    └─────┬─────┘
          ↓
generate-page-component
          ↓
validate-brand-and-compliance
          ↓
validate-page-build
          ↓
summarize-page-deliverables
```

## Execution

### Step 0: Choose Execution Mode

**FIRST**, ask user if they want interactive or uninterrupted mode:

```
Choose execution mode:

1. **Interactive** (default) - I'll ask for your approval at key decision points:
   - After presenting proposed page structure
   - Before synthesizing copy for all sections
   - After presenting selected images for review
   - At any validation warnings

2. **Uninterrupted** - I'll run the entire pipeline without prompting:
   - Use defaults for all decisions
   - Auto-approve all image selections
   - Proceed through warnings (unless critical errors)
   - Only stop for required information (page slug, title, etc.)

Type "interactive" or "uninterrupted" (or just press Enter for interactive):
```

**Wait for user response.**

**Record mode**:
- If user types "uninterrupted" or "no-prompt": `executionMode = "uninterrupted"`
- If user types "interactive" or blank: `executionMode = "interactive"`

**Execution mode behavior**:
- **Interactive mode**:
  - Ask for approval before major actions
  - Present image selections for review
  - Stop at validation warnings
  - Allow user to make changes at each step

- **Uninterrupted mode**:
  - Skip all approval prompts
  - Auto-approve image selections
  - Proceed through warnings (document them for final summary)
  - Only prompt for essential information (slug, title, template, etc.)
  - Use sensible defaults for optional decisions

**For the rest of the pipeline**, check `executionMode` before prompting:
```javascript
if (executionMode === "interactive") {
  // Ask user for approval/input
  askUser("Do you want to...?");
  waitForResponse();
} else {
  // Auto-proceed with sensible default
  console.log("Using default: [default choice]");
  proceed();
}
```

### Step 1: Environment Validation

Run environment analysis first:

```
/development:analyze-project-environment
```

**Check output for critical blockers**:
- Missing API keys
- Pinecone index unavailable
- No component library found

**If blockers found**, stop and prompt user:
```
Critical environment issues detected:
{list blockers}

Please resolve these before proceeding:
- Missing API keys → Add to .env.local
- Pinecone unavailable → Verify API key and index name
- Component library missing → Install @untitledui packages

Re-run this command after fixing issues.
```

**If environment ready**, proceed to next step.

### Step 2: Markdown Preparation

Prepare Markdown source (discover or create):

```
/development:prepare-page-markdown
```

This command will:
- Ask if you have existing Markdown or need to create new
- Interview you if creating new page
- Normalize frontmatter if using existing
- Generate section manifest

**Wait for command to complete.**

**Record outputs**:
- `markdownPath`: {path}
- `slug`: {slug}
- `sectionManifest`: {array of sections}

### Step 3: Content Synthesis (Optional/Parallel)

**Ask user**:
```
Do you want to update page copy?
- YES: I'll synthesize content from Pinecone for all sections
- NO: Skip to media curation (use existing copy)
- SELECTIVE: Specify which sections to update

Choose: yes/no/selective
```

**If YES or SELECTIVE**:

```
/development:update-page-copy
```

**Track progress** with TodoWrite:
- Mark sections as processing/complete
- Note any weak Pinecone matches
- Record final status

**If NO**: Skip to Step 4

### Step 4: Media Curation (Optional/Parallel)

**Ask user**:
```
Do you want to curate/update images?
- YES: I'll select optimal images for all sections that need them
- NO: Skip to component generation (use existing images)
- SELECTIVE: Specify which sections to update

Choose: yes/no/selective
```

**If YES or SELECTIVE**:

```
/development:curate-page-media
```

**Track progress** with TodoWrite:
- Mark image selections as complete
- Note any sections skipped (IconFeatureGrid, StatsGrid)
- Verify symlink status

**If NO**: Skip to Step 5

**NOTE**: Steps 3 and 4 can run in parallel if both needed. Ask user:
```
Both copy and media need updates. Run in parallel for faster completion?
- YES: I'll process both simultaneously
- NO: I'll run sequentially (copy first, then media)
```

### Step 5: Component Generation

Generate React component from finalized Markdown:

```
/development:generate-page-component
```

**This command will**:
- Verify icon library structure first
- Deploy frontend-developer agent
- Generate page.tsx and layout.tsx
- Restart dev server
- Verify compilation

**Monitor for errors**:
- Icon import failures
- Image 404s
- Compilation errors

**If errors occur**, stop and prompt:
```
Component generation failed:
{error details}

Common fixes:
- Icon error → Check variant numbers (Shield01 not Shield)
- Image 404 → Verify public/docs symlink exists
- Syntax error → Review generated code

Fix and re-run: /development:generate-page-component
```

**If successful**, record:
- Component files: {list}
- Route URL: {url}
- Icons used: {list}

### Step 6: Brand & Compliance Audit

Validate brand alignment and compliance:

```
/development:validate-brand-and-compliance
```

**This deploys both**:
- brand-copywriter agent (copy audit)
- brand-designer agent (visual audit)

**Check report status**:
- **PASS**: No critical issues, proceed
- **WARNING**: Has issues, prompt user
- **FAIL**: Critical blockers, must fix

**If WARNING or FAIL**:
```
Brand/compliance issues detected:
- Critical issues: {count}
- High priority: {count}

View full report above.

Options:
1. Fix issues now and re-validate
2. Note issues and proceed anyway (not recommended)
3. Skip to summary (review later)

Choose: 1/2/3
```

**If user chooses 1**: Wait for fixes, then re-run validation.
**If user chooses 2 or 3**: Proceed with warning noted.

### Step 7: Build Validation

Test compilation and HTTP status:

```
/development:validate-page-build
```

**This command checks**:
- Compilation success
- HTTP 200 status
- Image loading
- Provides manual test checklists

**Check compilation status**:
- **SUCCESS**: Page compiles and serves
- **FAILURE**: Compilation errors or non-200 status

**If FAILURE**:
```
Build validation failed:
{error details}

Fix issues and re-run: /development:validate-page-build

Or skip to summary if errors are minor (warning level).
```

**Prompt for manual tests**:
```
Automated checks passed.

Manual browser tests recommended:
- Console errors: Open DevTools, check for errors
- Responsive: Test at 375/768/1280px
- Accessibility: Keyboard nav, heading hierarchy
- Performance: Load time, smooth scrolling

Complete manual tests now? (You can do this later too)
- YES: I'll walk you through checklist
- NO: Skip to summary (test later)

Choose: yes/no
```

### Step 8: Final Summary

Generate complete deliverables summary:

```
/development:summarize-page-deliverables
```

**This provides**:
- All files created/modified
- Quality metrics compilation
- Known issues list
- Run and edit instructions
- Recommended next steps

**User now has**:
- Complete understanding of what was built
- Clear path to run/test page
- Instructions for making changes
- Prioritized action items

## Error Handling

**Throughout pipeline, if any command fails**:

1. **Stop execution** (don't continue to next step)
2. **Show clear error message** with context
3. **Provide remediation steps**
4. **Offer options**:
   - Fix and re-run failed command
   - Skip command and continue (if non-critical)
   - Abort entire pipeline

**Example error handling**:
```
Command failed: update-page-copy

Error: Pinecone index unavailable (connection timeout)

Options:
1. Check API keys and retry
2. Provide manual copy points for sections
3. Skip copy synthesis (use placeholders)
4. Abort pipeline

Choose: 1/2/3/4
```

## Pipeline Controls

**User can control pipeline flow**:

**Skip optional steps**:
- Skip copy synthesis (use existing)
- Skip media curation (use existing)
- Skip brand validation (not recommended)

**Run commands selectively**:
- Update only specific sections
- Regenerate only component
- Re-validate only

**Parallel execution**:
- Run copy + media together for speed
- User confirms before parallel launch

**Early exit**:
- Stop at any point
- Resume from any command (commands are standalone)

## Progress Tracking

Use TodoWrite throughout:

```
Initial todos:
- [ ] Validate environment
- [ ] Prepare Markdown
- [ ] Synthesize copy
- [ ] Curate media
- [ ] Generate component
- [ ] Validate brand/compliance
- [ ] Validate build
- [ ] Summarize deliverables

Update status as commands complete.
Mark as skipped if user chooses to skip.
```

## Success Criteria

Pipeline succeeds when:
- ✅ All commands complete (or explicitly skipped)
- ✅ Markdown source finalized with content and images
- ✅ React component generated and compiling
- ✅ Page accessible at target URL
- ✅ No critical brand/compliance issues (or acknowledged)
- ✅ Build validation passes
- ✅ User has clear summary and next steps

**Quality indicators**:
- Pinecone match scores > 0.7
- Copy within text budgets
- No unnecessary images
- Brand voice consistent
- Compliance requirements met
- WCAG AA minimum (AAA preferred)

## Output Format

Provide progress updates after each step:

```
=== PAGE BUILD PIPELINE ===

[✅] 1. Environment validated
[✅] 2. Markdown prepared: docs/pages/{slug}/index.md
[✅] 3. Copy synthesized (8 sections, avg score: 0.82)
[✅] 4. Media curated (5 images selected, 2 skipped)
[✅] 5. Component generated: src/app/{slug}/page.tsx
[⚠️] 6. Brand audit: 1 high priority issue detected
[✅] 7. Build validated: HTTP 200, all images load
[✅] 8. Summary complete

STATUS: Ready with minor issues to address

NEXT: Review high priority issue in brand audit report,
      then test page in browser.
```

## Advanced Features

**Incremental Updates**:
If Markdown already has some complete sections:
```
I see 3 sections are already complete:
- Hero (copy + image finalized)
- Values (copy finalized, no image needed)
- CTA (copy + image finalized)

Incomplete sections:
- Mission (needs copy + image)
- Stats (needs copy, no image needed)

Options:
1. Regenerate all sections (fresh content)
2. Only process incomplete sections
3. Update specific sections you choose

Choose: 1/2/3
```

**Parallel Section Processing**:
For pages with 5+ sections:
```
This page has 8 sections. I can process them in parallel
using multiple agents for faster completion.

Run in parallel? (Recommended for 5+ sections)
- YES: Faster (3-5 minutes)
- NO: Sequential (8-10 minutes)

Choose: yes/no
```

**Resume from Checkpoint**:
If pipeline interrupted:
```
Previous run detected. Resume from last checkpoint?

Completed:
- Environment validated
- Markdown prepared
- Copy synthesized (8/8 sections)

Next step: Media curation

Options:
1. Resume from media curation
2. Start fresh (regenerate all)
3. Skip to component generation (use existing assets)

Choose: 1/2/3
```

## Individual Command Reference

All commands can run standalone:

```bash
# Environment check
/development:analyze-project-environment

# Markdown preparation
/development:prepare-page-markdown

# Copy synthesis only
/development:update-page-copy

# Media curation only
/development:curate-page-media

# Component generation only
/development:generate-page-component

# Brand audit only
/development:validate-brand-and-compliance

# Build validation only
/development:validate-page-build

# Summary only
/development:summarize-page-deliverables

# Full pipeline (this command)
/development:build-page-from-markdown-or-description
```

## Version History

**v2.0.0** (Current):
- Refactored into modular commands
- Added specialized agent support
- Improved error handling and recovery
- Added parallel execution support
- Better progress tracking with TodoWrite

**v1.0.0** (Legacy):
- Monolithic command (933 lines)
- All logic in single file
- Limited error recovery
- Sequential execution only

---

## Execution Start

Ready to build your page. Let me start by validating the environment.

Running: /development:analyze-project-environment

[Command execution begins...]
