---
allowed-tools:
  - Task
  - Read
description: "Audit copy and visuals for brand alignment and compliance using specialized agents"
tags:
  - validation
  - brand-audit
  - compliance
  - quality-assurance
version: 1.0.0
---

# Validate Brand and Compliance

## Purpose
Deploy brand-copywriter (voice), compliance-officer (regulatory), and brand-designer (visual) agents to audit copy and imagery for brand tone, compliance requirements, typography/color conformance, and cultural sensitivity. Surface required fixes, review proposed edits with the user, then apply only the approved changes before release.

## Inputs
- `markdownPath`: Path to Markdown source
- `componentPaths`: Array of generated React component paths
- Brand guide references: `/docs/design/brand-guide.md`, `/docs/design/brand-guide.json`

## Outputs
JSON report with:
- `status`: pass/warning/fail
- `brandFindings`: Issues from brand-copywriter audit
- `complianceReport`: Embedded compliance-officer JSON (risk, rationale, issues, rewrite, disclosures, records, needs_legal_review)
- `visualFindings`: Array of visual issues with severity and recommendations
- `requiredActions`: Must-fix issues before deployment
- `recommendations`: Nice-to-have improvements

## Execution

### Step 1: Brand Voice Audit (brand-copywriter)

```
Task(agent: brand-copywriter):

You are auditing copy for brand alignment and compliance.

SOURCES TO AUDIT:
- Markdown: {markdownPath}
- Component: {componentPaths}

BRAND GUIDELINES:
Read:
- /docs/design/brand-guide.md (voice, tone, lexicon)
- /docs/design/brand-guide.json (technical constraints)

COPY AUDIT CHECKLIST:

1. BRAND VOICE ALIGNMENT:
   ✓ Tone is warm, direct, and human (not over-spiritual or clinical)
   ✓ Uses core lexicon: Alive, Free, Connected, Safe, Legal, Guided, Evidence-based
   ✓ Avoids restricted words: Sacred, Miracle, Cure, Protocolized
   ✓ Outcome-first language (benefits before features)
   ✓ One calm safety clause per section (not excessive disclaimers)

2. MESSAGING PATTERNS:
   ✓ Hero follows pattern: outcome headline + safety subhead + dual CTAs
   ✓ Proof bars cite specific numbers (330+ alumni, 200+ video stories, etc.)
   ✓ FAQ style uses short, plain answers
   ✓ Testimonial captions are alt-text friendly
   ✓ CTAs are action-oriented ("Start your path" not "Submit")

3. COMPLIANCE REQUIREMENTS (Colorado NMHA):
   ✓ No medical claims: "cure", "treat", "diagnose", "therapy" (unless licensed)
   ✓ Proper licensure language: "facilitator" not "therapist"
   ✓ References to Colorado Natural Medicine Health Act appropriate
   ✓ Licensed healing center status mentioned accurately
   ✓ No promises of specific outcomes

4. CULTURAL SENSITIVITY:
   ✓ Indigenous traditions honored without appropriation
   ✓ Uses "wisdom traditions" when referring to shamanic practices
   ✓ Avoids over-spiritual language
   ✓ Maintains respectful integration of West/South/East wisdom
   ✓ Ethical collaboration language present

5. ACCESSIBILITY (Plain Language):
   ✓ Readability: 8th grade level or below
   ✓ Scannability: Short paragraphs, clear hierarchy
   ✓ Line length: 50-75 characters optimal
   ✓ Active voice preferred
   ✓ Jargon minimized or explained

6. TEXT BUDGET ADHERENCE:
   ✓ Sections fit within specified word counts (±10% acceptable)
   ✓ Headlines: 15-25 words
   ✓ Subheads: 30-50 words
   ✓ Body sections: 50-100 words depending on section

OUTPUT FORMAT:
For each issue found, provide:
{
  section: "{section name}",
  finding: "{description}",
  severity: "critical/high/medium/low",
  currentText: "{excerpt}",
  recommendation: "{how to fix}",
  complianceImpact: true/false
}

OVERALL ASSESSMENT:
{
  voiceAlignment: "strong/acceptable/weak",
  complianceStatus: "pass/warning/fail",
  culturalSensitivity: "respectful/acceptable/problematic",
  readability: "excellent/good/needs-improvement",
  summary: "{overall assessment}"
}
```

