# Myxelium - AI-Powered Event Funnel Automation Platform
## Vision & Architecture Document

**Version:** 2.0.0
**Date:** 2025-10-01
**Product Type:** SaaS Platform
**Target Market:** Coaches, Educators, Small Businesses (Educational Offer Funnels)
**Audience:** Investors, Engineering Leadership, Product Team, Prospective Customers

---

## Executive Summary

Myxelium is an **AI-powered event funnel automation platform** that enables coaches, educators, and small businesses to create **personalized, brand-consistent funnels** on-the-fly without manual CRM configuration. Each lead receives **unique, AI-generated content** timed dynamically based on when they registered relative to the event.

**The Problem:** Existing CRM/EMS tools (HubSpot, GoHighLevel, ActiveCampaign) force manual workflow configuration for every event funnel. When someone registers 2 days before a webinar, they receive a 7-day campaign that sends emails AFTER the event ends. Content is generic, not brand-aligned, and requires hours of copywriting per funnel.

**The Solution:** AI agents generate custom funnels with:
- **Adaptive timing**: 7-day campaign auto-compresses to 2-day when registration is 48h from event
- **AI-generated content**: Brand-consistent emails/SMS pulled from vector knowledge base (no hallucination)
- **Behavioral branching**: Attended vs. no-show paths; poll responses trigger personalized follow-ups
- **CRM/EMS agnostic**: Works with any event platform (Zoom, GoToWebinar, in-person events)

**Current State:** Backend MVP operational (428 tests, 96.3% coverage). Supports webinars, in-person workshops, online courses, masterclasses.

**Next 90 Days:** Production-ready SaaS launch with adaptive timing, authentication, and multi-tenant architecture.

---

## Vision (Why & What)

### Problem & Stakes

1. **Manual funnel setup takes days per event**
   Evidence: HubSpot users report 6-12 hours to configure workflows for a single webinar. No CRM handles variable timing—when users register 2 days before event but 7-day campaign is configured, emails send AFTER event ends (40% waste rate for last-minute registrations).

2. **Generic content destroys conversion**
   Evidence: AI page builders (Lovable, Framer AI) hallucinate content that contradicts brand voice. Coaches spend 3-4 hours writing custom copy per funnel. Industry avg conversion: 2-5% registration→purchase.

3. **Post-event sequences ignore behavior**
   Evidence: No CRM automatically creates different paths for attendees vs. no-shows. Webinar poll responses ("Yes, I'm interested in coaching") never trigger targeted follow-ups. Qualified leads go uncontacted.

### Users & Jobs-to-be-Done

- **Primary: Solo Coaches & Educators (1-3 person teams)**
  Job: Launch high-converting event funnels in <1 hour (not days), using my brand voice and existing content library, achieving >8% conversion vs. industry 2-5%

- **Secondary: Marketing Agencies (serving coaches/educators)**
  Job: Deploy client funnels rapidly without custom copywriting, maintaining brand consistency across 10+ clients

- **Tertiary: Course Creators & Membership Platforms**
  Job: Automate event-based onboarding sequences (welcome webinars, challenges, masterclasses) with personalized timing for each cohort

### Product Thesis

**For** coaches, educators, and small businesses who launch educational offer funnels (webinars, workshops, challenges),
**Myxelium** is an AI-powered event automation platform that generates personalized, brand-consistent campaigns with adaptive timing,
**By** using vector knowledge bases, AI agents, and behavioral triggers—
**Unlike** HubSpot/GoHighLevel which require manual workflow setup and lack content intelligence.

### Before/After Scenarios

**Before (Current State with Traditional CRM):**
- Coach spends 8 hours setting up HubSpot workflow for webinar
- User registers 2 days before event; receives 7-day sequence that extends 5 days AFTER webinar
- Generic "Join our webinar" emails (not brand voice)
- Attendee and no-show both get identical "Thanks for attending" email
- No follow-up on poll responses
- **Conversion: 3.2%** (industry average)
- **Time-to-launch: 2 days**

**After (With Myxelium):**

**Measurable Deltas:**
- **Funnel setup time:** 8 hours → 45 minutes (AI agent builds funnel from event description)
- **Campaign timing accuracy:** 40% post-event emails → 100% pre-event (adaptive compression: 7-day → 2-day when needed)
- **Content quality:** Generic → Brand-consistent (pulled from vector knowledge base, zero hallucination)
- **Conversion rate:** 3.2% → 8-12% (personalized paths + behavioral triggers)
- **Cost per funnel:** $120/hour × 8h = $960 → $29/month subscription

### Scope: Now vs. Not Now

