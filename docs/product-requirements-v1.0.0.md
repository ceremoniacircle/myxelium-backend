# Product Requirements Document v1.1.0
*Myxelium: Event Funnel Orchestration API*

**Document Version:** 1.1.0
**Last Updated:** 2025-09-30
**Status:** In Progress
**Owner:** Austin Mao

---

## Implementation Status

### ✅ Completed (2025-09-30)
- **Database Schema**: Full schema designed and migrated to Supabase
  - Tables: contacts, events, registrations, campaigns, campaign_messages, jobs, message_sends
  - Commits: `1ad22b9` and earlier
- **Enrollment API**: POST /api/enrollments endpoint
  - Creates contacts, registrations, handles consent
  - Triggers Inngest pre-event funnel
  - Commit: `fe382f0`
- **Zoom Integration**: Full Meetings + Webinars API support implemented
  - OAuth client with token caching (`lib/zoom/client.ts`)
  - Registration service supports both platforms (`lib/zoom/registration.ts`)
  - Platform detection (zoom_meeting vs zoom_webinar)
  - **Current capability**: Can register users for either type
  - **Production use**: Using Meetings only (Pro plan). Webinars ready when add-on activated.
  - Returns unique join URLs
  - Test scripts for validation
  - Commits: `2ae25e0`, `4504481`, `166b864`, `fe382f0`, `89865d8`, `1ad22b9`
- **Inngest Job Queue System**: Full implementation complete
  - Client configuration (`inngest/client.ts`)
  - Pre-event funnel with 3-step sequence (welcome, T-24h, T-1h)
  - Post-event funnel with branching logic (attended vs no-show)
  - Generic message sender with consent checking
  - Database helpers for message tracking
  - API route for webhook handler (`/api/inngest`)
  - Test scripts for local development
  - Documentation and quick start guide
  - **Status**: Ready for testing (placeholder logging for messages)
  - **Next**: Integrate Resend/Twilio for actual delivery

### 🚧 Next Up (Week 2-3)
- **Email Provider**: Resend integration for transactional emails
- **SMS Provider**: Twilio integration for SMS delivery
- **Webhook Handlers**:
  - Resend webhooks for email engagement
  - Twilio webhooks for SMS delivery status
  - Zoom webhooks for attendance tracking
- **Content API**: Integration with external content generation service

### ⏳ Pending (Week 4-6)
- Admin endpoints for campaign management
- Analytics dashboard
- Testing and production deployment
- Performance optimization
- Security audit

---

## Executive Summary

**Problem:** Ceremonía needs a backend system to automate event enrollment and nurture sequences. Currently, there's no way to automatically enroll users in Zoom events (meetings/webinars) and trigger personalized, multi-channel drip campaigns based on user behavior.

**Solution:** Build Myxelium, a funnel orchestration API that accepts contact submissions, enrolls them in Zoom events (Meetings or Webinars), and executes sophisticated drip campaigns across email, SMS, and (future) WhatsApp based on time delays and behavioral triggers.

**Key Constraint:** Content generation is handled by a separate API. Myxelium only orchestrates delivery using pre-generated HTML/text content.

---

## Goals & Objectives

### Primary Goals
1. **Automate Event Enrollment**: User fills form → automatically enrolled in Zoom (Meeting or Webinar) with unique join URL
2. **Execute Pre-Event Drip Campaigns**: T-24h and T-1h reminders via email + SMS
3. **Branch Post-Event Flows**: Different sequences for attendees vs. no-shows
4. **Track Engagement**: Monitor email opens, clicks, SMS delivery for behavioral triggers
5. **Cost-Effective MVP**: Operate at <$50/month for 500 contacts, 5K emails, 500 SMS

### Zoom Platform Support
- **Current (MVP)**: Zoom Meetings (Zoom Pro plan)
- **Future**: Zoom Webinars (when webinar add-on is activated)
- **Abstraction**: Events table supports both via `platform` field (`zoom_meeting` or `zoom_webinar`)

### Success Criteria (MVP - 6 weeks)
- ✅ Successfully enroll 50+ users in live events via form submission (99%+ success rate)
- ✅ Execute 3-step pre-event drip (welcome → T-24h → T-1h) with 95%+ delivery rate
- ✅ Execute 3-step post-event drip (attended vs. no-show paths) with 95%+ delivery rate
- ✅ 99%+ job completion rate (excluding provider failures, measured in Inngest dashboard)
- ✅ <5 second P95 latency from form submit to Zoom enrollment + welcome email queued
- ✅ <2 second P95 latency for API response to user (enrollment confirmation)
- ✅ Total infrastructure cost <$50/month (measured via billing dashboard)
- ✅ Zero security incidents (no unauthorized access, no data breaches)