### Step 2: Compliance Review & Rewrite (compliance-officer)

```
Task(agent: compliance-officer):

You are reviewing this page for Colorado NMHA marketing compliance. Produce both the human-readable report and the JSON payload defined in your system brief. Do not modify files directly; surface a compliant rewrite the team can apply manually.

BEFORE RESPONDING:
- Read the Markdown source: {markdownPath}
- For each component path in {componentPaths}, read the file to understand rendered copy, CTAs, and imagery references

GATHER CONTEXT USING THE REQUIRED REQUEST TEMPLATE:
[CHANNEL]: landing page (web)
[AUDIENCE]: Adults 21+ (if documentation for ≥73.6% age 21+ is missing, flag it as required)
[CONTENT]: Paste the page copy you just reviewed (frontmatter not required). Quote key claims verbatim so issues can be cited precisely.
[GOAL]: Provide brand-aligned information about Ceremonia offerings while staying compliant
[NOTES]: Mention any cultural references, testimonial usage, imagery descriptions from components, and whether documentation (audience composition, cultural substantiation, testing certificates) exists. If unknown, note "documentation pending".
[MODE]: review+rewrite

Ensure you:
- Apply every rule in your compliance playbook (no medical claims, no "safe because tested", no youth appeal, no sale/transfer language, etc.)
- Include mandatory disclosures when rewriting copy
- Produce a risk rating (Red/Amber/Green) with rationale
- Log each issue with rule, evidence, explanation, and fix
- Provide a full compliant rewrite that can replace the original copy
- List disclosures to append and records to retain
- Set `needs_legal_review` to true if substantiation or legal input is required

Return your standard human-readable summary followed by the JSON block.
```

### Step 3: Deploy Brand-Designer Agent for Visual Audit

```
Task(agent: brand-designer):

You are auditing visuals for brand alignment and design conformance.

SOURCES TO AUDIT:
- Component: {componentPaths}
- Images referenced in component

BRAND GUIDELINES:
Read:
- /docs/design/brand-guide.md (visual identity, photography style)
- /docs/design/brand-guide.json (color tokens, typography specs)

VISUAL AUDIT CHECKLIST:

1. COLOR SYSTEM CONFORMANCE:
   ✓ 80/20 rule: 80% master brand, ≤20% sibling accent
   ✓ Accents only in: CTAs, active nav, tags, light washes, chart highlights
   ✓ NOT full accent backgrounds
   ✓ WCAG AAA contrast (7:1 body text, 4.5:1 large text)
   ✓ Uses semantic color tokens (not hardcoded hex values)

2. TYPOGRAPHY CONFORMANCE:
   ✓ Display font: Merriweather (weights 400, 500, 600, 700)
   ✓ Body font: Open Sans (weights 400, 500, 600, 700)
   ✓ Scale follows major third ratio
   ✓ Line heights: 1.5-1.7 for body text
   ✓ Heading hierarchy: no skipped levels (h1 → h2 → h3)
   ✓ Responsive typography applied

3. IMAGERY ALIGNMENT:
   ✓ Documentary portrait style (authentic, unposed)
   ✓ Warm daylight (golden hour preferred)
   ✓ Diverse representation (age, ethnicity, body types)
   ✓ Circle formations and community connection
   ✓ Nature integration (Colorado landscapes)
   ✓ High resolution (1600px minimum for hero)
   ✓ Proper alt text (descriptive, accessible)

4. COMPONENT-IMAGE APPROPRIATENESS:
   ✓ Hero has background image
   ✓ IconFeatureGrid does NOT have large featured image
   ✓ StatsGrid does NOT have image
   ✓ SplitLayout has contextual side image
   ✓ CTA has background image with overlay
   ✓ No duplicate images across sections

5. LAYOUT AND SPACING:
   ✓ Grid system followed
   ✓ Consistent spacing tokens (4/8/12/16/24/32/48/64/96px)
   ✓ Corner radius: 2xl (16px) for images
   ✓ Vertical rhythm maintained
   ✓ Container max-widths respected

6. ACCESSIBILITY (Visual):
   ✓ All images have descriptive alt text
   ✓ Color is not the only differentiator
   ✓ Touch targets ≥44px
   ✓ Focus indicators visible
   ✓ No pure black on white (use neutrals)

OUTPUT FORMAT:
For each issue found, provide:
{
  component: "{component name or section}",
  finding: "{description}",
  severity: "critical/high/medium/low",
  currentImplementation: "{what's there now}",
  recommendation: "{how to fix}",
  accessibilityImpact: true/false
}

OVERALL ASSESSMENT:
{
  colorConformance: "excellent/good/needs-improvement",
  typographyConformance: "excellent/good/needs-improvement",
  imageryAlignment: "strong/acceptable/weak",
  componentAppropri ateness: "correct/minor-issues/major-issues",
  accessibilityStatus: "WCAG-AAA/WCAG-AA/needs-work",
  summary: "{overall assessment}"
}
```

