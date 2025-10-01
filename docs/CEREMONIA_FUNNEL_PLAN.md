# Ceremonía AI-Powered Event Funnel System
*Technical Implementation Plan*
*Last Updated: 2025-09-30*

---

## 🎯 Project Vision

**Build an AI-generated, personalized event enrollment funnel for Ceremonía webinars where:**
- Landing pages are AI-generated using existing frontend commands
- Form submissions → automatic Zoom webinar enrollment
- AI generates personalized email/SMS drip campaigns
- **Same AI system** generates both pages AND emails (brand consistency)
- Rapid iteration: swap offers/pages, AI regenerates everything instantly

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (ceremonia-v2-frontend)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Landing Pages (AI-Generated)                         │  │
│  │  - Uses Claude commands (generate-page-component.md)  │  │
│  │  - Markdown → React components                        │  │
│  │  - Brand-themed with design tokens                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Webinar Enrollment Form                              │  │
│  │  - Collects: name, email, phone, [custom fields]     │  │
│  │  - Submits to backend API                            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ POST /api/enroll
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (myxelium-backend - THIS REPO)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Enrollment API                                       │  │
│  │  1. Validate form data                                │  │
│  │  2. Create/update contact in Supabase                 │  │
│  │  3. Enroll in Zoom webinar (API call)                 │  │
│  │  4. Trigger drip campaign (event → queue)             │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  AI Content Generation Engine                         │  │
│  │  - Same prompts/brand as frontend page generator      │  │
│  │  - Reads: brand-guide.json, user data, offer context  │  │
│  │  - Generates: personalized emails, SMS messages       │  │
│  │  - Guardrails: tone, compliance, brand voice          │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Drip Campaign Orchestration                          │  │
│  │  - Queue system (Inngest or Trigger.dev)              │  │
│  │  - Delayed sends (24h, 7d, etc.)                      │  │
│  │  - Personalization at send-time                       │  │
│  │  - Event-driven (signup → enrolled → attended)        │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Email/SMS Provider (Pick One)                        │  │
│  │  - Resend (email) - developer-friendly, cheap         │  │
│  │  - Twilio (SMS) - reliable, scalable                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES                                          │
│  - Zoom API (webinar enrollment, attendance tracking)       │
│  - OpenAI API (content generation)                          │
│  - Resend/Twilio (delivery)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Model

### Core Tables (Supabase Postgres)

```sql
-- Webinars (events you're hosting)
CREATE TABLE webinars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  zoom_webinar_id TEXT UNIQUE NOT NULL,  -- From Zoom API
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  landing_page_slug TEXT,  -- Link to frontend page
  offer_context JSONB,  -- Context for AI content generation
  status TEXT DEFAULT 'draft',  -- draft | published | live | completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts (leads who sign up)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  custom_fields JSONB,  -- Flexible data (e.g., {"company": "Acme", "role": "Founder"})
  consent_email BOOLEAN DEFAULT TRUE,
  consent_sms BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  locale TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON contacts(email);

-- Enrollments (contacts → webinars)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) NOT NULL,
  webinar_id UUID REFERENCES webinars(id) NOT NULL,
  zoom_registrant_id TEXT,  -- Zoom's ID for this registration
  zoom_join_url TEXT,  -- Unique join URL for this user
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  attended BOOLEAN DEFAULT FALSE,
  attended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'registered',  -- registered | confirmed | attended | no_show
  UNIQUE(contact_id, webinar_id)
);
CREATE INDEX ON enrollments(contact_id);
CREATE INDEX ON enrollments(webinar_id);

-- Campaigns (drip sequences)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,  -- 'webinar.enrolled' | 'webinar.attended' | etc.
  webinar_id UUID REFERENCES webinars(id),  -- Optional: specific to a webinar
  steps JSONB NOT NULL,  -- Array of step configs (delay, channel, template)
  brand_context JSONB,  -- Brand voice, tone, guidelines for AI
  status TEXT DEFAULT 'active',  -- active | paused | archived
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Steps (what to send when)
-- Embedded in campaigns.steps JSONB:
-- [
--   {
--     "delay": "0h",
--     "channel": "email",
--     "template_slug": "welcome-email",
--     "personalization": ["firstName", "webinarTitle", "joinUrl"]
--   },
--   {
--     "delay": "24h",
--     "channel": "email",
--     "template_slug": "reminder-1d",
--     "condition": "!attended"
--   }
-- ]

-- Message Templates (AI-generated or manual)
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,  -- 'welcome-email', 'reminder-1d', etc.
  channel TEXT NOT NULL,  -- 'email' | 'sms'
  name TEXT NOT NULL,
  generation_prompt TEXT,  -- Prompt used for AI generation
  subject TEXT,  -- For email
  body_html TEXT,  -- For email
  body_text TEXT,  -- For email plaintext or SMS
  variables JSONB,  -- Available variables: ['firstName', 'webinarTitle', etc.]
  brand_guidelines JSONB,  -- Brand voice, tone, style
  generated_by TEXT DEFAULT 'ai',  -- 'ai' | 'manual'
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sent Messages (audit log)
CREATE TABLE sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) NOT NULL,
  enrollment_id UUID REFERENCES enrollments(id),
  campaign_id UUID REFERENCES campaigns(id),
  template_id UUID REFERENCES message_templates(id),
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,  -- 'resend' | 'twilio'
  provider_message_id TEXT,  -- External tracking ID
  subject TEXT,  -- Email subject (personalized)
  body TEXT,  -- Actual content sent (personalized)
  status TEXT DEFAULT 'queued',  -- queued | sent | delivered | opened | clicked | bounced | failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,  -- Extra data (links clicked, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON sent_messages(contact_id);
CREATE INDEX ON sent_messages(status);
CREATE INDEX ON sent_messages(sent_at);
```