### Success Criteria (Year 1)
- 50K contacts enrolled across 100+ events (meetings + webinars)
- 500K emails/month, 50K SMS/month delivered
- 40%+ email open rate, 70%+ SMS open rate
- 30%+ event attendance rate
- Total infrastructure cost <$500/month

---

## Problem Statement

### Current Pain Points
1. **Manual Webinar Management**: No automated enrollment or reminder system
2. **Generic Communications**: No personalized drip sequences based on user behavior
3. **Single Channel**: Email-only, missing SMS for high-urgency reminders
4. **No Tracking**: Can't measure engagement or optimize sequences
5. **Content Disconnect**: Landing page generation is separate from email/SMS content

### Target Users
- **Primary**: Ceremonía marketing team managing webinar enrollments
- **Secondary**: Future clients using Ceremonía's funnel orchestration platform

### User Journey (Current State → Future State)

**Current State:**
1. User submits form → data to spreadsheet
2. Manual Zoom registration
3. Manual email sends (or none)
4. No follow-up automation

**Future State:**
1. User submits form → instant Zoom enrollment + confirmation email
2. Automated T-24h and T-1h reminders (email + SMS)
3. Post-event: branching sequences (attended → nurture, no-show → replay)
4. Real-time engagement tracking and behavioral triggers

---

## Features & Requirements

### Critical Features (MVP - Must Have)

#### 1. Contact Management
- **API Endpoint**: `POST /api/enrollments`
- **Input**: email, firstName, lastName, phone, eventId, timezone, smsConsent, customFields
- **Output**: enrollmentId, contactId, zoomJoinUrl, scheduledSteps, status
- **Database**: Store contacts with consent flags, timezone, custom attributes
- **Deduplication**: Upsert based on email+eventId unique constraint

#### 2. Zoom Event Integration (Meetings + Webinars)
- **Platform Detection**: Automatically detect event type (`zoom_meeting` or `zoom_webinar`)
- **Meetings API (Current - Zoom Pro)**:
  - Create scheduled meetings programmatically
  - Add registrants to meetings
  - Get unique join URLs for each participant
  - Track attendance via `meeting.participant_joined` webhook
- **Webinars API (Future - when add-on enabled)**:
  - Create webinars programmatically
  - Register participants via Webinar API
  - Track attendance via `webinar.participant_joined` webhook
- **Webhook Handling**: Receive participant events and attendance data
- **Attendance Tracking**: Update `registrations.attended` flag
- **Join URL Generation**: Return unique Zoom join URL immediately
- **Abstraction**: Single codebase supports both, switched via `events.platform` field

#### 3. Pre-Event Drip Campaign
- **Step 1 (T+0h)**: Welcome email with join URL and calendar invite
- **Step 2 (T-24h)**: Reminder email + SMS before event
- **Step 3 (T-1h)**: Final reminder email + SMS
- **Conditional Logic**: Only send if event hasn't happened yet (check status)
- **Timing Calculation**: Relative to `events.scheduled_at` (not enrollment time)

#### 4. Post-Event Drip Campaign
**Path A - Attended:**
- T+1h: Thank you email with replay link (if available)
- T+24h: Resources email (slides, materials)
- T+3d: Nurture/offer email

**Path B - No-Show:**
- T+1h: "Sorry we missed you" email with replay
- T+24h: Re-engagement email + SMS
- T+7d: Final follow-up (low priority)

#### 5. Job Queue/Scheduler
- **Technology**: Inngest (committed for MVP and production)
- **Future consideration**: If costs exceed $150/month at scale, evaluate self-hosted alternatives
- **Capabilities**:
  - Delayed execution (sleepUntil for T-24h, T-1h)
  - Automatic retries with exponential backoff
  - Idempotency (prevent duplicate sends)
  - Dead letter queue (DLQ) for failed jobs
  - Visual debugging dashboard
- **Triggers**: Event-based (`event.enrolled`, `event.completed`)

#### 6. Multi-Channel Sending
- **Email Provider**: Resend (MVP), SendGrid (future)
  - API integration for transactional sends
  - Webhook handlers for delivered, opened, clicked, bounced
