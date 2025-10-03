# 📋 SLC PLAN: Myxelium Event Funnel Automation

**Document Version:** 1.0.0
**Created:** 2025-10-03
**Scope:** Simple, Lovable, Complete delivery system for Ceremonía event funnels
**Build Time:** 2-3 weeks

---

## 1. SLC Vision Statement

**The "Slick" Version:**
*A delightful automated event funnel system that enrolls users in Zoom webinars and nurtures them with perfectly-timed, multi-channel messages from signup to post-event follow-up—all working reliably without manual intervention.*

**Core Problem:**
Ceremonía can enroll users in Zoom events but **cannot automatically send the email and SMS drip campaigns** that convert registrations into attendees and customers.

**Target User:**
Ceremonía marketing team managing webinar enrollments, and attendees who deserve a seamless, well-timed nurture experience.

---

## 2. Scope Definition

### ✅ What's Included (Simple Scope)

#### Feature 1: Email Delivery System (Resend Integration)
**Purpose:** Send automated emails for welcome, reminders, and follow-ups
**User Story:** As a webinar registrant, I want to receive timely email communications so that I remember to attend and feel engaged with the event.

**Detailed Specification:**
- Integrate Resend API for transactional email delivery
- Send welcome email immediately upon enrollment (T+0h)
- Send reminder emails at T-24h and T-1h before event
- Send post-event emails (thank you for attended, sorry-we-missed-you for no-shows)
- Include calendar .ics file as attachment in welcome email
- Support HTML email templates with personalization variables
- Handle delivery errors with retry logic via Inngest

**Acceptance Criteria:**
- ✅ Welcome email delivers within 30 seconds of enrollment
- ✅ Reminder emails send at correct times (T-24h, T-1h)
- ✅ Post-event emails branch correctly (attended vs no-show paths)
- ✅ Calendar attachment works across Gmail, Outlook, Apple Mail
- ✅ 95%+ delivery rate (excluding provider failures)
- ✅ All emails use personalized {{firstName}}, {{eventTitle}}, {{joinUrl}} variables

**Technical Notes:**
- Use Resend SDK with API key from environment variables
- Store sent messages in `sent_messages` table with status tracking
- Implement idempotency to prevent duplicate sends

**Completeness Check:** ✓ This feature provides full email delivery capability, not a placeholder

---

#### Feature 2: SMS Delivery System (Twilio Integration)
**Purpose:** Send high-urgency SMS reminders for time-sensitive notifications
**User Story:** As a webinar registrant, I want to receive SMS reminders so that I don't miss the event even if I don't check email.