---

## 🔑 Key Workflows

### Workflow 1: Webinar Enrollment

```
1. User fills out form on landing page
   ↓
2. Frontend: POST /api/enroll
   Body: {
     email, firstName, lastName, phone,
     webinarId, customFields: {...}
   }
   ↓
3. Backend validates data
   ↓
4. Create/update contact in Supabase
   ↓
5. Call Zoom API to register user
   POST https://api.zoom.us/v2/webinars/{webinarId}/registrants
   Response: { registrant_id, join_url }
   ↓
6. Create enrollment record with Zoom IDs
   ↓
7. Trigger campaign event
   Inngest.send({
     name: 'webinar.enrolled',
     data: { contactId, webinarId, enrollmentId }
   })
   ↓
8. Return success + join URL to frontend
   Response: { success: true, joinUrl }
```

### Workflow 2: AI Content Generation

```
1. Campaign triggered (e.g., 'webinar.enrolled')
   ↓
2. Load campaign steps from DB
   ↓
3. For each step, check if template exists
   ↓
4. IF template NOT generated yet:
   ↓
   a. Load brand guidelines from frontend repo
      Read: ceremonia-v2-frontend/docs/design/brand-guide.json
   ↓
   b. Build AI prompt:
      - Brand voice/tone
      - Template type (welcome, reminder, follow-up)
      - Available variables (firstName, webinarTitle, etc.)
      - Channel constraints (email: subject+body, SMS: 160 chars)
   ↓
   c. Call OpenAI API:
      Model: gpt-4o-mini
      Prompt: "Generate a {tone} {type} email for {brand}..."
      Response format: JSON { subject, bodyHtml, bodyText }
   ↓
   d. Validate output (guardrails)
      - Check tone matches brand
      - Verify variables used correctly
      - Ensure proper formatting
   ↓
   e. Save to message_templates table
   ↓
5. ELSE: Load existing template
   ↓
6. Personalize template with user data
   - Replace {{firstName}} with actual name
   - Replace {{webinarTitle}} with webinar title
   - Replace {{joinUrl}} with unique Zoom URL
   ↓
7. Queue send job (delayed if needed)
   Inngest.send({
     name: 'message.send',
     data: { templateId, contactId, channel },
     delay: step.delay  // '0h', '24h', '7d'
   })
```

### Workflow 3: Message Sending