- **SMS Provider**: Twilio
  - Send via Twilio API
  - Handle STOP/START/HELP auto-responses
  - Webhook handlers for delivery status

#### 7. Content Integration
- **External Content API**: Fetch pre-generated HTML/text from separate service
- **Personalization**: Replace variables ({{firstName}}, {{joinUrl}}, etc.)
- **Fallback**: Use static templates if content API unavailable

### Standard Features (Post-MVP - Should Have)

#### 8. Calendar Integration
- **Generate .ics Files**: Universal calendar format
- **Email Attachment**: Include in welcome email
- **Add-to-Calendar Links**: Google Calendar, Outlook direct links

#### 9. Funnel Analytics Dashboard
- **Enrollment Metrics**: Total enrollments, attendance rate, conversion rate
- **Email Performance**: Sent, delivered, opened, clicked per step
- **SMS Performance**: Sent, delivered per step
- **Funnel Visualization**: Drop-off rates at each step

#### 10. Webhook Infrastructure
- **Resend Webhooks**: `/api/webhooks/resend` for email events
- **Twilio Webhooks**: `/api/webhooks/twilio` for SMS events
- **Zoom Webhooks**: `/api/webhooks/zoom` for attendance
- **Signature Verification**: Validate all incoming webhooks

#### 11. Admin UI
- **Event List**: View all events, enrollments, status
- **Funnel Performance**: See metrics per event/campaign
- **Contact Detail View**: See all messages sent to a contact
- **Manual Triggers**: Ability to manually send a message or cancel jobs

### Future Considerations (Nice to Have)

#### 12. Behavioral Triggers
- **Email Opened → High Intent**: If user opens 2+ emails, escalate to SMS
- **Link Clicked → Hot Lead**: Tag contact, trigger priority sequence
- **Not Opened → Re-engagement**: After 48h no open, send SMS reminder

#### 13. A/B Testing
- **Template Variants**: Test subject lines, email copy, send times
- **Traffic Split**: 50/50 or custom percentage
- **Winner Declaration**: Manual or auto (based on open rate)

#### 14. WhatsApp Integration
- **Twilio WhatsApp API**: Send template messages
- **Template Approval**: Manage Meta-approved templates
- **Two-Way Messaging**: Handle user replies

#### 15. CRM Sync
- **HubSpot Integration**: Sync contacts, update properties
- **Salesforce Integration**: Create/update leads
- **Bidirectional Sync**: Pull custom fields from CRM

#### 16. Multi-Language Support
- **Locale Detection**: Based on user timezone or explicit field
- **Template Localization**: Store multiple language variants
- **Auto-Translation**: Optional AI-powered translation

#### 17. Advanced Scheduling
- **Quiet Hours**: Don't send 9pm-9am local time
- **Timezone Handling**: Convert all times to user's local timezone
- **Send Time Optimization**: ML-based best time to send

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────┐
│  Frontend (ceremonia-v2-frontend)       │
│  - Landing pages (AI-generated)         │
│  - Form submission                      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Myxelium API (this project)            │
│  - POST /api/enrollments                │
│  - Webhook handlers                     │
│  - Job orchestration                    │
└─────────────────────────────────────────┘
       ↓              ↓              ↓
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Supabase │   │ Inngest  │   │ Content  │
│   (DB)   │   │ (Queue)  │   │   API    │
└──────────┘   └──────────┘   └──────────┘
       ↓              ↓              ↓