**Detailed Specification:**
- Integrate Twilio API for SMS delivery
- Send SMS reminder at T-1h before event (only if user has SMS consent)
- Send SMS for post-event re-engagement (no-show path only)
- Support E.164 phone format validation
- Handle SMS auto-response keywords (STOP, START, HELP)
- Respect SMS quiet hours (9am-9pm in user's timezone)

**Acceptance Criteria:**
- ✅ SMS sends only when `consent_sms = true` in contacts table
- ✅ T-1h SMS delivers within 2 minutes of scheduled time
- ✅ STOP keyword immediately unsubscribes user (updates DB)
- ✅ Phone numbers validated as E.164 format before sending
- ✅ SMS does not send during quiet hours (delays to 9am next day)
- ✅ 98%+ delivery rate (excluding invalid numbers)

**Technical Notes:**
- Use Twilio SDK with Account SID and Auth Token from environment
- Character limit: 160 chars for standard SMS
- Store SMS delivery status in `sent_messages` table

**Completeness Check:** ✓ This feature provides full SMS delivery capability with compliance

---

#### Feature 3: Webhook Handlers for Engagement Tracking
**Purpose:** Track email opens, clicks, and SMS delivery to measure funnel performance
**User Story:** As a marketer, I want to see engagement metrics so that I can optimize campaign timing and content.

**Detailed Specification:**
- Implement Resend webhook handler at `/api/webhooks/resend`
- Implement Twilio webhook handler at `/api/webhooks/twilio`
- Implement Zoom webhook handler at `/api/webhooks/zoom` for attendance
- Validate webhook signatures to prevent forgery
- Update `sent_messages` status: queued → sent → delivered → opened → clicked
- Update `registrations.attended` flag based on Zoom attendance webhooks

**Acceptance Criteria:**
- ✅ Resend webhooks update message status (delivered, opened, clicked, bounced)
- ✅ Twilio webhooks update SMS status (delivered, failed, unsubscribed)
- ✅ Zoom webhooks mark attendance correctly (attended = true/false)
- ✅ All webhooks validate signatures before processing
- ✅ Duplicate webhooks are idempotent (don't double-update)
- ✅ 99%+ webhook processing success rate

**Technical Notes:**
- Use webhook signature validation (HMAC for Resend, signature header for Twilio)
- Implement deduplication using `provider_message_id`
- Handle webhook retries gracefully

**Completeness Check:** ✓ This feature provides full engagement tracking, not partial

---

#### Feature 4: Calendar Integration (.ics Generation)
**Purpose:** Make it effortless for users to add events to their calendar
**User Story:** As a webinar registrant, I want to add the event to my calendar with one click so that I don't forget to attend.

**Detailed Specification:**
- Generate .ics files using RFC 5545 standard
- Include event details: title, date/time, duration, Zoom join URL
- Support timezone conversion (use event's scheduled timezone)
- Attach .ics file to welcome email
- Provide "Add to Calendar" links for Google Calendar, Outlook, Apple Calendar

**Acceptance Criteria:**
- ✅ .ics file opens correctly in Gmail, Outlook, Apple Mail
- ✅ Event appears with correct date/time in user's timezone
- ✅ Join URL is clickable in calendar entry
- ✅ Calendar invite includes event description and location (Zoom URL)
- ✅ "Add to Calendar" links work for all major calendar providers

**Technical Notes:**
- Use `ics` npm package for file generation
- Store .ics content temporarily (not in DB, generate on-demand)
- Handle DST transitions correctly using `moment-timezone`

**Completeness Check:** ✓ This feature provides full calendar integration, not partial

---

#### Feature 5: Static Email/SMS Templates
**Purpose:** Provide professional, brand-consistent message content for all campaign steps
**User Story:** As a recipient, I want to receive well-written, personalized messages that feel human and on-brand.

**Detailed Specification:**
- Create static templates for all message types (not AI-generated for SLC)
- Templates:
  - Welcome email (HTML + text)
  - T-24h reminder email (HTML + text)
  - T-1h reminder email (HTML + text)
  - T-1h reminder SMS (text only, <160 chars)
  - Thank you email - attended (HTML + text)
  - Sorry we missed you email - no-show (HTML + text)
  - Re-engagement SMS - no-show (text only)
- Support personalization variables: {{firstName}}, {{lastName}}, {{eventTitle}}, {{eventDate}}, {{joinUrl}}, {{unsubscribeUrl}}
- Include unsubscribe links in all emails (CAN-SPAM compliance)
- Include business name and opt-out instructions in all SMS (TCPA compliance)

**Acceptance Criteria:**
- ✅ All templates render correctly with personalized variables
- ✅ HTML emails are mobile-responsive
- ✅ Plain text fallbacks provided for all emails
- ✅ Unsubscribe links work and update consent in DB
- ✅ SMS templates stay under 160 characters
- ✅ Templates use Ceremonía brand voice and tone

**Technical Notes:**
- Store templates in `/templates` directory (version controlled)
- Use simple template engine (e.g., Handlebars or native string replacement)
- Defer AI generation to post-SLC

**Completeness Check:** ✓ This feature provides complete messaging content, not placeholders

---

#### Feature 6: Admin Dashboard - Message Monitoring
**Purpose:** Give marketing team visibility into funnel performance and message delivery
**User Story:** As a marketer, I want to see which messages were sent and their status so that I can troubleshoot issues and measure success.

**Detailed Specification:**
- Admin API endpoints:
  - `GET /api/admin/messages` - List all sent messages with filters
  - `GET /api/admin/contacts/:id` - View message history for a contact
  - `GET /api/admin/events/:id/analytics` - Event-level funnel metrics
- Display message status: queued, sent, delivered, opened, clicked, failed
- Show engagement metrics: open rate, click rate, delivery rate
- Filter by: event, contact, channel (email/SMS), status, date range
- Export data to CSV for external analysis

**Acceptance Criteria:**
- ✅ Message list shows status updates in real-time (via webhooks)
- ✅ Contact detail view shows complete message history
- ✅ Event analytics show funnel metrics (enrolled → attended → engaged)
- ✅ Filters work correctly and return results quickly (<2s)
- ✅ CSV export includes all relevant data fields
- ✅ Dashboard is accessible only to authorized users

**Technical Notes:**
- Build admin routes in Next.js App Router
- Query Supabase with proper indexes for performance
- Use server components for data fetching
- Add basic authentication (defer JWT to post-SLC)

**Completeness Check:** ✓ This feature provides complete admin visibility, not partial

---

### ❌ What's Explicitly Excluded

**AI Content Generation:**
Why: Static templates are sufficient for SLC. AI generation adds complexity and can be added later without breaking the system.

**JWT Authentication & Multi-Tenancy:**
Why: Ceremonía is the only user. Single-tenant is simpler and faster to build. Authentication can be added post-launch.

**Adaptive Timing Logic (7-day → 2-day compression):**
Why: Core funnel works with fixed timing. Adaptive timing is a nice-to-have optimization, not essential for launch.

**Behavioral Triggers (email opened → SMS escalation):**
Why: Pre-defined sequences are complete. Advanced triggers can be added once basic system proves valuable.

**A/B Testing:**
Why: Need baseline performance data first. A/B testing is premature without initial metrics.

**WhatsApp Integration:**
Why: Email + SMS covers 95% of use cases. WhatsApp adds provider complexity for minimal gain.

**CRM Sync (HubSpot/Salesforce):**
Why: Supabase DB is sufficient for tracking. CRM sync can be added when there's proven demand.

**Multi-Language Support:**
Why: Ceremonía operates in English. Localization is unnecessary complexity for SLC.

---

## 3. Lovable Elements

### UX Principles

**Reliability Over Flash:**
Users trust the system because messages arrive **exactly when expected**. No missed reminders, no broken links, no delivery failures due to poor implementation.

**Personalization Without Creepiness:**
Every message feels personal (uses first name, event-specific details) but respects boundaries (only sends when consented, honors quiet hours).

**Invisible Automation:**
Users don't think about "the system"—they just experience a smooth journey from signup to post-event. The technology disappears.

### Delight Factors

**Calendar Magic:** One-click calendar add with perfect timezone handling. The event just *appears* in their calendar with the join URL ready to click.

**SMS at the Perfect Moment:** T-1h SMS arrives right when users need that gentle nudge, not too early (gets buried) or too late (already missed it).

**Smart No-Show Recovery:** Users who miss the event get a thoughtful "sorry we missed you" email with replay link, not a generic blast. They feel cared for, not spammed.

**Engagement Transparency:** Marketers can see *exactly* what happened with each message (opened? clicked? bounced?) without digging through provider dashboards.

### Emotional Connection

**For Event Attendees:**
The system makes them feel *valued and remembered*. They don't have to worry about forgetting the event—the system has their back. When they receive that perfectly-timed SMS reminder, they think "wow, that's exactly when I needed that."

**For Marketers:**
The system makes them feel *in control and informed*. They can see the funnel working in real-time, spot issues before they become problems, and trust that their audience is being nurtured properly. No more manual sending, no more hoping emails went out.

---

## 4. Success Criteria

### Launch Readiness

- [ ] **All features meet "Complete" standard:** Every feature above is fully functional, not a placeholder or "coming soon"
- [ ] **UX is delightful:** Marketers trust the system, attendees feel valued and reminded
- [ ] **Scope is simple:** Can ship in 2-3 weeks with focused execution

### User Success Metrics

**For Event Attendees:**
- ✅ **95%+ email delivery rate:** Welcome emails arrive reliably within 30 seconds
- ✅ **98%+ SMS delivery rate:** Reminders reach users' phones without failures
- ✅ **30%+ attendance rate:** Automated reminders improve show-up rate (industry avg: 20-40%)
- ✅ **Zero missed reminders:** No user reports "I didn't get a reminder"

**For Marketers (Ceremonía Team):**
- ✅ **40%+ email open rate:** Emails are engaging enough to open (industry avg: 20-30%)
- ✅ **70%+ SMS open rate:** SMS reminders are read (SMS typically higher than email)
- ✅ **Real-time status visibility:** Can see message status updates within 1 minute of delivery
- ✅ **<$50/month infrastructure cost:** Stays within budget (Resend free tier + Twilio ~$4/month)

### Technical Success Metrics

- ✅ **<5 second enrollment latency (P95):** Form submit → Zoom enrolled → welcome email queued
- ✅ **99%+ job completion rate:** Inngest jobs succeed (excluding provider failures)
- ✅ **99%+ webhook processing rate:** All webhooks handled correctly
- ✅ **Zero delivery failures due to bugs:** All failures are provider-side or invalid inputs

---

## 5. Implementation Guardrails

### Anti-Pattern Warnings

⚠️ **Feature Creep - DO NOT ADD:**
- AI content generation (use static templates)
- JWT authentication (use basic auth for SLC)
- Adaptive timing logic (use fixed T-24h, T-1h)
- A/B testing framework (measure baseline first)
- Multi-tenant architecture (single-tenant is complete)
- Behavioral triggers (pre-defined sequences are complete)

*If tempted to add these, create a post-SLC roadmap instead.*

⚠️ **MVP Thinking - DO NOT SHIP:**
- Broken email delivery ("we'll fix it later")
- Missing SMS consent checks ("we'll add compliance later")
- Partial webhook handlers ("we'll track clicks later")
- Buggy calendar integration ("timezone handling is hard")
- Incomplete admin dashboard ("they can check the DB directly")

*Each feature must be FULLY FUNCTIONAL before shipping.*

⚠️ **Vague Implementation - DO NOT GUESS:**
- "How should we handle timezone DST transitions?" → Ask for clarification or use industry standard (moment-timezone)
- "What happens if Resend API is down?" → Implement retry logic, don't assume it works
- "Should SMS respect quiet hours in user's timezone or our timezone?" → User's timezone (specified in PRD)

*If spec is ambiguous, refer to PRD or ask rather than making assumptions.*

### SLC Validation Questions for Implementers

Before marking any feature as "done," answer:

1. **Is this still simple?**
   - Can this ship in 2-3 weeks without heroic effort?
   - Have we cut all non-essential complexity?
   - Could a new developer understand this in <30 minutes?

2. **Is this lovable?**
   - Would I personally use this system if I were running webinars?
   - Do users feel cared for (not spammed or forgotten)?
   - Is there at least one "wow, that's nice" moment?

3. **Is this complete?**
   - Does every feature work end-to-end without hacks?
   - Can I demo this to a customer without apologizing?
   - Are there zero "we'll fix this later" TODOs in critical paths?

### Quality Checklist (Before Launch)

- [ ] **End-to-end test with real event:** Enroll 10 test users, verify all messages deliver
- [ ] **Timezone edge case test:** DST transition, international timezones
- [ ] **Webhook resilience test:** Send duplicate webhooks, verify idempotency
- [ ] **SMS compliance test:** Verify STOP keyword works, quiet hours respected
- [ ] **Email deliverability test:** Check spam scores, verify calendar attachment works
- [ ] **Admin dashboard test:** Verify metrics are accurate, CSV export works
- [ ] **Error handling test:** Simulate Resend/Twilio failures, verify retries work
- [ ] **Performance test:** 50 concurrent enrollments, verify <5s P95 latency

---

## 6. Implementation Timeline

### Week 1: Foundation (Email + SMS Integration)

**Day 1-2: Resend Integration**
- Set up Resend account, verify domain
- Implement `sendEmail()` function
- Create email templates (welcome, reminder-24h, reminder-1h)
- Test: Send welcome email on enrollment

**Day 3-4: Twilio Integration**
- Set up Twilio account, get phone number
- Implement `sendSMS()` function
- Create SMS templates (reminder-1h, re-engagement)
- Add consent checking and quiet hours logic
- Test: Send T-1h SMS reminder

**Day 5: Calendar Integration**
- Implement .ics file generation
- Attach to welcome email
- Add "Add to Calendar" links
- Test: Calendar works in Gmail, Outlook, Apple Mail

**Deliverable:** Email and SMS delivery working end-to-end

---

### Week 2: Webhooks + Admin Dashboard

**Day 6-7: Webhook Handlers**
- Implement `/api/webhooks/resend` (delivered, opened, clicked)
- Implement `/api/webhooks/twilio` (delivered, failed, unsubscribed)
- Implement `/api/webhooks/zoom` (attendance tracking)
- Add signature validation for all webhooks
- Test: Webhooks update DB correctly

**Day 8-9: Admin Dashboard - Messages**
- Build `GET /api/admin/messages` endpoint
- Create messages list page (table with filters)
- Add contact detail page (message history timeline)
- Test: Can view and filter messages

**Day 10-11: Admin Dashboard - Analytics**
- Build `GET /api/admin/events/:id/analytics` endpoint
- Create database function `get_event_analytics`
- Build analytics page (funnel metrics, charts)
- Add CSV export functionality
- Test: Metrics are accurate

**Deliverable:** Full visibility and tracking working

---

### Week 3: Testing + Polish

**Day 12-13: End-to-End Testing**
- Create test event with 10 test users
- Verify all messages deliver at correct times
- Test both paths: attended and no-show
- Fix any bugs found

**Day 14-15: Compliance + Error Handling**
- Add unsubscribe page (email + SMS)
- Verify CAN-SPAM compliance (footer, physical address)
- Verify TCPA compliance (opt-out, quiet hours)
- Test error scenarios (API failures, retries)

**Day 16-17: Performance Optimization**
- Add database indexes for slow queries
- Optimize webhook processing speed
- Test concurrent load (50 enrollments)
- Verify P95 latency <5s

**Day 18-19: Documentation + Launch Prep**
- Write README for admin dashboard
- Document webhook setup for Resend/Twilio
- Create runbook for troubleshooting
- Final production deployment

**Deliverable:** Production-ready SLC system

---

## 7. Post-SLC Roadmap

**After SLC ships and proves valuable, consider:**

**Phase 2 (Month 2):**
- AI content generation (replace static templates)
- JWT authentication (multi-user admin)
- Behavioral triggers (email opened → SMS escalation)

**Phase 3 (Month 3):**
- Adaptive timing logic (7-day → 2-day compression)
- A/B testing framework
- WhatsApp integration

**Phase 4 (Month 4+):**
- Multi-tenant architecture (SaaS transformation)
- CRM sync (HubSpot, Salesforce)
- Advanced analytics (revenue attribution)

*Each phase should be evaluated as a separate SLC project.*

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Email deliverability issues** | Medium | High | Use Resend (reputable provider), verify domain, SPF/DKIM setup, avoid spam triggers |
| **Zoom API rate limits** | Low | Medium | Already implemented, caching in place, unlikely to hit limits at current scale |
| **SMS cost overrun** | Low | Medium | Only send T-1h + re-engagement (2 SMS max per user), monitor Twilio spend weekly |
| **Webhook delays** | Medium | Low | Accept eventual consistency, show "sending..." status, retries handle failures |
| **Timezone bugs** | Medium | Medium | Use moment-timezone, test DST edge cases, validate with international test users |
| **Template personalization breaks** | Low | High | Validate all variables exist before sending, fallback to generic if missing |

---

## 9. Success Definition

**The SLC is successful if:**

✅ **Ceremonía runs 1 live webinar using the system** with real attendees
✅ **50+ users enrolled** without manual intervention
✅ **All messages deliver reliably** (95%+ email, 98%+ SMS)
✅ **30%+ attendance rate** (improved from baseline due to reminders)
✅ **Zero critical bugs** that require immediate hotfixes
✅ **Marketers trust the system** and don't feel the need to manually verify sends
✅ **Infrastructure costs <$50/month** (within budget)

**If these criteria are met, the system is Simple, Lovable, and Complete.** 🎉

---

## Appendix: Related Documents

- **Vision & Architecture:** `/docs/vision/VISION_AND_ARCHITECTURE.md` (future SaaS platform)
- **Product Requirements:** `/docs/product-requirements-v1.0.0.md` (full PRD)
- **Technical Plan:** `/docs/CEREMONIA_FUNNEL_PLAN.md` (original implementation plan)

---

*This SLC plan focuses exclusively on completing the core delivery system. All advanced features (AI, multi-tenancy, adaptive timing) are deferred to post-SLC phases.*