### Step 4: Aggregate Findings

Combine outputs from all three agents:

1. Normalize severity labels across reports (critical/high/medium/low).
2. Promote any compliance-officer `issues` with severity ≥ high to the must-fix queue.
3. Record the compliance-officer `risk` level and `needs_legal_review` flag.
4. Surface the compliant rewrite (if provided) so the team can update Markdown explicitly—do not auto-apply changes.
5. Create a `proposedChanges` list capturing each actionable edit (copy replacements, class updates, asset swaps) with current/proposed snippets and default status `pending-user-review`.

### Step 5: Generate Action Plan

For each critical/high finding (brand, compliance, or visual), capture:

```
Issue: {finding}
Source: {brand-copywriter|compliance-officer|brand-designer}
Impact: {compliance/accessibility/brand}
Current: {what's there now}
Fix: {specific change needed}
Location: {file path + section or component}
Effort: {low/medium/high}
```

## Output Format

Return a structured JSON report that merges all audits, embeds the compliance-officer payload, and enumerates proposed edits for user approval:

```json
{
  "status": "warning",
  "timestamp": "2025-09-30T10:00:00Z",
  "auditedFiles": [
    "docs/pages/about/index.md",
    "src/app/about/page.tsx"
  ],

  "brandFindings": [
    {
      "section": "Hero",
      "finding": "Uses restricted word 'sacred' in subheadline",
      "severity": "high",
      "currentText": "Experience the sacred power of transformation",
      "recommendation": "Replace with 'Experience the transformative power of guided healing'",
      "complianceImpact": false
    }
  ],

  "complianceReport": {
    "risk": "Amber",
    "rationale": "Medical benefit claim and missing audience documentation",
    "issues": [
      {
        "rule": "No medical claims",
        "evidence": "Our program can cure PTSD and anxiety",
        "why_problem": "Implied treatment/cure violates NMHA advertising rules",
        "fix": "Rephrase to 'supports facilitator-guided integration work'"
      }
    ],
    "rewritten_copy": "... full compliant rewrite ...",
    "required_disclosures": [
      "**For adults 21+.** Content for educational purposes only.",
      "This program is educational. It does not diagnose, treat, or cure any condition..."
    ],
    "records_to_keep": [
      "Audience composition proof (≥73.6% 21+)",
      "Testing certificate (if product claims remain)"
    ],
    "needs_legal_review": false
  },

  "visualFindings": [
    {
      "component": "CTASection",
      "finding": "Contrast ratio 3.2:1 on button text (fails WCAG AA)",
      "severity": "critical",
      "currentImplementation": "White text on light purple (#9B87F5)",
      "recommendation": "Use darker purple (#6D28D9) or increase text weight",
      "accessibilityImpact": true
    }
  ],

  "requiredActions": [
    {
      "priority": 1,
      "action": "Revise Values section copy using compliance-officer rewrite (remove medical claim)",
      "file": "docs/pages/about/index.md",
      "section": "Values",
      "source": "compliance-officer",
      "effort": "low"
    },
    {
      "priority": 2,
      "action": "Fix CTA button contrast ratio to meet WCAG AA",
      "file": "src/app/about/page.tsx",
      "component": "CTASection",
      "source": "brand-designer",
      "effort": "low"
    }
  ],

  "recommendations": [
    {
      "category": "brand-voice",
      "suggestion": "Replace 'sacred' with 'meaningful' in Hero subheadline",
      "impact": "Better brand voice alignment",
      "effort": "low"
    }
  ],

  "proposedChanges": [
    {
      "id": "copy-values-medical-claim",
      "description": "Replace Values section paragraph with compliant rewrite",
      "file": "docs/pages/about/index.md",
      "current": "Our program can cure PTSD and anxiety...",
      "proposed": "Our facilitator-supported program helps participants cultivate integration practices that support trauma recovery journeys...",
      "source": "compliance-officer",
      "status": "approved",
      "appliedText": "Our facilitator-supported program helps participants cultivate integration practices that support trauma recovery journeys while staying within Colorado Natural Medicine Health Act guidelines."
    },
    {
      "id": "cta-button-contrast",
      "description": "Update CTA button class to use darker accent color",
      "file": "src/app/about/page.tsx",
      "current": "className=\"bg-untitled-purple-300 text-white\"",
      "proposed": "className=\"bg-untitled-purple-600 text-white\"",
      "source": "brand-designer",
      "status": "approved",
      "appliedText": "className=\"bg-untitled-purple-600 text-white\""
    }
  ],

  "summary": {
    "overallStatus": "warning",
    "criticalIssues": 2,
    "highPriorityIssues": 1,
    "complianceRisk": "Amber",
    "needsLegalReview": false,
    "accessibilityStatus": "needs-fixes",
    "brandAlignment": "mostly-aligned",
    "readyForDeployment": false,
    "nextSteps": "Apply compliance rewrite, address contrast issue, re-run validation"
  }
}
```