┌──────────┐   ┌──────────┐   ┌──────────┐
│  Zoom    │   │  Resend  │   │  Twilio  │
│   API    │   │ (Email)  │   │  (SMS)   │
└──────────┘   └──────────┘   └──────────┘
```

### Database Schema (Supabase Postgres)

**Core Tables:**
- `contacts` - Contact records with consent, timezone, custom fields
- `events` - Event details (Zoom Meetings/Webinars), scheduled times, platform type
- `registrations` - Links contacts to events, tracks attendance status
- `campaigns` - Funnel definitions (steps, delays, conditions)
- `campaign_messages` - Message templates in campaign sequences
- `jobs` - Queued work (managed by Inngest)
- `message_sends` - Delivery audit log with engagement tracking

**Key Relationships:**
- registration → contact (many-to-one)
- registration → event (many-to-one)
- message_send → registration (many-to-one)
- campaign_message → campaign (many-to-one)

### API Endpoints

**Public API:**
- `POST /api/enrollments` - Enroll contact in event funnel
- `GET /api/events/:id` - Get event details (public)

**Webhook Receivers:**
- `POST /api/webhooks/zoom` - Zoom attendance events
- `POST /api/webhooks/resend` - Email delivery/engagement events
- `POST /api/webhooks/twilio` - SMS delivery/reply events

**Admin API:**
- `GET /api/admin/events` - List all events
- `GET /api/admin/events/:id/cancel` - Cancel event and stop all campaigns
- `GET /api/admin/funnels/:id/analytics` - Funnel performance metrics
- `GET /api/admin/contacts/:id` - Contact detail with message history
- `POST /api/admin/messages/send` - Manual message send (testing)

**Inngest Functions:**
- `inngest/event-funnel` - Pre-event drip sequence
- `inngest/post-event-funnel` - Post-event branching sequences
- `inngest/send-message` - Generic message sending with retries

### API Endpoint Specifications

#### POST /api/enrollments

**Request Schema (Zod):**
```typescript
{
  email: string (email format, required),
  firstName: string (1-100 chars, required),
  lastName: string (1-100 chars, required),
  phone: string (E.164 format, optional),
  eventId: uuid (required),
  timezone: string (IANA timezone, optional, defaults to America/Denver),
  smsConsent: boolean (required if phone provided),
  customFields: Record<string, string | number | boolean> (optional)
}
```

**Response (Success 200):**
```json
{
  "enrollmentId": "uuid",
  "contactId": "uuid",
  "zoomJoinUrl": "string",
  "scheduledSteps": [
    { "type": "email", "scheduledAt": "ISO8601" },
    { "type": "sms", "scheduledAt": "ISO8601" }
  ],
  "status": "enrolled"
}
```

**Error Responses:**
- `400` - Validation error (invalid email, missing required fields)
- `409` - Already enrolled (returns existing enrollment)
- `422` - Zoom enrollment failed (check event availability)
- `500` - Internal server error
- `503` - Service unavailable (Zoom API down)

**Rate Limiting:**
- 60 requests per minute per IP
- 429 response with `Retry-After` header

**Authentication:**
- Public endpoint (no auth for MVP)
- Admin endpoints require `Authorization: Bearer <JWT>` header

### Technology Stack

**Backend Framework:**
- Next.js 15 (App Router)
- Hono 4.9 (API routes - faster than native Next.js)
- TypeScript 5.7

**Database:**
- Supabase (Postgres + Auth + Realtime)
- Row Level Security (RLS) for multi-tenancy (future)

**Job Queue:**
- Inngest (serverless orchestration)
- Free tier: sufficient for MVP
- Paid: ~$20/month at scale

**Email Provider:**
- Resend (MVP) - $0/month (3K emails free)
- SendGrid (future) - better deliverability at scale

**SMS Provider:**
- Twilio - ~$4/month (500 SMS at $0.008 each)

**Integrations:**
- Zoom API (Server-to-Server OAuth)
- Content Generation API (external, separate project)

**Deployment:**
- Vercel (serverless, free tier)
- Edge functions for webhook handlers

**Monitoring:**
- Inngest Dashboard (job health, retries, failures)
- Supabase Logs (database queries)
- Sentry (error tracking - future)

### Content API Integration

**Contract:**
- **Endpoint**: `POST https://content-api.ceremonia.com/generate` (to be confirmed)
- **Authentication**: API key in `X-API-Key` header
- **Timeout**: 5 seconds
- **Retry**: 2 attempts with 1s backoff

**Request Format:**
```json
{
  "templateType": "welcome_email" | "reminder_24h" | "reminder_1h" | "post_attended" | "post_noshow",
  "channel": "email" | "sms",
  "context": {
    "firstName": "string",
    "lastName": "string",
    "eventTitle": "string",
    "eventDate": "ISO8601",
    "joinUrl": "string"
  }
}
```

**Response Format:**
```json
{
  "subject": "string (email only)",
  "htmlBody": "string (email only)",
  "textBody": "string",
  "personalizationTokens": ["{{firstName}}", "{{joinUrl}}"]
}
```

**Fallback Strategy:**
- If Content API unavailable or returns 5xx: use static templates from `/templates/fallback/`
- Cache successful responses for 1 hour (reduce API calls)
- Log all fallback uses for monitoring

**Personalization Token Syntax:**
- Format: `{{variableName}}`
- Supported tokens: `{{firstName}}`, `{{lastName}}`, `{{eventTitle}}`, `{{eventDate}}`, `{{joinUrl}}`
- Rendering: Server-side replacement before sending