**v2.0 - NOW (Production SaaS Launch)**
- ✅ Event enrollment API (CRM-agnostic: Zoom, GoToWebinar, in-person, virtual)
- ✅ Pre-event drip campaigns (welcome, reminders with adaptive timing)
- ✅ Post-event behavioral branching (attended vs. no-show paths)
- ✅ Multi-channel delivery (email via Resend, SMS via Twilio, calendar .ics)
- ✅ Webhook processing (delivery tracking, engagement analytics)
- ✅ Admin dashboard (12 API endpoints for funnel monitoring)
- 🔨 **Variable-timing logic** (CRITICAL: 7-day → 2-day auto-compression)
- 🔨 **JWT authentication** (CRITICAL: multi-tenant security)
- 🔨 **AI content generation** (Vector DB integration with Pinecone)

**v2.0 - Event Types Supported:**
- ✅ Webinars (Zoom, GoToWebinar, WebinarJam)
- ✅ In-person workshops and seminars
- ✅ Virtual masterclasses and training sessions
- ✅ Online challenges (5-day, 21-day, 30-day)
- ✅ Course launch events
- ✅ Membership onboarding sequences

**NOT NOW (Deferred to v3.0+):**
- AI-powered ephemeral landing pages (quiz → personalized page)
- Multi-language support (English-only for v2.0)
- Advanced behavioral scoring (lead temperature tracking)
- White-label reseller program
- Native integrations beyond Zoom (HubSpot/GoHighLevel sync)

---

## System on a Page

### 60-Second Narrative (Event Flow)

1. **Coach describes event** → AI agent generates funnel (email sequence, SMS reminders, calendar invites)
2. **User registers** → POST /api/enrollments creates contact + event registration
3. **Inngest triggers pre-event funnel:**
   - T+0h: Welcome email (brand voice, AI-generated from knowledge base)
   - T+24h: Reminder (email + SMS if opted-in)
   - T+1h: Final reminder (email + SMS)
   - ⚡ **Adaptive timing:** If registration is 2 days before event, compress 7-day sequence → 2-day
4. **Event occurs** → Attendance tracked (Zoom webhook, manual check-in, or virtual platform)
5. **Post-event funnel branches:**
   - **Attended path:** Thank you → Resources (24h) → Offer (3d) → Nurture (7d)
   - **No-show path:** Sorry + replay link (24h) → Re-engagement (3d) → Final offer (7d)
   - **Poll-triggered:** "Yes" to offer poll → High-intent nurture sequence
6. **All messages logged** → Engagement tracking (opens, clicks, SMS delivery) via webhooks
7. **Admin dashboard** → Coach monitors funnel performance (conversion rates, drop-off points)

### C4 Context Diagram (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MYXELIUM SAAS PLATFORM CONTEXT                        │
└──────────────────────────────────────────────────────────────────────────┘

[Coach/Educator] ──Describes Event──> (AI Agent)
                                          │
                                          ├──> (Pinecone Vector DB)
                                          │    - Brand voice samples
                                          │    - Content library
                                          │    - Template patterns
                                          │
                                          └──> Generates Funnel
                                                    │
                                                    ▼
[End User/Lead] ──Registers for Event──> (Next.js API - Multi-tenant)
                                                │
                                                ├──> (Supabase PostgreSQL)
                                                │    - tenants (coaches/orgs)
                                                │    - contacts
                                                │    - events
                                                │    - registrations
                                                │    - sent_messages
                                                │    - webhook_events
                                                │
                                                ├──> (Event Platforms)
                                                │    - Zoom API
                                                │    - GoToWebinar API
                                                │    - In-person check-ins
                                                │
                                                ├──> (Inngest Job Queue)
                                                │    Orchestrates:
                                                │    - Pre-event sequences
                                                │    - Adaptive timing logic
                                                │    - Post-event branching
                                                │    - Poll-triggered paths
                                                │
                                                ├──> (Resend - Email)
                                                │    Sends AI-generated emails
                                                │    Webhook: delivery/open/click
                                                │
                                                ├──> (Twilio - SMS)
                                                │    Sends reminder texts
                                                │    Webhook: delivery/failure
                                                │
                                                └──> (Calendar Integration)
                                                     Generates .ics files
                                                     Links: Google/Outlook/Apple

[Admin Dashboard] ──Monitors Performance──> (Admin API)
                                                │
                                                └──> Analytics:
                                                     - Funnel conversion rates
                                                     - Engagement metrics
                                                     - Drop-off analysis
                                                     - Revenue attribution