Also produce a human-readable recap that highlights the compliance-officer risk rating, summarizes major fixes, and links to the rewrite snippet the team should apply manually.

### Step 6: User Review & Change Application

1. Present `proposedChanges` to the user in a concise table (ID, description, source, diff preview).
2. Prompt the user: "Reply with any of the following for each ID: `approve`, `reject`, or `edit:<replacement text>`." Allow batch responses.
3. Wait for user confirmation before editing files. If the user supplies modified text, treat it as the replacement payload.
4. For each approved change, use the Edit tool to update the specified file. Preserve surrounding context and validate frontmatter/formatting.
5. Update `proposedChanges[].status` to `approved` or `rejected-by-user` accordingly; attach any user-supplied replacements under `appliedText`.
6. After applying edits, re-read the affected sections to confirm updates and note any follow-up validation needed (e.g., rerun compliance if significant copy changed).
7. If all critical compliance issues are approved and applied, update overall `status` to `pass`; otherwise remain `warning/fail` and list outstanding items.

## Success Criteria

- Complete audit of copy and visuals
- All compliance violations identified and categorized
- Compliance-officer risk rating and rewrite captured
- User decisions collected for each proposed change
- Approved edits applied to source files; rejected edits left untouched
- All accessibility issues flagged
- Brand alignment assessed
- Clear action plan provided
- Severity levels assigned correctly
- Both critical and nice-to-have improvements listed

## Next Commands

If status is `pass`:
- `validate-page-build.md` (test build)
- `summarize-page-deliverables.md` (final summary)

If status is `warning` or `fail`:
- Fix required actions
- Re-run this command
- Then proceed to build validation