### Error Handling & Partial Failures

**Scenario 1: Zoom Enrollment Succeeds, Email Fails**
- Mark enrollment as `enrolled` (success)
- Retry email send via Inngest (4 attempts: immediate, 1m, 5m, 30m)
- If all retries fail: move to DLQ, alert admin
- User still has Zoom access (partial success acceptable)

**Scenario 2: Zoom Enrollment Fails**
- Return 422 error to client
- Do NOT create enrollment record
- Do NOT trigger email/SMS jobs
- Log failure with Zoom API error details

**Scenario 3: Database Write Fails After Zoom Success**
- Compensating transaction: attempt to delete Zoom registrant
- If compensation fails: log to manual review queue
- Return 500 error to client

**Scenario 4: Event Cancelled or Rescheduled**
- Admin endpoint: `DELETE /api/admin/events/:id/cancel`
- Cancel all pending Inngest jobs for this event
- Send cancellation email to all registrants (immediate)
- Update `events.status` to `cancelled`

**Retry Policy (All Jobs):**
- Attempt 1: Immediate
- Attempt 2: +1 minute
- Attempt 3: +5 minutes
- Attempt 4: +30 minutes
- After 4 failures: move to DLQ, create alert

**Idempotency:**
- All Inngest jobs use `eventId + contactId + stepType` as idempotency key
- Duplicate webhook deliveries: check `message_sends.external_id` before processing
- Duplicate form submissions: upsert based on `email + eventId` unique constraint

### Timezone & Scheduling Details

**Timezone Detection:**
1. Use `timezone` field from enrollment form (IANA format, e.g., "America/New_York")
2. If not provided: default to "America/Denver" (US/Mountain)
3. Validate timezone using `moment-timezone` library

**Time Storage:**
- All timestamps stored in UTC in database
- `events.scheduled_at` stored as `TIMESTAMPTZ`
- Convert to user's timezone only for display/scheduling

**DST Handling:**
- Use `moment-timezone` for DST-aware calculations
- T-24h calculation: `event.scheduled_at.minus(24, 'hours')` in user's timezone
- Test edge cases: DST spring forward, fall back

**SMS Quiet Hours:**
- Definition: 9am-9pm in **user's local timezone**
- If scheduled send falls outside window: delay to next 9am
- Holiday detection: not implemented in MVP (future enhancement)

**Phone Number Validation:**
- Format: E.164 (e.g., "+14155552671")
- Validation library: `libphonenumber-js`
- Reject invalid formats with 400 error
- Normalize before storage: remove spaces, dashes, parentheses

**Calendar .ics Format:**
- Timezone: Use event's timezone (from `events.timezone` field)
- Format: RFC 5545 compliant
- Library: `ics` npm package
- Include: DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION (Zoom URL)

### Monitoring & Operations

**Key Metrics Dashboard:**
- **API Latency**: P50, P95, P99 response times (target: <5s P95)
- **Error Rate**: 5xx errors per hour (target: <1%)
- **Job Completion**: % jobs completed successfully (target: 99%+)
- **Email Deliverability**: % delivered, bounced, spam complaints
- **SMS Deliverability**: % delivered, failed
- **Cost Tracking**: Daily spend by service

**Alerting Thresholds:**
- P95 latency >10 seconds: Slack alert
- Error rate >5% over 5 minutes: Email alert (solo dev)
- Job failure rate >10%: Immediate alert
- Daily cost >$5: Email notification
- Zoom API rate limit hit: Immediate alert

**Tools:**
- Inngest Dashboard: Job health, retry rates, DLQ size
- Vercel Analytics: API latency, error rates, bandwidth
- Supabase Logs: Slow queries, connection pool usage
- Custom Dashboard: Aggregate metrics from all sources (future)

**Incident Response (Solo Developer):**
- **Severity 1** (API down): Drop everything, investigate immediately
- **Severity 2** (degraded performance): Investigate within 2 hours
- **Severity 3** (failed jobs): Review DLQ daily, manual retry if needed
- **Backup contact**: [TBD - define escalation path]

### Data Flow: Enrollment to Completion

