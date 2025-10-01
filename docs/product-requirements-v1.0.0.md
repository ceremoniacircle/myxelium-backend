# Product Requirements Document v1.0.0
*Myxelium: Event Funnel Orchestration API*

**Document Version:** 1.0.0
**Last Updated:** 2025-09-30
**Status:** Draft
**Owner:** Austin Mao

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
- ✅ Successfully enroll 50+ users in live events via form submission
- ✅ Execute 3-step pre-event drip (welcome → T-24h → T-1h)
- ✅ Execute 3-step post-event drip (attended vs. no-show paths)
- ✅ 99%+ job completion rate (excluding provider failures)
- ✅ <5 second latency from form submit to Zoom enrollment
- ✅ Total infrastructure cost <$50/month

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
3. Post-webinar: branching sequences (attended → nurture, no-show → replay)
4. Real-time engagement tracking and behavioral triggers

---

## Features & Requirements

### Critical Features (MVP - Must Have)

#### 1. Contact Management
- **API Endpoint**: `POST /api/enrollments`
- **Input**: email, firstName, lastName, phone, webinarId, customFields
- **Output**: enrollmentId, zoomJoinUrl, scheduledSteps
- **Database**: Store contacts with consent flags, timezone, custom attributes
- **Deduplication**: Handle re-submissions (update vs. create)

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
- **Technology**: Inngest (serverless, visual debugging)
- **Capabilities**:
  - Delayed execution (sleepUntil for T-24h, T-1h)
  - Automatic retries with exponential backoff
  - Idempotency (prevent duplicate sends)
  - Dead letter queue (DLQ) for failed jobs
- **Triggers**: Event-based (`webinar.enrolled`, `webinar.completed`)

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

#### 8. Behavioral Triggers
- **Email Opened → High Intent**: If user opens 2+ emails, escalate to SMS
- **Link Clicked → Hot Lead**: Tag contact, trigger priority sequence
- **Not Opened → Re-engagement**: After 48h no open, send SMS reminder

#### 9. Calendar Integration
- **Generate .ics Files**: Universal calendar format
- **Email Attachment**: Include in welcome email
- **Add-to-Calendar Links**: Google Calendar, Outlook direct links

#### 10. Funnel Analytics Dashboard
- **Enrollment Metrics**: Total enrollments, attendance rate, conversion rate
- **Email Performance**: Sent, delivered, opened, clicked per step
- **SMS Performance**: Sent, delivered per step
- **Funnel Visualization**: Drop-off rates at each step

#### 11. Webhook Infrastructure
- **Resend Webhooks**: `/api/webhooks/resend` for email events
- **Twilio Webhooks**: `/api/webhooks/twilio` for SMS events
- **Zoom Webhooks**: `/api/webhooks/zoom` for attendance
- **Signature Verification**: Validate all incoming webhooks

#### 12. Admin UI
- **Webinar List**: View all webinars, enrollments, status
- **Funnel Performance**: See metrics per webinar/campaign
- **Contact Detail View**: See all messages sent to a contact
- **Manual Triggers**: Ability to manually send a message or cancel jobs

### Future Considerations (Nice to Have)

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
- `webinars` - Webinar details, Zoom IDs, scheduled times
- `enrollments` - Links contacts to webinars, tracks attendance
- `campaigns` - Funnel definitions (steps, delays, conditions)
- `message_templates` - Template metadata (references external content)
- `scheduled_jobs` - Queued work (managed by Inngest)
- `sent_messages` - Delivery audit log with engagement tracking

**Key Relationships:**
- enrollment → contact (many-to-one)
- enrollment → webinar (many-to-one)
- sent_message → enrollment (many-to-one)
- sent_message → template (many-to-one)

### API Endpoints

**Public API:**
- `POST /api/enrollments` - Enroll contact in webinar funnel
- `GET /api/webinars/:id` - Get webinar details (public)

**Webhook Receivers:**
- `POST /api/webhooks/zoom` - Zoom attendance events
- `POST /api/webhooks/resend` - Email delivery/engagement events
- `POST /api/webhooks/twilio` - SMS delivery/reply events

