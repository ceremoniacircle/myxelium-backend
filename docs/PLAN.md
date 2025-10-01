# Myxelium Campaign Orchestration Platform
*Strategic Project Plan*
*Last Updated: 2025-09-30*
*Version: 0.1.0 - Initial Strategic Draft*

---

## 🎯 Executive Summary

**Vision**: Build the first **developer-first, provider-agnostic campaign orchestration platform** that treats marketing automation like infrastructure - programmable, version-controlled, and composable.

**The Opportunity**: Marketing teams spend $50B+ annually on CRM/EMS platforms (HubSpot, Marketo, Salesforce) but face:
- **Vendor lock-in**: Expensive migrations, limited portability
- **GUI fatigue**: Click-heavy campaign builders that don't scale
- **Integration hell**: Each tool has different APIs, capabilities, limits
- **No version control**: Campaign changes aren't audited, reviewed, or rolled back easily

**Our Approach**: Separate **content generation** and **orchestration logic** from **delivery infrastructure**. Let developers:
1. Define campaigns as code (TypeScript/JSON) in Git
2. Generate multi-channel content with AI (email, SMS, future: WhatsApp, push)
3. Queue and schedule delivery via pluggable adapters to any provider
4. Observe, debug, and optimize with granular metrics

**Market Position**: "Stripe for campaign delivery" - infrastructure layer that developers love, marketers adopt.

**Core Differentiators**:
- **Provider-agnostic**: Works with GoHighLevel, SendGrid, Resend, Twilio, MessageBird - no lock-in
- **Code-first**: Campaigns in Git, reviewed in PRs, deployed like software
- **AI-native**: Content generation with guardrails (compliance, tone, personalization)
- **Reliability**: Idempotent jobs, DLQ, exponential backoff, audit trails

**Success Metrics (12 months)**:
- 100+ active campaigns in production
- 1M+ messages delivered across 5+ providers
- 99.9% job completion rate (excluding provider failures)
- 10+ paying customers (developers/agencies/startups)

---

## 🔍 Problem Statement

### The Core Problem

**Marketing automation is trapped in vendor silos.**

Modern development practices (Git, CI/CD, code review, IaC) haven't reached marketing operations. Teams face:

1. **Vendor Lock-In Pain**
   - Migrating from HubSpot → Customer.io requires rewriting every campaign
   - Each provider has proprietary builders, APIs, data models
   - Switching costs are so high that teams stay with suboptimal tools

2. **GUI Builder Limitations**
   - Campaign logic buried in 50+ clicks across dashboards
   - No version history, diff, or rollback capabilities
   - Hard to test, review, or replicate across brands/clients

3. **Integration Fragmentation**
   - Want email from SendGrid, SMS from Twilio, push from OneSignal? Build custom integration layer
   - Each provider has different capabilities (scheduling, templates, webhooks)
   - Maintaining sync, idempotency, retry logic is reinvented every time

4. **Compliance & Scale Risks**
   - Consent management scattered across providers
   - No unified audit trail for GDPR/CCPA
   - Hard to enforce quiet hours, rate limits, brand safety globally

### Evidence & Market Validation

**Qualitative Signals**:
- **Developer forums**: 100+ Stack Overflow questions about "campaign orchestration alternatives"
- **Agency pain**: Agencies managing 10+ clients use spreadsheets to track 5 different CRM logins
- **Migration stories**: HubSpot → Customer.io migrations taking 3-6 months, high error rates

**Quantitative Indicators**:
- **Market size**: Email marketing software = $1.5B (2024), SMS marketing = $12B (2024)
- **Developer tools growth**: Twilio, SendGrid, Resend all growing 30%+ YoY
- **Open-source traction**: Novu (notifications) raised $6.6M, 20K+ stars; Knock (notifications) raised $12M

**Competitive Gaps**:
- **Existing tools lack multi-provider orchestration**: Customer.io, Iterable, Braze are single-stack
- **Developer tools lack orchestration**: SendGrid, Postmark, Resend are delivery-only
- **Open-source tools lack AI + compliance**: Novu, Knock focus on transactional, not campaign workflows

### Target Audience

**Primary Persona: "Dev-First Marketer" (Startup/SMB)**
- **Profile**: Technical founder or growth engineer at 10-100 person startup
- **Current workflow**: Duct-taping SendGrid + Twilio with custom scripts, Zapier, or internal tools
- **Pain**: Spending engineering time on campaign plumbing instead of core product
- **Jobs to be Done**: "When I launch a new feature, I want to send a coordinated email + SMS campaign without writing custom retry/scheduling logic"
- **Success criteria**: Campaign live in <1 hour, Git-versioned, observable

**Secondary Persona: "Multi-Client Agency Operator"**
- **Profile**: Agency managing 5-20 clients, each with different CRMs
- **Current workflow**: Logging into HubSpot, Mailchimp, GoHighLevel for each client
- **Pain**: No template reuse, billing complexity, reporting fragmentation
- **Jobs to be Done**: "When I onboard a new client, I want to deploy proven campaign templates without rebuilding in their CRM"
- **Success criteria**: Multi-tenant isolation, white-label reports, unified billing

**Tertiary Persona: "Compliance-Conscious Enterprise"**
- **Profile**: Marketing ops at fintech, healthcare, or regulated industry
- **Current workflow**: Manual audit trails, spreadsheet-based consent tracking
- **Pain**: Risk of GDPR fines, hard to prove compliance, slow to adapt to new regulations
- **Jobs to be Done**: "When regulators ask for proof, I need a complete audit log of every send, consent change, and unsubscribe"
- **Success criteria**: Immutable logs, GDPR/CCPA controls, SOC 2 compliance

---

## 💡 Proposed Solution

### Core Value Proposition

**"Own your campaign logic. Rent delivery infrastructure."**

Myxelium is the orchestration layer that sits **above** your CRM/EMS providers:

```
┌─────────────────────────────────────┐
│   Your Campaigns (Git Repo)        │
│   ├─ welcome-drip.ts                │
│   ├─ cart-abandon.ts                │
│   └─ nurture-sequence.ts            │
└─────────────────────────────────────┘
              ↓ (Deploy)
┌─────────────────────────────────────┐
│   Myxelium Orchestration Engine     │
│   ├─ AI Content Generation          │
│   ├─ Job Queue & Scheduling         │
│   ├─ Compliance & Consent           │
│   └─ Observability & Metrics        │
└─────────────────────────────────────┘
       ↓              ↓              ↓
┌──────────┐   ┌──────────┐   ┌──────────┐
│ SendGrid │   │  Twilio  │   │ GHL API  │
│  Adapter │   │ Adapter  │   │ Adapter  │
└──────────┘   └──────────┘   └──────────┘
```

**You write code like this:**