```
1. User submits form on landing page
   ↓
2. POST /api/enrollments
   - Validate input (Zod schema)
   - Create/update contact in Supabase
   - Call Zoom API to register
   - Store registration with Zoom IDs
   ↓
3. Trigger Inngest event: 'event.enrolled'
   - Event payload: { contactId, eventId, registrationId }
   ↓
4. Inngest function: event-funnel
   - Step 1: Send welcome email (immediate)
   - Step 2: sleepUntil(T-24h), send reminder email + SMS
   - Step 3: sleepUntil(T-1h), send final reminder email + SMS
   ↓
5. Event happens (external, on Zoom)
   ↓
6. Zoom webhook: POST /api/webhooks/zoom
   - Parse participant list
   - Update registration.attended = true/false
   - Trigger Inngest event: 'event.completed'
   ↓
7. Inngest function: post-event-funnel
   - Branch based on attended flag:
     - IF attended: thank you → resources → offer sequence
     - IF no-show: missed you → re-engagement → final sequence
   ↓
8. Each send triggers provider API call
   - Email: Resend API
   - SMS: Twilio API
   - Record in message_sends table
   ↓
9. Provider webhooks update status
   - Resend: delivered, opened, clicked, bounced
   - Twilio: delivered, failed
   - Update message_sends.status, timestamps
```

---

## Implementation Timeline

### Phase 1: Foundation (Week 1-2)

**Week 1: Database & Basic API**
- Day 1-2: Supabase schema, migrations, seed data
- Day 3-4: POST /api/enrollments endpoint (validation, contact creation)
- Day 5-7: Zoom API integration (register user, get join URL)
- **Deliverable**: Form submission creates contact, enrolls in Zoom

**Week 2: Job Queue & Content Integration**
- Day 8-9: Inngest setup, first function (event.enrolled handler)
- Day 10-11: Content API integration (fetch HTML, personalization)
- Day 12-14: Email sending (Resend integration, welcome email working)
- **Deliverable**: Immediate welcome email sent on enrollment

### Phase 2: Drip Campaigns (Week 3-4)

**Week 3: Pre-Event Sequence**
- Day 15-16: Implement T-24h reminder (email + SMS)
- Day 17-18: Implement T-1h reminder (email + SMS)
- Day 19-21: Twilio SMS integration, test end-to-end
- **Deliverable**: Complete pre-event drip working

**Week 4: Post-Event Sequence**
- Day 22-23: Zoom webhook handler (attendance tracking)
- Day 24-25: Post-event branching logic (attended vs. no-show)
- Day 26-28: Implement both sequences, test with real event
- **Deliverable**: End-to-end funnel working for 1 event

### Phase 3: Admin UI & Polish (Week 5-6)

**Week 5: Dashboard & Webhooks**
- Day 29-30: Resend webhook handler (email engagement)
- Day 31-32: Twilio webhook handler (SMS delivery)
- Day 33-35: Admin dashboard (event list, enrollment stats)
- **Deliverable**: Can track funnel performance

**Week 6: Testing & Launch**
- Day 36-37: Calendar integration (.ics files)
- Day 38-39: End-to-end testing with 50 test users
- Day 40-42: Bug fixes, documentation, launch prep
- **Deliverable**: MVP ready for production

### Post-MVP Roadmap (Month 2-3)

**Month 2:**
- A/B testing framework
- Enhanced analytics (funnel visualization)
- Behavioral triggers (email opened → SMS escalation)

**Month 3:**
- WhatsApp integration
- CRM sync (HubSpot/Salesforce)
- Multi-language support

---

## Success Metrics & KPIs

### Product Metrics

**Enrollment Success:**
- **Target**: 99%+ successful Zoom enrollments (excluding invalid input)
- **Measure**: `COUNT(registrations WHERE zoom_registrant_id IS NOT NULL) / COUNT(registrations)`

**Job Completion Rate:**
- **Target**: 99%+ jobs complete successfully
- **Measure**: `COUNT(jobs WHERE status = 'completed') / COUNT(jobs)`
- **Note**: Excludes provider failures (out of our control)

**Latency:**
- **Target**: <5 seconds from form submit to Zoom enrolled + welcome email sent
- **Measure**: P95 latency of POST /api/enrollments

**Deliverability:**
- **Email**: 95%+ delivery rate (not bounced)
- **SMS**: 98%+ delivery rate
- **Measure**: Provider webhook status updates

### Business Metrics

**Event Attendance:**
- **Target**: 30%+ attendance rate (industry avg: 20-40%)
- **Measure**: `COUNT(registrations WHERE attended = true) / COUNT(registrations)`

**Email Engagement:**
- **Open Rate**: 40%+ (industry avg: 20-30%)
- **Click Rate**: 5%+ (industry avg: 2-5%)