External Dependencies:
- Pinecone (vector database for content)
- Supabase (PostgreSQL + Auth)
- Vercel (hosting Next.js API)
- Inngest (job queue SaaS)
- Resend (email delivery SaaS)
- Twilio (SMS delivery SaaS)
- Zoom/GoToWebinar (event platforms)
```

---

## Architecture Brief (How)

### Quality Attributes (Non-Functional Requirements)

**Performance:**
- p95 enrollment API latency: <800ms (includes Zoom API call)
- p99 enrollment API latency: <1.5s
- AI funnel generation: <10s for 7-email sequence
- Webhook processing: <200ms p95 (async job queue)

**Scalability:**
- 1,000 tenants (coaches/educators) at launch
- 100,000 contacts across all tenants
- 10,000 events/month (avg 10 events per tenant)
- 50,000 registrations/month
- 500,000 messages/month (email + SMS)

**Availability & SLOs:**
- 99.9% uptime over 30 days (43.2 minutes downtime budget)
- Email delivery SLA: 99.5% delivered within 5 minutes
- SMS delivery SLA: 99% delivered within 1 minute
- Webhook processing: 99.9% success rate (with retry logic)

**Security & Compliance:**
- SOC 2 Type II controls (audit planned for Q2 2026)
- GDPR compliance: EU data residency, right to deletion, consent tracking
- CAN-SPAM compliance: Unsubscribe links, physical address, consent required
- TCPA compliance: SMS opt-in required, opt-out honored immediately
- JWT authentication with RS256 signing
- Webhook signature validation (Resend, Twilio, Zoom)
- Rate limiting: 100 req/min per tenant (burst: 200)

**Cost Targets:**
- <$2,000/month infrastructure at 1,000 tenants
- <$0.10 per funnel execution (email + SMS costs)
- Target: 60% gross margin after delivery costs

### C4 Container View

**API Services (Next.js 15 App Router):**
- `POST /api/enrollments` - Create contact + register for event
- `GET /api/events` - List tenant's events
- `POST /api/events` - Create new event (AI funnel generation)
- `POST /api/webhooks/resend` - Email delivery/engagement tracking
- `POST /api/webhooks/twilio` - SMS delivery status
- `POST /api/webhooks/zoom` - Attendance tracking
- `GET /api/admin/analytics/events/{id}` - Funnel performance metrics
- `GET /api/admin/contacts` - Contact list with filters
- `GET /api/admin/messages` - Message history and engagement

**Inngest Functions (Job Queue):**
- `send-message` - Deliver email/SMS with retry logic
- `event-enrolled` - Trigger pre-event sequence
- `event-completed` - Trigger post-event branching (attended vs. no-show)
- `adaptive-timing-calculator` - Compress sequences based on registration date
- `poll-response-handler` - Trigger custom sequences based on poll answers

**Data Stores:**
- **Supabase PostgreSQL** (primary transactional DB)
  - Multi-tenant with tenant_id foreign key on all tables
  - Row-level security (RLS) policies per tenant
  - Tables: tenants, contacts, events, registrations, sent_messages, webhook_events
- **Pinecone Vector DB** (content retrieval)
  - Namespace per tenant for brand voice isolation
  - Stores: email templates, brand guidelines, content library
- **Vercel KV (Redis)** (caching)
  - Session tokens (JWT refresh)
  - Rate limiting counters
  - Webhook deduplication (24h window)

**External Integrations:**
- **Zoom API** - Create registrations, fetch attendance
- **GoToWebinar API** - Create registrants (v3.0)
- **Resend API** - Send emails with attachments
- **Twilio API** - Send SMS with link shortening
- **Pinecone API** - Vector search for content

### Data & Contracts

**Canonical Entities:**

```typescript
// Multi-tenant isolation
Tenant {
  id: UUID
  name: string
  subdomain: string
  brand_config: JSON // colors, fonts, logo URLs
  pinecone_namespace: string
  created_at: timestamp
}

// End users who register for events
Contact {
  id: UUID
  tenant_id: UUID (FK to Tenant)
  email: string
  phone?: string
  first_name?: string
  last_name?: string
  consent_email: boolean
  consent_sms: boolean
  created_at: timestamp
}

// Events (webinars, workshops, etc.)
Event {
  id: UUID
  tenant_id: UUID (FK to Tenant)
  title: string
  type: 'webinar' | 'workshop' | 'masterclass' | 'challenge' | 'course_launch'
  scheduled_at: timestamp
  duration_minutes: number
  zoom_meeting_id?: string
  status: 'upcoming' | 'completed' | 'cancelled'
  funnel_config: JSON // AI-generated sequence
  created_at: timestamp
}

// Event registrations
Registration {
  id: UUID
  tenant_id: UUID (FK to Tenant)
  event_id: UUID (FK to Event)
  contact_id: UUID (FK to Contact)
  zoom_join_url?: string
  attended: boolean
  registered_at: timestamp
}