```
1. Job triggered (immediate or delayed)
   ↓
2. Check consent (email/SMS permissions)
   ↓
3. IF no consent: Cancel, log reason
   ↓
4. Load personalized content
   ↓
5. Send via provider:

   IF email:
     - Call Resend API
     - POST https://api.resend.com/emails
     - Body: { from, to, subject, html, text }

   IF SMS:
     - Call Twilio API
     - POST https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json
     - Body: { To, From, Body }
   ↓
6. Record in sent_messages table
   - Save provider message ID
   - Status: 'sent'
   ↓
7. Listen for webhooks (delivery, opens, clicks)
   - Resend: POST /api/webhooks/resend
   - Twilio: POST /api/webhooks/twilio
   ↓
8. Update sent_messages status
```

### Workflow 4: Rapid Iteration (Regenerate Content)

```
1. Marketer changes offer/angle in CMS
   ↓
2. Click "Regenerate Campaign Content"
   ↓
3. Backend:
   - Load new offer context
   - Delete old templates (or version them)
   - Re-run AI generation for all steps
   - Preview new content
   ↓
4. Approve new templates
   ↓
5. Campaign uses new content for NEW enrollments
   (existing scheduled messages unaffected)
```

---

## 🛠️ Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Goal**: Get basic enrollment working (form → Supabase → Zoom)

#### Week 1: Database & API Setup

**Day 1-2: Supabase Schema**
- [ ] Create tables (webinars, contacts, enrollments, campaigns, message_templates, sent_messages)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Seed data: 1 test webinar

**Day 3-4: Enrollment API**
- [ ] Create `/api/enroll` endpoint (Hono route)
- [ ] Validate form data (Zod schema)
- [ ] Create/update contact logic
- [ ] Error handling & responses

**Day 5-7: Zoom Integration**
- [ ] Set up Zoom OAuth app (get API credentials)
- [ ] Create Zoom API client wrapper
- [ ] Implement webinar registration flow
- [ ] Test: Submit form → user registered in Zoom
- [ ] Store join URL in enrollments table

**Deliverable**: Working form submission → Zoom enrollment

---

#### Week 2: AI Content Generation

**Day 8-9: Brand Context Loader**
- [ ] Create utility to read `ceremonia-v2-frontend/docs/design/brand-guide.json`
- [ ] Parse brand voice, tone, color tokens
- [ ] Create prompt builder utility
- [ ] Test: Load brand context from frontend repo

**Day 10-11: AI Template Generator**
- [ ] OpenAI API integration (gpt-4o-mini)
- [ ] Email template generation prompt
- [ ] SMS template generation prompt
- [ ] Guardrails (tone check, variable validation)
- [ ] Save to message_templates table

**Day 12-14: Template Personalization**
- [ ] Variable replacement engine ({{firstName}} → "Austin")
- [ ] Load user data from contacts/enrollments
- [ ] Load webinar data
- [ ] Generate final personalized content
- [ ] Preview endpoint: `GET /api/templates/{id}/preview?contactId=X`

**Deliverable**: AI generates brand-consistent email templates

---

### Phase 2: Campaign Orchestration (Week 3-4)

#### Week 3: Job Queue Setup

**Day 15-16: Inngest Integration**
- [ ] Install Inngest SDK: `npm install inngest`
- [ ] Create Inngest client
- [ ] Set up Inngest endpoint: `/api/inngest`
- [ ] Create first function: `webinar.enrolled` handler
- [ ] Test: Trigger event → function runs

**Day 17-18: Campaign Logic**
- [ ] Load campaign steps from database
- [ ] Schedule delayed jobs (use `step.sleep()`)
- [ ] Implement conditional logic (if attended → different path)
- [ ] Create campaign admin UI (list, create, edit)