```typescript
// campaigns/welcome-drip.ts
import { campaign } from '@myxelium/sdk'

export default campaign({
  id: 'welcome-drip-v2',
  triggers: ['user.signup'],

  steps: [
    {
      delay: '0h',
      channel: 'email',
      template: 'welcome_v1',
      personalize: (user) => ({
        firstName: user.profile.firstName,
        ctaUrl: `https://app.example.com/onboard?uid=${user.id}`
      })
    },
    {
      delay: '24h',
      channel: 'sms',
      condition: (user) => !user.hasOpened('welcome_v1'),
      template: 'checkin_sms',
    },
    {
      delay: '7d',
      channel: 'email',
      template: 'nurture_v2',
      abTest: { variants: ['control', 'personalized'], split: 0.5 }
    }
  ],

  compliance: {
    requireConsent: ['email', 'sms'],
    respectQuietHours: true,
    unsubscribeUrl: true
  }
})
```

**Myxelium handles:**
- ✅ Generating email HTML/plaintext and SMS copy with AI
- ✅ Scheduling jobs with delays, retries, idempotency
- ✅ Routing to configured provider (SendGrid, Resend, Twilio, etc.)
- ✅ Ingesting webhooks for delivery status
- ✅ Enforcing consent, quiet hours, rate limits
- ✅ Logging every step for observability

### Key Features (MVP → V2)

#### **Phase 1: Foundation (MVP - 3 months)**

**1.1 Campaign Definition SDK**
- TypeScript SDK for defining campaigns declaratively
- JSON schema validation
- CLI for deploying campaigns to Myxelium API

**1.2 Provider Adapters (2 initial)**
- **Email**: Resend (simple, developer-friendly)
- **SMS**: Twilio (industry standard)
- Unified interface: `EmailProvider.send()`, `SmsProvider.send()`
- Capability discovery (e.g., "supports scheduled send")

**1.3 Job Orchestration**
- Event ingestion API (webhook + SDK)
- Queue with delayed jobs (Inngest or Trigger.dev)
- Idempotency keys, deduplication
- DLQ for failed jobs, exponential backoff

**1.4 Basic AI Content Generation**
- OpenAI GPT-4 integration for email subject/body
- React Email templates with variable substitution
- Simple profanity filter, PII detection

**1.5 Observability Dashboard**
- View campaigns, jobs, deliveries
- Status tracking: queued → sent → delivered → opened
- Basic metrics: send rate, delivery rate, open rate

**1.6 Compliance Baseline**
- Consent model (email/sms opt-in)
- Unsubscribe link injection
- Quiet hours enforcement (9am-9pm local time)

#### **Phase 2: Scaling & Expansion (Months 4-9)**

**2.1 Additional Providers**
- **Email**: SendGrid, Postmark, AWS SES
- **SMS**: MessageBird, Vonage
- **CRM Sync**: GoHighLevel, HubSpot (read contacts, sync tags)

**2.2 Advanced Orchestration**
- Conditional branching (if/else based on user events)
- Event-driven triggers (not just time-based)
- Cancel/reschedule jobs when user state changes

**2.3 Enhanced AI Generation**
- Multi-language localization (detect locale, generate variants)
- A/B test variant generation
- Compliance guardrails (HIPAA, financial claims filters)
- MJML support for complex email layouts

**2.4 Template Management**
- Version control for templates (v1, v2, rollback)
- Template library (browse, fork, customize)
- Preview API for UI rendering

**2.5 Advanced Analytics**
- Per-campaign funnel analysis
- Cohort tracking (signup → onboard → activate)
- Provider health monitoring (latency, error rates)
- Cost attribution per provider

**2.6 Human-in-the-Loop**
- Approval gates for sensitive campaigns
- Diff view for template changes
- Scheduled deploys with rollback

#### **Phase 3: Enterprise & Scale (Months 10-18)**

**3.1 Multi-Tenancy**
- Workspace/organization isolation
- Per-tenant provider credentials
- White-label branding

**3.2 Advanced Compliance**
- GDPR data export/deletion APIs
- CCPA opt-out automation
- SOC 2 audit trail
- Geofenced data residency

**3.3 Performance & Scale**
- Horizontal worker scaling
- Rate limiting per provider/account
- Batch sending optimizations
- Edge deployment for global latency

**3.4 Advanced Channels**
- WhatsApp Business API
- Push notifications (APNs, FCM)
- In-app messaging
- Webhooks (trigger external systems)

**3.5 Self-Service UI**
- Web-based campaign builder (optional, for non-devs)
- Visual journey editor
- Template designer

### Differentiation Matrix

| Feature | Myxelium | Customer.io | SendGrid | Novu (OSS) |
|---------|----------|-------------|----------|------------|
| **Multi-provider** | ✅ Core value | ❌ Single stack | ❌ Email only | ⚠️ Limited |
| **Code-first** | ✅ Git-native | ⚠️ API-driven | ⚠️ API-driven | ✅ Code-first |
| **AI generation** | ✅ Built-in | ❌ No | ❌ No | ❌ No |
| **Compliance suite** | ✅ GDPR/CCPA | ✅ Enterprise tier | ⚠️ Basic | ❌ DIY |
| **Orchestration** | ✅ Event-driven | ✅ Journeys | ❌ No | ⚠️ Basic |
| **Self-hosted** | ⚠️ Future | ❌ SaaS only | ❌ SaaS only | ✅ OSS |
| **Pricing** | Usage-based | Seat + usage | Usage-based | Free (self-host) |

**Key Insight**: We occupy the **"developer infrastructure"** quadrant that doesn't exist yet - powerful orchestration + multi-provider + AI, without forcing GUI workflows.

---

## 🏗️ Architecture & Design

### High-Level System Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        USER SPACE                             │
│  ┌────────────────┐      ┌──────────────┐                    │
│  │ Campaign Code  │      │  Events API  │                    │
│  │  (Git Repo)    │──┐   │  (Webhooks)  │──┐                │
│  └────────────────┘  │   └──────────────┘  │                │
│                      │                      │                │
└──────────────────────┼──────────────────────┼────────────────┘
                       │                      │
                       ▼                      ▼
┌───────────────────────────────────────────────────────────────┐
│               MYXELIUM CONTROL PLANE (Next.js App)            │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  API Routes (Hono)                                  │     │
│  │   ├─ POST /campaigns/deploy                         │     │
│  │   ├─ POST /events/ingest                            │     │
│  │   ├─ GET /campaigns/:id/metrics                     │     │
│  │   └─ POST /templates/generate (AI)                  │     │
│  └─────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Admin UI (React)                                   │     │
│  │   ├─ Campaign dashboard                             │     │
│  │   ├─ Job queue viewer                               │     │
│  │   ├─ Provider health                                │     │
│  │   └─ Analytics                                      │     │
│  └─────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                   DATA & ORCHESTRATION LAYER                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Supabase    │  │   Inngest    │  │   OpenAI     │       │
│  │   (Postgres) │  │ (Job Queue)  │  │ (AI Content) │       │
│  │              │  │              │  │              │       │
│  │ • Campaigns  │  │ • Delayed    │  │ • Email gen  │       │
│  │ • Templates  │  │   jobs       │  │ • SMS gen    │       │
│  │ • Contacts   │  │ • Retries    │  │ • Guardrails │       │
│  │ • Deliveries │  │ • DLQ        │  │              │       │
│  │ • Events     │  │ • Idempotent │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────────────────┐
│                     PROVIDER ADAPTERS                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Resend  │  │  Twilio  │  │   GHL    │  │SendGrid  │     │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │  │ Adapter  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│       │              │              │              │         │
└───────┼──────────────┼──────────────┼──────────────┼─────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────┐
│                   EXTERNAL PROVIDERS                         │
│     Resend API    Twilio API   GHL API   SendGrid API       │
└──────────────────────────────────────────────────────────────┘
```

### Core Components

#### **1. Campaign SDK & CLI**

**Responsibility**: Define campaigns as code, validate, deploy

**Tech Stack**:
- TypeScript SDK (`@myxelium/sdk`)
- Zod for schema validation
- CLI tool (`myxelium deploy`)

**Key Patterns**:
- Builder pattern for campaign definition
- Compile-time type safety for templates/personalization
- Git hooks for pre-deploy validation

#### **2. Control Plane (Next.js + Hono)**

**Responsibility**: API for campaign management, event ingestion, UI

**Tech Stack**:
- Next.js 14+ (App Router)
- Hono for API routes (faster than native Next.js API routes)
- Supabase client for DB access
- React + shadcn/ui for admin dashboard

**Key Endpoints**:
- `POST /api/campaigns/deploy` - Deploy campaign from SDK
- `POST /api/events/ingest` - Receive user events (signup, purchase, etc.)
- `POST /api/templates/generate` - AI content generation
- `GET /api/jobs/:id/status` - Job status polling
- `POST /api/webhooks/:provider` - Receive delivery status from providers

**Design Decisions**:
- **Why Hono?** - 3x faster than Express, edge-compatible, type-safe
- **Why Next.js?** - Unified frontend + backend, Vercel deployment simplicity
- **Why Supabase?** - Postgres + realtime + auth in one, generous free tier

#### **3. Database Layer (Supabase Postgres)**

**Schema** (simplified):