// Sent messages (email + SMS)
SentMessage {
  id: UUID
  tenant_id: UUID (FK to Tenant)
  contact_id: UUID (FK to Contact)
  event_id?: UUID (FK to Event)
  channel: 'email' | 'sms'
  step: number // Position in sequence
  subject?: string // Email only
  body: string
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed'
  provider_message_id?: string
  sent_at: timestamp
}
```

**API Contracts (v1):**

```typescript
// POST /api/enrollments
Request {
  tenant_id: UUID
  event_id: UUID
  contact: {
    email: string
    phone?: string
    first_name?: string
    last_name?: string
    consent_email: boolean
    consent_sms: boolean
  }
}

Response {
  registration_id: UUID
  zoom_join_url?: string
  calendar_ics_url: string
  funnel_preview: {
    pre_event_steps: number
    post_event_steps: number
    estimated_duration_days: number
  }
}

// POST /api/events (AI Funnel Generation)
Request {
  tenant_id: UUID
  event: {
    title: string
    type: 'webinar' | 'workshop' | 'masterclass' | 'challenge' | 'course_launch'
    scheduled_at: ISO8601
    duration_minutes: number
    description: string // AI uses this to generate funnel
  }
  funnel_template?: 'standard' | 'high_touch' | 'low_touch' | 'custom'
}

Response {
  event_id: UUID
  funnel_config: {
    pre_event: Array<{step: number, delay_hours: number, channel: 'email' | 'sms', subject: string, body: string}>
    post_event_attended: Array<{step: number, delay_hours: number, channel: 'email' | 'sms', subject: string, body: string}>
    post_event_no_show: Array<{step: number, delay_hours: number, channel: 'email' | 'sms', subject: string, body: string}>
  }
  estimated_cost_per_registration: number // USD
}
```

**Inngest Events (Internal):**

```typescript
event.enrolled {
  event_id: UUID
  registration_id: UUID
  contact_id: UUID
  tenant_id: UUID
  registered_at: ISO8601
}

event.completed {
  event_id: UUID
  tenant_id: UUID
  completed_at: ISO8601
}