**SMS Engagement:**
- **Open Rate**: 70%+ (SMS typically higher)
- **Reply Rate**: 1-3%

**Conversion (Post-Event):**
- **Target**: 10%+ take desired action (book call, purchase, etc.)
- **Measure**: Track clicks on CTA links in post-event emails

### Operational Metrics

**Cost Efficiency:**
- **MVP**: <$50/month for 500 contacts
- **Year 1**: <$500/month for 50K contacts
- **Measure**: Monthly bill from Inngest + Resend + Twilio + Vercel + Supabase

**Reliability:**
- **Uptime**: 99.9% API availability
- **Error Rate**: <1% of requests fail with 5xx errors
- **Measure**: Vercel analytics + error tracking

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Zoom API rate limits** | Medium | High | Cache event data, batch requests, implement backoff |
| **Email deliverability issues** | Medium | High | Use Resend/SendGrid, warm up domain, SPF/DKIM setup |
| **Job queue failures** | Low | Critical | Inngest has built-in retries + DLQ, monitor dashboard |
| **Content API downtime** | Medium | Medium | Cache templates locally, fallback to static content |
| **Webhook signature forgery** | Low | High | Validate all webhooks, use HTTPS only |
| **Database performance** | Low | Medium | Index optimization, read replicas if needed |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Low event attendance** | Medium | Medium | Focus on reminder timing, test different cadences |
| **Email marked as spam** | Medium | High | Use reputable provider, avoid spammy content, unsubscribe links |
| **SMS opt-out rate** | Low | Low | Only send high-value SMS (reminders), respect STOP |
| **Cost overruns** | Low | Medium | Monitor usage weekly, set spend limits on providers |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Solo developer bottleneck** | High | Medium | Prioritize ruthlessly, use managed services, automate |
| **Feature creep** | Medium | Medium | Stick to PRD, defer nice-to-haves, focus on MVP |
| **Vendor lock-in** | Low | Medium | Use abstraction layers, avoid vendor-specific features |

---

## Budget & Cost Analysis

### MVP Costs (First 6 Weeks)

| Service | Usage | Cost |
|---------|-------|------|
| Inngest | <10K jobs/month | $0 (free tier) |
| Resend | 3K emails/month | $0 (free tier) |
| Twilio SMS | 500 SMS/month | $4/month |
| Supabase | <1GB database | $0 (free tier) |
| Vercel | Hobby plan | $0 (free tier) |
| Zoom API | Existing account | $0 |
| Content API | Separate project | $0 (internal) |
| **Total MVP** | | **$4/month** |

### Year 1 Costs (Projected)

| Service | Usage | Cost | Alert Threshold |
|---------|-------|------|-----------------|
| Inngest | 200K jobs/month | $75/month | >$100/month |
| Resend/SendGrid | 500K emails/month | $200/month | >$250/month |
| Twilio SMS | 50K SMS/month | $400/month | >$450/month |
| Supabase | Pro plan (>8GB) | $25/month | >$30/month |
| Vercel | Pro plan | $20/month | >$25/month |
| **Total Year 1** | | **$720/month** | **>$800/month** |

**Budget Gap**: $720/month projected vs $500/month ceiling = **$220/month over budget**

**Required Optimizations (before Year 1):**
1. **Reduce SMS volume by 40%**: Use email for T-24h reminder, SMS only for T-1h (saves ~$160/month)
2. **Negotiate Twilio discount**: Target 25% savings at 100K+ volume (saves ~$100/month)
3. **Alternative**: Switch to cheaper SMS provider (e.g., Bandwidth.com at $0.004/SMS)
4. **Email optimization**: Stay on Resend free tier longer (3K → 10K with careful batching)

**Revised Budget Target**: $500-550/month achievable with optimizations

**Cost Monitoring:**
- Weekly review of service spend
- Automated alerts at threshold breaches
- Monthly optimization review

---

## Open Questions & Decisions Needed

### Technical Decisions

1. **~~Timezone Handling~~**: ✅ DECIDED - Use timezone from form, default to America/Denver (US/Mountain)

2. **~~Idempotency Strategy~~**: ✅ DECIDED - Use email+eventId unique constraint, upsert if exists

3. **~~Content Caching~~**: ✅ DECIDED - Cache successful responses for 1 hour, fetch fresh for first send

4. **~~Retry Policy~~**: ✅ DECIDED - 4 attempts (immediate, 1m, 5m, 30m) then DLQ

5. **~~Calendar Format~~**: ✅ DECIDED - Both .ics attachment AND "Add to Calendar" links