```sql
-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version INTEGER NOT NULL,
  spec JSONB NOT NULL,  -- Full campaign definition
  status TEXT NOT NULL,  -- draft | active | paused | archived
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL,  -- email | sms
  engine TEXT NOT NULL,   -- react-email | mjml
  content JSONB NOT NULL,  -- Template source + metadata
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Contacts (shadow model)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,  -- ID from external CRM
  external_source TEXT,  -- 'hubspot' | 'custom' | etc.
  email TEXT,
  phone TEXT,
  locale TEXT DEFAULT 'en',
  consent_email BOOLEAN DEFAULT FALSE,
  consent_sms BOOLEAN DEFAULT FALSE,
  consent_updated_at TIMESTAMPTZ,
  attributes JSONB,  -- Flexible metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_id, external_source)
);

-- Jobs (queued work)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),
  contact_id UUID REFERENCES contacts(id),
  step_index INTEGER NOT NULL,  -- Which step in campaign
  status TEXT NOT NULL,  -- pending | running | completed | failed | cancelled
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempt INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON jobs(status, scheduled_at);
CREATE INDEX ON jobs(idempotency_key);

-- Events (user activity)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,  -- 'user.signup' | 'order.completed' | etc.
  contact_id UUID REFERENCES contacts(id),
  payload JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON events(type, occurred_at);
CREATE INDEX ON events(contact_id, occurred_at);

-- Deliveries (send records)
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  provider TEXT NOT NULL,  -- 'resend' | 'twilio' | etc.
  provider_message_id TEXT,  -- External tracking ID
  channel TEXT NOT NULL,  -- 'email' | 'sms'
  status TEXT NOT NULL,  -- sent | delivered | opened | clicked | bounced | failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,  -- Provider-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON deliveries(job_id);
CREATE INDEX ON deliveries(provider_message_id);
CREATE INDEX ON deliveries(status, sent_at);
```

**Design Decisions**:
- **Why JSONB for spec/attributes?** - Flexibility for evolving schemas, good Postgres JSONB support
- **Why shadow contacts?** - Minimal PII custody, comply with GDPR "right to be forgotten" easily
- **Why separate jobs/deliveries?** - Jobs are internal orchestration, deliveries track external provider state

#### **4. Job Orchestration (Inngest)**

**Responsibility**: Reliable, delayed, retriable job execution

**Why Inngest over alternatives?**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Inngest** | Serverless-native, visual debugger, built-in retries/DLQ, free tier | Vendor dependency | ✅ **Choose for MVP** |
| **Trigger.dev** | Similar to Inngest, good DX | Newer, smaller community | ⚠️ Alternative |
| **BullMQ** | Self-hosted, Redis-based, mature | Requires Redis management, more ops | ❌ Too much infra for MVP |
| **QStash** | Upstash serverless queue | Less orchestration features | ❌ Too basic |

**Inngest Workflow Example**:

```typescript
// inngest/send-campaign-step.ts
import { inngest } from './client'

export const sendCampaignStep = inngest.createFunction(
  {
    id: 'send-campaign-step',
    retries: 3,
    idempotency: 'event.data.jobId'
  },
  { event: 'campaign.step.trigger' },
  async ({ event, step }) => {
    const { jobId, campaignId, contactId, stepIndex } = event.data

    // 1. Resolve contact data
    const contact = await step.run('resolve-contact', async () => {
      return db.contacts.findUnique({ where: { id: contactId } })
    })

    // 2. Check consent
    await step.run('check-consent', async () => {
      if (!contact.consent_email) throw new Error('No email consent')
    })

    // 3. Generate content (AI)
    const content = await step.run('generate-content', async () => {
      return generateEmailContent(campaignId, stepIndex, contact)
    })

    // 4. Send via provider
    const delivery = await step.run('send-email', async () => {
      const provider = getEmailProvider('resend')
      return provider.send({
        to: contact.email,
        subject: content.subject,
        html: content.html,
        text: content.text
      })
    })

    // 5. Record delivery
    await step.run('record-delivery', async () => {
      return db.deliveries.create({
        data: {
          jobId,
          provider: 'resend',
          providerMessageId: delivery.id,
          channel: 'email',
          status: 'sent'
        }
      })
    })

    return { success: true, deliveryId: delivery.id }
  }
)
```

**Key Features Used**:
- `step.run()` - Automatic retries per step
- `step.sleep()` - For delayed steps (24h, 7d, etc.)
- Idempotency via `event.data.jobId`
- Dead-letter queue for failures after max retries

#### **5. Provider Adapters (Ports & Adapters Pattern)**

**Responsibility**: Unified interface to heterogeneous providers

**Interface Definition**:

```typescript
// lib/providers/types.ts
export interface EmailProvider {
  name: string
  capabilities: {
    supportsScheduling: boolean
    supportsTemplates: boolean
    supportsBatch: boolean
  }

  send(params: {
    to: string
    from: string
    subject: string
    html: string
    text: string
    headers?: Record<string, string>
    scheduledAt?: Date
  }): Promise<{
    id: string  // Provider's message ID
    status: 'queued' | 'sent'
  }>

  getStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'bounced' | 'failed'
    timestamp: Date
  }>
}

export interface SmsProvider {
  name: string
  capabilities: {
    supportsScheduling: boolean
    supportsUnicode: boolean
    maxLength: number
  }

  send(params: {
    to: string  // E.164 format
    from: string
    body: string
    scheduledAt?: Date
  }): Promise<{
    id: string
    status: 'queued' | 'sent'
  }>

  getStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'failed' | 'undelivered'
    timestamp: Date
  }>
}
```

**Example Adapter**:

```typescript
// lib/providers/email/resend.ts
import { Resend } from 'resend'
import type { EmailProvider } from '../types'

export class ResendEmailProvider implements EmailProvider {
  name = 'resend'
  capabilities = {
    supportsScheduling: true,  // Resend supports scheduledAt
    supportsTemplates: false,
    supportsBatch: true
  }

  private client: Resend

  constructor(apiKey: string) {
    this.client = new Resend(apiKey)
  }

  async send(params) {
    const result = await this.client.emails.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      html: params.html,
      text: params.text,
      scheduledAt: params.scheduledAt?.toISOString()
    })

    if (result.error) {
      throw new Error(`Resend send failed: ${result.error.message}`)
    }

    return {
      id: result.data!.id,
      status: 'queued'  // Resend queues immediately
    }
  }

  async getStatus(messageId: string) {
    const email = await this.client.emails.get(messageId)

    // Map Resend status to our standard
    const statusMap = {
      'queued': 'sent',
      'sent': 'sent',
      'delivered': 'delivered',
      'bounced': 'bounced',
      'failed': 'failed'
    }

    return {
      status: statusMap[email.status] || 'sent',
      timestamp: new Date(email.created_at)
    }
  }
}
```

**Adapter Registry**:

```typescript
// lib/providers/registry.ts
import { ResendEmailProvider } from './email/resend'
import { TwilioSmsProvider } from './sms/twilio'

export class ProviderRegistry {
  private emailProviders = new Map<string, EmailProvider>()
  private smsProviders = new Map<string, SmsProvider>()

  register(type: 'email' | 'sms', name: string, provider: any) {
    if (type === 'email') this.emailProviders.set(name, provider)
    if (type === 'sms') this.smsProviders.set(name, provider)
  }

  getEmailProvider(name: string): EmailProvider {
    const provider = this.emailProviders.get(name)
    if (!provider) throw new Error(`Email provider '${name}' not found`)
    return provider
  }

  getSmsProvider(name: string): SmsProvider {
    const provider = this.smsProviders.get(name)
    if (!provider) throw new Error(`SMS provider '${name}' not found`)
    return provider
  }
}

// Initialize from env vars
const registry = new ProviderRegistry()

if (process.env.RESEND_API_KEY) {
  registry.register('email', 'resend', new ResendEmailProvider(process.env.RESEND_API_KEY))
}

if (process.env.TWILIO_ACCOUNT_SID) {
  registry.register('sms', 'twilio', new TwilioSmsProvider({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER
  }))
}

export { registry }
```

**Design Benefits**:
- ✅ Add new providers without changing core logic
- ✅ Graceful degradation via `capabilities` check
- ✅ Easy to mock for testing
- ✅ Runtime provider selection (e.g., route US → Twilio, EU → MessageBird)

#### **6. AI Content Generation**

**Responsibility**: Generate email/SMS content with brand consistency and guardrails

**Flow**:

```typescript
// lib/ai/generate-email.ts
import OpenAI from 'openai'
import { z } from 'zod'

const EmailContentSchema = z.object({
  subject: z.string().max(78),  // RFC standard
  preheader: z.string().max(100),
  html: z.string(),
  text: z.string(),
  readingLevel: z.number().min(5).max(12),  // Flesch-Kincaid grade
})

export async function generateEmailContent({
  brief,  // "Welcome email for new users who signed up for free trial"
  persona,  // { role: "B2B SaaS founder", painPoints: [...] }
  tone,  // "friendly, professional, concise"
  brandGuidelines,  // { voice: "...", avoidWords: [...] }
  complianceRules,  // { industry: "fintech", regulations: ["GDPR"] }
  seedContent,  // Optional existing email to reference
  personalizationFields  // { firstName: string, companyName: string }
}: GenerateEmailParams): Promise<EmailContent> {

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const systemPrompt = `You are an expert email copywriter for ${complianceRules.industry} companies.

BRAND VOICE: ${brandGuidelines.voice}
TONE: ${tone}
AVOID: ${brandGuidelines.avoidWords.join(', ')}

COMPLIANCE REQUIREMENTS:
${complianceRules.regulations.includes('GDPR') ? '- Include clear unsubscribe link' : ''}
${complianceRules.regulations.includes('HIPAA') ? '- No PHI in subject line' : ''}
- Reading level: 6th-8th grade (Flesch-Kincaid)
- No profanity, discriminatory language, or unverified medical claims

OUTPUT FORMAT: JSON matching this schema:
{ "subject": "...", "preheader": "...", "html": "...", "text": "..." }`

  const userPrompt = `Generate email content:

BRIEF: ${brief}

TARGET PERSONA: ${JSON.stringify(persona, null, 2)}

PERSONALIZATION FIELDS AVAILABLE:
${Object.keys(personalizationFields).map(f => `- {{${f}}}`).join('\n')}

${seedContent ? `REFERENCE EXAMPLE:\n${seedContent}` : ''}

Generate:
1. Subject line (max 78 chars, compelling, personalized)
2. Preheader text (max 100 chars, complements subject)
3. HTML email body (responsive, use React Email components or simple HTML)
4. Plain text version (for email clients without HTML support)`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',  // Cheaper, faster for most content
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,  // Balance creativity and consistency
    response_format: { type: 'json_object' }
  })

  const rawContent = JSON.parse(response.choices[0].message.content!)

  // Validate schema
  const content = EmailContentSchema.parse(rawContent)

  // Apply guardrails
  await runGuardrails(content, complianceRules)

  return content
}

async function runGuardrails(content: EmailContent, rules: ComplianceRules) {
  // 1. Profanity check
  const hasProfanity = await checkProfanity(content.text)
  if (hasProfanity) throw new Error('Content failed profanity check')

  // 2. PII detection (SSN, credit cards, etc.)
  const hasPII = detectPII(content.html)
  if (hasPII) throw new Error('Content contains potential PII')

  // 3. Reading level
  const readingLevel = calculateFleschKincaid(content.text)
  if (readingLevel > 10) {
    console.warn(`Reading level too high: ${readingLevel}. Simplifying...`)
    // Could trigger re-generation with "simpler language" instruction
  }

  // 4. Regulated claims (e.g., "guaranteed", "cure", etc. for healthcare)
  if (rules.industry === 'healthcare') {
    const forbiddenWords = ['cure', 'guaranteed', 'miracle']
    const hasForbidden = forbiddenWords.some(w => content.text.toLowerCase().includes(w))
    if (hasForbidden) throw new Error('Content contains forbidden healthcare claims')
  }

  return true
}
```

**Design Decisions**:
- **Why GPT-4o-mini?** - 80% quality of GPT-4 at 20% cost, fast enough for real-time
- **Why JSON mode?** - Structured output, easier parsing, validation
- **Why guardrails?** - Prevent AI from generating non-compliant content (legal risk)
- **Future**: Fine-tune model on customer's past emails for better brand voice

#### **7. Compliance & Consent Engine**

**Responsibility**: Enforce GDPR/CCPA/TCPA, track consent, handle unsubscribes

**Consent Model**:

```typescript
// lib/compliance/consent.ts
export type ConsentChannel = 'email' | 'sms' | 'push' | 'whatsapp'
export type ConsentStatus = 'granted' | 'denied' | 'pending' | 'withdrawn'

export interface ConsentRecord {
  contactId: string
  channel: ConsentChannel
  status: ConsentStatus
  grantedAt?: Date
  withdrawnAt?: Date
  source: 'explicit' | 'implicit' | 'imported'  // Explicit = double opt-in
  ipAddress?: string  // For audit trail
  userAgent?: string
}

export class ConsentEngine {
  async checkConsent(contactId: string, channel: ConsentChannel): Promise<boolean> {
    const consent = await db.consents.findFirst({
      where: { contactId, channel },
      orderBy: { createdAt: 'desc' }
    })

    return consent?.status === 'granted'
  }

  async grantConsent(params: {
    contactId: string
    channel: ConsentChannel
    source: 'explicit' | 'implicit'
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    await db.consents.create({
      data: {
        ...params,
        status: 'granted',
        grantedAt: new Date()
      }
    })

    // Audit log
    await db.auditLogs.create({
      data: {
        action: 'consent.granted',
        contactId: params.contactId,
        metadata: { channel: params.channel, source: params.source }
      }
    })
  }

  async withdrawConsent(contactId: string, channel: ConsentChannel): Promise<void> {
    await db.consents.create({
      data: {
        contactId,
        channel,
        status: 'withdrawn',
        withdrawnAt: new Date()
      }
    })

    // Cancel any pending jobs for this contact/channel
    await db.jobs.updateMany({
      where: {
        contactId,
        status: 'pending',
        // Filter by channel via campaign spec lookup
      },
      data: { status: 'cancelled' }
    })

    // Audit log
    await db.auditLogs.create({
      data: {
        action: 'consent.withdrawn',
        contactId,
        metadata: { channel }
      }
    })
  }

  async handleUnsubscribe(token: string): Promise<void> {
    // Token encodes: contactId + channel + signature (HMAC)
    const { contactId, channel } = verifyUnsubscribeToken(token)
    await this.withdrawConsent(contactId, channel)
  }
}
```

**Unsubscribe Link Injection**:

```typescript
// lib/compliance/unsubscribe.ts
import crypto from 'crypto'

export function generateUnsubscribeToken(contactId: string, channel: ConsentChannel): string {
  const payload = `${contactId}:${channel}`
  const signature = crypto
    .createHmac('sha256', process.env.UNSUBSCRIBE_SECRET!)
    .update(payload)
    .digest('hex')

  const token = Buffer.from(`${payload}:${signature}`).toString('base64url')
  return token
}

export function injectUnsubscribeLink(html: string, contactId: string): string {
  const token = generateUnsubscribeToken(contactId, 'email')
  const unsubUrl = `${process.env.APP_URL}/unsubscribe?token=${token}`

  // Find closing </body> and inject footer
  const footer = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666;">
      <p>You're receiving this email because you signed up for our service.</p>
      <p><a href="${unsubUrl}" style="color: #666; text-decoration: underline;">Unsubscribe</a> |
         <a href="${process.env.APP_URL}/preferences" style="color: #666;">Manage Preferences</a></p>
      <p>Our Company Inc, 123 Main St, San Francisco, CA 94105</p>
    </div>
  `

  return html.replace('</body>', `${footer}</body>`)
}
```

**Quiet Hours Enforcement**:

```typescript
// lib/compliance/quiet-hours.ts
export function isQuietHours(contact: Contact, campaignConfig: CampaignSpec): boolean {
  if (!campaignConfig.compliance?.respectQuietHours) return false

  const timezone = contact.locale?.split('_')[1] || 'UTC'  // e.g., 'en_US' → 'US'
  const localTime = new Date().toLocaleString('en-US', { timeZone: timezone })
  const hour = new Date(localTime).getHours()

  // Default quiet hours: 9pm - 9am
  const quietStart = campaignConfig.compliance.quietHoursStart || 21
  const quietEnd = campaignConfig.compliance.quietHoursEnd || 9

  if (hour >= quietStart || hour < quietEnd) {
    return true  // It's quiet hours, don't send
  }

  return false
}