message.send {
  tenant_id: UUID
  contact_id: UUID
  event_id?: UUID
  channel: 'email' | 'sms'
  step: number
  subject?: string
  body: string
  delay_until: ISO8601 // Adaptive timing applied here
}
```

**Versioning Strategy:**
- API versioning via URL path: `/api/v1/enrollments`, `/api/v2/enrollments`
- Database migrations via Supabase CLI (Postgres triggers + RLS policies)
- Inngest event versioning via `event.enrolled.v2` (parallel processing)
- Breaking changes: 90-day deprecation notice for customers

### Runtime Concerns

**State Management:**
- Stateless API (Next.js serverless functions)
- Session state: JWT in httpOnly cookie (15min access token, 7d refresh token)
- Job state: Inngest manages retries, delays, and execution tracking
- Webhook idempotency: Redis deduplication with 24h TTL (key: `webhook:{provider}:{message_id}`)

**Resilience Patterns:**
- **Retries:** Inngest automatic retry (exponential backoff: 1s, 2s, 4s, 8s, 16s)
- **Timeouts:** API calls to Zoom/Resend/Twilio: 10s timeout
- **Circuit breakers:** After 5 consecutive failures to external API, pause for 5 minutes
- **Graceful degradation:** If SMS fails, log error but continue email delivery
- **Dead letter queue:** Failed jobs after 5 retries → Slack alert + manual review

**Caching Strategy:**
- **Tenant config:** Redis cache, 1h TTL (invalidate on update)
- **Event details:** Redis cache, 5min TTL (frequently accessed during enrollment)
- **Analytics queries:** Postgres materialized views, refresh every 15min
- **Vector search results:** Pinecone has built-in caching (no app-level cache needed)

**Idempotency:**
- All POST /api/enrollments require `Idempotency-Key` header (24h window)
- Inngest functions are idempotent by design (event ID as dedup key)
- Webhook handlers check Redis for duplicate `provider_message_id` before processing

### Observability

**Logging:**
- Structured JSON logs via Vercel/Next.js (stdout)
- Log levels: ERROR, WARN, INFO, DEBUG
- Correlation ID: `x-request-id` header propagated through all services
- PII redaction: Email/phone hashed in logs (GDPR compliance)

**Metrics (Golden Signals):**
- **Latency:** p50, p95, p99 for all API endpoints (via Vercel Analytics)
- **Traffic:** Requests per minute by tenant, endpoint
- **Errors:** 5xx rate, 4xx rate by endpoint
- **Saturation:** Inngest queue depth, Postgres connection pool usage

**Custom Business Metrics:**
- Funnel conversion rate (registration → purchase) by event
- Email open rate, click rate by tenant
- SMS delivery rate by tenant
- Attendance rate (registered → attended) by event type
- Revenue per tenant (tracked via webhook from payment provider)

**Distributed Tracing:**
- OpenTelemetry instrumentation (spans for API → Inngest → Resend/Twilio)
- Trace IDs propagated via `traceparent` header
- Sampled at 10% of traffic (100% for errors)

**Dashboards:**
- **Operations Dashboard:** Inngest queue health, job success rate, retry rate
- **Tenant Dashboard:** Per-tenant metrics (events, registrations, messages, conversion)
- **SRE Dashboard:** p95 latency, error rate, uptime, incident timeline

**Alerting (SLO-Based):**
- **Critical (PagerDuty):**
  - API error rate >1% over 5min
  - Email delivery failure >5% over 15min
  - Postgres connection pool >90% for 5min
- **Warning (Slack):**
  - p95 latency >1s over 10min
  - Inngest job retry rate >10% over 30min
  - Webhook signature validation failures >5% over 15min

### Security & Privacy

**Authentication & Authorization:**
- **Tenant Auth:** JWT (RS256) with public/private key pair
- **Admin API:** Role-based access control (RBAC) - owner, admin, member
- **API Keys:** Revocable tenant-scoped keys for programmatic access
- **Webhook Verification:** HMAC signature validation (Resend, Twilio, Zoom)

**Secrets Management:**
- Vercel environment variables (encrypted at rest)
- Rotation policy: API keys rotated every 90 days
- Never log secrets (automated detection via regex in CI/CD)

**Data Classification:**
- **PII (Personally Identifiable Information):** Contact email, phone, name
  - Encrypted at rest (Supabase native encryption)
  - Hashed in logs
  - GDPR right to deletion: cascade delete contact + messages
- **Sensitive:** Zoom join URLs, calendar .ics content
  - TTL: Deleted 30 days post-event
- **Public:** Event title, scheduled time (no encryption needed)

**Data Retention:**
- Active contacts: Indefinite (until tenant deletes or GDPR request)
- Sent messages: 2 years (compliance with CAN-SPAM record-keeping)
- Webhook events: 90 days (debugging window)
- Analytics aggregates: 5 years (business intelligence)

**Audit Trails:**
- All tenant admin actions logged: event creation, contact deletion, API key generation
- Retention: 7 years (SOC 2 requirement)
- Immutable append-only log (Postgres `audit_log` table)

**Threat Model Highlights:**
- **Tenant isolation breach:** Mitigated via Postgres RLS policies (tenant_id enforcement)
- **Webhook replay attack:** Mitigated via Redis deduplication + signature validation
- **Email spoofing:** Mitigated via SPF/DKIM/DMARC records for Resend
- **SMS pumping fraud:** Mitigated via rate limiting (10 SMS per contact per day)
- **API key leakage:** Mitigated via IP allowlist option + rate limiting

### Delivery Pipeline

**Branching Strategy:**
- **main:** Production-ready code (protected branch)
- **develop:** Integration branch for feature merging
- **feature/*:** Short-lived branches (squash merge to develop)
- **hotfix/*:** Emergency fixes (cherry-pick to main + develop)

**CI/CD Pipeline (GitHub Actions):**
1. **Lint & Format:** ESLint, Prettier (fail on warnings)
2. **Type Check:** TypeScript strict mode (fail on errors)
3. **Unit Tests:** Vitest (428 tests, 96%+ coverage required)
4. **Integration Tests:** API endpoint tests against Supabase staging DB
5. **Security Scan:** Dependabot, npm audit (fail on high/critical CVEs)
6. **Build:** Next.js production build (fail on build errors)
7. **Deploy Preview:** Vercel preview deployment (per PR)
8. **E2E Tests:** Playwright smoke tests on preview URL
9. **Deploy Production:** Vercel production deployment (main branch only)

**Testing Pyramid:**
- **Unit tests (70%):** Vitest for pure functions, business logic
- **Integration tests (20%):** API routes with mocked external services
- **E2E tests (10%):** Playwright for critical user flows (enrollment, webhook processing)

**Rollout Strategy:**
- **Canary deployment:** 5% traffic → 25% → 50% → 100% over 4 hours
- **Automated rollback:** If error rate >0.5% in canary, auto-rollback to previous version
- **Feature flags:** LaunchDarkly for gradual feature rollout (adaptive timing, AI content generation)
- **Database migrations:** Zero-downtime via dual-write pattern (old + new schema for 1 week)

**Feature Flags (Kill Switches):**
- `adaptive_timing_enabled` - Toggle variable-timing logic
- `ai_content_generation_enabled` - Toggle Pinecone vector search
- `poll_personalization_enabled` - Toggle poll-driven sequences
- `sms_delivery_enabled` - Kill switch for SMS (cost control)

---

## Decisions & Risks

### Architecture Decision Records (ADR Index)

| ID | Title | Status | Consequence |
|----|-------|--------|-------------|
| ADR-001 | Use Inngest for job orchestration | Accepted | Scalable job queue with retries; vendor lock-in to Inngest SaaS |
| ADR-002 | Supabase for PostgreSQL + Auth | Accepted | Fast development; limited customization vs. self-hosted Postgres |
| ADR-003 | Next.js 15 App Router for API | Accepted | Vercel deployment; serverless scaling; cold start latency |
| ADR-004 | Resend for email delivery | Accepted | Best-in-class deliverability; cost scales with volume |
| ADR-005 | JWT authentication for tenants | Accepted | Stateless auth; requires secure key rotation process |
| ADR-006 | Pinecone for vector content storage | Accepted | Fast semantic search; cost = $70/month at 1k tenants |
| ADR-007 | Multi-tenant single-database design | Accepted | Simpler ops; requires strict RLS policies for isolation |
| ADR-008 | CRM-agnostic event platform | Accepted | Flexibility; requires custom integrations per platform |
| ADR-009 | Webhook-driven attendance tracking | Accepted | Real-time updates; dependent on provider reliability |
| ADR-010 | Adaptive timing via Inngest delays | Proposed | Solves core value prop; adds complexity to job scheduling |

### Top 5 Risks

#### 1. **Multi-Tenant Data Isolation Breach** (CRITICAL)
- **Risk:** Bug in Postgres RLS policy allows Tenant A to access Tenant B's contacts
- **Impact:** GDPR violation, customer churn, potential lawsuit, reputation damage
- **Mitigation:**
  - Automated RLS policy tests in CI/CD (query as different tenants, assert zero cross-tenant reads)
  - Annual security audit with penetration testing
  - Bug bounty program ($500-$5,000 for isolation bypass)
- **Owner:** CTO
- **Validation:** Hire external security firm for Q1 2026 audit

#### 2. **Adaptive Timing Logic Not Implemented** (HIGH)
- **Risk:** Core value proposition (variable-timing campaigns) missing from v2.0 launch
- **Impact:** 30% of registrations occur <3 days before event; without adaptive timing, they receive post-event emails (poor UX, low conversion)
- **Mitigation:**
  - **Bet #1** in 90-day plan prioritizes this feature
  - If not delivered by Nov 15, defer launch to Dec 1
- **Owner:** Lead Engineer
- **Validation:** Unit tests for `adaptive-timing-calculator` Inngest function + E2E test with 2-day registration

#### 3. **Inngest Free Tier Limits Exceeded** (MEDIUM)
- **Risk:** Inngest free tier = 50k job runs/month; at 1k tenants × 10 events × 50 registrations × 10 messages = 5M jobs/month
- **Impact:** Forced upgrade to $200/month plan at 500 tenants (earlier than budgeted)
- **Mitigation:**
  - Optimize job runs: Batch messages where possible (single job sends 10 emails vs. 10 jobs)
  - Monitor usage dashboard weekly
  - Budget includes $200/month Inngest cost from month 3
- **Owner:** Head of Product
- **Validation:** Load test with 10k registrations, measure job count

#### 4. **Email Deliverability Issues** (MEDIUM)
- **Risk:** AI-generated content triggers spam filters (Gmail, Outlook); open rates <10% (industry avg 20%)
- **Impact:** Low engagement → poor conversion → customer churn
- **Mitigation:**
  - SPF/DKIM/DMARC configured for all tenant domains
  - AI content training: Avoid spam trigger words ("FREE", "LIMITED TIME", "ACT NOW")
  - Warm-up period: New tenants send max 100 emails/day for first 14 days
  - Monitor Resend reputation score (must be >95%)
- **Owner:** Head of Product
- **Validation:** A/B test AI-generated vs. human-written emails, compare open rates

#### 5. **Poll Integration Deferred to v3.0** (LOW)
- **Risk:** Poll-driven personalization is differentiator but not in v2.0
- **Impact:** Estimated revenue impact: $75k/year (10% of customers would pay $50/month premium for this feature)
- **Mitigation:**
  - Clearly communicate roadmap to early customers
  - Offer early access beta program for poll feature in Q2 2026
  - Prioritize based on customer demand (if >30% request it, accelerate to v2.1)
- **Owner:** CEO
- **Validation:** Survey first 100 customers about feature priority

---

## 90-Day Plan (Bets, Not Tasks)

### Bet #1: Adaptive Campaign Timing Increases Conversion

**Hypothesis:** If we implement variable-timing logic that compresses 7-day campaigns to match registration date (e.g., 2-day compression for registrations 48h before event), then conversion rate will increase from 3.2% baseline to >5% because users won't receive post-event emails (current 40% waste rate).

**Success Metric:**
- A/B test: 50% of new events use adaptive timing, 50% use fixed timing
- Target: Adaptive timing group achieves ≥5% conversion (vs. 3.2% control)
- Secondary: Post-event email send rate drops from 40% → <5%

**Owner:** Lead Backend Engineer

**ETA:** 2025-11-15

**Kill/Scale Decision:**
- **Kill if:** By Nov 1, adaptive timing logic complexity exceeds 2 weeks of dev time → defer to v3.0, focus on other features
- **Scale if:** By Nov 15, conversion hits 5%+ → make adaptive timing default for all tenants, remove fixed-timing option

---

### Bet #2: JWT Authentication Prevents Security Incidents

**Hypothesis:** If we implement JWT authentication with role-based access control (owner/admin/member) for all admin API endpoints, then we will have zero security incidents related to unauthorized data access over 30 days.

**Success Metric:**
- Zero GDPR complaints or data breach reports post-launch
- 100% of admin API requests include valid JWT (monitored via middleware logs)
- External security audit (Q1 2026) finds no critical vulnerabilities in auth system

**Owner:** CTO

**ETA:** 2025-10-30

**Kill/Scale Decision:**
- **Cannot kill:** This is a blocker for production launch (GDPR compliance requirement)
- **Scale if:** Auth implementation complete → add MFA (multi-factor authentication) for tenant owners by Dec 15

---

### Bet #3: Webhook Retry Logic Improves Accuracy to 99.5%

**Hypothesis:** If we implement exponential backoff retry logic (5 attempts: 1s, 2s, 4s, 8s, 16s) for webhook processing, then webhook success rate will increase from 95% to >99.5%, reducing missing engagement data (opens, clicks, attendance).

**Success Metric:**
- Webhook success rate (successful processing / total webhooks received) ≥99.5% over 30 days
- Zero "missing attendance data" support tickets from customers
- Dead letter queue contains <0.5% of webhooks (after 5 retries)

**Owner:** Lead Backend Engineer

**ETA:** 2025-11-30

**Kill/Scale Decision:**
- **Kill if:** By Nov 20, retry logic causes Inngest queue depth >10k jobs (performance degradation) → simplify to 3 retries max
- **Scale if:** By Nov 30, success rate hits 99.5%+ → add webhook replay UI for manual recovery of failed webhooks

---

### Bet #4: Production Monitoring Reduces MTTR to <30min

**Hypothesis:** If we implement comprehensive monitoring (Vercel Analytics, Inngest dashboards, Supabase metrics) with PagerDuty alerts for critical errors, then mean time to resolution (MTTR) for incidents will be <30 minutes (vs. industry avg 4 hours).

**Success Metric:**
- MTTR for critical incidents (API error rate >1%, email delivery failure >5%) <30min over 90 days
- Zero incidents where customers report issues before engineering team is alerted
- 100% of critical alerts result in engineer acknowledgment within 5 minutes

**Owner:** CTO

**ETA:** 2025-12-15

**Kill/Scale Decision:**
- **Kill if:** PagerDuty costs exceed $200/month → switch to lower-cost alerting (Slack + Zapier)
- **Scale if:** MTTR consistently <15min → invest in automated incident remediation (auto-rollback, auto-scaling)

---

### Bet #5: Load Testing Keeps Infrastructure Under $2k/month

**Hypothesis:** If we load test the platform with 10k concurrent registrations and optimize database queries + Inngest job batching, then infrastructure costs will stay under $2,000/month at 1,000 tenants (vs. $5k unoptimized).

**Success Metric:**
- Vercel bill: <$500/month at 1k tenants
- Supabase bill: <$250/month (stay on Pro plan, avoid Enterprise)
- Inngest bill: <$200/month (optimize to <500k jobs/month)
- Resend + Twilio: <$1,000/month (variable cost, scales with usage)
- **Total: <$2,000/month**

**Owner:** Head of Product

**ETA:** 2025-12-01

**Kill/Scale Decision:**
- **Kill if:** Costs exceed $3k/month even after optimization → raise prices from $29/month → $49/month to maintain 60% margin
- **Scale if:** Costs stay <$1.5k/month → invest savings into hiring DevOps engineer for further optimization

---

## Open Questions & Assumptions

### Open Questions

1. **What is the acceptable cost per registration for customers?**
   - Current assumption: $0.10 per registration (email + SMS costs)
   - Validation needed: Survey 20 beta customers on willingness to pay for premium SMS features
   - Confidence: MEDIUM (no customer validation yet)

2. **How many event types beyond webinars are critical for v2.0?**
   - Current plan: Support 6 event types (webinar, workshop, masterclass, challenge, course_launch, in-person)
   - Validation needed: Analyze first 100 customer sign-ups to see event type distribution
   - Confidence: LOW (no usage data yet)

3. **Should we build native GoHighLevel integration for v2.0 or defer to v3.0?**
   - Current decision: Deferred to v3.0
   - Validation needed: Survey customers on CRM usage (HubSpot vs. GoHighLevel vs. other)
   - Confidence: MEDIUM (anecdotal evidence suggests 40% of target market uses GoHighLevel)

4. **What is the optimal tenant pricing tier structure?**
   - Current assumption: Single tier at $29/month (unlimited events, 1k contacts, 10k messages)
   - Validation needed: Price sensitivity analysis with beta customers
   - Confidence: LOW (no pricing experiments conducted)

5. **How critical is AI-generated landing page creation for v2.0?**
   - Current decision: Deferred to v2.5 (focusing on funnel automation first)
   - Validation needed: Customer interviews on biggest pain point (funnel setup vs. landing page creation)
   - Confidence: MEDIUM (transcript suggests high value, but MVP can launch without it)

### Assumptions

1. **Customers have existing content libraries (blog posts, course materials, brand guidelines)**
   - Assumption: Coaches have 10-50 pages of content to feed into Pinecone vector DB
   - Validation: Onboarding survey asks for content volume; if <10 pages, offer content creation service
   - Confidence: HIGH (target market = established coaches with existing content)

2. **Zoom is the dominant webinar platform for target market**
   - Assumption: 70% of customers use Zoom; 20% use GoToWebinar; 10% use other platforms
   - Validation: Analyze sign-up data for event platform selection
   - Confidence: MEDIUM (based on industry reports, no first-party data)

3. **Email + SMS is sufficient multi-channel delivery (no need for WhatsApp, Slack, etc.)**
   - Assumption: SMS opt-in rate = 30%; email opt-in rate = 100%
   - Validation: Monitor opt-in rates post-launch; if SMS <10%, consider deprecating
   - Confidence: MEDIUM (SMS effectiveness varies by audience demographic)

4. **Customers will accept AI-generated content if brand-aligned (zero hallucination)**
   - Assumption: AI content quality = 90% approval rate (vs. 50% for generic AI tools like Jasper)
   - Validation: A/B test AI-generated vs. human-written emails with first 50 customers
   - Confidence: LOW (no validation yet; critical assumption for product-market fit)

5. **Supabase Postgres RLS policies are sufficient for multi-tenant data isolation**
   - Assumption: Zero data leakage between tenants when RLS policies are correctly configured
   - Validation: Automated RLS tests in CI/CD + external security audit
   - Confidence: MEDIUM (RLS is battle-tested, but implementation bugs are possible)

6. **Inngest job queue can handle 500k jobs/month on $200/month plan**
   - Assumption: Optimized job batching reduces job count by 80% (5M → 500k jobs/month)
   - Validation: Load testing with 10k registrations
   - Confidence: MEDIUM (depends on optimization success)

7. **Customers are willing to migrate from HubSpot/GoHighLevel to a new platform**
   - Assumption: Pain point is severe enough (8 hours funnel setup → 45 min) to justify migration friction
   - Validation: Customer interviews; measure churn rate in first 90 days
   - Confidence: LOW (migration friction is real; value prop must be 10x better)

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-10-01 | Initial Ceremonia-specific backend vision | Vision Agent |
| 2.0.0 | 2025-10-01 | Rewritten as SaaS platform for coaches/educators; CRM-agnostic; event-based (not webinar-specific) | Vision Agent |

---

**End of Document**

---

## Appendix: Key Differentiators vs. Competitors

| Feature | HubSpot | GoHighLevel | ActiveCampaign | **Myxelium** |
|---------|---------|-------------|----------------|--------------|
| **Variable-timing campaigns** | ❌ Manual | ❌ Manual | ❌ Manual | ✅ Automatic (7-day → 2-day) |
| **AI-generated content** | ❌ Generic templates | ❌ Generic templates | ❌ Generic templates | ✅ Brand-specific (vector DB) |
| **Behavioral branching (attended/no-show)** | ✅ Manual setup | ✅ Manual setup | ✅ Manual setup | ✅ Automatic |
| **Poll-driven personalization** | ❌ No integration | ❌ No integration | ❌ No integration | ✅ Automatic (roadmap) |
| **Setup time per funnel** | 6-12 hours | 4-8 hours | 6-10 hours | **45 minutes** |
| **Pricing** | $800/month | $297/month | $229/month | **$29/month** |
| **Target market** | Enterprise (1000+ employees) | Agencies (10+ clients) | Mid-market (50-500 employees) | **Solo coaches (1-3 people)** |

**Myxelium's Moat:**
1. **AI content generation from vector knowledge base** (not generic templates)
2. **Adaptive timing logic** (unique to event-based funnels)
3. **10x faster setup** (45 min vs. 6-12 hours)
4. **10x cheaper** ($29 vs. $297-$800/month)
5. **Purpose-built for coaches/educators** (not general CRM trying to do everything)