**Day 19-21: Message Sending Functions**
- [ ] Inngest function: `message.send`
- [ ] Check consent before sending
- [ ] Load personalized template
- [ ] Call provider API (Resend for email)
- [ ] Record in sent_messages
- [ ] Idempotency handling (don't send twice)

**Deliverable**: End-to-end campaign - enrollment → delayed email

---

#### Week 4: Email/SMS Providers

**Day 22-23: Resend Integration (Email)**
- [ ] Install Resend SDK: `npm install resend`
- [ ] Create Resend client wrapper
- [ ] Implement `sendEmail()` function
- [ ] Handle errors (bounces, rate limits)
- [ ] Test: Send real email to yourself

**Day 24-25: Twilio Integration (SMS)**
- [ ] Install Twilio SDK: `npm install twilio`
- [ ] Create Twilio client wrapper
- [ ] Implement `sendSMS()` function
- [ ] Handle SMS-specific logic (character limits, E.164 phone format)
- [ ] Test: Send real SMS to yourself

**Day 26-28: Webhook Handlers**
- [ ] Resend webhook: `/api/webhooks/resend`
- [ ] Parse delivery, open, click events
- [ ] Update sent_messages status
- [ ] Twilio webhook: `/api/webhooks/twilio`
- [ ] Parse delivery, reply events
- [ ] Test with Resend/Twilio webhook simulators

**Deliverable**: Full message delivery + status tracking

---

### Phase 3: Admin UI & Rapid Iteration (Week 5-6)

#### Week 5: Dashboard

**Day 29-30: Webinar Management**
- [ ] List webinars page
- [ ] Create webinar form (title, date, Zoom ID)
- [ ] View enrollments per webinar
- [ ] Dashboard: total enrollments, open rate, etc.

**Day 31-32: Campaign Management**
- [ ] List campaigns page
- [ ] Create campaign form (name, trigger, steps)
- [ ] Visual step builder (drag-drop would be nice, but start simple)
- [ ] Preview campaign flow

**Day 33-35: Message Template Editor**
- [ ] List templates page
- [ ] "Generate with AI" button
- [ ] Edit generated template (WYSIWYG or markdown)
- [ ] Preview with test data
- [ ] Version history (optional)

**Deliverable**: Admin can manage webinars, campaigns, templates

---

#### Week 6: Rapid Iteration Features

**Day 36-37: Template Regeneration**
- [ ] "Regenerate All Templates" button for a campaign
- [ ] Prompt customization (change tone, angle, etc.)
- [ ] Side-by-side diff (old vs. new template)
- [ ] Approve/reject workflow

**Day 38-39: A/B Testing Setup**
- [ ] Create template variants (A, B)
- [ ] Split traffic logic (50/50 or custom %)
- [ ] Track performance by variant
- [ ] Declare winner (manual or auto)

**Day 40-42: Analytics & Reporting**
- [ ] Campaign performance dashboard
- [ ] Metrics: sent, delivered, opened, clicked
- [ ] Funnel visualization (enrolled → confirmed → attended)
- [ ] Export to CSV
- [ ] Integration with Google Sheets (optional)

**Deliverable**: Marketer can iterate campaigns quickly

---

## 🔧 Technical Stack

### Backend (myxelium-backend)

**Framework**:
- Next.js 15 (App Router)
- Hono 4.9 (API routes)
- TypeScript 5.7

**Database**:
- Supabase (Postgres + Auth + Realtime)

**Job Queue**:
- Inngest (serverless, visual debugger)
- Alternative: Trigger.dev

**AI**:
- OpenAI API (gpt-4o-mini)
- Prompt: Reuse brand guidelines from frontend

**Providers**:
- Resend (email) - $0.10/1000 emails
- Twilio (SMS) - ~$0.0075/SMS

**External APIs**:
- Zoom API (webinar registration)

**Monitoring**:
- Sentry (errors)
- Vercel Analytics
- Inngest Dashboard (job health)

---

## 🎨 AI Content Generation Strategy

### Reuse Frontend Page Generator Approach

**Frontend command** (`generate-page-component.md`) uses:
1. Brand guide JSON (voice, tone, colors)
2. Markdown content (structure, copy)
3. Claude/Codex prompts
4. Template structure validation

**Backend should use SAME approach**:

```typescript
// lib/ai/generate-campaign-content.ts

import { loadBrandGuide } from '@/lib/brand'
import OpenAI from 'openai'

export async function generateCampaignEmail({
  campaignType,  // 'welcome' | 'reminder' | 'follow-up'
  webinarContext,  // { title, description, date, speaker }
  brandScope = 'ceremonia',  // Can support multiple brands
  tone = 'warm and inviting',
  customInstructions = ''
}: GenerateEmailParams) {

  // 1. Load brand guidelines (SAME as frontend)
  const brandGuide = await loadBrandGuide(brandScope)
  // Reads: ceremonia-v2-frontend/docs/design/brand-guide.json

  // 2. Build prompt (similar to page generation)
  const systemPrompt = `You are an expert copywriter for ${brandGuide.name}.

BRAND VOICE: ${brandGuide.voice}
- ${brandGuide.voiceAttributes.join('\n- ')}

TONE: ${tone}

WRITING STYLE:
- ${brandGuide.writingGuidelines.join('\n- ')}

COLOR PALETTE (for email design):
- Primary: ${brandGuide.colors.primary}
- Accent: ${brandGuide.colors.accent}

OUTPUT FORMAT: JSON
{
  "subject": "Email subject line (max 60 chars)",
  "preheader": "Preview text (max 100 chars)",
  "bodyHtml": "HTML email body",
  "bodyText": "Plain text version"
}

REQUIREMENTS:
- Use personalization variables: {{firstName}}, {{webinarTitle}}, {{joinUrl}}
- Include clear CTA (call-to-action)
- Mobile-responsive HTML (simple structure)
- Unsubscribe link in footer
- Match brand voice exactly`

  const userPrompt = `Generate a ${campaignType} email for this webinar:

WEBINAR DETAILS:
- Title: ${webinarContext.title}
- Description: ${webinarContext.description}
- Date: ${webinarContext.date}
- Speaker: ${webinarContext.speaker}

CAMPAIGN TYPE: ${campaignType}
${campaignType === 'welcome' ? '- Goal: Confirm registration, build excitement' : ''}
${campaignType === 'reminder' ? '- Goal: Remind to attend, provide join link' : ''}
${campaignType === 'follow-up' ? '- Goal: Thank for attending, next steps' : ''}

PERSONALIZATION VARIABLES AVAILABLE:
- {{firstName}} - Contact's first name
- {{lastName}} - Contact's last name
- {{webinarTitle}} - Webinar title
- {{webinarDate}} - Formatted date/time
- {{joinUrl}} - Unique Zoom join URL
- {{unsubscribeUrl}} - Unsubscribe link

${customInstructions ? `CUSTOM INSTRUCTIONS:\n${customInstructions}` : ''}

Generate compelling, brand-aligned email content.`

  // 3. Call OpenAI (same as frontend would)
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  })

  const content = JSON.parse(response.choices[0].message.content!)

  // 4. Validate (guardrails)
  validateEmailContent(content, brandGuide)

  return content
}

function validateEmailContent(content: any, brandGuide: any) {
  // Check subject line length
  if (content.subject.length > 60) {
    throw new Error('Subject line too long')
  }

  // Check for required elements
  if (!content.bodyHtml.includes('{{joinUrl}}')) {
    throw new Error('Email must include {{joinUrl}} variable')
  }

  if (!content.bodyHtml.includes('{{unsubscribeUrl}}')) {
    throw new Error('Email must include unsubscribe link')
  }

  // Tone check (simple - could use AI)
  const forbiddenWords = brandGuide.avoidWords || []
  forbiddenWords.forEach(word => {
    if (content.bodyText.toLowerCase().includes(word.toLowerCase())) {
      throw new Error(`Content contains forbidden word: ${word}`)
    }
  })
}
```

---

## 📈 Success Metrics

### MVP (End of Week 6)

- [ ] 1 live webinar with real enrollments
- [ ] 3-step campaign running (welcome → reminder → follow-up)
- [ ] 50+ emails sent successfully
- [ ] 0 delivery failures due to bugs
- [ ] <5 second enrollment latency (form submit → Zoom registered)
- [ ] Admin can regenerate templates in <2 minutes

### V1 (3 Months)

- [ ] 10 webinars hosted
- [ ] 500+ total enrollments
- [ ] 5K+ messages sent (email + SMS)
- [ ] 40%+ email open rate
- [ ] 5%+ click-through rate
- [ ] 3+ campaign templates (welcome, nurture, re-engagement)
- [ ] A/B testing active on 1+ campaign

---

## ⚠️ Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Zoom API rate limits** | High | Cache webinar data, batch registrations if needed |
| **AI generates off-brand content** | Medium | Strict prompts, human review before first use, version templates |
| **Email deliverability issues** | High | Use reputable provider (Resend), warm up domain, SPF/DKIM setup |
| **Form spam submissions** | Medium | Add reCAPTCHA, email verification, rate limiting |
| **Job queue failures** | High | Inngest has built-in retries + DLQ, monitor dashboard |
| **Webhook delays** | Low | Accept eventual consistency, show "sending..." status |

---

## 🚀 Quick Start (For You)

### Step 1: Set up Zoom Integration

1. Go to https://marketplace.zoom.us/
2. Create a new "Server-to-Server OAuth" app
3. Get credentials: Account ID, Client ID, Client Secret
4. Add to `.env.local`:
   ```
   ZOOM_ACCOUNT_ID=xxx
   ZOOM_CLIENT_ID=xxx
   ZOOM_CLIENT_SECRET=xxx
   ```
5. Test API access:
   ```bash
   curl https://api.zoom.us/v2/users/me/webinars \
     -H "Authorization: Bearer {access_token}"
   ```

### Step 2: Set up Resend

1. Go to https://resend.com/
2. Sign up (free tier: 3K emails/month)
3. Verify your domain (add DNS records)
4. Get API key
5. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxx
   RESEND_FROM_EMAIL=events@ceremonia.com
   ```

### Step 3: Set up Inngest

1. Go to https://www.inngest.com/
2. Sign up (free tier: generous)
3. Create new app
4. Get signing key
5. Add to `.env.local`:
   ```
   INNGEST_SIGNING_KEY=signkey-xxx
   INNGEST_EVENT_KEY=xxx
   ```
6. Install SDK:
   ```bash
   npm install inngest
   ```

### Step 4: Database Schema

```bash
# Connect to Supabase
npx supabase login

# Push schema (create tables)
# First, create migration file with the SQL above
npx supabase db push
```

### Step 5: Create First API Route

```typescript
// app/api/enroll/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const EnrollSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  webinarId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Validate input
    const body = await req.json()
    const data = EnrollSchema.parse(body)

    // 2. Create/update contact
    const supabase = createClient()
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
      })
      .select()
      .single()

    if (contactError) throw contactError

    // 3. Register with Zoom (you'll implement this)
    const zoomRegistrant = await registerZoomWebinar({
      webinarId: data.webinarId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    })

    // 4. Create enrollment
    const { data: enrollment } = await supabase
      .from('enrollments')
      .insert({
        contact_id: contact.id,
        webinar_id: data.webinarId,
        zoom_registrant_id: zoomRegistrant.id,
        zoom_join_url: zoomRegistrant.join_url,
      })
      .select()
      .single()

    // 5. Trigger campaign (you'll implement this)
    // await inngest.send({
    //   name: 'webinar.enrolled',
    //   data: { contactId: contact.id, webinarId: data.webinarId }
    // })

    return NextResponse.json({
      success: true,
      joinUrl: zoomRegistrant.join_url,
    })

  } catch (error) {
    console.error('Enrollment error:', error)
    return NextResponse.json(
      { error: 'Enrollment failed' },
      { status: 400 }
    )
  }
}
```

---

## 📚 Next Steps

1. **Create Supabase migration** with the schema above
2. **Set up Zoom OAuth app** and test API access
3. **Install Inngest** and create first event handler
4. **Implement `/api/enroll`** endpoint
5. **Build AI content generator** reusing frontend brand guide
6. **Test end-to-end**: Form → Zoom → Email sent

---

## 💬 Key Decisions

**Q1: Email provider - Resend vs. SendGrid?**
- **Recommendation**: Resend
- **Why**: Simpler API, developer-friendly, $0.10/1K (vs SendGrid $15/mo base)

**Q2: Job queue - Inngest vs. BullMQ?**
- **Recommendation**: Inngest for MVP
- **Why**: Serverless, visual debugging, built-in retries, free tier

**Q3: Store templates in DB vs. Git?**
- **Recommendation**: Database for AI-generated, Git for manual overrides
- **Why**: Rapid iteration needs DB, but version control in Git is valuable

**Q4: Single campaign per webinar or reusable templates?**
- **Recommendation**: Hybrid - reusable templates, webinar-specific customization
- **Why**: Don't rebuild from scratch each time, but allow per-event tweaks

---

This plan focuses on YOUR actual use case: **AI-powered event funnels for Ceremonía webinars**. Ready to start building? 🚀