// In job executor
if (isQuietHours(contact, campaign)) {
  // Reschedule to next available time (9am local)
  const nextSendTime = calculateNextNonQuietTime(contact.timezone)
  await inngest.send({
    name: 'campaign.step.trigger',
    data: { ...jobData },
    ts: nextSendTime.getTime()
  })
  return { rescheduled: true, nextSendTime }
}
```

---

## 📊 Business Model & Go-to-Market

### Revenue Model

**Hybrid: Usage-Based + Feature Tiers**

#### Pricing Tiers

**Free Tier (Hobbyist)**
- **Price**: $0/month
- **Includes**:
  - 1,000 messages/month (combined email + SMS)
  - 2 campaigns
  - 1 user
  - Basic providers (Resend, Twilio)
  - Community support
- **Target**: Solo developers, side projects, POCs

**Starter Tier**
- **Price**: $49/month + usage
- **Includes**:
  - 10,000 included messages/month
  - Unlimited campaigns
  - 3 users
  - All providers
  - Email support
  - Basic analytics
- **Overage**: $5 per 1,000 additional messages
- **Target**: Startups, small SaaS companies

**Pro Tier**
- **Price**: $199/month + usage
- **Includes**:
  - 50,000 included messages/month
  - Unlimited users
  - Advanced analytics & reporting
  - A/B testing
  - Priority email + Slack support
  - Custom provider adapters (request)
- **Overage**: $4 per 1,000 additional messages
- **Target**: Growth-stage companies, agencies

**Enterprise Tier**
- **Price**: Custom (starts ~$999/month)
- **Includes**:
  - Volume discounts on messages
  - Multi-tenant/white-label
  - SSO (SAML)
  - SOC 2 compliance
  - Dedicated account manager
  - SLA (99.9% uptime)
  - Self-hosted option (future)
- **Target**: Large enterprises, agencies with 50+ clients

#### Unit Economics (Projected)

**Assumptions**:
- Average customer: Pro tier ($199/mo + 75K msgs/mo overage = $299/mo total)
- Cost of goods sold (COGS):
  - Provider fees: ~$0.001/email (Resend), ~$0.0075/SMS (Twilio)
  - Infrastructure: ~$50/mo per customer (Vercel, Supabase, Inngest)
  - AI generation: ~$0.0001/message (OpenAI)
- Average: 60% email, 40% SMS = ~$0.0034/message blended COGS

**Monthly P&L per Pro Customer**:
- Revenue: $299
- Provider costs: $255 (75K msgs × $0.0034)
- Infrastructure: $50
- **Gross margin**: -$6 ❌ → **Need to optimize**

**Optimization Paths**:
1. **Increase prices**: $6/1K messages instead of $4 (75% gross margin)
2. **Bulk provider discounts**: Negotiate <$0.005/SMS at scale
3. **Customer mix**: More email-heavy customers (better margins)
4. **AI optimization**: Cache generated content, reduce API calls

**Revised Target Economics**:
- Revenue: $299/mo
- COGS: $150/mo (50% margin)
- **Gross profit**: $149/mo
- CAC target: <$450 (3-month payback)
- LTV:CAC target: >3:1

### Market Analysis

#### Total Addressable Market (TAM)

**Email Marketing Software**: $1.5B (2024) → $2.8B (2028) - 17% CAGR

**SMS Marketing**: $12B (2024) → $28B (2028) - 24% CAGR

**Marketing Automation Platforms**: $8.4B (2024) → $14.5B (2028) - 15% CAGR

**Serviceable Addressable Market (SAM)**:
- Developer-friendly tools segment: ~15% of TAM = **$3.3B** (2024)
- Multi-channel orchestration buyers: ~40% of SAM = **$1.3B**

**Serviceable Obtainable Market (SOM)**:
- Year 1 target: 0.01% of SOM = **$130K ARR** (realistic with 10-20 customers)
- Year 3 target: 0.1% of SOM = **$1.3M ARR** (100-150 customers)

#### Competitive Landscape

**Direct Competitors**:
1. **Customer.io** ($100M ARR, 2023)
   - Strength: Mature product, strong brand
   - Weakness: Single-stack (their infrastructure), expensive (starts $100/mo)
   - Our advantage: Multi-provider, code-first, cheaper

2. **Iterable** (Acquired for $1B, 2022)
   - Strength: Enterprise-grade, AI features
   - Weakness: Complex, sales-driven, not developer-friendly
   - Our advantage: Self-serve, simpler, faster time-to-value

3. **Braze** (Public, $246M revenue, 2023)
   - Strength: Mobile-first, real-time
   - Weakness: Very expensive (enterprise only), steep learning curve
   - Our advantage: Affordable, easier onboarding

**Indirect Competitors** (Delivery-only):
1. **SendGrid/Twilio** (Twilio: $3.8B revenue, 2023)
   - Strength: Massive scale, reliability
   - Weakness: No orchestration, requires custom dev work
   - Our positioning: "Built on top of SendGrid/Twilio, adds orchestration"

2. **Resend** (~$5M ARR estimated, 2024)
   - Strength: Developer love, great DX
   - Weakness: Email-only, no campaigns
   - Our positioning: "Resend for multi-channel campaigns"

**Open-Source Alternatives**:
1. **Novu** (20K+ GitHub stars, $6.6M raised)
   - Strength: Free, extensible
   - Weakness: Notification-focused (transactional), not campaign-oriented
   - Our advantage: Campaign workflows, AI content, compliance built-in

2. **Knock** ($12M raised)
   - Strength: Good developer experience
   - Weakness: Notification-centric, limited multi-provider
   - Our advantage: Full campaign lifecycle, more providers

#### Competitive Moat Strategy

**Primary Moat: Developer Experience**
- "Stripe-like DX" - beautiful docs, quick start in <5 min, no sales calls
- Open-source SDK, community-driven adapters
- Git-native workflow (existing tools: Git, CI/CD, testing frameworks)

**Secondary Moat: Provider Ecosystem**
- First to deeply integrate 10+ providers with capability negotiation
- Community-contributed adapters (GitHub PRs welcome)
- Provider-agnostic pricing (no incentive to lock-in)

**Tertiary Moat: Compliance-by-Default**
- GDPR/CCPA compliance out-of-the-box (competitors charge extra)
- Audit trails, consent management, data residency options
- Appeal to regulated industries (fintech, healthcare, legal)

### Go-to-Market Strategy

#### Phase 1: Developer Community (Months 1-6)

**Target**: 100 signups, 10 active campaigns

**Channels**:
1. **Product Hunt launch** - Aim for #1 Product of the Day
2. **Dev community presence**:
   - Post on Hacker News (Show HN: Myxelium)
   - Reddit: r/webdev, r/SaaS, r/entrepreneur
   - Dev.to, Hashnode blog posts
3. **Open-source strategy**:
   - SDK on GitHub with MIT license
   - Adapter framework open-sourced
   - "Community adapters" repo
4. **Content marketing**:
   - "Build a drip campaign in 10 minutes" tutorial
   - "How we handle 1M emails/day" architecture post
   - "GDPR compliance for developers" guide

**Pricing**: Free tier only, gather feedback

#### Phase 2: Product-Led Growth (Months 7-12)

**Target**: 500 signups, 50 paying customers ($25K MRR)

**Channels**:
1. **SEO & Content**:
   - "Best [Provider] alternatives for developers"
   - "How to migrate from Customer.io to code-first campaigns"
   - Comparison pages (vs. Customer.io, vs. Iterable, vs. Braze)
2. **Integration marketplace**:
   - Zapier integration (trigger campaigns from 5000+ apps)
   - Segment integration (ingest events)
   - Listed in provider marketplaces (Resend, Twilio)
3. **Developer advocacy**:
   - Conference talks (React Summit, Node Congress)
   - Podcast appearances (Syntax.fm, JS Party)
   - YouTube tutorials (Fireship, Web Dev Simplified collabs)
4. **Referral program**:
   - Give $50 credit, get $50 credit
   - Agency partner program (20% revenue share)

**Pricing**: Launch Starter ($49) and Pro ($199) tiers

#### Phase 3: Enterprise & Scale (Months 13-24)

**Target**: 2000 signups, 200 paying ($150K MRR)

**Channels**:
1. **Outbound sales** (for Enterprise tier):
   - Target: Series A-C startups with >50 employees
   - Agencies managing 10+ clients
   - Fintech/healthcare companies needing compliance
2. **Partnerships**:
   - Co-marketing with Resend, Supabase, Vercel
   - Integration with CRMs (HubSpot, Salesforce "app exchange")
   - Agency white-label program
3. **Community building**:
   - Annual user conference (virtual)
   - "Myxelium Champions" program (power users)
   - Case studies & testimonials
4. **PR & Media**:
   - TechCrunch, VentureBeat coverage
   - Industry reports (Gartner mentions, G2 reviews)

**Pricing**: Launch Enterprise tier, custom contracts

---

## 🚀 Implementation Roadmap

### MVP Scope (Months 1-3)

**Goal**: Ship the simplest version that delivers core value - "send a code-defined campaign via 2 providers"

#### Month 1: Foundation

**Week 1-2: Database & Auth**
- [ ] Supabase project setup (Postgres DB, Auth, Storage)
- [ ] Schema design & migrations (campaigns, templates, contacts, jobs, deliveries)
- [ ] Seed data for development
- [ ] Auth flows (magic link, OAuth)

**Week 3-4: Campaign SDK**
- [ ] TypeScript SDK scaffolding (`@myxelium/sdk`)
- [ ] Campaign definition types & Zod schemas
- [ ] CLI tool (`myxelium init`, `myxelium deploy`)
- [ ] Example campaign templates

**Deliverable**: Developer can define a campaign locally and validate schema

#### Month 2: Orchestration Core

**Week 5-6: API & Job Queue**
- [ ] Next.js app setup (App Router, Hono routes)
- [ ] API endpoints: `/api/campaigns/deploy`, `/api/events/ingest`
- [ ] Inngest setup (event schemas, retry policies)
- [ ] Job creation logic (event → campaign match → enqueue steps)

**Week 7-8: Provider Adapters**
- [ ] Email provider interface
- [ ] Resend adapter implementation
- [ ] SMS provider interface
- [ ] Twilio adapter implementation
- [ ] Provider registry pattern

**Deliverable**: End-to-end flow - ingest event → queue job → send via Resend/Twilio

#### Month 3: AI & UI

**Week 9-10: AI Content Generation**
- [ ] OpenAI integration (GPT-4o-mini)
- [ ] Email generation prompts & schemas
- [ ] SMS generation (character limits, tone)
- [ ] Basic guardrails (profanity, PII)
- [ ] Template versioning

**Week 11-12: Admin Dashboard**
- [ ] UI layout (shadcn/ui components)
- [ ] Campaign list & detail views
- [ ] Job queue viewer (status, retries, errors)
- [ ] Basic analytics (send rate, delivery rate)
- [ ] Provider health status

**Deliverable**: Full MVP - define campaign → AI generates content → schedules send → observes results

**MVP Success Criteria**:
- [ ] 5 internal test campaigns running successfully
- [ ] 10 external beta users onboarded
- [ ] <5 second event-to-job-enqueue latency
- [ ] 99% job completion rate (excluding provider failures)
- [ ] Documentation: quickstart guide, API reference

---

### V1 Expansion (Months 4-6)

**Goal**: Add critical features for product-market fit - more providers, better analytics, compliance

#### Month 4: Provider Expansion

**Week 13-14: Additional Email Providers**
- [ ] SendGrid adapter
- [ ] Postmark adapter
- [ ] AWS SES adapter
- [ ] Provider capability negotiation (scheduling, templates)

**Week 15-16: Additional SMS Providers**
- [ ] MessageBird adapter
- [ ] Vonage adapter
- [ ] SMS character encoding (unicode, GSM-7)
- [ ] Cost estimation per provider

**Deliverable**: Support 6 providers, automatic routing based on region/cost

#### Month 5: Advanced Orchestration

**Week 17-18: Conditional Logic**
- [ ] Event-based branching (if opened → path A, else → path B)
- [ ] User attribute conditions (if segment = 'enterprise' → custom content)
- [ ] Time windows (only send M-F 9am-5pm)
- [ ] Cancel/reschedule on user state change

**Week 19-20: Template Engine**
- [ ] React Email integration (`.tsx` templates)
- [ ] MJML support (drag-drop editors → MJML → HTML)
- [ ] Variable substitution (`{{firstName}}`, `{{ctaUrl}}`)
- [ ] Preview API (render with test data)

**Deliverable**: Complex campaigns with branching logic and rich templates

#### Month 6: Compliance & Analytics

**Week 21-22: Compliance Suite**
- [ ] Consent management (double opt-in flow)
- [ ] Unsubscribe token generation & handling
- [ ] Quiet hours enforcement with timezone detection
- [ ] GDPR data export API (`GET /contacts/:id/data`)
- [ ] GDPR deletion API (`DELETE /contacts/:id`)

**Week 23-24: Analytics Dashboard**
- [ ] Campaign funnel visualization (sent → delivered → opened → clicked)
- [ ] Cohort analysis (signup cohort → campaign engagement)
- [ ] A/B test results (variant performance)
- [ ] Provider cost tracking (per campaign, per month)
- [ ] Export to CSV, Google Sheets

**Deliverable**: Production-ready compliance and actionable analytics

**V1 Success Criteria**:
- [ ] 50 active campaigns across beta users
- [ ] 500K messages delivered (mix of email/SMS)
- [ ] <10 support tickets per week
- [ ] NPS > 50 from beta users
- [ ] 5 case studies/testimonials

---

### V2 Scale & Enterprise (Months 7-12)

**Goal**: Scale to 100+ customers, enable enterprise use cases

#### Month 7-8: Multi-Tenancy

- [ ] Workspace/organization model
- [ ] Per-workspace provider credentials (KMS encryption)
- [ ] User roles & permissions (admin, editor, viewer)
- [ ] White-label dashboard (custom branding)
- [ ] Billing per workspace

#### Month 9-10: Advanced Features

- [ ] GoHighLevel CRM sync (read contacts, update tags)
- [ ] HubSpot integration (bidirectional contact sync)
- [ ] Webhook actions (trigger external APIs in campaign flow)
- [ ] SMS keyword responses (auto-reply to STOP/START/HELP)
- [ ] Localization (detect locale, generate translated content)

#### Month 11-12: Enterprise & Optimization

- [ ] SOC 2 Type I audit (security, availability)
- [ ] SSO (SAML 2.0, Okta, Google Workspace)
- [ ] Data residency options (US, EU regions)
- [ ] Horizontal scaling (worker fleet autoscaling)
- [ ] Provider rate limit handling (queue throttling)
- [ ] Self-hosted deployment guides (Docker, K8s)

**V2 Success Criteria**:
- [ ] 100 paying customers
- [ ] $50K MRR
- [ ] 99.9% uptime (measured)
- [ ] <1 hour mean time to resolution (support)
- [ ] Featured in 3+ industry publications

---

## ⚠️ Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|-------------------|
| **Provider API changes break adapters** | High | Medium | - Version adapters per provider API version<br>- Automated integration tests daily<br>- Monitor provider changelogs<br>- Graceful degradation if API unavailable |
| **Job queue reliability issues** | Critical | Low | - Use battle-tested queue (Inngest)<br>- Implement DLQ + manual replay<br>- Idempotency keys prevent duplicates<br>- Monitor queue depth, alert on backlog |
| **AI-generated content violates compliance** | High | Medium | - Multi-layer guardrails (profanity, PII, claims)<br>- Human-in-the-loop for first 100 campaigns<br>- Customer review/approve gates (optional)<br>- Legal review of prompts |
| **Database performance at scale** | Medium | Medium | - Index optimization (jobs by status/scheduled_at)<br>- Partition large tables (deliveries by month)<br>- Read replicas for analytics<br>- Cache frequently accessed data (campaigns, templates) |
| **Webhook ingestion overwhelms API** | Medium | Low | - Rate limiting per provider<br>- Async processing (queue webhook → background job)<br>- Dedicated webhook endpoints (not main API) |
| **Multi-provider delivery ordering issues** | Low | Medium | - Don't guarantee cross-provider ordering<br>- Document limitation clearly<br>- Future: "send gates" (wait for email delivery before SMS) |

### Business Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|-------------------|
| **Low demand (wrong market)** | Critical | Medium | - Validate with 50 beta users before launch<br>- Pivot to most-requested use case<br>- Offer free migration from competitors (land-and-expand) |
| **Can't compete with incumbents' pricing** | High | Medium | - Focus on developer segment (underserved)<br>- Emphasize multi-provider savings (negotiate bulk rates)<br>- Bundle value (AI, compliance) not just delivery |
| **Churn due to complexity** | High | Low | - Invest heavily in docs, examples, templates<br>- Offer white-glove onboarding (first 20 customers)<br>- Simplify SDK (opinionated defaults) |
| **Unit economics don't work** | Critical | Medium | - Negotiate provider volume discounts at 1M msgs/mo<br>- Increase prices iteratively (test willingness to pay)<br>- Upsell higher-margin features (white-label, custom adapters) |
| **Large competitor copies features** | Medium | High | - Build strong community (harder to replicate)<br>- Iterate faster (weekly releases vs. quarterly)<br>- Open-source SDK (ecosystem lock-in) |

### Operational Risks

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|-------------------|
| **Key provider shuts down API access** | High | Low | - Support 3+ providers per channel (redundancy)<br>- Monitor provider health, news<br>- Diversify revenue (not dependent on 1 provider partnership) |
| **GDPR/CCPA non-compliance lawsuit** | Critical | Low | - Legal review of consent flows before launch<br>- SOC 2 audit by Month 12<br>- Cyber insurance ($2M coverage)<br>- Regular penetration testing |
| **Solo founder burnout** | High | Medium | - Hire contractor for non-core work (design, docs)<br>- Join founder support group (YC, Indie Hackers)<br>- Time-box scope (ruthless prioritization)<br>- Build in public (accountability + motivation) |
| **Hosting costs spiral** | Medium | Medium | - Set Vercel, Supabase spend limits<br>- Monitor per-customer infra costs weekly<br>- Migrate heavy workloads to cheaper providers if needed (e.g., Railway, Fly.io) |

---

## 📈 Success Metrics & KPIs

### Product Metrics (North Star: Messages Delivered)

**Leading Indicators**:
- **Signups**: 100 (Month 3) → 500 (Month 6) → 2000 (Month 12)
- **Activation rate**: >60% (defined as: deployed first campaign within 7 days)
- **Time to first campaign**: <2 hours (median)

**Usage Metrics**:
- **Active campaigns**: 10 (Month 3) → 100 (Month 6) → 500 (Month 12)
- **Messages delivered**: 50K (Month 3) → 1M (Month 6) → 10M (Month 12)
- **Jobs processed**: 100K (Month 3) → 2M (Month 6) → 20M (Month 12)

**Quality Metrics**:
- **Job success rate**: >99% (excluding provider failures)
- **P95 event-to-send latency**: <30 seconds
- **Provider uptime**: 99.9% (SLA with customers)

### Business Metrics (North Star: MRR)

**Revenue**:
- **MRR**: $0 (Month 3, free beta) → $5K (Month 6) → $50K (Month 12)
- **ARR**: $60K (Month 12) → $600K (Month 24, goal)

**Growth**:
- **MRR growth rate**: 20%+ month-over-month
- **Customer count**: 10 paying (Month 6) → 100 (Month 12) → 300 (Month 24)
- **ARPU**: $500/mo (target, Pro tier customers)

**Retention**:
- **Gross revenue retention**: >90% (low churn)
- **Net revenue retention**: >110% (expansion via usage growth)
- **Churn rate**: <5% monthly

**Efficiency**:
- **CAC**: <$300 (mostly self-serve, product-led)
- **CAC payback period**: <3 months
- **LTV:CAC ratio**: >3:1
- **Gross margin**: >60% (after COGS optimization)

### Customer Health Metrics

**Engagement**:
- **WAU/MAU ratio**: >0.6 (sticky product)
- **Campaigns per customer**: >5 (power users)
- **Messages per campaign**: >1000 (meaningful volume)

**Satisfaction**:
- **NPS**: >50 (promoters - detractors)
- **CSAT**: >4.5/5 (post-support interaction)
- **G2/Capterra rating**: >4.7/5

**Support**:
- **Time to first response**: <4 hours (business days)
- **Time to resolution**: <24 hours (P1), <7 days (P2/P3)
- **Support ticket volume**: <5% of customers/month (low-touch product)

---

## ❓ Open Questions & Decisions

### Strategic Decisions Pending

#### **Decision 1: Data Architecture - Shadow Contact Model**

**Options**:
- **A) Minimal Shadow** (contact ID + consent only, resolve from CRM at send-time)
- **B) Rich Shadow** (full profile cache, bidirectional sync)
- **C) Hybrid** (start minimal, optionally enable caching per customer)

**Trade-offs**:
| Dimension | Minimal (A) | Rich (B) | Hybrid (C) |
|-----------|-------------|----------|------------|
| Privacy compliance | ✅ Easiest | ⚠️ Complex | ⚠️ Moderate |
| Send performance | ❌ Slow (external lookup) | ✅ Fast (local) | ⚠️ Depends |
| Personalization richness | ⚠️ Limited | ✅ Full | ⚠️ Flexible |
| Sync complexity | ✅ None | ❌ High | ⚠️ Optional |
| Storage costs | ✅ Low | ❌ High | ⚠️ Variable |

**Recommendation**: Start with **Option A** (minimal), offer **Option C** (caching) as paid add-on for high-volume customers.

**Validation needed**: Survey beta users - "Would you pay 20% more for cached contacts and 10x faster sends?"

---

#### **Decision 2: Scheduling Backbone**

**Options**:
- **A) Inngest** (serverless, visual debugger, generous free tier)
- **B) Trigger.dev** (similar to Inngest, newer)
- **C) BullMQ** (self-hosted, Redis-based, full control)
- **D) QStash** (Upstash serverless queue, simpler)

**Trade-offs**:
| Dimension | Inngest (A) | Trigger.dev (B) | BullMQ (C) | QStash (D) |
|-----------|-------------|-----------------|------------|------------|
| Ease of use | ✅ Excellent | ✅ Excellent | ⚠️ Moderate | ✅ Simple |
| Orchestration features | ✅ Rich (steps, delays, retries) | ✅ Rich | ⚠️ Basic | ❌ Very basic |
| Cost (10M jobs/mo) | ~$200/mo | ~$200/mo | ~$50/mo (Redis) | ~$100/mo |
| Vendor lock-in | ⚠️ Medium | ⚠️ Medium | ✅ None | ⚠️ Medium |
| Debuggability | ✅ Excellent UI | ✅ Good UI | ⚠️ CLI/logs | ⚠️ Limited |

**Recommendation**: **Option A (Inngest)** for MVP. Developer experience and built-in reliability features outweigh vendor risk. Migrate to BullMQ if cost becomes prohibitive (>$500/mo) or need full control.

**Validation needed**: Prototype 100K job workflow in Inngest, measure cost and performance.

---

#### **Decision 3: Template Storage**

**Options**:
- **A) Git Repo Only** (templates live in customer's code, deployed with campaigns)
- **B) Database + API** (templates stored in DB, versioned, editable via UI)
- **C) Hybrid** (templates in Git, DB stores compiled versions for preview)

**Trade-offs**:
| Dimension | Git Only (A) | Database (B) | Hybrid (C) |
|-----------|--------------|--------------|------------|
| Version control | ✅ Native Git | ⚠️ Custom versioning | ✅ Best of both |
| Non-dev accessibility | ❌ Requires Git knowledge | ✅ UI-editable | ⚠️ Some Git needed |
| Preview/testing | ⚠️ Local only | ✅ Live preview API | ✅ Live preview |
| Deployment speed | ✅ Fast (just code) | ⚠️ API calls | ⚠️ Moderate |
| Audit trail | ✅ Git history | ⚠️ Custom logs | ✅ Git + DB logs |

**Recommendation**: **Option C (Hybrid)** - Templates defined in Git (`.tsx` React Email files), compiled versions cached in DB for preview API. Balances developer workflow with non-dev usability.

**Implementation**:
- Campaign deploys include `templates/` directory
- Build step compiles React Email → HTML
- Store compiled HTML in DB with version reference to Git SHA
- Preview API serves from DB cache

---

#### **Decision 4: Branching Logic Representation**

**Options**:
- **A) State Machine** (declarative YAML/JSON states with transitions)
- **B) Conditional Steps** (imperative TypeScript with `if`/`else`)
- **C) Rules Engine** (event-sourced rules with pattern matching)

**Trade-offs**:
| Dimension | State Machine (A) | Conditional Steps (B) | Rules Engine (C) |
|-----------|-------------------|----------------------|------------------|
| Ease of learning | ⚠️ Moderate | ✅ Familiar (JS) | ❌ Steep |
| Visual tooling | ✅ Possible | ❌ Hard | ⚠️ Complex |
| Flexibility | ⚠️ Limited | ✅ Full power | ✅ Very flexible |
| Testing | ✅ Easy (state tests) | ⚠️ Harder (mocking) | ⚠️ Complex |
| Performance | ✅ Fast | ✅ Fast | ⚠️ Slower (rule eval) |
| Debugging | ✅ Clear state transitions | ⚠️ Trace execution | ✅ Audit log replay |

**Recommendation**: **Option B (Conditional Steps)** for MVP, with hooks for future state machine visualization. Example:

```typescript
campaign({
  steps: [
    send('welcome_email'),

    branch({
      condition: (user) => user.hasOpened('welcome_email'),
      ifTrue: [
        delay('24h'),
        send('engaged_followup')
      ],
      ifFalse: [
        delay('48h'),
        send('re_engagement_sms')
      ]
    }),

    delay('7d'),
    send('nurture_v2')
  ]
})
```

Later, build UI that visualizes this as a flowchart (parse AST, render nodes/edges).

**Validation needed**: User testing - can developers understand branching syntax in <5 min?

---

### Research Questions

#### **Q1: Provider Adapter Governance**

**Question**: Should we accept community-contributed provider adapters? If yes, how do we ensure quality/security?

**Research needed**:
- Study Terraform provider model (community + official)
- Interview 5 potential contributors (would they submit PRs?)
- Define certification criteria (tests, docs, maintenance)

**Decision timeline**: Month 4 (before opening adapter contributions)

---

#### **Q2: Pricing Sensitivity**

**Question**: What's the willingness-to-pay for each tier? Are customers price-sensitive to overage rates?

**Research needed**:
- Van Westendorp Price Sensitivity Meter (survey 50+ beta users)
- A/B test pricing page variants (3 price points)
- Competitor pricing analysis (what do they charge for similar volume?)

**Decision timeline**: Month 5 (before public launch)

---

#### **Q3: Self-Hosted Demand**

**Question**: Is there enough demand for self-hosted deployment to justify the effort?

**Research needed**:
- Survey: "Would you self-host if available?" (target: enterprises, regulated industries)
- Estimate TAM for self-hosted (e.g., healthcare orgs with HIPAA constraints)
- Assess effort: Docker → K8s → Terraform modules (3-6 months work)

**Decision timeline**: Month 9 (decide if V2 includes self-hosted)

---

#### **Q4: International Expansion**

**Question**: Which international markets should we target first? (EU, APAC, LATAM)

**Research needed**:
- Analyze provider coverage by region (e.g., MessageBird strong in EU, Twilio global)
- Survey demand in non-US markets (can we support non-English campaigns?)
- Regulatory requirements (GDPR, Brazil LGPD, India DPDP)

**Decision timeline**: Month 10 (plan for Year 2 expansion)

---

## 📚 Appendices & References

### A. Technology Stack Summary

**Frontend**:
- Next.js 15 (App Router)
- React 19
- TypeScript 5.7
- Tailwind CSS + shadcn/ui
- Recharts (analytics visualizations)

**Backend**:
- Next.js API Routes (Hono framework)
- Supabase (Postgres, Auth, Storage)
- Inngest (job orchestration)
- OpenAI API (GPT-4o-mini for content generation)

**Infrastructure**:
- Vercel (hosting, edge functions, CDN)
- Supabase Cloud (database, realtime)
- Inngest Cloud (job queue)
- GitHub Actions (CI/CD)

**Providers (MVP)**:
- Resend (email)
- Twilio (SMS)

**Monitoring**:
- Sentry (error tracking)
- Vercel Analytics (web vitals)
- Supabase Logs (database queries)
- Inngest Dashboard (job health)

### B. Inspirations & Case Studies

**Products with Similar DNA**:
1. **Stripe** - Infrastructure for payments, developer-first, great docs
2. **Vercel** - Infrastructure for hosting, Git-native, instant deploys
3. **Supabase** - Open-source alternative to Firebase, Postgres-backed
4. **Resend** - Email for developers, React Email templates

**Relevant Acquisitions**:
- Twilio acquires SendGrid ($3B, 2019) - Consolidation of email + SMS
- Salesforce acquires Slack ($27.7B, 2021) - Integration with CRM
- Customer.io raises $58M Series B (2021) - Validates market demand

**Design Patterns**:
- **Ports & Adapters** (Hexagonal Architecture) - For provider abstraction
- **Event Sourcing** - For audit trails, replay, time-travel debugging
- **Saga Pattern** - For multi-step orchestration with compensation (rollbacks)

### C. Glossary

- **CRM**: Customer Relationship Management (e.g., HubSpot, Salesforce)
- **EMS**: Email Marketing Service (e.g., Mailchimp, SendGrid)
- **DLQ**: Dead-Letter Queue (failed jobs for manual review)
- **Idempotency**: Ability to retry operations safely without duplicates
- **Drip Campaign**: Series of automated messages sent over time
- **Shadow Contact**: Lightweight contact record mirroring external CRM
- **Quiet Hours**: Time windows when messages shouldn't be sent (e.g., nighttime)
- **React Email**: Framework for building emails with React components
- **MJML**: Markup language for responsive emails

---

## 🔄 Revision History

| Date | Version | Changes | Rationale |
|------|---------|---------|-----------|
| 2025-09-30 | 0.1.0 | Initial strategic plan created | Based on comprehensive project brief |

---

## 🎯 Next Steps for Refinement

Based on this plan, here are the **highest-priority areas to explore next**:

### 1. **Validate Core Assumptions** (Week 1)
- [ ] Interview 10 potential users (developers, agencies, marketers)
- [ ] Key questions: "How do you manage campaigns today? What's broken? Would you pay $49/mo for this?"
- [ ] Document insights, refine personas

### 2. **Technical Prototype** (Week 2-3)
- [ ] Build "hello world" campaign: Event → Inngest job → Resend send
- [ ] Validate: <30 sec latency, idempotent retries work
- [ ] Document: Architecture decisions, performance benchmarks

### 3. **Pricing Validation** (Week 4)
- [ ] Create pricing page mockups (3 variants: $39/$49/$59 starter tier)
- [ ] A/B test with 100 landing page visitors
- [ ] Survey beta list: "What would you pay for this?"

### 4. **Competitive Deep-Dive** (Week 4)
- [ ] Sign up for Customer.io, Iterable trials
- [ ] Document: What do they do well? What's missing?
- [ ] Identify: Top 3 features we MUST have to compete

### 5. **Refine Roadmap** (Week 5)
- [ ] Based on interviews, adjust MVP scope (add/remove features)
- [ ] Sequence features by: must-have → nice-to-have → future
- [ ] Set OKRs for Month 3 MVP launch

---

## 💬 Let's Discuss

I've created a comprehensive strategic plan covering:
✅ Problem-solution fit with market validation
✅ Detailed architecture with technology choices
✅ Business model and competitive analysis
✅ 12-month implementation roadmap
✅ Risk assessment and mitigation
✅ Open decisions needing validation

**What would you like to explore deeper?**

Options:
1. **Refine a specific section** (e.g., "Let's detail the AI content generation prompts")
2. **Challenge an assumption** (e.g., "What if we focus on agencies instead of developers?")
3. **Solve an open question** (e.g., "How should we model branching logic?")
4. **Dive into implementation** (e.g., "Show me the campaign SDK API design")
5. **Explore alternatives** (e.g., "What if we build this as open-source first?")

What resonates most? What needs more clarity? 🚀