6. **Authentication Strategy**: When to implement auth for admin endpoints? Phase 1 or defer to post-MVP?
   - **Impact**: Security vs. speed tradeoff
   - **Recommendation**: Implement JWT auth in Phase 3 (Week 5)

7. **Rate Limiting**: Implement in Phase 1 (60/min) or defer to post-MVP?
   - **Impact**: API protection vs. development speed
   - **Recommendation**: Implement in Phase 1 (simple middleware)

### Business Decisions

1. **~~SMS Consent~~**: ✅ DECIDED - Explicit checkbox required (TCPA compliance)

2. **~~Unsubscribe Granularity~~**: ✅ DECIDED - Unsubscribe from all for MVP, per-channel later

3. **Data Retention**: Confirm 90 days is legally sufficient for GDPR/CCPA
   - **Impact**: Legal compliance
   - **Action Required**: Legal review before launch

4. **~~Multi-Tenant~~**: ✅ DECIDED - Single-tenant MVP, add tenancy in v2

5. **Budget Overrun**: Approve SMS reduction strategy to meet $500/month ceiling?
   - **Impact**: $220/month savings needed
   - **Action Required**: Approve T-24h email-only strategy

### Scope Clarifications

1. **Content API**: Need endpoint specification, authentication details, SLA requirements
   - **Status**: Blocked - waiting on content team
   - **Action Required**: Schedule alignment meeting

2. **Calendar Integration**: Confirm if required for MVP launch (Week 6) or can be deferred to post-MVP
   - **Impact**: 2 days of development time
   - **Recommendation**: Include in MVP (high user value)

3. **Backup Contact**: Who handles incidents if solo developer is unavailable?
   - **Status**: TBD
   - **Action Required**: Define escalation path before production

4. **Staging Environment**: Set up separate staging or use production with feature flags?
   - **Recommendation**: Feature flags for MVP, separate staging post-launch

---

## Compliance & Legal Considerations

### Email Compliance (CAN-SPAM Act)
- ✅ Unsubscribe link in every email
- ✅ Physical mailing address in footer
- ✅ Accurate "From" name and subject line
- ✅ Honor unsubscribe requests within 10 business days

### SMS Compliance (TCPA)
- ✅ Explicit consent before sending SMS
- ✅ Handle STOP, START, HELP keywords automatically
- ✅ Include business name in SMS
- ✅ Only send during reasonable hours (9am-9pm)

### Data Privacy (GDPR/CCPA)
- ✅ Store only necessary contact data
- ✅ Provide data export API (future)
- ✅ Provide data deletion API (future)
- ✅ Cookie consent not needed (backend only)

### Security
- ✅ HTTPS only (enforced by Vercel)
- ✅ Webhook signature verification
- ✅ Environment variables for API keys (never commit)
- ✅ Rate limiting on public API endpoints (future)

---

## Documentation Requirements

### Developer Documentation
- [ ] API reference (OpenAPI spec)
- [ ] Webhook integration guide
- [ ] Database schema diagram
- [ ] Inngest function architecture
- [ ] Local development setup guide

### User Documentation
- [ ] Admin dashboard user guide
- [ ] Funnel analytics interpretation
- [ ] Best practices for email/SMS timing
- [ ] Troubleshooting common issues

### Operations Documentation
- [ ] Deployment runbook
- [ ] Monitoring and alerting setup
- [ ] Incident response procedures
- [ ] Cost optimization guide

---

## Appendix

### Related Documents
- Strategic Plan: `/docs/CEREMONIA_FUNNEL_PLAN.md`
- Database Schema: (To be created)
- API Design: (To be created)

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-09-30 | Austin Mao | Initial PRD creation |
| 1.1.0 | 2025-09-30 | Austin Mao | Major update: Added API specs, Content API integration, Error handling, Timezone details, Monitoring section. Fixed database naming (events vs webinars). Clarified Zoom support status. Committed to Inngest. Added budget gap analysis. Updated Open Questions with decisions. Moved Behavioral Triggers to Future. Default timezone: US/Mountain. |

---

## Approval & Sign-Off

**Product Owner:** Austin Mao
**Status:** Draft - Ready for Review
**Next Steps:**
1. Review and approve PRD
2. Create detailed database schema design
3. Begin Phase 1 implementation (Week 1-2)

---

*This PRD is a living document and will be updated as requirements evolve. For questions or clarifications, contact Austin Mao.*