**Admin API:**
- `GET /api/admin/webinars` - List all webinars
- `GET /api/admin/funnels/:id/analytics` - Funnel performance metrics
- `GET /api/admin/contacts/:id` - Contact detail with message history
- `POST /api/admin/messages/send` - Manual message send (testing)

**Inngest Functions:**
- `inngest/webinar-funnel` - Pre-webinar drip sequence
- `inngest/post-webinar-funnel` - Post-webinar branching sequences
- `inngest/send-message` - Generic message sending with retries

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

### Data Flow: Enrollment to Completion

```
1. User submits form on landing page
   ↓
2. POST /api/enrollments
   - Validate input (Zod schema)
   - Create/update contact in Supabase
   - Call Zoom API to register
   - Store enrollment with Zoom IDs
   ↓
3. Trigger Inngest event: 'webinar.enrolled'
   - Event payload: { contactId, webinarId, enrollmentId }
   ↓
4. Inngest function: webinar-funnel
   - Step 1: Send welcome email (immediate)
   - Step 2: sleepUntil(T-24h), send reminder email + SMS
   - Step 3: sleepUntil(T-1h), send final reminder email + SMS
   ↓
5. Webinar happens (external, on Zoom)
   ↓
6. Zoom webhook: POST /api/webhooks/zoom
   - Parse participant list
   - Update enrollment.attended = true/false
   - Trigger Inngest event: 'webinar.completed'
   ↓
7. Inngest function: post-webinar-funnel
   - Branch based on attended flag:
     - IF attended: thank you → resources → offer sequence
     - IF no-show: missed you → re-engagement → final sequence
   ↓
8. Each send triggers provider API call
   - Email: Resend API
   - SMS: Twilio API
   - Record in sent_messages table
   ↓
9. Provider webhooks update status
   - Resend: delivered, opened, clicked, bounced
   - Twilio: delivered, failed
   - Update sent_messages.status, timestamps
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
- Day 8-9: Inngest setup, first function (webinar.enrolled handler)
- Day 10-11: Content API integration (fetch HTML, personalization)
- Day 12-14: Email sending (Resend integration, welcome email working)
- **Deliverable**: Immediate welcome email sent on enrollment

### Phase 2: Drip Campaigns (Week 3-4)

**Week 3: Pre-Webinar Sequence**
- Day 15-16: Implement T-24h reminder (email + SMS)
- Day 17-18: Implement T-1h reminder (email + SMS)
- Day 19-21: Twilio SMS integration, test end-to-end
- **Deliverable**: Complete pre-webinar drip working

**Week 4: Post-Webinar Sequence**
- Day 22-23: Zoom webhook handler (attendance tracking)
- Day 24-25: Post-webinar branching logic (attended vs. no-show)
- Day 26-28: Implement both sequences, test with real webinar
- **Deliverable**: End-to-end funnel working for 1 webinar

### Phase 3: Admin UI & Polish (Week 5-6)

**Week 5: Dashboard & Webhooks**
- Day 29-30: Resend webhook handler (email engagement)
- Day 31-32: Twilio webhook handler (SMS delivery)
- Day 33-35: Admin dashboard (webinar list, enrollment stats)
- **Deliverable**: Can track funnel performance

**Week 6: Testing & Launch**
- Day 36-37: Calendar integration (.ics files)
- Day 38-39: End-to-end testing with 50 test users
- Day 40-42: Bug fixes, documentation, launch prep
- **Deliverable**: MVP ready for production

### Post-MVP Roadmap (Month 2-3)

**Month 2:**
- Behavioral triggers (email opened → SMS escalation)
- A/B testing framework
- Enhanced analytics (funnel visualization)

**Month 3:**
- WhatsApp integration
- CRM sync (HubSpot/Salesforce)
- Multi-language support

---

## Success Metrics & KPIs

### Product Metrics

**Enrollment Success:**
- **Target**: 99%+ successful Zoom enrollments (excluding invalid input)
- **Measure**: `COUNT(enrollments WHERE zoom_registrant_id IS NOT NULL) / COUNT(enrollments)`

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

**Webinar Attendance:**
- **Target**: 30%+ attendance rate (industry avg: 20-40%)
- **Measure**: `COUNT(enrollments WHERE attended = true) / COUNT(enrollments)`

**Email Engagement:**
- **Open Rate**: 40%+ (industry avg: 20-30%)
- **Click Rate**: 5%+ (industry avg: 2-5%)

**SMS Engagement:**
- **Open Rate**: 70%+ (SMS typically higher)
- **Reply Rate**: 1-3%

**Conversion (Post-Webinar):**
- **Target**: 10%+ take desired action (book call, purchase, etc.)
- **Measure**: Track clicks on CTA links in post-webinar emails

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
| **Zoom API rate limits** | Medium | High | Cache webinar data, batch requests, implement backoff |
| **Email deliverability issues** | Medium | High | Use Resend/SendGrid, warm up domain, SPF/DKIM setup |
| **Job queue failures** | Low | Critical | Inngest has built-in retries + DLQ, monitor dashboard |
| **Content API downtime** | Medium | Medium | Cache templates locally, fallback to static content |
| **Webhook signature forgery** | Low | High | Validate all webhooks, use HTTPS only |
| **Database performance** | Low | Medium | Index optimization, read replicas if needed |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Low webinar attendance** | Medium | Medium | Focus on reminder timing, test different cadences |
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

| Service | Usage | Cost |
|---------|-------|------|
| Inngest | 200K jobs/month | $75/month |
| Resend/SendGrid | 500K emails/month | $200/month |
| Twilio SMS | 50K SMS/month | $400/month |
| Supabase | Pro plan (>8GB) | $25/month |
| Vercel | Pro plan | $20/month |
| **Total Year 1** | | **$720/month** |

**Budget Ceiling**: $500/month (need to optimize or reduce SMS volume)

**Optimization Strategies:**
- Negotiate Twilio volume discount (25%+ savings at 100K+ SMS/month)
- Use email for lower-urgency reminders (reduce SMS volume)
- Self-host BullMQ if Inngest costs exceed $100/month

---

## Open Questions & Decisions Needed

### Technical Decisions

1. **Timezone Handling**: Use user's browser timezone (from form) or IP-based detection?
   - **Recommendation**: Ask in form, default to US/Pacific if not provided

2. **Idempotency Strategy**: How to handle duplicate form submissions?
   - **Recommendation**: Use email+webinarId as unique key, update if exists

3. **Content Caching**: Cache generated content locally or always fetch fresh?
   - **Recommendation**: Fetch fresh for first send, cache for retries

4. **Retry Policy**: How many retries for failed sends? How long between retries?
   - **Recommendation**: 3 retries with exponential backoff (1min, 5min, 30min)

5. **Calendar Format**: Just .ics attachment or also "Add to Calendar" links?
   - **Recommendation**: Both (maximizes compatibility)

### Business Decisions

1. **SMS Consent**: Explicit checkbox or implied by form submission?
   - **Recommendation**: Explicit checkbox to comply with TCPA

2. **Unsubscribe Granularity**: Unsubscribe from all or per-webinar?
   - **Recommendation**: All (simpler for MVP), per-channel later

3. **Data Retention**: How long to keep sent_messages data?
   - **Recommendation**: 90 days for analytics, then archive

4. **Multi-Tenant**: Single-tenant (Ceremonía only) or multi-tenant from start?
   - **Recommendation**: Single-tenant MVP, add tenancy in v2

### Scope Clarifications

1. **Behavioral Triggers**: Which specific behaviors trigger which actions?
   - **Deferred to Post-MVP**: Start with time-based only

2. **A/B Testing**: How to define variants and declare winner?
   - **Deferred to Post-MVP**: Manual testing first

3. **CRM Sync**: Which CRMs? One-way or bidirectional?
   - **Deferred to Post-MVP**: Focus on core funnel first

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
